import { PrismaClient } from "@prisma/client";
import { createVerifier } from "fast-jwt";
import { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from "fastify";
import fp from "fastify-plugin";

const prisma = new PrismaClient();
const JWT_Verifier = createVerifier({ key: process.env.REFRESH_SECRET });

module.exports = fp(async function (fastify, opts) {
  // authenticate user
  fastify.decorate(
    "authenticate",
    async (
      request: FastifyRequest,
      reply: FastifyReply,
      done: HookHandlerDoneFunction
    ) => {
      // @ts-ignore
      const { authorization } = request.headers;
      const authToken = authorization?.startsWith("Bearer ")
        ? authorization.split(" ")[1]
        : "";

      // check if request has token
      if (!authToken.length) return reply.forbidden(`authentication required`);

      // check if request token is valid
      const tokenValid = fastify.jwt.verify(authToken);
      if (!tokenValid) return reply.unauthorized(`invalid or expired token`);

      // retreive token information from db and validate
      const session = await prisma.session.findUniqueOrThrow({
        where: {
          authToken,
        },
        include: {
          user: {
            include: {
              profile: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });

      if (!session || session.expired)
        return reply.unauthorized(`invalid or expired session`);

      const sessionValid = JWT_Verifier(session.token);
      if (!sessionValid) {
        try {
          await prisma.session.update({
            where: {
              id: session.id,
            },
            data: { expired: true },
          });
          return reply.unauthorized(
            `session expired and you have been signed out`
          );
        } catch (error) {
          return reply.internalServerError();
        }
      }
      const user = {
        ...session.user,
        profile: undefined,
        userId: session?.user?.profile?.id,
        token: authToken,
      };

      request.user = user;

      return done;
    }
  );

  // authorise artists only
  fastify.decorate(
    "is_artist",
    async (
      request: FastifyRequest,
      reply: FastifyReply,
      done: HookHandlerDoneFunction
    ) => {
      // @ts-ignore
      return request.user?.role !== "artists"
        ? reply.unauthorized("owner only; you are not authorised for this")
        : done;
    }
  );

  // authorise artists or admin only
  fastify.decorate(
    "is_artist_admin",
    async (
      request: FastifyRequest,
      reply: FastifyReply,
      done: HookHandlerDoneFunction
    ) => {
      // @ts-ignore
      return request.user?.role !== "artists" ||
        // @ts-ignore
        request.user?.role !== "admin"
        ? reply.unauthorized("owner only; you are not authorised for this")
        : done;
    }
  );

  // authorise admins only
  fastify.decorate(
    "is_admin",
    async (
      request: FastifyRequest,
      reply: FastifyReply,
      done: HookHandlerDoneFunction
    ) => {
      // @ts-ignore
      return request.user?.role !== "admin"
        ? reply.unauthorized("admin only")
        : done;
    }
  );
});
