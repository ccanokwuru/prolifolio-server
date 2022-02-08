import { IJob, IOneId } from './../../interface';
import { PrismaClient } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";

const prisma = new PrismaClient();
const jobsRoute: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post<{ Body: IJob }>("/create", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate,
    ], { run: 'all' })
  }, async function (request, reply) {
    const { title, description, categoryId } = request.body

    const job = await prisma.job.create({
      data: {
        description,
        title,
        owner: {
          connect: {
            // @ts-ignore
            email: request.user.email
          }
        },
        category: {
          connect: {
            id: Number(categoryId)
          }
        }
      },
      include: {
        owner: true,
        applicants: true,
        category: true,
      }
    });
    return {
      job
    };
  });

  fastify.get("/all", async function (request, reply) {

    const jobs = await prisma.job.findMany({
      include: {
        owner: true,
        applicants: true,
        category: true,
      },
      orderBy: {
        updatedAt: "desc"
      }
    })

    return {
      jobs
    };
  });

  fastify.get<{ Params: IOneId }>("/j/:id", async function (request, reply) {
    const { id } = request.params
    const job = await prisma.job.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        owner: true,
        applicants: true,
        category: true,
      }
    })

    return {
      job
    };
  });

  fastify.post<{ Body: IJob, Params: IOneId }>("/j/:id/update", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate, fastify.current_userId,
    ])
  }, async function (request, reply) {
    const { title, description, categoryId } = request.body
    const { id } = request.params

    const job = await prisma.job.update({
      where: {
        id: Number(id)
      },
      data: {
        description,
        title,
        category: {
          connect: {
            id: Number(categoryId)
          }
        },
      },
      include: {
        owner: true,
        applicants: true,
        category: true,
      }
    });
    return {
      job
    };
  });

  fastify.post<{ Params: IOneId }>("/delete",
    {
      preHandler: fastify.auth([
        // @ts-ignore
        fastify.authenticate, fastify.current_userId_admin
      ])
    }, async function (request, reply) {
      const { id } = request.params

      const job = await prisma.job.delete({
        where: {
          id: Number(id)
        },
      })

      return {
        job
      };
    });
};

export default jobsRoute;
