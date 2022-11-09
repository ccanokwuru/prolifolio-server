import { Type } from "@sinclair/typebox";
import { Message, PrismaClient, Profile } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";
import { EventEmitter } from "stream";

const emitter = new EventEmitter();

interface WSSEVENT {
  action: "join" | "new" | "delete" | "forward" | "new_room" | "disconnected";
  room?: string;
  participants?: Profile[];
  user?: Profile;
  message?: Message;
}

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

      const send = (data: WSSEVENT) => {
        // @ts-ignore
        if (data.participants?.find((e) => e.id === request.user.userId))
          wss.send(JSON.stringify({ ...data, meta: "update" }));
      };

      try {
        const chatRooms = await prisma.chatRoom.findMany({
          where: {
            participants: {
              some: {
                // @ts-ignore
                id: request.user.userId,
              },
            },
          },
        });
        wss.send(
          JSON.stringify({
            meta: "all_chats",
            chatRooms,
          })
        );

        emitter.on("user_join", send);
        emitter.on("new_message", send);
        emitter.on("deleted_message", send);
        emitter.on("user_join", send);

        // @ts-ignore
        wsServer.clients?.forEach((client) => {
          if (client !== wss && client.readyState === 3) {
            const data: WSSEVENT = {
              action: "disconnected",
            };
            client.send(JSON.stringify(data));
          }
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
        emitter.emit("new_room", {
          action: "new_room",
          room: chat.id,
          participants: chat?.participants,
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

      // const sendToAll = (data: WSSEVENT) => {
      //   // @ts-ignore
      //   wsServer.clients?.forEach((client) => {
      //     if (client.readyState === 1) client.send(JSON.stringify({ data }));
      //   });
      // };

      const broadcast = (data: any) => {
        // @ts-ignore
        wsServer.clients?.forEach((client) => {
          if (client.readyState === 1) client.send(JSON.stringify({ data }));
        });
      };

      const send = (data: any) => {
        wss.send(JSON.stringify({ data }));
      };

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

            emitter.emit("user_join", {
              action: "join",
              room,
              participants: conversation?.participants,
              user: await prisma.profile.findFirst({
                // @ts-ignore
                where: { userId: request.user.userId },
              }),
            });
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
                  action: "new",
                  room,
                  participants: conversation?.participants,
                  user: await prisma.profile.findFirst({
                    // @ts-ignore
                    where: { userId: request.user.userId },
                  }),
                  message: recent,
                },
              });
              emitter.emit("new_message", {
                action: "new",
                room,
                participants: conversation?.participants,
                user: await prisma.profile.findFirst({
                  // @ts-ignore
                  where: { userId: request.user.userId },
                }),
                message: recent,
              });
            } else if (data.type === "delete") {
              const message = await prisma.message.findFirst({
                where: {
                  id: data.messageId,
                  room: {
                    participants: {
                      some: {
                        // @ts-ignore
                        id: request.user.userId,
                      },
                    },
                  },
                },
              });
              if (message)
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
                payload: {
                  action: "delete",
                  room,
                  participants: conversation?.participants,
                  user: await prisma.profile.findFirst({
                    // @ts-ignore
                    where: { userId: request.user.userId },
                  }),
                  message,
                },
              });

              // emitter.emit("deleted_message", {
              //   action: "delete",
              //   room,
              //   participants: conversation?.participants,
              //   user: await prisma.profile.findFirst({
              //     // @ts-ignore
              //     where: { userId: request.user.userId },
              //   }),
              //   message,
              // });
            } else if (data.type === "forward") {
              const originalMessage = await prisma.message.findFirst({
                where: {
                  id: data.meassageId,
                  room: {
                    participants: {
                      some: {
                        // @ts-ignore
                        id: request.user.userId,
                      },
                    },
                  },
                },
              });

              if (originalMessage) {
                const chats = await prisma.chatRoom.update({
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
                  include: {
                    messages: true,
                  },
                });

                const recent = chats?.messages[chats?.messages.length - 1];
                send({
                  meta: "forward",
                  payload: {
                    action: "forward",
                    room,
                    to: data.forwardTo,
                    message: recent,
                    participants: conversation?.participants,
                    user: await prisma.profile.findFirst({
                      // @ts-ignore
                      where: { userId: request.user.userId },
                    }),
                  },
                });

                emitter.emit("new_message", {
                  action: "new",
                  room,
                  participants: conversation?.participants,
                  user: await prisma.profile.findFirst({
                    // @ts-ignore
                    where: { userId: request.user.userId },
                  }),
                  message: recent,
                });
              }
            }
          }
        } catch (error) {
          console.log(error);
        }
      });

      // @ts-ignore
      wsServer.clients?.forEach((client) => {
        if (client !== wss && client.readyState === 3)
          client.send("disconnected");
      });
    }
  );
};

export default messagesRoute;
