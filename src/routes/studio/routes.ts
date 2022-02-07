import { IStudio, IOneId, IReact } from './../../interface';
import { PrismaClient } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";

const prisma = new PrismaClient();
const studiosRoute: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post<{ Body: IStudio }>("/create", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate, fastify.creator_auth,
    ], { run: 'all' })
  }, async function (request, reply) {
    const { name, description } = request.body

    const studio = await prisma.studio.create({
      data: {
        description,
        name,
        creator: {
          connect: {
            // @ts-ignore
            email: request.user.email,
          }
        },
      },
      include: {
        creator: true,
        works: true,
        reactions: true,
        favourites: true,
      }
    });
    return {
      studio
    };
  });

  fastify.get("/all", async function (request, reply) {

    const studios = await prisma.studio.findMany({
      include: {
        creator: true,
        works: true,
        reactions: true,
        favourites: true,
      },
      orderBy: {
        updatedAt: "desc"
      }
    })

    return {
      studios
    };
  });

  fastify.get<{ Params: IOneId }>("/s/:id", async function (request, reply) {
    const { id } = request.params
    const studio = await prisma.studio.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        creator: true,
        works: true,
        reactions: true,
        favourites: true,
      }
    })

    return {
      studio
    };
  });

  fastify.post<{ Body: IStudio, Params: IOneId }>("/s/:id/update", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate, fastify.creator_auth, fastify.current_userId
    ])
  }, async function (request, reply) {
    const { name, description } = request.body
    const { id } = request.params

    const studio = await prisma.studio.update({
      where: {
        id: Number(id)
      },
      data: {
        description,
        name,
      },
      include: {
        creator: true,
        works: true,
        reactions: true,
        favourites: true,
      }
    });
    return {
      studio
    };
  });

  fastify.post<{ Body: IReact, Params: IOneId }>("/s/:id/react", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate
    ])
  }, async function (request, reply) {
    const { type, userId } = request.body
    const { id } = request.params

    const studio = await prisma.studio.update({
      where: {
        id: Number(id)
      },
      data: {
        reactions: {
          create: {
            type,
            user: {
              connect: {
                id: userId
              }
            }
          }
        }
      },
      include: {
        creator: true,
        works: true,
        reactions: true,
        favourites: true,
      }
    });
    return {
      studio
    };
  });

  fastify.post<{ Params: IOneId }>("/s/:id/make-favourite", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate
    ])
  }, async function (request, reply) {
    const { id } = request.params

    const studio = await prisma.studio.update({
      where: {
        id: Number(id)
      },
      data: {
        favourites: {
          create: {
            user: {
              connect: {
                // @ts-ignore
                email: request.user.email
              }
            }
          }
        }
      },
      include: {
        creator: true,
        works: true,
        reactions: true,
        favourites: true,
      }
    });
    return {
      studio
    };
  });

  fastify.post<{ Params: IOneId }>("/delete",
    {
      preHandler: fastify.auth([
        // @ts-ignore
        fastify.authenticate, fastify.current_userId_admin,
      ])
    }, async function (request, reply) {
      const { id } = request.params

      const studio = await prisma.studio.findUnique({
        where: {
          id: Number(id)
        },
        include: {
          creator: true
        }
      })

      if (studio?.creator.id !== id)
        return reply.code(401).send({ msg: " you are not authorised for this" })

      const s = await prisma.studio.delete({
        where: {
          id: Number(id)
        },
      });

      return {
        s
      };
    });
};

export default studiosRoute;
