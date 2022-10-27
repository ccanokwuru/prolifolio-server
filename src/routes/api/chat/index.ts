import { Type } from "@sinclair/typebox";
import { PrismaClient } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";
import { EventEmitter } from "stream";

const emitter = new EventEmitter();

const prisma = new PrismaClient();
const messagesRoute: FastifyPluginAsync = async (
  fastify,
  opts
): Promise<void> => {
  // all chats
  fastify.get(
    "/",
    {
      websocket: true,
      preHandler: fastify.auth(
        [
          // @ts-ignore
          fastify.authenticate,
        ],
        { run: "all" }
      ),
    },
    async function (connection, request) {
      const wss = connection.socket;
      const wsServer = this.websocketServer;

      try {
        wsServer.on("connection", async () => {
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

          wss.send({ chats });
        });

        // @ts-ignore
        wsServer.clients?.forEach((client) => {
          if (client !== wss && client.readyState === 3)
            client.broadcast("disconnected");
        });
      } catch (error) {
        console.log(error);
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

  fastify.get<{ Params: { room: string } }>(
    "/c/:room",
    {
      websocket: true,
      schema: {
        params: Type.Object({
          room: Type.String({ format: "uuid" }),
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
    async function (connection, request) {
      const { room } = request.params;
      const wss = connection.socket;
      const wsServer = this.websocketServer;

      const broadcast = (data: any) =>
        // @ts-ignore
        wsServer.clients?.forEach((client) => {
          if (client.readyState === 1) client.send(JSON.stringify({ data }));
        });

      const send = (data: any) => wss.send(JSON.stringify({ data }));

      wss.on("message", async (m: string) => {
        const dataString = m.toString();
        const { meta, payload } = JSON.parse(dataString);
        const data =
          typeof payload === "string" && JSON.parse(payload)
            ? JSON.parse(payload)
            : payload;

        try {
          const conversation = await prisma.chatRoom.findUnique({
            where: {
              id: room,
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
            messages?.participants.find((o) => o.id === request.user?.userId);

          if (meta === "join" && isParticipant) {
            send({
              meta: "all",
              payload: { conversation },
            });

            // @ts-ignore
            emitter.emit("user_join", { room, userId: request.user.userId });
          } else if (isParticipant && meta === "message") {
            if (data.type === "new" || data.type === "reply") {
              const chats =
                data.type === "new"
                  ? await prisma.chatRoom.update({
                      where: {
                        id: room,
                      },
                      data: {
                        messages: {
                          create: {
                            // @ts-ignore
                            senderId: request.user?.userId,
                            message: data.message,
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
                    })
                  : data.type === "reply"
                  ? await prisma.chatRoom.update({
                      where: {
                        id: room,
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
                            message: data.message,
                            p_message: {
                              connect: {
                                id: data.replyTo,
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
                    })
                  : undefined;

              const recent = chats?.messages[chats?.messages.length - 1];
              broadcast({
                meta: "new",
                payload: {
                  message: recent,
                },
              });
              emitter.emit("new_message", {
                room,
                message: recent,
              });
            } else if (data.type === "delete") {
              await prisma.chatRoom.update({
                where: {
                  id: room,
                },
                data: {
                  messages: {
                    delete: {
                      id: data.messageId,
                    },
                  },
                },
              });
              broadcast({
                meta: "delete",
                payload: { messageId: data.messageId },
              });
              emitter.emit("deleted_message", {
                room,
                // @ts-ignore
                userId: request.user.userId,
                messageId: data.messageId,
              });
            } else if (data.type === "forward") {
              const originalMessage = await prisma.message.findUnique({
                where: {
                  id: data.meassageId,
                },
              });

              if (originalMessage)
                await prisma.chatRoom.update({
                  where: { id: data.forwardTo },
                  data: {
                    messages: {
                      create: {
                        message: originalMessage.message,
                        // @ts-ignore
                        senderId: request.user.userId,
                      },
                    },
                  },
                });
              wss.send({
                meta: "forward",
                payload: {
                  to: originalMessage?.roomId,
                  message: originalMessage?.message,
                },
              });

              emitter.emit("new_message", {
                room: data.forwardTo,
                messageId: data.messageId,
              });
            }
          }
        } catch (error) {
          console.log(error);
        }
      });

      // @ts-ignore
      wsServer.clients?.forEach((client) => {
        if (client !== wss && client.readyState === 3)
          client.broadcast("disconnected");
      });
    }
  );
};

export default messagesRoute;
