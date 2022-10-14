import { PrismaClient } from "@prisma/client";
import { createVerifier } from "fast-jwt";
import { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from "fastify";
import fp from "fastify-plugin";
// import { ROLE } from "../types";

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
      let token = "";
      // token  = request.cookies ?? '';
      const { authorization } = request.headers;
      const authToken = authorization?.startsWith("Bearer ")
        ? authorization.split(" ")[1]
        : token;

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
        include: { auth: true },
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
        ...session.auth,
        password: undefined,
        token: authToken,
        deletedAt: undefined,
      };

      request.user = user;

      return done;
    }
  );

  // authorise owners only
  fastify.decorate(
    "is_owner",
    async (
      request: FastifyRequest,
      reply: FastifyReply,
      done: HookHandlerDoneFunction
    ) => {
      // @ts-ignore
      const { user } = request.params;
      // @ts-ignore
      const { userId, ownerId, creatorId, authorId } = request.body;

      const userInfo = request?.user;

      console.log(userInfo);

      // if (
      //   userInfo?.userId !== userId &&
      //   userInfo?.userId !== ownerId &&
      //   userInfo?.userId !== creatorId &&
      //   userInfo?.userId !== authorId &&
      //   userInfo?.userId !== user
      // )
      //   return reply.unauthorized(
      //     "owner only; you are not authorised for this"
      //   );
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
      console.log(request.user);
      return done;
      // return request.user?.role !== ROLE.ARTIST
      //   ? reply.unauthorized("owner only; you are not authorised for this")
      //   : done;
    }
  );

  // authorise owners & admins only
  fastify.decorate(
    "is_owner_admin",
    async (
      request: FastifyRequest,
      reply: FastifyReply,
      done: HookHandlerDoneFunction
    ) => {
      // @ts-ignore
      const { user } = request.params;
      // @ts-ignore
      const { userId, ownerId, creatorId, authorId } = request.body;

      const userInfo = JSON.parse(JSON.stringify(request.user));

      if (
        userInfo?.userId !== userId &&
        userInfo?.userId !== ownerId &&
        userInfo?.userId !== creatorId &&
        userInfo?.userId !== authorId &&
        userInfo?.userId !== user &&
        userInfo?.role !== "admin"
      )
        return reply.unauthorized(
          "specific roles; you are not authorised for this"
        );
      return done;

      return done;
    }
  );
});
