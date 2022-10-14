import { AuthRecovery, PrismaClient, User } from "@prisma/client";
import { randomBytes } from "crypto";
import { FastifyPluginAsync } from "fastify";
import { ROLE } from "../../types";
import {
  checkEmail,
  checkPassword,
  checkMatchPassword,
} from "../../utils/checkers";
import { JWT_Signer } from "../../utils/jwt";
const prisma = new PrismaClient();

interface LoginI {
  email: string;
  password: string;
}

interface RegisterI extends User {
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
      let userExits = false;
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

      console.log(errors);

      if (errors.length)
        return reply.code(403).send({
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

      // check if user exits aready
      try {
        const emailExists = emailCheck
          ? await prisma.auth.findFirst({
              where: {
                email: email,
              },
            })
          : undefined;

        if (emailExists && emailCheck) {
          errors.push(`user with email "${email}" already exists`);
          userExits = true;
        }
      } catch (error) {
        console.log(error);
      }

      try {
        const displayNameExists = emailCheck
          ? await prisma.user.findFirst({
              where: {
                display_name,
              },
            })
          : undefined;

        if (displayNameExists) {
          errors.push(
            `user with display_name "${display_name}" already exists`
          );
          userExits = true;
        }
      } catch (error) {
        console.log(error);
      }

      if (!checkMatchPassword(password, confirm_password))
        errors.push(`passwords do not match`);

      if (errors.length)
        return reply.code(userExits ? 409 : 406).send({
          message: "Registration failed",
          errors,
        });

      // create the user
      try {
        const user = await prisma.auth.create({
          data: {
            email: email,
            password: await fastify.bcrypt.hash(password),
            user: {
              create: {
                display_name,
                role: is_artist ? ROLE.ARTIST : ROLE.USER,
                first_name,
                last_name,
              },
            },
          },
          include: { user: true },
        });
        if (user)
          if (is_artist) {
            await prisma.creator.create({
              data: {
                userId: user.user.id,
              },
            });
          }
        return reply.code(201).send({
          message: "Registration successfull",
          user: {
            ...user,
            password: undefined,
            deletedAt: undefined,
            user: {
              ...user.user,
              deletedAt: undefined,
            },
          },
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

    // verify email & password format
    const emailCheck = checkEmail(email);
    const passwordCheck = checkPassword(password);
    if (!emailCheck) errors.push("invalid email format");

    if (!passwordCheck)
      errors.push(
        "invalid password format 6+ characters, 1+ uppercase, 1+ symbols or number "
      );

    // check if user exists and verify password
    const auth = emailCheck
      ? await prisma.auth.findUnique({
          where: {
            email: email,
          },
        })
      : undefined;

    const verifyPassword = auth
      ? await fastify.bcrypt.compare(password, auth.password)
      : false;

    !auth || auth.deletedAt
      ? errors.push("user does not exist")
      : !verifyPassword
      ? errors.push("invalid user credentials")
      : null;

    if (errors.length)
      return reply.code(auth && !verifyPassword ? 409 : 403).send({
        message: "Login failed",
        errors,
      });

    // create refresh token & user session to login
    const refreshToken = JWT_Signer({
      email: email,
      client: request.headers["user-agent"],
      role: auth?.role,
    });

    try {
      const session = await prisma.session.create({
        data: {
          token: refreshToken,
          auth: {
            connect: {
              email: email,
            },
          },
        },
      });

      const authToken = fastify.jwt.sign({
        session: session.id,
        role: auth?.role,
      });

      const user = await prisma.session.update({
        where: {
          id: session.id,
        },
        data: {
          authToken,
        },
        include: { auth: true },
      });

      return reply.code(200).send({
        authToken,
        refreshToken,
        user: {
          ...user.auth,
          password: undefined,
          deletedAt: undefined,
          id: undefined,
        },
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
      console.log({ authToken });
      try {
        const session = await prisma.session.update({
          where: {
            authToken,
          },
          data: {
            expired: true,
          },
        });
        return {
          message: session.expired ? "Logout successful" : "Logout failed",
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError("Logout failed");
      }
    }
  );

  // user forgot password request for token
  fastify.post<{ Body: { email: string } }>(
    "/forget-password",
    async function (request, reply) {
      const errors: string[] = [];
      const { email } = request.body;
      reply.badRequest();

      // verify email & password format
      const emailCheck = checkEmail(email);
      if (!emailCheck) errors.push("invalid email format");

      // check email on db
      const emailExists = emailCheck
        ? await prisma.auth.findUnique({
            where: {
              email,
            },
          })
        : undefined;

      if (!emailExists) {
        reply.conflict();
        errors.push(`user with email "${email}" doesn't exists`);
      }

      if (errors.length)
        return {
          errors,
        };

      try {
        const recovery = await prisma.authRecovery.create({
          data: {
            token: randomBytes(256).toString("hex"),
            auth: {
              connect: {
                email,
              },
            },
          },
        });
        if (recovery)
          return {
            token: recovery.token,
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

      // check email on db
      const emailExists = emailCheck
        ? await prisma.auth.findUnique({
            where: {
              email,
            },
          })
        : undefined;

      if (!emailExists)
        errors.push(`user with email "${email}" doesn't exists`);

      let checkToken: AuthRecovery | null = null;

      try {
        checkToken = await prisma.authRecovery.findUnique({
          where: {
            token,
          },
        });

        const tokenExpired = checkToken
          ? new Date(checkToken?.createdAt).getTime() <
            new Date(Date.now()).getTime() - 3600000 * 24
          : true;

        if (!checkToken || tokenExpired)
          errors.push("invalid or expired token");
      } catch (error) {
        console.log(error);
      }

      if (errors.length)
        return {
          errors,
        };

      try {
        const user = await prisma.auth.update({
          where: { id: checkToken?.authId },
          data: {
            password: await fastify.bcrypt.hash(password),
          },
        });

        return user;
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );
};

export default auth;
