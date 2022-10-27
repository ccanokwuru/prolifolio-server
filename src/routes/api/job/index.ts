import { APPLICATION, JobApplication, PrismaClient } from "@prisma/client";
import { Type } from "@sinclair/typebox";
import { FastifyPluginAsync } from "fastify";
import { JobI } from "../../../types";
import { PAGINATION_ITEMS } from "../../../utils/paginationHelper";
const prisma = new PrismaClient();

const jobRoute: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // get all jobs
  fastify.get<{ Querystring: { page?: number } }>(
    "/get-all",
    {
      schema: {
        querystring: Type.Optional(
          Type.Object({
            page: Type.Optional(Type.Number({ default: 1 })),
          })
        ),
      },
    },
    async function (request, reply) {
      try {
        const count = await prisma.job.count();
        const { page } = request.query;
        const skip = page ? Number(page - 1) * PAGINATION_ITEMS : 0;

        const jobs = await prisma.job.findMany({
          skip,
          take: PAGINATION_ITEMS,
          include: {
            category: true,
            _count: {
              select: {
                applications: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        return {
          jobs,
          total: count,
          pages: count / PAGINATION_ITEMS,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get all jobs by category
  fastify.get<{ Querystring: { page?: number }; Params: { category: string } }>(
    "/get-all/c/:category",
    {
      schema: {
        querystring: Type.Optional(
          Type.Object({
            page: Type.Optional(Type.Number({ default: 1 })),
          })
        ),
        params: Type.Optional(
          Type.Object({
            category: Type.Optional(Type.String({ format: "uuid" })),
          })
        ),
      },
    },
    async function (request, reply) {
      const { page } = request.query;
      const { category } = request.params;
      try {
        const count = await prisma.job.count({
          where: {
            categoryId: category,
          },
        });

        const skip = page ? Number(page - 1) * PAGINATION_ITEMS : 0;

        const jobs = await prisma.job.findMany({
          skip,
          take: PAGINATION_ITEMS,
          where: {
            categoryId: category,
          },
          include: {
            category: true,
            _count: {
              select: {
                applications: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        return {
          jobs,
          total: count,
          pages: count / PAGINATION_ITEMS,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get all jobs by category
  // fastify.get<{ Querystring: { page?: number }; Params: { category: string } }>(
  //   "/get-all/c/:category",
  //   {
  //     schema: {
  //       querystring: Type.Optional(
  //         Type.Object({
  //           page: Type.Optional(Type.Number({ default: 1 })),
  //         })
  //       ),
  //       params: Type.Optional(
  //         Type.Object({
  //           category: Type.Optional(
  //             Type.String({ minLength: 2, maxLength: 200 })
  //           ),
  //         })
  //       ),
  //     },
  //   },
  //   async function (request, reply) {
  //     const { page } = request.query;
  //     const { category } = request.params;
  //     try {
  //       const count = await prisma.job.count({
  //         where: {
  //           category: {
  //             name: category,
  //           },
  //         },
  //       });

  //       const skip = page ? Number(page - 1) * PAGINATION_ITEMS : 0;

  //       const jobs = await prisma.job.findMany({
  //         skip,
  //         take: PAGINATION_ITEMS,
  //         where: {
  //           category: {
  //             name: category,
  //           },
  //         },
  //         include: {
  //           category: true,
  //           _count: {
  //             select: {
  //               applications: true,
  //             },
  //           },
  //         },
  //         orderBy: {
  //           createdAt: "asc",
  //         },
  //       });

  //       return {
  //         jobs,
  //         total: count,
  //         pages: count / PAGINATION_ITEMS,
  //       };
  //     } catch (error) {
  //       console.log(error);
  //       return reply.internalServerError();
  //     }
  //   }
  // );

  // add a job
  fastify.post<{ Body: JobI }>(
    "/post-job",
    {
      schema: {
        body: Type.Object({
          title: Type.String({ minLength: 2, maxLength: 200 }),
          categoryId: Type.Optional(Type.String({ format: "uuid" })),
          description: Type.String({ minLength: 2 }),
          budget: Type.Object({
            start: Type.Number(),
            end: Type.Number(),
            currency: Type.String({ minLength: 3, maxLength: 10 }),
          }),
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
      const { title, categoryId, description, budget } = request.body;

      try {
        const job = await prisma.job.create({
          data: {
            // @ts-ignore
            ownerId: request.user.userId,
            title,
            description,
            categoryId,
            budget,
          },
          include: {
            owner: true,
          },
        });

        return reply.code(201).send({
          message: "successful",
          job,
        });
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // edit a job
  fastify.post<{ Body: JobI; Params: { job: string } }>(
    "/:job/edit-job",
    {
      schema: {
        params: Type.Object({
          job: Type.String({ format: "uuid" }),
        }),
        body: Type.Object({
          title: Type.String({ minLength: 2, maxLength: 200 }),
          categoryId: Type.Optional(Type.String({ format: "uuid" })),
          description: Type.String({ minLength: 2 }),
          budget: Type.Object({
            start: Type.Number(),
            end: Type.Number(),
            currency: Type.String({ minLength: 3, maxLength: 10 }),
          }),
        }),
      },
      preHandler: fastify.auth(
        [
          // @ts-ignore
          fastify.authenticate,
          // @ts-ignore
          fastify.is_artist_admin,
        ],
        { run: "all" }
      ),
    },
    async function (request, reply) {
      const { title, categoryId, description, budget } = request.body;

      const { job } = request.params;

      // check if skill already exit under the same category connect or create skill
      try {
        const jobInDb = await prisma.job.findFirst({
          where: {
            id: job,
          },
        });

        if (
          // @ts-ignore
          jobInDb?.ownerId !== request.user.userId &&
          // @ts-ignore
          request.user.role !== "admin"
        )
          return reply.unauthorized();

        const jobUpdate = await prisma.job.update({
          where: {
            id: job,
          },
          data: {
            title,
            description,
            categoryId,
            budget,
          },
          include: {
            owner: true,
          },
        });

        return {
          message: "successful",
          job: jobUpdate,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // delete job
  fastify.delete<{ Body: { id: string } }>(
    "/delete",
    {
      schema: {
        body: Type.Object({
          id: Type.String({ format: "uuid" }),
        }),
      },
      preHandler: fastify.auth(
        [
          // @ts-ignore
          fastify.authenticate,
          // @ts-ignore
          fastify.is_artist_admin,
        ],
        { run: "all" }
      ),
    },
    async function (request, reply) {
      const { id } = request.body;

      try {
        const jobInDb = await prisma.job.findFirst({
          where: {
            id,
          },
        });

        if (
          // @ts-ignore
          jobInDb?.artist.profileId !== request.user.userId &&
          // @ts-ignore
          request.user.role !== "admin"
        )
          return reply.unauthorized();

        await prisma.job.delete({
          where: { id },
        });
        return {
          message: "successful",
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // apply for a job
  fastify.post<{ Params: { job: string }; Body: JobApplication }>(
    "/:job/apply",
    {
      schema: {
        params: Type.Object({
          job: Type.String({ format: "uuid" }),
        }),
        body: Type.Object({
          cover: Type.Optional(Type.String({ minLength: 2 })),
        }),
      },
      preHandler: fastify.auth(
        [
          // @ts-ignore
          fastify.authenticate,
          // @ts-ignore
          fastify.is_artist_admin,
        ],
        { run: "all" }
      ),
    },
    async function (request, reply) {
      const { job } = request.params;
      const { cover } = request.body;
      try {
        const application = await prisma.jobApplication.create({
          data: {
            cover,
            job: {
              connect: {
                id: job,
              },
            },
            artist: {
              connect: {
                // @ts-ignore
                profileId: request.user.userId,
              },
            },
          },
          include: {
            job: {
              include: {
                _count: {
                  select: {
                    applications: true,
                  },
                },
              },
            },
          },
        });

        return {
          application,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get all applications for a job
  fastify.get<{ Params: { job: string }; Querystring: { page?: number } }>(
    "/:job/applications",
    {
      schema: {
        params: Type.Object({
          job: Type.String({ format: "uuid" }),
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
      const { job } = request.params;
      const { page } = request.query;
      try {
        const count = await prisma.jobApplication.count({
          where: {
            jobId: job,
            job: {
              // @ts-ignore
              ownerId: request.user.userId,
            },
          },
        });
        const skip = page ? Number(page - 1) * PAGINATION_ITEMS : 0;

        const applications = await prisma.jobApplication.findMany({
          skip,
          take: PAGINATION_ITEMS,
          where: {
            jobId: job,
            job: {
              // @ts-ignore
              ownerId: request.user.userId,
            },
          },
        });

        return {
          applications,
          total: count,
          pages: count / PAGINATION_ITEMS,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get a single application for a job
  fastify.get<{
    Params: { application: string };
    Body: { status: APPLICATION };
  }>(
    "/application/:application",
    {
      schema: {
        params: Type.Object({
          application: Type.String({ format: "uuid" }),
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
      const { application } = request.params;
      try {
        const applicationData = await prisma.jobApplication.findFirst({
          where: {
            id: application,
            OR: [
              {
                job: {
                  // @ts-ignore
                  ownerId: request.user.userId,
                },
              },
              {
                artist: {
                  // @ts-ignore
                  profileId: request.user.userId,
                },
              },
            ],
          },
        });

        return {
          application: applicationData,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // update status application for a job
  fastify.put<{
    Params: { application: string };
    Body: { status: APPLICATION };
  }>(
    "/application/:application/update-status",
    {
      schema: {
        params: Type.Object({
          application: Type.String({ format: "uuid" }),
        }),
        body: Type.Enum(APPLICATION),
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
      const { application } = request.params;
      const { status } = request.body;
      try {
        const applicationData = await prisma.jobApplication.findFirst({
          where: {
            id: application,
            job: {
              // @ts-ignore
              ownerId: request.user.userId,
            },
          },
        });
        if (!applicationData) return reply.unauthorized();

        const applicationUpdate = await prisma.jobApplication.update({
          where: {
            id: application,
          },
          data: {
            status,
          },
        });

        return {
          application: applicationUpdate,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get a job
  fastify.get<{ Params: { job: string } }>(
    "/:job",
    {
      schema: {
        params: Type.Object({
          job: Type.String({ format: "uuid" }),
        }),
      },
    },
    async function (request, reply) {
      try {
        const job = await prisma.job.findUnique({
          where: { id: request.params.job },
          include: {
            owner: true,
            applications: true,
            category: true,
            _count: { select: { applications: true } },
          },
        });

        return {
          ...job,
          applications:
            // @ts-ignore
            request.user.userId === job?.ownerId
              ? job?.applications
              : undefined,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );
};

export default jobRoute;
