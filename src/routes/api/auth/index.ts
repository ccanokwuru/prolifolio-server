import { PrismaClient, Profile } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";
import {
  checkEmail,
  checkPassword,
  checkMatchPassword,
} from "../../../utils/checkers";
import { JWT_Signer, JWT_Verifier } from "../../../utils/jwt";
import { uniqueToken } from "../../../utils/uniqueToken";
const prisma = new PrismaClient();

interface LoginI {
  email: string;
  password: string;
}

interface RegisterI extends Profile {
  email: string;
  password: string;
  confirm_password: string;
  is_artist?: boolean;
}

interface ResetPasswordI extends LoginI {
  confirm_password: string;
  token: string;
}

const auth: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // user registration
  fastify.post<{ Body: RegisterI }>(
    "/register",
    async function (request, reply) {
      const errors: string[] = [];
      const {
        email,
        password,
        confirm_password,
        display_name,
        is_artist,
        first_name,
        last_name,
      } = request.body;

      // check for all required fields
      if (!email || !email.length) errors.push("email is required");
      if (!password || !password.length) errors.push("password is required");
      if (!confirm_password || !confirm_password.length)
        errors.push("confirm_password is required");
      if (is_artist && (!display_name || !display_name.length))
        errors.push("display_name is required");
      if (!first_name || !first_name.length)
        errors.push("first_name is required");
      if (!last_name || !last_name.length) errors.push("last_name is required");

      if (errors.length)
        return reply.code(400).send({
          message: "Registration failed",
          errors,
        });

      // verify email & password format
      const emailCheck = checkEmail(email);
      const passwordCheck = checkPassword(password);
      if (!emailCheck) errors.push("invalid email format");

      if (!passwordCheck)
        errors.push(
          "invalid password format 6+ characters, 1+ uppercase, 1+ symbols or number "
        );

      if (!checkMatchPassword(password, confirm_password))
        errors.push(`passwords do not match`);

      if (errors.length)
        return reply.code(406).send({
          message: "Registration failed",
          errors,
        });

      // check if user exits aready
      try {
        const emailExists = emailCheck
          ? await prisma.user.findFirst({
              where: {
                email: {
                  equals: email,
                  mode: "insensitive",
                },
              },
            })
          : undefined;

        if (emailExists && emailCheck)
          errors.push(`user with email "${email}" already exists`);

        const displayNameExists = emailCheck
          ? await prisma.profile.findFirst({
              where: {
                display_name: {
                  equals: display_name,
                  mode: "insensitive",
                },
              },
            })
          : undefined;

        if (displayNameExists) {
          errors.push(
            `user with display_name "${display_name}" already exists`
          );
        }
      } catch (error) {
        console.log(error);
      }

      if (errors.length)
        return reply.code(emailCheck || passwordCheck ? 406 : 409).send({
          message: "Registration failed",
          errors,
        });

      // create the user
      try {
        const user = await prisma.user.create({
          data: {
            email: email,
            password: await fastify.bcrypt.hash(password),
            role: is_artist ? "artist" : "user",
            profile: {
              create: {
                display_name,
                first_name,
                last_name,
                artist: is_artist
                  ? {
                      create: {},
                    }
                  : {},
              },
            },
          },
          select: {
            email: true,
            id: true,
            role: true,
            profile: true,
          },
        });

        return reply.code(201).send({
          message: "Registration successfull",
          user,
        });
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // user login
  fastify.post<{ Body: LoginI }>("/login", async function (request, reply) {
    const errors: string[] = [];
    const { email, password } = request.body;

    // check for all required fields
    if (!email || !email.length) errors.push("email is required");
    if (!password || !password.length) errors.push("password is required");

    if (errors.length)
      return reply.code(400).send({
        message: "Login failed",
        errors,
      });

    // verify email & password format
    const emailCheck = checkEmail(email);
    const passwordCheck = checkPassword(password);
    if (!emailCheck) errors.push("invalid email format");

    if (!passwordCheck)
      errors.push(
        "invalid password format 6+ characters, 1+ uppercase, 1+ symbols or number "
      );

    if (errors.length)
      return reply.code(406).send({
        message: "Login failed",
        errors,
      });

    // check if user exists and verify password
    const user = emailCheck
      ? await prisma.user.findFirst({
          where: {
            email: {
              equals: email,
              mode: "insensitive",
            },
          },
        })
      : undefined;

    const verifyPassword = user
      ? await fastify.bcrypt.compare(password, user.password)
      : false;

    !user
      ? errors.push("user does not exist")
      : !verifyPassword
      ? errors.push("invalid user credentials")
      : null;

    if (errors.length)
      return reply.code(user && !verifyPassword ? 409 : 403).send({
        message: "Login failed",
        errors,
      });

    // create refresh token & user session to login
    const refreshToken = JWT_Signer({
      email: email,
      client: request.headers["user-agent"],
      role: user?.role,
    });

    try {
      const session = await prisma.session.create({
        data: {
          token: refreshToken,
          user: {
            connect: {
              email: email,
            },
          },
        },
      });

      const authToken = fastify.jwt.sign({
        session: session.id,
        role: user?.role,
      });

      const sessionUpdate = await prisma.session.update({
        where: {
          id: session.id,
        },
        data: {
          authToken,
        },
        include: {
          user: {
            select: {
              email: true,
              id: true,
              role: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

      return reply.code(200).send({
        authToken,
        refreshToken,
        user: sessionUpdate.user,
      });
    } catch (error) {
      console.log(error);
      return reply.internalServerError();
    }
  });

  // user logout
  fastify.get(
    "/logout",
    {
      preHandler: fastify.auth(
        [
          // @ts-ignore
          fastify.authenticate,
        ],
        { run: "all" }
      ),
    },
    async function (request, reply) {
      // @ts-ignore
      const authToken = request.user.token;
      try {
        const session = await prisma.session.update({
          where: {
            authToken,
          },
          data: {
            expired: true,
          },
        });
        return reply.code(session ? 200 : 500).send({
          message: session.expired ? "Logout successful" : "Logout failed",
        });
      } catch (error) {
        console.log(error);
        return reply.internalServerError("Logout failed");
      }
    }
  );

  // user forgot password request for token
  fastify.post<{ Body: { email: string } }>(
    "/forgotten-password",
    async function (request, reply) {
      const errors: string[] = [];
      const { email } = request.body;

      if (!email) return reply.badRequest("email is required");

      // verify email & password format
      const emailCheck = checkEmail(email);
      if (!emailCheck) errors.push("invalid email format");

      // check email on db
      const emailExists = emailCheck
        ? await prisma.user.findUnique({
            where: {
              email,
            },
          })
        : undefined;

      if (!emailExists) {
        errors.push(`user with email "${email}" doesn't exists`);
      }

      if (errors.length)
        return reply.code(!emailCheck ? 406 : 403).send({
          message: "Failed",
          errors,
        });

      try {
        const recovery = await prisma.authRecovery.create({
          data: {
            token: uniqueToken(64),
            user: {
              connect: {
                email,
              },
            },
          },
        });
        if (recovery)
          return {
            message: "token sent to your email",
            token: recovery,
          };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // user reset password request
  fastify.post<{ Body: ResetPasswordI }>(
    "/reset-password",
    async function (request, reply) {
      const errors: string[] = [];
      const { email, password, confirm_password, token } = request.body;
      const _tokenExpires = new Date(new Date(Date.now()).getTime() - 8.64e7);

      // verify email & password format
      const emailCheck = checkEmail(email);
      const passwordCheck = checkPassword(password);
      if (!emailCheck) errors.push("invalid email format");

      if (!passwordCheck)
        errors.push(
          "invalid password format 6+ characters, 1+ uppercase, 1+ symbols or number "
        );

      if (!checkMatchPassword(password, confirm_password))
        errors.push(`passwords do not match`);

      if (errors.length)
        return reply.code(406).send({
          message: "failed",
          errors,
        });

      // check email on db
      const emailExists = await prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (!emailExists)
        errors.push(`user with email "${email}" doesn't exists`);

      // check token on db and update paswword
      try {
        const checkToken = emailExists
          ? await prisma.authRecovery.findFirst({
              where: {
                token,
                createdAt: {
                  gte: _tokenExpires,
                },
                expired: {
                  not: {
                    equals: true,
                  },
                },
              },
            })
          : undefined;

        const user = checkToken
          ? await prisma.authRecovery.update({
              where: { token },
              data: {
                expired: true,
                user: {
                  update: checkToken
                    ? {
                        password: await fastify.bcrypt.hash(password),
                      }
                    : {},
                },
              },
              select: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    role: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                },
              },
            })
          : undefined;

        if (user)
          return {
            message: "successful",
            user: user,
          };
        errors.push("invalid or expired token");
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }

      return reply.code(404).send({
        message: "failed",
        errors,
      });
    }
  );

  // user refresh auth
  fastify.post<{ Body: { refreshToken: string } }>(
    "/refresh",
    async function (request, reply) {
      const errors: string[] = [];
      const { refreshToken } = request.body;
      const { authorization } = request.headers;
      const authToken = authorization?.startsWith("Bearer ")
        ? authorization.split(" ")[1]
        : undefined;

      if (!authToken?.length) errors.push("authentication required");

      if (!refreshToken?.length) errors.push("invalid session");

      if (errors.length)
        return reply.code(403).send({
          message: "Failed",
          errors,
        });

      const checkToken = JWT_Verifier(refreshToken);
      if (!checkToken) errors.push("invalid or expired session token");
      try {
        const tokenFromDb = checkToken
          ? await prisma.session.findUnique({
              where: {
                token: refreshToken,
                authToken,
              },
              include: { user: true },
            })
          : undefined;
        if (!tokenFromDb) errors.push("corrupted refresh token");
        if (tokenFromDb?.authToken !== authToken)
          errors.push("corrupted auth token");
        if (errors.length)
          return reply.code(checkToken ? 403 : 401).send({
            message: "Failed",
            errors,
          });

        const updatedSession = await prisma.session.update({
          where: {
            token: tokenFromDb?.token,
          },
          data: {
            authToken: await fastify.jwt.sign({
              session: tokenFromDb?.id,
              role: tokenFromDb?.user?.role,
            }),
          },
          select: {
            authToken: true,
            token: true,
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        });

        return reply.code(200).send({
          authToken: updatedSession?.authToken,
          refreshToken: updatedSession?.token,
          user: updatedSession?.user,
        });
      } catch (error) {
        console.log(error);
        reply.internalServerError();
      }
    }
  );
};

export default auth;
