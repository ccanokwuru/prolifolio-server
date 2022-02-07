import { IOneId, ISkill } from './../../interface';
import { PrismaClient } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";

const prisma = new PrismaClient();
const categoriesRoute: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post("/create", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate,
    ], { run: 'all' })
  }, async function (request, reply) {

    const creator = await prisma.creator.create({
      data: {
        user: {
          connect: {
            // @ts-ignore
            email: request.user.email
          }
        }
      },
      include: {
        user: true,
        works: true,
        studio: true,
        skills: true,
        favourites: true,
        reactions: true,
      }
    });
    return {
      creator
    };
  });

  fastify.get("/all", async function (request, reply) {

    const categories = await prisma.creator.findMany({
      include: {
        user: true,
        works: true,
        studio: true,
        skills: true,
        favourites: true,
        reactions: true,
      },
      orderBy: {
        updatedAt: "desc"
      }
    })

    return {
      categories
    };
  });

  fastify.get<{ Params: IOneId }>("/w/:id", async function (request, reply) {
    const { id } = request.params
    const creator = await prisma.creator.findUnique({
      where: {
        id,
      },
      include: {
        user: true,
        works: true,
        studio: true,
        skills: true,
        favourites: true,
        reactions: true,
      }
    })

    return {
      creator
    };
  });

  fastify.post<{ Body: { skill: ISkill, skillId: number }, Params: IOneId }>("/w/:id/add_skills", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate, fastify.creator_auth
    ])
  }, async function (request, reply) {
    const { skill, skillId } = request.body
    const { id } = request.params

    const creator = await prisma.creator.update({
      where: {
        id: Number(id)
      },
      data: {
        skills: {
          connectOrCreate: {
            create: {
              ...skill
            },
            where: {
              id: skillId
            }
          }

        }
      },
      include: {
        user: true,
        works: true,
        studio: true,
        skills: true,
        favourites: true,
        reactions: true,
      }
    });
    return {
      creator
    };
  });

  fastify.post<{ Body: IOneId, Params: IOneId }>("/w/:id/job_apply", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate, fastify.creator_auth
    ])
  }, async function (request, reply) {
    const jobId = request.body.id
    const { id } = request.params

    const creator = await prisma.creator.update({
      where: {
        id: Number(id)
      },
      data: {
        jobs: {
          connect: {
            id: Number(jobId)
          }
        }
      },
      include: {
        user: true,
        works: true,
        studio: true,
        skills: true,
        favourites: true,
        reactions: true,
      }
    });
    return {
      creator
    };
  });

  fastify.post<{ Params: IOneId }>("/delete",
    {
      preHandler: fastify.auth([
        // @ts-ignore
        fastify.authenticate, fastify.admin_auth
      ])
    }, async function (request, reply) {
      const { id } = request.params

      const creator = await prisma.creator.delete({
        where: {
          id
        },
      })


      return {
        creator
      };
    });
};

export default categoriesRoute;
