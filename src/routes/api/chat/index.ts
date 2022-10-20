import { Type } from "@sinclair/typebox";
import { Message, PrismaClient } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";

const prisma = new PrismaClient();
const messagesRoute: FastifyPluginAsync = async (
  fastify,
  opts
): Promise<void> => {
  // all chats
  fastify.get(
    "/get-all",
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
      try {
        const chats = await prisma.chatRoom.findMany({
          where: {
            participants: {
              some: {
                // @ts-ignore
                id: request.user.userId,
              },
            },
          },
        });

        return {
          chats,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // start a Chat
  fastify.post<{ Body: { participant1: string; participant2: string } }>(
    "/start",
    {
      schema: {
        body: Type.Object({
          participant1: Type.String({ format: "uuid" }),
          participant2: Type.String({ format: "uuid" }),
        }),
      },
      preHandler: fastify.auth(
        [
          // @ts-ignore
          fastify.authenticate,
        ],
        { run: "all" }
      ),
    },
    async function (request, reply) {
      const { participant1, participant2 } = request.body;

      try {
        const chat = await prisma.chatRoom.create({
          data: {
            participants: {
              connect: [{ id: participant1 }, { id: participant2 }],
            },
          },
          include: {
            participants: true,
          },
        });

        reply.code(201);
        return {
          chat,
        };
      } catch (error) {
        console.log(error);
        reply.internalServerError();
      }
    }
  );

  // send a message /Chat
  fastify.post<{ Body: Message }>(
    "/msg/send",
    {
      schema: {
        body: Type.Object({
          roomId: Type.String({ format: "uuid" }),
          message: Type.String(),
        }),
      },
      preHandler: fastify.auth(
        [
          // @ts-ignore
          fastify.authenticate,
        ],
        { run: "all" }
      ),
    },
    async function (request, reply) {
      const { message, roomId } = request.body;

      try {
        const chat = await prisma.chatRoom.update({
          where: {
            id: roomId,
          },
          data: {
            messages: {
              create: {
                sender: {
                  connect: {
                    // @ts-ignore
                    id: request.user?.userId,
                  },
                },
                message,
              },
            },
          },
          include: {
            messages: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        });

        return {
          chat,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // reply a message /Chat
  fastify.post<{ Body: Message; Params: { chat: string } }>(
    "/msg/:chat/reply",
    {
      schema: {
        params: {
          chat: Type.String({ format: "uuid" }),
        },
        body: Type.Object({
          message: Type.String(),
        }),
      },
      preHandler: fastify.auth(
        [
          // @ts-ignore
          fastify.authenticate,
        ],
        { run: "all" }
      ),
    },
    async function (request, reply) {
      const { chat } = request.params;
      const { message } = request.body;
      try {
        const chatInDb = await prisma.message.findUnique({
          where: {
            id: chat,
          },
          include: {
            room: {
              include: {
                participants: true,
              },
            },
            p_message: true,
          },
        });

        const isParticipant = chatInDb?.room.participants.find(
          // @ts-ignore
          (o) => o.id === request.user.userId
        );

        if (!isParticipant) return reply.unauthorized();

        const chatReply = await prisma.chatRoom.update({
          where: {
            id: chatInDb?.roomId,
          },
          data: {
            messages: {
              create: {
                sender: {
                  connect: {
                    // @ts-ignore
                    id: request.user?.userId,
                  },
                },
                message,
                p_message: {
                  connect: {
                    id: chat,
                  },
                },
              },
            },
          },
          include: {
            messages: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        });

        return {
          chat: chatReply,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // forward a chat message
  fastify.post<{ Body: { room: string }; Params: { chat: string } }>(
    "/msg/:chat/forward",
    {
      schema: {
        params: Type.Object({
          chat: Type.String({ format: "uuid" }),
        }),
        body: Type.Object({
          room: Type.String({ format: "uuid" }),
        }),
      },
      preHandler: fastify.auth([
        // @ts-ignore
        fastify.authenticate,
      ]),
    },
    async function (request, reply) {
      const { room } = request.body;
      const { chat } = request.params;

      try {
        const originalMessage = await prisma.message.findUnique({
          where: {
            id: chat,
          },
          include: {
            room: {
              include: {
                participants: true,
              },
            },
          },
        });

        const isParticipant = originalMessage?.room.participants.find(
          // @ts-ignore
          (o) => o.id === request.user?.userId
        );

        if (!isParticipant || !originalMessage) return reply.unauthorized();

        await prisma.chatRoom.update({
          where: { id: room },
          data: {
            messages: {
              create: {
                message: originalMessage?.message,
                sender: {
                  connect: {
                    // @ts-ignore
                    id: request.user.userId,
                  },
                },
              },
            },
          },
        });
        return {
          message: "successfull",
        };
      } catch (error) {
        console.log();
        return reply.internalServerError();
      }
    }
  );

  fastify.post<{ Body: { id: string } }>(
    "/msg/delete",
    {
      preHandler: fastify.auth([
        // @ts-ignore
        fastify.authenticate,
      ]),
    },
    async function (request, reply) {
      const { id } = request.body;

      const chatInDb = await prisma.message.findUnique({
        where: {
          id,
        },
        include: {
          room: {
            include: {
              participants: true,
            },
          },
        },
      });

      const isParticipant =
        // @ts-ignore
        chatInDb?.room.participants.find((o) => o.id === request.user?.userId);

      if (!isParticipant) return reply.unauthorized();

      const chat = await prisma.message.delete({
        where: {
          id,
        },
      });

      return {
        chat,
      };
    }
  );

  // get a chat messages
  fastify.get<{ Params: { chat: string } }>(
    "/:chat",
    {
      schema: {
        params: Type.Object({
          chat: Type.String({ format: "uuid" }),
        }),
      },
      preHandler: fastify.auth(
        [
          // @ts-ignore
          fastify.authenticate,
        ],
        { run: "all" }
      ),
    },
    async function (request, reply) {
      const { chat } = request.params;
      try {
        const chatInDb = await prisma.chatRoom.findUnique({
          where: {
            id: chat,
          },
          include: {
            participants: true,
            messages: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        });

        const isParticipant =
          // @ts-ignore
          chatInDb?.participants.find((o) => o.id === request.user?.userId);

        if (!isParticipant) return reply.unauthorized();

        return {
          chat: chatInDb,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );
};

export default messagesRoute;
