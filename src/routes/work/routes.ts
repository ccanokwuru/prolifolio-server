import { IWork, IOneId, IReact, IUserId, IReview, IImageInfo } from './../../interface';
import { PrismaClient } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";

const slugger = require("github-slugger")

const prisma = new PrismaClient();
const worksRoute: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post<{ Body: IWork }>("/create", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate, fastify.creator_auth, fastify.current_userId
    ], { run: 'all' })
  }, async function (request, reply) {
    const { title, categoryId, description, studioId } = request.body

    if (!title && !categoryId && !description && !studioId)
      return reply.code(501).send({ message: "Something went wrong" })

    // @ts-ignore
    const { files } = request.files
    let images: { main: IImageInfo, others: IImageInfo[] } | "" = ""

    // @ts-ignore
    files.forEach(file => {
      if (file === files[0])
        // @ts-ignore
        images.main = {
          name: slugger(title),
          // @ts-ignore
          url: `http://localhost:5000/${request.uploadPath.replace("../../uploads/", "")}`
        }

      // @ts-ignore
      images.others.push({
        name: slugger(title),
        // @ts-ignore
        url: `http://localhost:5000/${request.uploadPath.replace("../../uploads/", "")}`
      })
    });

    const work = await prisma.work.create({
      data: {
        description,
        title,
        files: JSON.stringify(images),
        creator: {
          connect: {
            // @ts-ignore
            email: request.user.email,
          }
        },
        category: {
          connect: {
            id: categoryId
          }
        },
        studio: {
          connect: {
            id: studioId
          }
        }
      },
      include: {
        creator: true,
        reactions: true,
        reviews: true,
        favourites: true,
        category: true
      }
    });

    return {
      work
    };
  });

  fastify.get("/all", async function (request, reply) {

    const works = await prisma.work.findMany({
      include: {
        creator: true,
        reactions: true,
        reviews: true,
        favourites: true,
        category: true
      },
      orderBy: {
        updatedAt: "desc"
      }
    })

    return {
      works
    };
  });

  fastify.get<{ Params: IOneId }>("/w/:id", async function (request, reply) {
    const { id } = request.params
    const work = await prisma.work.findUnique({
      where: {
        id,
      },
      include: {
        creator: true,
        reactions: true,
        reviews: true,
        favourites: true,
        category: true
      }
    })

    return {
      work
    };
  });

  fastify.post<{ Body: IWork, Params: IOneId }>("/w/:id/update", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate, fastify.current_userId
    ])
  }, async function (request, reply) {
    const { title, categoryId, description, studioId, creatorId } = request.body
    const { id } = request.params

    const files = JSON.stringify({})

    const work = await prisma.work.update({
      where: {
        id
      },
      data: {
        description,
        title,
        files,
        studio: {
          connect: {
            id: studioId
          }
        },
        category: {
          connect: {
            id: categoryId
          }
        },
        creator: {
          connect: {
            id: creatorId
          }
        },
      },
      include: {
        creator: true,
        reactions: true,
        reviews: true,
        favourites: true,
        category: true
      }
    });
    return {
      work
    };
  });

  fastify.post<{ Body: IReact, Params: IOneId }>("/w/:id/react", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate
    ])
  }, async function (request, reply) {
    const { type, userId } = request.body
    const { id } = request.params

    const work = await prisma.work.update({
      where: {
        id
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
        reactions: true,
        reviews: true,
        favourites: true,
        category: true
      }
    });
    return {
      work
    };
  });

  fastify.post<{ Body: IUserId, Params: IOneId }>("/w/:id/make-favourite", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate
    ])
  }, async function (request, reply) {
    const { userId } = request.body
    const { id } = request.params

    const work = await prisma.work.update({
      where: {
        id
      },
      data: {
        favourites: {
          create: {
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
        reactions: true,
        reviews: true,
        favourites: true,
        category: true
      }
    });
    return {
      work
    };
  });

  fastify.post<{ Body: IReview, Params: IOneId }>("/w/:id/review", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate
    ])
  }, async function (request, reply) {
    const { userId, rating, comment } = request.body
    const { id } = request.params

    const work = await prisma.work.update({
      where: {
        id
      },
      data: {
        reviews: {
          create: {
            comment,
            rating,
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
        reactions: true,
        reviews: true,
        favourites: true,
        category: true
      }
    });
    return {
      work
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

      const work = await prisma.work.findUnique({
        where: {
          id
        },
        include: {
          creator: true,
          reactions: true,
          reviews: true,
          favourites: true,
          category: true
        }
      })

      if (work?.creator.id !== id)
        return reply.code(401).send({ msg: " you are not authorised for this" })

      const w = await prisma.work.delete({
        where: {
          id
        },
      });

      return {
        w
      };
    });
};

export default worksRoute;
