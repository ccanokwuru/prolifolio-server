import { IPost, IOneId, IReact } from './../../interface';
import { PrismaClient } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";
import * as cyrpto from "crypto"

const slugger = require("github-slugger")

const prisma = new PrismaClient();
const postsRoute: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post<{ Body: IPost }>("/create", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate
    ], { run: 'all' })
  }, async function (request, reply) {
    const { title, content } = request.body

    const post = await prisma.post.create({
      data: {
        content,
        title,
        slug: `${slugger(title)}_${cyrpto.randomBytes(4).toString('hex')}`,
        // @ts-ignore
        mainImage: `http://localhost:5000/assets/${request.uploadPath.replace("../../uploads/", "")}`,
        author: {
          connect: {
            // @ts-ignore
            email: request.user.email,
          }
        },
      },
      include: {
        author: true
      }
    });
    return {
      post
    };
  });

  fastify.get("/all", async function (request, reply) {

    const posts = await prisma.post.findMany({
      include: {
        author: true,
        reactions: true,
        favourites: true,
        comments: true
      },
      orderBy: {
        updatedAt: "desc"
      }
    })

    return {
      posts
    };
  });

  fastify.get<{ Params: IOneId }>("/p/:id", async function (request, reply) {
    const { id } = request.params
    const post = await prisma.post.findUnique({
      where: {
        id,
      },
      include: {
        author: true,
        reactions: true,
        favourites: true,
        comments: true
      }
    })

    return {
      post
    };
  });

  fastify.post<{ Body: IPost, Params: IOneId }>("/p/:id/update", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate, fastify.current_userId
    ])
  }, async function (request, reply) {
    const { title, content } = request.body
    const { id } = request.params

    const post = await prisma.post.update({
      where: {
        id: Number(id)
      },
      data: {
        content,
        title,
        // @ts-ignore
        mainImage: `http://localhost:5000/assets/${request.uploadPath.replace("../../uploads/", "")}`,
      },
      include: {
        author: true,
        reactions: true,
        favourites: true,
        comments: true
      }
    });
    return {
      post
    };
  });

  fastify.post<{ Body: IReact, Params: IOneId }>("/p/:id/react", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate
    ])
  }, async function (request, reply) {
    const { type, userId } = request.body
    const { id } = request.params

    const post = await prisma.post.update({
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
        author: true,
        reactions: true,
        favourites: true,
        comments: true
      }
    });
    return {
      post
    };
  });

  fastify.post<{ Params: IOneId }>("/p/:id/make-favourite", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate
    ])
  }, async function (request, reply) {
    const { id } = request.params

    const post = await prisma.post.update({
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
        author: true,
        reactions: true,
        favourites: true,
        comments: true
      }
    });
    return {
      post
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

      const post = await prisma.post.delete({
        where: {
          id: Number(id)
        },
      })

      return {
        post
      };
    });
};

export default postsRoute;
