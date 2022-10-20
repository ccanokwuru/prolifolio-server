import { Type } from "@sinclair/typebox";
import { PrismaClient, SELLAS } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";
import { PAGINATION_ITEMS } from "../../../utils/paginationHelper";
import average from "../../../utils/average";
import { WorkI } from "../../../types";
const prisma = new PrismaClient();

const studioRoute: FastifyPluginAsync = async (
  fastify,
  opts
): Promise<void> => {
  // get all studios
  fastify.get<{ Querystring: { page?: number } }>(
    "/get-all",
    {
      schema: {
        querystring: Type.Optional(
          Type.Object({
            page: Type.Number({ default: 1 }),
          })
        ),
      },
    },
    async function (request, reply) {
      const count = await prisma.studio.count();
      const { page } = request.query;
      const skip = page ? Number(page - 1) * PAGINATION_ITEMS : 0;
      try {
        const studios = await prisma.studio.findMany({
          skip,
          take: PAGINATION_ITEMS,
          include: {
            artist: true,
            ratings: true,
            works: true,
            _count: {
              select: {
                works: true,
                ratings: true,
              },
            },
          },
        });

        const studioWithRating = studios.map((e) => {
          const rating = e.ratings.map((r) => r.rating);
          return {
            ...e,
            rating: average(rating),
          };
        });

        return {
          studios: studioWithRating,
          total: count,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // delete studio account
  fastify.delete(
    "/delete",
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
        const artist = await prisma.artist.findUnique({
          where: {
            // @ts-ignore
            profileId: request.user.userId,
          },
        });
        if (!artist)
          return reply.unauthorized(
            "you must be an artist to perform this action"
          );

        const studio = await prisma.studio.delete({
          where: {
            // @ts-ignore
            artistId: artist.id,
          },
        });

        if (!studio)
          return reply.unauthorized(
            "you must be an artist and own this studio to perform this action"
          );

        return {
          message: "successful",
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
          categoryId: Type.String({ format: "uuid" }),
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

      // check if skill already exit under the same category connect or create skill
      try {
        const studio = await prisma.studio.findFirst({
          where: {
            artist: {
              // @ts-ignore
              profileId: request.user.userId,
            },
          },
        });

        if (!studio)
          return reply.notImplemented("you have not yet created a studio");

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
                id: categoryId,
              },
            },
            artist: {
              connect: {
                // @ts-ignore
                profileId: request.user.userId,
              },
            },
            studio: {
              connect: studio,
            },
            skills: {
              connect: allIds,
            },
          },
          include: {
            artist: true,
            studio: true,
          },
        });

        return {
          message: "successful",
          work,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // rate studio
  fastify.post<{ Params: { studio: string }; Body: { rating: number } }>(
    "/:studio/rate",
    {
      schema: {
        params: Type.Object({
          studio: Type.String({ format: "uuid" }),
        }),
        body: Type.Object({
          rating: Type.Number(),
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
      const { studio } = request.params;
      const { rating } = request.body;
      try {
        const ratingInDB = await prisma.rating.findFirst({
          where: {
            user: {
              // @ts-ignore
              id: request.user.userId,
            },
            artist: {
              id: studio,
            },
          },
        });

        // create / update reaction
        ratingInDB
          ? await prisma.rating.update({
              where: ratingInDB,
              data: {
                rating,
                user: {
                  connect: {
                    // @ts-ignore
                    id: request.user.userId,
                  },
                },
                studio: {
                  connect: {
                    id: studio,
                  },
                },
              },
            })
          : await prisma.rating.create({
              data: {
                rating,
                user: {
                  connect: {
                    // @ts-ignore
                    id: request.user.userId,
                  },
                },
                studio: {
                  connect: {
                    id: studio,
                  },
                },
              },
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

  // mark studio account as favourite
  fastify.post<{ Params: { studio: string } }>(
    "/:studio/mark-favourite",
    {
      schema: {
        params: Type.Object({
          studio: Type.String({ format: "uuid" }),
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
      const { studio } = request.params;
      try {
        const favouriteInDB = await prisma.favourite.findFirst({
          where: {
            user: {
              // @ts-ignore
              id: request.user.userId,
            },
            studio: {
              id: studio,
            },
          },
        });

        // create / update reaction
        favouriteInDB
          ? null
          : await prisma.favourite.create({
              data: {
                user: {
                  connect: {
                    // @ts-ignore
                    id: request.user.userId,
                  },
                },
                studio: {
                  connect: {
                    id: studio,
                  },
                },
              },
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

  // unmark studio account as favourite
  fastify.delete<{ Params: { studio: string } }>(
    "/:studio/unmark-favourite",
    {
      schema: {
        params: Type.Object({
          studio: Type.String({ format: "uuid" }),
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
      const { studio } = request.params;
      try {
        const favouriteInDB = await prisma.favourite.findFirst({
          where: {
            user: {
              // @ts-ignore
              id: request.user.userId,
            },
            studio: {
              id: studio,
            },
          },
        });

        // create / update reaction
        favouriteInDB
          ? await prisma.favourite.delete({
              where: {
                id: favouriteInDB.id,
              },
            })
          : null;

        return {
          message: "successful",
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get all studio work
  fastify.get<{ Params: { studio: string }; Querystring: { page?: number } }>(
    "/:studio/all-works",
    {
      schema: {
        querystring: Type.Optional(
          Type.Object({
            page: Type.Optional(Type.Number({ default: 1 })),
          })
        ),
        params: Type.Optional(
          Type.Object({
            studio: Type.Optional(Type.String({ format: "uuid" })),
          })
        ),
      },
    },
    async function (request, reply) {
      const { page } = request.query;
      const { studio } = request.params;

      const count = await prisma.work.count({
        where: {
          studioId: studio,
        },
      });
      const skip = page ? Number(page - 1) * PAGINATION_ITEMS : 0;

      try {
        const works = await prisma.work.findMany({
          skip,
          take: PAGINATION_ITEMS,
          where: {
            studioId: request.params.studio,
          },
          include: {
            artist: {
              select: {
                profile: {
                  select: {
                    display_name: true,
                    id: true,
                  },
                },
              },
            },
            skills: true,
            reactions: true,
            reviews: true,
            _count: {
              select: {
                reviews: true,
              },
            },
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
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get studio
  fastify.get<{ Params: { studio: string } }>(
    "/:studio",
    {
      schema: {
        params: Type.Object({
          studio: Type.String({ format: "uuid" }),
        }),
      },
    },
    async function (request, reply) {
      const { studio } = request.params;

      try {
        const studioData = await prisma.studio.findUnique({
          where: { id: studio },
          include: {
            artist: true,
            ratings: true,
            _count: {
              select: {
                works: true,
              },
            },
          },
        });

        const rating = studioData?.ratings.map((r) => r.rating);
        return {
          studio: {
            ...studioData,
            rating: rating ? average(rating) : undefined,
          },
        };
      } catch (error) {
        console.log(error);
        // @ts-ignore
        return reply.internalServerError();
      }
    }
  );
};

export default studioRoute;
