import { IFiles } from './../../interface';
import { FastifyPluginAsync } from "fastify";

const uploadRoute: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post<{ Body: IFiles }>("/", {
    preHandler: fastify.auth([
      // @ts-ignore
      fastify.authenticate,
    ], { run: 'all' })
  }, async function (request, reply) {
    const { body } = request

    // @ts-ignore
    const { files } = request.files

    return {
      body
    };
  });
};

export default uploadRoute;
