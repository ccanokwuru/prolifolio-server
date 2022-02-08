import { PrismaClient } from '@prisma/client';
import { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify';
import fp from 'fastify-plugin';

const prisma = new PrismaClient();

module.exports = fp(async function (fastify, opts) {
  fastify.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {

    const { token } = request.cookies
    const { authorization } = request.headers
    const userToken = authorization?.startsWith('Bearer ') ? authorization.split(' ')[1] : token

    if (!userToken)
      return reply.code(401).send({ message: "requires authentication" })

    const user = fastify.jwt.verify(userToken)
    if (!user) return reply.code(401).send({ message: "empty session token" });

    const authToken = await prisma.token.findFirst({
      where: {
        token: userToken
      }
    })

    if (!authToken) return reply.code(401).send({ message: "invalid session token" });

    // @ts-ignore
    const over = new Date(authToken.createdAt).getTime() < new Date(Date.now()).getTime() - (3600000 * 24)

    if (over) {
      try {
        await prisma.token.update({
          where: {
            token,
          },
          data: { expired: true }
        })
      } catch (error) {
        return reply.code(500).send({ message: "oops something went wrong" });
      }
    }

    const expired = authToken.expired
    if (expired) return reply.code(401).send({ message: "session expired and you have been signed out" });

    request.user = user

    // @ts-ignore
    request.token = userToken

    return done
  })

  fastify.decorate("creator_auth", async (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {

    // @ts-ignore
    if (!request.user || !request.user.role || request.user.role === "collector") return reply.code(401).send({ message: "you are not authorised for this" })

    return done
  })

  fastify.decorate("admin_auth", async (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {

    // @ts-ignore
    if (request.user?.role !== "admin") return reply.code(401).send({ message: "admins only; you are not authorised for this" })

    return done
  })

  fastify.decorate("current_user", async (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {
    // @ts-ignore
    const { id } = request.params
    // @ts-ignore
    const { userId } = request.body

    const user = await prisma.user.findUnique({
      where: {
        // @ts-ignore
        email: request.user.email
      }
    })

    if (user?.id !== Number(id) && user?.id !== Number(userId)) return reply.code(401).send({ message: "ooops; you are not authorised for this" })


    return done
  })

  fastify.decorate("current_userId", async (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {
    // @ts-ignore
    const { userId, ownerId, creatorId, authorId } = request.body

    const user = await prisma.user.findUnique({
      where: {
        // @ts-ignore
        email: request.user.email
      }
    })

    // @ts-ignore
    if (
      user?.id !== userId &&
      user?.id !== ownerId &&
      user?.id !== creatorId &&
      user?.id !== authorId
    ) return reply.code(401).send({ message: "owner only; you are not authorised for this" })

    return done
  })

  fastify.decorate("current_userId_admin", async (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {
    // @ts-ignore
    const { userId, ownerId, creatorId, authorId, fromId, toId } = request.body

    console.log(request.user)

    const user = await prisma.user.findUnique({
      where: {
        // @ts-ignore
        email: request.user.email
      }
    })

    if (
      user?.id !== userId &&
      user?.id !== ownerId &&
      user?.id !== creatorId &&
      user?.id !== authorId &&
      user?.id !== fromId &&
      user?.id !== toId &&
      // @ts-ignore
      !request.user && !request.user.role && request.user.role !== "admin" &&
      // @ts-ignore
      user?.id !== request.user.id
    ) return reply.code(401).send({ message: "specific roles; you are not authorised for this" })

    return done
  })
})

