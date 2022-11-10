import { Bidding, Comment, PrismaClient, Review, SELLAS } from "@prisma/client";
import { Type } from "@sinclair/typebox";
import { FastifyPluginAsync } from "fastify";
import { WorkI } from "../../../types";
import average from "../../../utils/average";
import { PAGINATION_ITEMS } from "../../../utils/paginationHelper";
const prisma = new PrismaClient();

const workRoute: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // get all works
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
        const count = await prisma.work.count();
        const { page } = request.query;
        const skip = page ? Number(page - 1) * PAGINATION_ITEMS : 0;

        const works = await prisma.work.findMany({
          skip,
          take: PAGINATION_ITEMS,
          include: {
            skills: {
              select: {
                id: true,
                name: true,
                categoryId: true,
              },
            },
            artist: {
              select: {
                profile: {
                  select: {
                    display_name: true,
                    id: true,
                  },
                },
                _count: {
                  select: {
                    skills: true,
                    works: true,
                  },
                },
              },
            },

            reviews: true,
            _count: {
              select: {
                biddings: true,
                views: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        const worksWithRating = works.map((e) => {
          const rating = e.reviews.map((r) => r.rating);
          return {
            ...e,
            rating: average(rating),
          };
        });

        return {
          works: worksWithRating,
          total: count,
          pages: Math.ceil(count / PAGINATION_ITEMS),
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get all works and group category
  fastify.get<{ Querystring: { page?: number } }>(
    "/get-all/grouped",
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
        const works = await prisma.category.findMany({
          where: {
            parentId: null,
          },
          include: {
            categories: true,
            works: {
              include: {
                skills: {
                  select: {
                    id: true,
                    name: true,
                    categoryId: true,
                  },
                },
                artist: {
                  select: {
                    profile: {
                      select: {
                        display_name: true,
                        id: true,
                      },
                    },
                    _count: {
                      select: {
                        skills: true,
                        works: true,
                      },
                    },
                  },
                },

                reviews: true,
                _count: {
                  select: {
                    biddings: true,
                    views: true,
                  },
                },
              },
            },
          },
        });

        const worksWithRating = works.map((category) => {
          return {
            ...category,
            works: category.works.map((e) => {
              const rating = e.reviews.map((r) => r.rating);
              return {
                ...e,
                rating: average(rating),
              };
            }),
          };
        });

        return worksWithRating;
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get all works by skill
  fastify.get<{ Querystring: { page?: number }; Params: { skill: string } }>(
    "/get-all/s/:skill",
    {
      schema: {
        querystring: Type.Optional(
          Type.Object({
            page: Type.Optional(Type.Number({ default: 1 })),
          })
        ),
        params: Type.Optional(
          Type.Object({
            skill: Type.Optional(Type.String({ format: "uuid" })),
          })
        ),
      },
    },
    async function (request, reply) {
      const { page } = request.query;
      const { skill } = request.params;
      try {
        const count = await prisma.work.count({
          where: {
            skills: {
              some: {
                id: skill,
              },
            },
          },
        });
        const skip = page ? Number(page - 1) * PAGINATION_ITEMS : 0;

        const works = await prisma.work.findMany({
          skip,
          take: PAGINATION_ITEMS,
          where: {
            skills: {
              some: {
                id: skill,
              },
            },
          },
          include: {
            skills: {
              select: {
                id: true,
                name: true,
                categoryId: true,
              },
            },
            artist: {
              select: {
                profile: {
                  select: {
                    display_name: true,
                    id: true,
                  },
                },
                _count: {
                  select: {
                    skills: true,
                    works: true,
                  },
                },
              },
            },

            reviews: true,
            _count: {
              select: {
                biddings: true,
                views: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        const worksWithRating = works.map((e) => {
          const rating = e.reviews.map((r) => r.rating);
          return {
            ...e,
            rating: average(rating),
          };
        });

        return {
          works: worksWithRating,
          total: count,
          pages: Math.ceil(count / PAGINATION_ITEMS),
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get all works by category
  fastify.post<{ Querystring: { page?: number }; Body: { category: string } }>(
    "/get-all/c",
    {
      schema: {
        querystring: Type.Optional(
          Type.Object({
            page: Type.Optional(Type.Number({ default: 1 })),
          })
        ),
        body: Type.Optional(
          Type.Object({
            category: Type.Optional(
              Type.String({ minLength: 2, maxLength: 200 })
            ),
          })
        ),
      },
    },
    async function (request, reply) {
      const { page } = request.query;
      const { category } = request.body;
      console.log({ category });
      try {
        const count = await prisma.work.count({
          where: {
            OR: [
              {
                category: {
                  name: {
                    contains: category,
                    mode: "insensitive",
                  },
                },
              },
              {
                category: {
                  name: {
                    equals: category,
                    mode: "insensitive",
                  },
                },
              },
            ],
          },
        });
        const skip = page ? Number(page - 1) * PAGINATION_ITEMS : 0;

        const works = await prisma.work.findMany({
          skip,
          take: PAGINATION_ITEMS,
          where: {
            category: {
              name: {
                contains: category,
                mode: "insensitive",
              },
            },
          },
          include: {
            skills: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
            artist: {
              select: {
                profile: {
                  select: {
                    display_name: true,
                    id: true,
                  },
                },
                _count: {
                  select: {
                    skills: true,
                    works: true,
                  },
                },
              },
            },

            reviews: true,
            _count: {
              select: {
                biddings: true,
                views: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        const cat = await prisma.category.findUnique({
          where: {
            name: category,
          },
        });

        const worksWithRating = works.map((e) => {
          const rating = e.reviews.map((r) => r.rating);
          return {
            ...e,
            rating: average(rating),
          };
        });

        return {
          ...cat,
          works: worksWithRating,
          total: count,
          pages: Math.ceil(count / PAGINATION_ITEMS),
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get all works by category
  fastify.get<{ Querystring: { page?: number }; Params: { category: string } }>(
    "/get-all/cid/:category",
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
      console.log({ category });
      try {
        const count = await prisma.work.count({
          where: {
            categoryId: category,
          },
        });
        const skip = page ? Number(page - 1) * PAGINATION_ITEMS : 0;

        const works = await prisma.work.findMany({
          skip,
          take: PAGINATION_ITEMS,
          where: {
            categoryId: category,
          },
          include: {
            skills: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
            artist: {
              select: {
                profile: {
                  select: {
                    display_name: true,
                    id: true,
                  },
                },
                _count: {
                  select: {
                    skills: true,
                    works: true,
                  },
                },
              },
            },

            reviews: true,
            _count: {
              select: {
                biddings: true,
                views: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        });
        const cat = await prisma.category.findUnique({
          where: {
            id: category,
          },
        });

        const worksWithRating = works.map((e) => {
          const rating = e.reviews.map((r) => r.rating);
          return {
            ...e,
            rating: average(rating),
          };
        });

        return {
          ...cat,
          works: worksWithRating,
          total: count,
          pages: Math.ceil(count / PAGINATION_ITEMS),
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // add a work
  fastify.post<{ Body: WorkI }>(
    "/add-work",
    {
      schema: {
        body: Type.Object({
          title: Type.String({ minLength: 2, maxLength: 200 }),
          categoryId: Type.Optional(Type.String({ format: "uuid" })),
          description: Type.String({ minLength: 2 }),
          price: Type.Optional(Type.String()),
          currency: Type.Optional(Type.String({ minLength: 2, maxLength: 10 })),
          sellAs: Type.Array(Type.Enum(SELLAS)),
          files: Type.Optional(
            Type.Object({
              images: Type.Array(Type.String({ minLength: 2, maxLength: 500 })),
              videos: Type.Optional(
                Type.Array(Type.String({ minLength: 2, maxLength: 500 }))
              ),
            })
          ),
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
      const {
        skills,
        title,
        categoryId,
        description,
        price,
        currency,
        sellAs,
        files,
      } = request.body;

      const allIds: object[] = [];

      skills.forEach((id) => {
        allIds.push({ id });
      });

      try {
        const work = await prisma.work.create({
          data: {
            title,
            description,
            price,
            currency,
            sellAs,
            files,
            category: {
              connect: {
                id: categoryId ?? undefined,
              },
            },
            artist: {
              connect: {
                // @ts-ignore
                profileId: request.user.userId,
              },
            },
            skills: {
              connect: allIds,
            },
          },
          include: {
            artist: true,
          },
        });

        return reply.code(201).send({
          message: "successful",
          work,
        });
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // edit a work
  fastify.post<{ Body: WorkI; Params: { work: string } }>(
    "/:work/edit-work",
    {
      schema: {
        params: Type.Object({
          work: Type.String({ format: "uuid" }),
        }),
        body: Type.Object({
          title: Type.String({ minLength: 2, maxLength: 200 }),
          categoryId: Type.Optional(Type.String({ format: "uuid" })),
          description: Type.String({ minLength: 2 }),
          price: Type.Optional(Type.String()),
          currency: Type.Optional(Type.String({ minLength: 2, maxLength: 10 })),
          sellAs: Type.Array(Type.Enum(SELLAS)),
          files: Type.Optional(
            Type.Object({
              images: Type.Array(Type.String({ minLength: 2, maxLength: 500 })),
              videos: Type.Optional(
                Type.Array(Type.String({ minLength: 2, maxLength: 500 }))
              ),
            })
          ),
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
      const {
        skills,
        title,
        categoryId,
        description,
        price,
        currency,
        sellAs,
        files,
      } = request.body;

      const { work } = request.params;

      const allIds: object[] = [];

      skills.forEach((id) => {
        allIds.push({ id });
      });

      // check if skill already exit under the same category connect or create skill
      try {
        const workInDb = await prisma.work.findFirst({
          where: {
            id: work,
          },
          include: {
            artist: true,
          },
        });

        if (
          // @ts-ignore
          workInDb?.artist.profileId !== request.user.userId &&
          // @ts-ignore
          request.user.role !== "admin"
        )
          return reply.unauthorized();

        const workUpdate = await prisma.work.update({
          where: {
            id: work,
          },
          data: {
            title,
            description,
            price,
            currency,
            sellAs,
            files,
            categoryId,
            skills: {
              connect: allIds,
            },
          },
          include: {
            artist: true,
            skills: true,
          },
        });

        return {
          message: "successful",
          work: workUpdate,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // delete work
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
        const workInDb = await prisma.work.findFirst({
          where: {
            id,
          },
          include: {
            artist: true,
          },
        });

        if (
          // @ts-ignore
          workInDb?.artist.profileId !== request.user.userId &&
          // @ts-ignore
          request.user.role !== "admin"
        )
          return reply.unauthorized();

        await prisma.work.delete({
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

  // link to skills
  fastify.post<{ Body: { skills: string[] }; Params: { work: string } }>(
    "/:work/link-skills",
    {
      schema: {
        params: Type.Object({
          work: Type.String({ format: "uuid" }),
        }),
        body: Type.Object({
          skills: Type.Array(Type.String({ format: "uuid" })),
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
      const { work } = request.params;
      const { skills } = request.body;

      const allIds: object[] = [];

      skills.forEach((id) => {
        allIds.push({ id });
      });

      // check if skill already exit under the same category connect or create skill
      try {
        const workInDb = await prisma.work.findFirst({
          where: {
            id: work,
          },
          include: {
            artist: true,
          },
        });

        if (
          // @ts-ignore
          workInDb?.artist.profileId !== request.user.userId &&
          // @ts-ignore
          request.user.role !== "admin"
        )
          return reply.unauthorized();
        const workUpdate = await prisma.work.update({
          where: {
            id: work,
          },
          data: {
            skills: {
              connect: allIds,
            },
          },
        });

        return {
          message: "successful",
          work: workUpdate,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // bid work
  fastify.post<{ Params: { work: string }; Body: Bidding }>(
    "/:work/bid",
    {
      schema: {
        params: Type.Object({
          work: Type.String({ format: "uuid" }),
        }),
        body: Type.Object({
          offer: Type.Number(),
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
      const { work } = request.params;
      const { offer } = request.body;

      // check if skill already exit under the same category connect or create skill
      try {
        const workInDb = await prisma.work.findFirst({
          where: {
            id: work,
          },
        });

        return !workInDb?.price
          ? {
              message: "this art work is not yet for sale",
            }
          : workInDb?.isSold
          ? {
              message: "sold out",
            }
          : !workInDb?.sellAs.includes(SELLAS.best_offer)
          ? {
              message: "you can only bid for this item",
            }
          : reply.code(201).send({
              bidding: await prisma.bidding.create({
                data: {
                  workId: work,
                  // @ts-ignore
                  userId: request.user.userId,
                  offer,
                },
                include: {
                  work: true,
                  user: true,
                },
              }),
            });
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // order work
  fastify.post<{ Params: { work: string } }>(
    "/:work/order",
    {
      schema: {
        params: Type.Object({
          work: Type.String({ format: "uuid" }),
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
      const { work } = request.params;

      // check if skill already exit under the same category connect or create skill
      try {
        const workInDb = await prisma.work.findFirst({
          where: {
            id: work,
          },
        });

        return !workInDb?.price
          ? {
              message: "this art work is not yet for sale",
            }
          : workInDb?.isSold
          ? {
              message: "sold out",
            }
          : !workInDb?.sellAs.includes("buy_now")
          ? {
              message: "you can only bid for this item",
            }
          : reply.code(201).send({
              order: await prisma.order.create({
                data: {
                  workId: work,
                  // @ts-ignore
                  userId: request.user.userId,
                },
                include: {
                  work: true,
                  user: true,
                },
              }),
            });
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // review work
  fastify.post<{ Params: { work: string }; Body: Review }>(
    "/:work/review",
    {
      schema: {
        params: Type.Object({
          work: Type.String({ format: "uuid" }),
        }),
        body: Type.Object({
          comment: Type.Optional(Type.String({ minLength: 2 })),
          rating: Type.Number(),
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
      const { work } = request.params;
      const { rating, comment } = request.body;

      // check if skill already exit under the same category connect or create skill
      try {
        const reviewInDb = await prisma.review.findFirst({
          where: {
            // @ts-ignore
            userId: request.user.userId,
            workId: work,
          },
        });

        const workUpdate = reviewInDb
          ? await prisma.work.update({
              where: {
                id: work,
              },
              data: {
                reviews: {
                  update: {
                    where: {
                      id: reviewInDb.id,
                    },
                    data: {
                      rating,
                      comment,
                      // @ts-ignore
                      userId: request.user.userId,
                    },
                  },
                },
              },
              include: {
                skills: {
                  select: {
                    id: true,
                    name: true,
                    categoryId: true,
                  },
                },
                artist: {
                  select: {
                    profile: {
                      select: {
                        display_name: true,
                        id: true,
                      },
                    },
                    skills: true,
                    _count: {
                      select: {
                        works: true,
                      },
                    },
                  },
                },
                reviews: true,
                _count: {
                  select: {
                    biddings: true,
                    views: true,
                  },
                },
              },
            })
          : await prisma.work.update({
              where: {
                id: work,
              },
              data: {
                reviews: {
                  create: {
                    rating,
                    comment,
                    // @ts-ignore
                    userId: request.user.userId,
                  },
                },
              },
              include: {
                skills: {
                  select: {
                    id: true,
                    name: true,
                    categoryId: true,
                  },
                },
                artist: {
                  select: {
                    profile: {
                      select: {
                        display_name: true,
                        id: true,
                      },
                    },
                    skills: true,
                    _count: {
                      select: {
                        works: true,
                      },
                    },
                  },
                },
                reviews: true,
                _count: {
                  select: {
                    biddings: true,
                    views: true,
                  },
                },
              },
            });

        const rate = workUpdate.reviews.map((r) => r.rating);

        return {
          message: "successful",
          work: {
            ...workUpdate,
            rating: rating ? average(rate) : undefined,
          },
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // work review comment
  fastify.post<{ Params: { review: string }; Body: Comment }>(
    "/review/:review/comment",
    {
      schema: {
        params: Type.Object({
          review: Type.String({ format: "uuid" }),
        }),
        body: Type.Object({
          message: Type.String({ minLength: 2 }),
          workId: Type.String({ format: "uuid" }),
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
      const { review } = request.params;
      const { message, parentId } = request.body;

      // check if skill already exit under the same category connect or create skill
      try {
        const comment = await prisma.comment.create({
          data: {
            message,
            parentId,
            reviewId: review,
            // @ts-ignore
            userId: request.user.userId,
          },
        });
        return {
          message: "successful",
          comment,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // review comments
  fastify.get<{ Params: { review: string } }>(
    "/review/:review/all-comments",
    {
      schema: {
        params: Type.Object({
          review: Type.String({ format: "uuid" }),
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
      const { review } = request.params;

      // check if skill already exit under the same category connect or create skill
      try {
        const comments = await prisma.comment.groupBy({
          by: ["parentId"],
          where: {
            reviewId: review,
          },
        });
        return {
          message: "successful",
          comments,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // remove a skill
  fastify.delete<{ Body: { id: string }; Params: { work: string } }>(
    "/:work/remove-skill",
    {
      schema: {
        params: Type.Object({
          work: Type.String({ format: "uuid" }),
        }),
        body: Type.Object({
          id: Type.String({ format: "uuid" }),
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
      const { id } = request.body;
      const { work } = request.params;

      // check disconnect skill from artist
      try {
        const workInDb = await prisma.work.findFirst({
          where: {
            id: work,
          },
          include: {
            artist: true,
          },
        });

        if (
          // @ts-ignore
          workInDb?.artist.profileId !== request.user.userId &&
          // @ts-ignore
          request.user.role !== "admin"
        )
          return reply.unauthorized();

        const workUpdate = await prisma.work.update({
          where: { id: work },
          data: {
            skills: {
              disconnect: {
                id,
              },
            },
          },
          include: {
            skills: true,
          },
        });

        return {
          message: "successful",
          work: workUpdate,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get a work
  fastify.get<{ Params: { work: string } }>(
    "/:work",
    {
      schema: {
        params: Type.Object({
          work: Type.String({ format: "uuid" }),
        }),
      },
    },
    async function (request, reply) {
      try {
        const work = await prisma.work.findUnique({
          where: { id: request.params.work },
          include: {
            skills: {
              select: {
                id: true,
                name: true,
                categoryId: true,
              },
            },
            artist: {
              select: {
                profile: {
                  select: {
                    display_name: true,
                    id: true,
                  },
                },
                _count: {
                  select: {
                    skills: true,
                    works: true,
                  },
                },
              },
            },

            reviews: {
              include: {
                comments: {
                  where: {
                    NOT: {
                      parentId: null,
                    },
                  },
                  include: {
                    comments: {
                      where: {
                        parent: {
                          NOT: {
                            parentId: null,
                          },
                        },
                      },
                      include: {
                        comments: {
                          where: {
                            parent: {
                              NOT: {
                                parent: {
                                  NOT: {
                                    parentId: null,
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            _count: {
              select: {
                biddings: true,
                views: true,
              },
            },
          },
        });

        const rating = work?.reviews.map((r) => r.rating);

        return {
          work: {
            ...work,
            rating: rating ? average(rating) : undefined,
          },
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );
};

export default workRoute;
