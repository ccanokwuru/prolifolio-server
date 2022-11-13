import { join } from "path";
import AutoLoad, { AutoloadPluginOptions } from "@fastify/autoload";
import { FastifyPluginAsync } from "fastify";
import fastifyAuth from "@fastify/auth";
import fastifyJwt from "@fastify/jwt";
import fastifyBcrypt from "fastify-bcrypt";
import { FastifyCookieOptions } from "@fastify/cookie";
import fastifyCookie = require("@fastify/cookie");
import fastifyCors from "@fastify/cors";
import websocketPlugin from "@fastify/websocket";

export type AppOptions = {
  // Place your custom options for app below here.
} & Partial<AutoloadPluginOptions>;

const app: FastifyPluginAsync<AppOptions> = async (
  fastify,
  opts
): Promise<void> => {
  // const server = fastify.withTypeProvider<TypeBoxTypeProvider>();
  // Place here your custom code!

  fastify.register(fastifyCors, {
    origin: "*",
  });

  fastify.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET,
    parseOptions: {
      domain: "*",
      path: "/",
      signed: true,
    },
  } as FastifyCookieOptions);

  fastify.register(fastifyBcrypt, {
    saltWorkFactor: Number(process.env.CRYPTO_SALT) || 10,
  });

  fastify.register(websocketPlugin, {
    options: {
      clientTracking: true,
    },
  });

  fastify.register(fastifyAuth);

  fastify.register(fastifyJwt, {
    secret:
      process.env.JWT_SECRET ||
      "ac0544fe9c6d36b7451cb321239a9e954194972a27758e204118767155c5662b32c23ec9a7f9d5046689dbc8714e180359f1acd75639921ecffe3d40905ed1b4",
    sign: {
      expiresIn: 3e5,
    },
  });

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  void fastify.register(AutoLoad, {
    dir: join(__dirname, "plugins"),
    options: opts,
  });

  // This loads all plugins defined in routes
  // define your routes in one of these
  void fastify.register(AutoLoad, {
    dir: join(__dirname, "routes"),
    options: opts,
  });
};

export default app;
export { app };
