import { join } from "path";
import AutoLoad, { AutoloadPluginOptions } from "fastify-autoload";
import { FastifyPluginAsync } from "fastify";
import fastifyCors from "fastify-cors";
import { fastifyCookie, FastifyCookieOptions } from "fastify-cookie";
import fastifyBcrypt from "fastify-bcrypt";
import fastifyAuth from "fastify-auth";
import { fastifyJwt } from "fastify-jwt";
import FastifyFormidable from "fastify-formidable";

export type AppOptions = {
  // Place your custom options for app below here.
} & Partial<AutoloadPluginOptions>;

const app: FastifyPluginAsync<AppOptions> = async (
  fastify,
  opts
): Promise<void> => {
  // Place here your custom code!

  fastify.register(fastifyCors, {
    origin: "*",
  });

  fastify.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET,
    parseOptions: {},
  } as FastifyCookieOptions);

  fastify.register(fastifyBcrypt, {
    saltWorkFactor: 10,
  });

  fastify.register(fastifyAuth);

  fastify.register(fastifyJwt, {
    secret: 'ac0544fe9c6d36b7451cb321239a9e954194972a27758e204118767155c5662b32c23ec9a7f9d5046689dbc8714e180359f1acd75639921ecffe3d40905ed1b4'
  })

  fastify.register(FastifyFormidable, {
    // addHooks: true,
    addContentTypeParser: true,
    formidable: {
      // maxFileSize: 1024 * 1024 * 20,
      // this folder will be automatic created by this plugin
      uploadDir: join(__dirname, 'uploads'),
    }
  })

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    options: opts
  })

  // This loads all plugins defined in routes
  // define your routes in one of these
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes'),
    options: opts
  })

};

export default app;
export { app }
