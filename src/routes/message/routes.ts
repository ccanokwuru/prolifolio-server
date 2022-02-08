import { IMessage, IOneId } from './../../interface';
import { PrismaClient } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";

const prisma = new PrismaClient();
const messagesRoute: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post<{ Body: IMessage }>("/send", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate
    ], { run: 'all' })
  }, async function (request, reply) {
    const { toId, message } = request.body

    const msg = await prisma.message.create({
      data: {
        from: {
          connect: {
            // @ts-ignore
            email: request.user.email
          }
        },
        to: {
          connect: {
            id: Number(toId)
          }
        },
        message,
      },
      include: {
        from: true,
        to: true
      }
    });

    reply.code(201)
    return {
      msg
    };
  });

  fastify.post<{ Body: IMessage }>("/reply", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate
    ], { run: 'all' })
  }, async function (request, reply) {
    const { message, p_messageId } = request.body
    const parent = await prisma.message.findUnique({
      where: {
        id: Number(p_messageId)
      }
    })

    const msg = await prisma.message.create({
      data: {
        from: {
          connect: {
            // @ts-ignore
            email: request.user.email
          }
        },
        to: {
          connect: {
            id: Number(parent?.fromId)
          }
        },
        message,
        p_message: {
          connect: {
            id: Number(p_messageId)
          }
        }
      },

      include: {
        from: true,
        to: true,
        p_message: true
      }
    });

    reply.code(201)
    return {
      msg
    };
  });

  fastify.get("/all", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate, fastify.admin_auth
    ], { run: 'all' })
  }, async function (request, reply) {

    const msgs = await prisma.message.findMany({
      where: {
        p_messageId: {
          equals: null
        }
      },
      include: {
        from: true,
        to: true,
        replies: true
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return {
      msgs
    };
  });

  fastify.get("/all-mine", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate, fastify.current_userId
    ], { run: 'all' })
  }, async function (request, reply) {

    const msgs = await prisma.message.findMany({
      where: {
        OR: [
          {
            from: {
              // @ts-ignore
              email: request.user.email
            },
          },
          {
            to: {
              // @ts-ignore
              email: request.user.email
            }
          }
        ],
        AND: [
          {
            p_messageId: {
              equals: null
            }
          },
        ]
      },
      include: {
        from: true,
        to: true,
        replies: true
      }
    })

    return {
      msgs
    };
  });

  fastify.get<{ Params: IOneId }>("/m/:id", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate, fastify.current_userId_admin
    ], { run: 'all' })
  }, async function (request, reply) {
    const { id } = request.params
    const msg = await prisma.message.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        from: true,
        to: true,
        p_message: true,
        replies: true
      }
    })

    return {
      msg
    };
  });

  fastify.post<{ Body: IMessage, Params: IOneId }>("/m/:id/forward", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate, fastify.current_userId_admin
    ])
  }, async function (request, reply) {
    const { toId } = request.body
    const { id } = request.params

    const original = await prisma.message.findUnique({
      where: {
        id: Number(id)
      }
    })
    if (!original)
      return reply.code(500).send({ message: 'oops! something went wrong!!!!' })

    const msg = await prisma.message.create({
      data: {
        message: original?.message,
        from: {
          connect: {
            // @ts-ignore
            email: request.user.email
          }
        },
        to: {
          connect: {
            id: Number(toId)
          }
        }
      },
      include: {
        from: true,
        to: true,
      }
    });
    return {
      msg
    };
  });

  fastify.post<{ Body: IOneId }>("/delete",
    {
      preHandler: fastify.auth([
        // @ts-ignore
        fastify.authenticate, fastify.current_userId_admin
      ])
    }, async function (request, reply) {
      const { id } = request.body

      const msg = await prisma.message.delete({
        where: {
          id: Number(id)
        },
      })

      return {
        msg
      };
    });
};

export default messagesRoute;
