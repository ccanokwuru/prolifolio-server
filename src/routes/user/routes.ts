import { PrismaClient } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";
import { IOneId, ISignin, ISignup, IUserUpdate, IRole, IRoleBody, IContacts, IManyId } from "../../interface";

const prisma = new PrismaClient();
const userRoute: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post<{ Body: ISignup }>("/signup", async function (request, reply) {
    const { email, password, confirm, display_name } = request.body;
    if (!email.length || !password.length || !confirm.length || !display_name.length)
      return reply.code(401).send({ message: "missing fields" });
    if (password !== confirm)
      return reply.code(401).send({ message: "passwords do not match" });

    const hash = await fastify.bcrypt.hash(password);

    const result = await prisma.user.create({
      data: {
        display_name,
        email,
        password: hash,
      },
    });

    if (!result) return reply.code(409).send({ message: "user already exits" });

    const userInfo = {
      name: result.display_name,
      email: result.email,
      role: result.role,
    };
    const authToken = fastify.jwt.sign(userInfo)

    const token = await prisma.token.create({
      data: {
        token: authToken,
        user: {
          connect: {
            email: result.email
          }
        }
      }
    })

    if (!token) return reply.code(401).send({ message: "failed to create token" });

    reply.code(201).setCookie("token", authToken, {
      httpOnly: true,
      path: "/",
      signed: true,
    });
    return {
      token: authToken,
      user: result
    };
  });

  fastify.post<{ Body: ISignin }>("/signin", async function (request, reply) {
    const { email, password } = request.body;

    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!user) return reply.code(401).send({ message: "user not found" });

    const match = await fastify.bcrypt.compare(password, user?.password);

    if (!match) {
      return reply.code(401).send({ message: "email or password is wrong" });
    }
    const userInfo = {
      name: user.display_name,
      email: user.email,
      role: user.role,
    };

    const authToken = fastify.jwt.sign(userInfo)
    // console.log(fastify.jwt.verify(authToken))

    const token = await prisma.token.create({
      data: {
        token: authToken,
        user: {
          connect: {
            email: user.email
          }
        }
      }
    })

    if (!token) return reply.code(401).send({ message: "failed to create token" });

    reply.setCookie("token", authToken, {
      httpOnly: true,
      path: "/",
      signed: true,
    });
    return {
      token: authToken,
      user: user
    };
  });

  fastify.get("/signout", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate
    ], { run: 'all' })
  }, async function (request, reply) {

    // @ts-ignore
    const { token } = request
    if (typeof token === 'string' && token.length) {

      await prisma.token.update({
        where: {
          token,
        },
        data: { expired: true }
      })

      reply.clearCookie("token");

      return {
        message: "Logout Successful",
      };
    }
    else
      return reply.code(401).send({ message: "requires authentication" })
  });

  fastify.get("/all", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate, fastify.admin_auth
    ])
  }, async function (request, reply) {
    const users = await prisma.user.findMany();

    if (!users) return reply.code(404).send({ message: "users not found" });

    return reply.send(users);
  });

  fastify.get<{ Params: IOneId }>("/u/:id", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate
    ])
  }, async function (request, reply) {

    const { id } = request.params;

    const user = await prisma.user.findUnique({
      where: {
        id,
      },
      include: {
        interests: true,
        posts: true,
        jobs: true,
      }
    });

    if (!user) return reply.code(404).send({ message: "user not found" });

    return reply.send({
      user
    });
  });

  fastify.post<{ Params: IOneId, Body: IUserUpdate }>("/u/:id/update", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate, fastify.current_user
    ], { run: 'all' })
  }, async function (request, reply) {

    const { id } = request.params;
    const { email, display_name, first_name, last_name, other_name } = request.body

    if (!email?.length || !display_name?.length || !first_name?.length || !last_name?.length || !other_name?.length)
      return reply.code(401).send({ message: "missing fields" });

    const user = await prisma.user.update({
      where: {
        id,
      },
      data: {
        email, display_name, first_name, last_name, other_name,
      },
    });

    if (!user) return reply.code(404).send({ message: "user not found" });

    return reply.send({
      user
    });
  });

  fastify.post<{ Params: IOneId, Body: IContacts }>("/u/:id/add-contacts", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate, fastify.current_user
    ], { run: 'all' })
  }, async function (request, reply) {

    const { id } = request.params;
    const { contacts } = request.body;

    const user = await prisma.user.update({
      where: {
        id,
      },
      data: {
        contacts: {
          createMany: {
            data: [
              ...contacts
            ]
          }
        }
      },
      include: {
        contacts: true
      }
    });

    if (!user) return reply.code(404).send({ message: "user not found" });

    return reply.status(201).send({
      user
    });
  });

  fastify.get<{ Params: IOneId }>("/u/:id/all-contacts", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate, fastify.current_user
    ], { run: 'all' })
  }, async function (request, reply) {

    const { id } = request.params;

    const user = await prisma.user.findUnique({
      where: {
        id,
      },
      include: {
        contacts: true
      }
    });

    if (!user) return reply.code(404).send({ message: "user not found" });

    return reply.send({
      user
    });
  });

  fastify.post<{ Params: IOneId, Body: IManyId }>("/u/:id/add-interests", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate, fastify.current_user
    ], { run: 'all' })
  }, async function (request, reply) {

    const { id } = request.params;
    const { ids } = request.body;

    const user = await prisma.user.update({
      where: {
        id,
      },
      data: {
        interests: {
          connect: [
            ...ids
          ]
        }
      },
      include: {
        interests: true
      }
    });

    if (!user) return reply.code(404).send({ message: "user not found" });

    return reply.status(201).send({
      user
    });
  });

  fastify.post<{ Params: IOneId, Body: IManyId }>("/u/:id/remove-interests", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate, fastify.current_user
    ], { run: 'all' })
  }, async function (request, reply) {

    const { id } = request.params;
    const { ids } = request.body;

    const user = await prisma.user.update({
      where: {
        id,
      },
      data: {
        interests: {
          disconnect: [
            ...ids
          ]
        }
      },
      include: {
        interests: true
      }
    });

    if (!user) return reply.code(404).send({ message: "user not found" });

    return reply.status(201).send({
      user
    });
  });

  fastify.get<{ Params: IOneId }>("/u/:id/all-interests", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate,
    ], { run: 'all' })
  }, async function (request, reply) {

    const { id } = request.params;

    const user = await prisma.user.findUnique({
      where: {
        id,
      },
      include: {
        interests: true
      }
    });

    if (!user) return reply.code(404).send({ message: "user not found" });

    return reply.send({
      user
    });
  });

  fastify.post<{ Params: IOneId, Body: IRoleBody }>("/u/:id/make-creator",
    {
      preHandler: fastify.auth([
        // @ts-ignore
        fastify.authenticate, fastify.admin_auth
      ], { run: 'all' })
    },
    async function (request, reply) {

      const { id } = request.params;
      const { role } = request.body

      if (role !== IRole.crt)
        return reply.status(403).send({ message: "invalid role" })

      const creator = await prisma.user.update({
        where: {
          id: Number(id)
        },
        data: {
          role,
          creator: {
            connectOrCreate: {
              where: {
                userId: Number(id),
              },
              create: {}
            }
          },
        },
        include: { creator: true, }
      })

      if (!creator)
        return reply.code(401).send({ message: "account migration failed" });

      return reply.status(201).send({
        creator
      })
    });
  fastify.post<{ Params: IOneId, Body: IRoleBody }>("/u/:id/make-admin",
    {
      preHandler: fastify.auth([
        // @ts-ignore
        fastify.authenticate, fastify.admin_auth
      ], { run: 'all' })
    },
    async function (request, reply) {

      const { id } = request.params;
      const { role } = request.body

      if (role !== IRole.adm)
        return reply.status(403).send({ message: "invalid role" })

      const admin = await prisma.user.update({
        where: {
          id: Number(id)
        },
        data: {
          role,
          creator: {
            connectOrCreate: {
              where: {
                userId: Number(id),
              },
              create: {}
            }
          },
          admin: {
            connectOrCreate: {
              where: {
                userId: Number(id),
              },
              create: {}
            }
          }
        },
        include: { creator: true, admin: true }
      })

      if (!admin)
        return reply.code(401).send({ message: "account migration failed" });

      return reply.status(201).send({
        admin
      })
    });

  fastify.post<{ Params: IOneId, Body: IRoleBody }>("/u/:id/remoke-creator",
    {
      preHandler: fastify.auth([
        // @ts-ignore
        fastify.authenticate, fastify.admin_auth
      ], { run: 'all' })
    },
    async function (request, reply) {

      const { id } = request.params;


      const admin = await prisma.user.update({
        where: {
          id: Number(id)
        },
        data: {
          role: IRole.col,
          creator: {
            disconnect: true
          }
        },
        include: { creator: true }
      })

      if (!admin)
        return reply.code(401).send({ message: "account migration failed" });

      return reply.status(201).send({
        admin
      })
    });

  fastify.post<{ Params: IOneId, Body: IRoleBody }>("/u/:id/remoke-admin",
    {
      preHandler: fastify.auth([
        // @ts-ignore
        fastify.authenticate, fastify.admin_auth
      ], { run: 'all' })
    },
    async function (request, reply) {

      const { id } = request.params;

      const admin = await prisma.user.update({
        where: {
          id: Number(id)
        },
        data: {
          role: IRole.crt,
          admin: {
            disconnect: true
          }
        },
        include: { creator: true, admin: true }
      })

      if (!admin)
        return reply.code(401).send({ message: "account migration failed" });

      return reply.status(201).send({
        admin
      })
    });

  fastify.post<{ Body: IOneId }>("/u/:id/delete", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate, fastify.admin_auth, fastify.current_user
    ], { run: 'all' })
  }, async function (request, reply) {

    const { id } = request.body

    const user = await prisma.user.delete({
      where: {
        id
      }
    })

    return reply.send({
      user
    });
  });

};

export default userRoute;
