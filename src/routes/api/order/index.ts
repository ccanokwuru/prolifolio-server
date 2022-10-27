import { ORDER, PrismaClient, ROLE } from "@prisma/client";
import { Type } from "@sinclair/typebox";
import { FastifyPluginAsync } from "fastify";
const prisma = new PrismaClient();

const orderRoute: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // update order status
  fastify.put<{ Params: { order: string }; Body: { status: ORDER } }>(
    "/:order/update-status",
    {
      schema: {
        params: Type.Object({
          order: Type.Optional(Type.String({ format: "uuid" })),
        }),
        body: Type.Object({
          status: Type.Enum(ORDER),
        }),
      },
      preHandler: fastify.auth([
        // @ts-ignore
        fastify.authenticate,
      ]),
    },
    async function (request, reply) {
      try {
        const { order } = request.params;
        const { status } = request.body;

        const orderInDb = await prisma.order.findFirst({
          where: {
            id: order,
            OR: [
              {
                // @ts-ignore
                userId: request.user.userId,
              },
              {
                work: {
                  // @ts-ignore
                  artistId: request.user.userId,
                },
              },
            ],
          },
        });

        // @ts-ignore
        if (!orderInDb && request.user.role !== ROLE.admin)
          return reply.unauthorized();

        if (
          // @ts-ignore
          request.user.role === ROLE.user &&
          status !== ORDER.cancelled &&
          status !== ORDER.delivered
        )
          return reply.unauthorized(
            `allowed updates are cancelled and delivered`
          );

        if (
          // @ts-ignore
          request.user.role === ROLE.artist &&
          status === ORDER.cancelled
        )
          return reply.unauthorized(`you can not cancel an order`);

        // @ts-ignore
        if (status === ORDER.paid && request.user.role !== ROLE.admin)
          return reply.badRequest();

        if (status === ORDER.pending) return reply.badRequest();

        if (
          // @ts-ignore
          request.user.role === ROLE.artist &&
          orderInDb?.status === ORDER.pending &&
          status !== ORDER.accepted &&
          status !== ORDER.declined
        )
          return reply.badRequest();

        if (
          // @ts-ignore
          request.user.role === ROLE.artist &&
          orderInDb?.status === ORDER.paid &&
          status !== ORDER.pending_delivery
        )
          return reply.badRequest();

        if (
          // @ts-ignore
          request.user.role === ROLE.artist &&
          orderInDb?.status === ORDER.pending_delivery &&
          status !== ORDER.delivered
        )
          return reply.badRequest();

        if (orderInDb?.status === ORDER.delivered)
          return { message: "order already completed" };

        const orderUpdate = await prisma.order.update({
          where: {
            id: order,
          },
          data: {
            status,
          },
          include: {
            work: {
              select: {
                id: true,
                title: true,
                files: true,
                reviews: {
                  select: {
                    rating: true,
                  },
                },
              },
            },
          },
        });
        const rating = orderUpdate?.work?.reviews.map((r) => r.rating);

        return {
          order: {
            ...orderUpdate,
            rating,
          },
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get one order
  fastify.get<{ Params: { order: string } }>(
    "/:order",
    {
      schema: {
        params: Type.Object({
          order: Type.Optional(Type.String({ format: "uuid" })),
        }),
      },
      preHandler: fastify.auth([
        // @ts-ignore
        fastify.authenticate,
      ]),
    },
    async function (request, reply) {
      try {
        const { order } = request.params;

        const orderInDb = await prisma.order.findFirst({
          where: {
            id: order,
            OR: [
              {
                // @ts-ignore
                userId: request.user.userId,
              },
              {
                work: {
                  // @ts-ignore
                  artistId: request.user.userId,
                },
              },
            ],
          },
          include: {
            work: {
              select: {
                id: true,
                title: true,
                files: true,
                reviews: {
                  select: {
                    rating: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        });
        const rating = orderInDb?.work?.reviews.map((r) => r.rating);

        return {
          order: {
            ...orderInDb,
            rating,
          },
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );
};

export default orderRoute;
