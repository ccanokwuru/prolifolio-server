import { FastifyPluginAsync } from "fastify";

const worksRoute: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get("/root/*", async function (request, reply) {
    return request.url
  });
};

export default worksRoute;
