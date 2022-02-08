import { ISkill, IOneId } from './../../interface';
import { PrismaClient } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";

const prisma = new PrismaClient();
const categoriesRoute: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post<{ Body: ISkill }>("/create", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate, fastify.creator_auth
    ], { run: 'all' })
  }, async function (request, reply) {
    const { name, categoryId, description } = request.body

    const skill = await prisma.skill.create({
      data: {
        description,
        name,
        category: {
          connect: {
            id: Number(categoryId)
          }
        }
      },
      include: {
        category: true
      }
    });
    return {
      skill
    };
  });

  fastify.get("/all", async function (request, reply) {

    const categories = await prisma.skill.findMany({
      include: {
        category: true
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
    const skill = await prisma.skill.findUnique({
      where: {
        id,
      },
      include: {
        category: true
      }
    })

    return {
      skill
    };
  });

  fastify.post<{ Body: ISkill, Params: IOneId }>("/w/:id/update", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate, fastify.creator_auth
    ])
  }, async function (request, reply) {
    const { name, description, categoryId } = request.body
    const { id } = request.params

    const skill = await prisma.skill.update({
      where: {
        id
      },
      data: {
        description,
        name,
        category: {
          connect: {
            id: Number(categoryId)
          }
        }
      }, include: {
        category: true,
      }
    });
    return {
      skill
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

      const skill = await prisma.skill.delete({
        where: {
          id
        },
      })


      return {
        skill
      };
    });
};

export default categoriesRoute;
