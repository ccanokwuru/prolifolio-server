import { Type } from "@sinclair/typebox";
import { PrismaClient, Skill } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";
import { PAGINATION_ITEMS } from "../../../utils/paginationHelper";
import average from "../../../utils/average";
const prisma = new PrismaClient();

const artistRoute: FastifyPluginAsync = async (
  fastify,
  opts
): Promise<void> => {
  // get my artist account
  fastify.get(
    "/",
    {
      preHandler: fastify.auth([
        // @ts-ignore
        fastify.authenticate,
        // @ts-ignore
        fastify.is_artist_admin,
      ]),
    },
    async function (request, reply) {
      try {
        const artist = await prisma.artist.findUnique({
          where: {
            // @ts-ignore
            profileId: request.user.userId,
          },

          include: {
            profile: true,
            skills: {
              select: {
                id: true,
                name: true,
                categoryId: true,
              },
            },
            ratings: true,
            works: true,
            _count: {
              select: {
                works: true,
                favourites: true,
                ratings: true,
              },
            },
          },
        });

        const rating = artist?.ratings.map((r) => r.rating);

        return {
          artist: {
            ...artist,
            rating: average(rating ?? []),
          },
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get all artists
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
      const count = await prisma.artist.count();
      const { page } = request.query;
      const skip = page ? Number(page - 1) * PAGINATION_ITEMS : 0;
      try {
        const artists = await prisma.artist.findMany({
          skip,
          take: PAGINATION_ITEMS,
          include: {
            profile: true,
            skills: {
              select: {
                id: true,
                name: true,
                categoryId: true,
              },
            },
            ratings: true,
            _count: {
              select: {
                works: true,
                ratings: true,
              },
            },
          },
        });

        const artistWithRating = artists.map((e) => {
          const rating = e.ratings.map((r) => r.rating);
          return {
            ...e,
            rating: average(rating),
          };
        });

        return {
          artists: artistWithRating,
          total: count,
          pages: Math.ceil(count / PAGINATION_ITEMS),
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get all artists by skill id
  fastify.get<{ Querystring: { page?: number }; Params: { skill?: string } }>(
    "/get-all/skill/s/:skill",
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
      const { skill } = request.params;
      const { page } = request.query;

      const count = await prisma.artist.count({
        where: {
          skills: {
            some: { id: skill },
          },
        },
      });
      const skip = page ? Number(page - 1) * PAGINATION_ITEMS : 0;
      try {
        const artists = await prisma.artist.findMany({
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
            profile: true,
            skills: {
              select: {
                id: true,
                name: true,
                categoryId: true,
              },
            },
            ratings: true,
            _count: {
              select: {
                works: true,
              },
            },
          },
        });

        const artistWithRating = artists.map((e) => {
          const rating = e.ratings.map((r) => r.rating);
          return {
            ...e,
            rating: average(rating),
          };
        });
        return {
          artists: artistWithRating,
          total: count,
          pages: Math.ceil(count / PAGINATION_ITEMS),
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get all artists by skill name
  fastify.get<{ Querystring: { page?: number }; Params: { skill?: string } }>(
    "/get-all/skill/:skill",
    {
      schema: {
        querystring: Type.Optional(
          Type.Object({
            page: Type.Optional(Type.Number({ default: 1 })),
          })
        ),
        params: Type.Optional(
          Type.Object({
            skill: Type.Optional(Type.String({ minLength: 2, maxLength: 200 })),
          })
        ),
      },
    },
    async function (request, reply) {
      const { skill } = request.params;
      const { page } = request.query;

      const count = await prisma.artist.count({
        where: {
          skills: {
            some: { name: skill },
          },
        },
      });
      const skip = page ? Number(page - 1) * PAGINATION_ITEMS : 0;
      try {
        const artists = await prisma.artist.findMany({
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
            profile: true,
            skills: {
              select: {
                id: true,
                name: true,
                categoryId: true,
              },
            },
            ratings: true,
            _count: {
              select: {
                works: true,
              },
            },
          },
        });

        const artistWithRating = artists.map((e) => {
          const rating = e.ratings.map((r) => r.rating);
          return {
            ...e,
            rating: average(rating),
          };
        });
        return {
          artists: artistWithRating,
          total: count,
          pages: Math.ceil(count / PAGINATION_ITEMS),
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // delete artist account
  fastify.delete(
    "/delete",
    {
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
      try {
        const deletedArtist = await prisma.artist.delete({
          where: {
            // @ts-ignore
            profileId: request.user.userId,
          },
        });
        if (!deletedArtist) return reply.forbidden();

        await prisma.artist.delete({
          where: {
            // @ts-ignore
            profileId: request.user.userId,
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

  // mark artist account as favourite
  fastify.post<{ Params: { artist: string } }>(
    "/:artist/mark-favourite",
    {
      schema: {
        params: Type.Object({
          artist: Type.String({ format: "uuid" }),
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
      const { artist } = request.params;
      try {
        const favouriteInDB = await prisma.favourite.findFirst({
          where: {
            user: {
              // @ts-ignore
              id: request.user.userId,
            },
            artist: {
              id: artist,
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
                artist: {
                  connect: {
                    id: artist,
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

  // rate artist
  fastify.post<{ Params: { artist: string }; Body: { rating: number } }>(
    "/:artist/rate",
    {
      schema: {
        params: Type.Object({
          artist: Type.String({ format: "uuid" }),
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
      const { artist } = request.params;
      const { rating } = request.body;
      try {
        const ratingInDB = await prisma.rating.findFirst({
          where: {
            user: {
              // @ts-ignore
              id: request.user.userId,
            },
            artist: {
              id: artist,
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
                artist: {
                  connect: {
                    id: artist,
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
                artist: {
                  connect: {
                    id: artist,
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

  // unmark artist account as favourite
  fastify.delete<{ Params: { artist: string } }>(
    "/:artist/unmark-favourite",
    {
      schema: {
        params: Type.Object({
          artist: Type.String({ format: "uuid" }),
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
      const { artist } = request.params;
      try {
        const favouriteInDB = await prisma.favourite.findFirst({
          where: {
            user: {
              // @ts-ignore
              id: request.user.userId,
            },
            artist: {
              id: artist,
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

  // add artist skill
  fastify.post<{ Body: Skill }>(
    "/new-skill",
    {
      schema: {
        body: Type.Object({
          name: Type.String({ minLength: 2, maxLength: 100 }),
          description: Type.Optional(Type.String({ minLength: 2 })),
          categoryId: Type.String({ format: "uuid" }),
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
      const { name, description, categoryId } = request.body;
      // check if skill already exit under the same category connect or create skill
      try {
        const skillCheck = await prisma.skill.findFirst({
          where: {
            name: {
              equals: name,
              mode: "insensitive",
            },
            categoryId,
          },
        });

        const artist = await prisma.artist.update({
          where: {
            // @ts-ignore
            userId: request.user.userId,
          },
          data: {
            skills: {
              connectOrCreate: {
                where: skillCheck ? { id: skillCheck.id } : { id: "" },
                create: {
                  name,
                  description,
                  categoryId,
                },
              },
            },
          },
          include: { skills: true },
        });

        return {
          message: "successful",
          artist,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // link to skills
  fastify.post<{ Body: { skills: string[] } }>(
    "/link-skills",
    {
      schema: {
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
      const { skills } = request.body;

      const allIds: object[] = [];

      skills.forEach((id) => {
        allIds.push({ id });
      });

      // check if skill already exit under the same category connect or create skill
      try {
        const artist = await prisma.artist.update({
          where: {
            // @ts-ignore
            userId: request.user.userId,
          },
          data: {
            skills: {
              connect: allIds,
            },
          },
        });

        return {
          message: "successful",
          artist,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // remove a skill
  fastify.delete<{ Body: { id: string } }>(
    "/remove-skill",
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
      // check disconnect skill from artist
      try {
        const artist = await prisma.artist.update({
          where: {
            // @ts-ignore
            userId: request.user.userId,
          },
          data: {
            skills: {
              disconnect: {
                id: request.body.id,
              },
            },
          },
          include: {
            skills: true,
          },
        });

        return {
          message: "successful",
          artist,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get all artist work by artist name
  fastify.get<{ Params: { artist: string }; Querystring: { page?: number } }>(
    "/:artist/all-works",
    {
      schema: {
        querystring: Type.Optional(
          Type.Object({
            page: Type.Optional(Type.Number({ default: 1 })),
          })
        ),
        params: Type.Optional(
          Type.Object({
            artist: Type.String({ minLength: 2, maxLength: 200 }),
          })
        ),
      },
    },
    async function (request, reply) {
      const { page } = request.query;
      const { artist } = request.params;

      const count = await prisma.work.count({
        where: {
          artist: {
            profile: {
              display_name: artist,
            },
          },
        },
      });
      const skip = page ? Number(page - 1) * PAGINATION_ITEMS : 0;

      try {
        const works = await prisma.work.findMany({
          skip,
          take: PAGINATION_ITEMS,
          where: {
            artist: {
              profile: {
                display_name: artist,
              },
            },
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
          pages: Math.ceil(count / PAGINATION_ITEMS),
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get all artist work by artist id
  fastify.get<{ Params: { artist: string }; Querystring: { page?: number } }>(
    "/a/:artist/all-works",
    {
      schema: {
        querystring: Type.Optional(
          Type.Object({
            page: Type.Optional(Type.Number({ default: 1 })),
          })
        ),
        params: Type.Optional(
          Type.Object({
            artist: Type.Optional(Type.String({ format: "uuid" })),
          })
        ),
      },
    },
    async function (request, reply) {
      const { page } = request.query;
      const { artist } = request.params;

      const count = await prisma.work.count({
        where: {
          artistId: artist,
        },
      });
      const skip = page ? Number(page - 1) * PAGINATION_ITEMS : 0;

      try {
        const works = await prisma.work.findMany({
          skip,
          take: PAGINATION_ITEMS,
          where: {
            artistId: request.params.artist,
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
          pages: Math.ceil(count / PAGINATION_ITEMS),
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get all my orders
  fastify.get<{ Querystring: { page?: number } }>(
    "/get-orders",
    {
      schema: {
        querystring: Type.Optional(
          Type.Object({
            page: Type.Optional(Type.Number({ default: 1 })),
          })
        ),
      },
      preHandler: fastify.auth([
        // @ts-ignore
        fastify.authenticate,
      ]),
    },
    async function (request, reply) {
      try {
        const count = await prisma.order.count({
          where: {
            // @ts-ignore
            userId: request.user.userId,
          },
        });
        const { page } = request.query;
        const skip = page ? Number(page - 1) * PAGINATION_ITEMS : 0;

        const orders = await prisma.order.groupBy({
          by: ["status", "createdAt"],
          skip,
          take: PAGINATION_ITEMS,
          where: {
            OR: [
              {
                // @ts-ignore
                userId: request.user.userId,
              },
            ],
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        return {
          orders,
          total: count,
          pages: Math.ceil(count / PAGINATION_ITEMS),
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get artist by id
  fastify.get<{ Params: { artist: string } }>(
    "/a/:artist",
    {
      schema: {
        params: Type.Object({
          artist: Type.String({ format: "uuid" }),
        }),
      },
    },
    async function (request, reply) {
      const { artist } = request.params;

      try {
        const artistData = await prisma.artist.findUnique({
          where: { id: artist },
          include: {
            profile: true,
            skills: {
              select: {
                id: true,
                name: true,
                categoryId: true,
              },
            },
            ratings: true,
            works: true,
            _count: {
              select: {
                works: true,
                favourites: true,
              },
            },
          },
        });

        const rating = artistData?.ratings.map((r) => r.rating);
        return {
          artist: {
            ...artistData,
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

  // get artist by display_name
  fastify.get<{ Params: { artist: string } }>(
    "/:artist",
    {
      schema: {
        params: Type.Object({
          artist: Type.String({ minLength: 2, maxLength: 200 }),
        }),
      },
    },
    async function (request, reply) {
      const { artist } = request.params;

      try {
        const artistData = await prisma.artist.findFirst({
          where: {
            profile: {
              display_name: artist,
            },
          },
          include: {
            profile: true,
            skills: {
              select: {
                id: true,
                name: true,
                categoryId: true,
              },
            },
            ratings: true,
            works: true,
            _count: {
              select: {
                works: true,
                favourites: true,
              },
            },
          },
        });

        const rating = artistData?.ratings.map((r) => r.rating);
        return {
          artist: {
            ...artistData,
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

export default artistRoute;
