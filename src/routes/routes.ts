import { FastifyPluginAsync } from "fastify";

const worksRoute: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get("/", async function (request, reply) {
    return {
      message:"root route"
    }
  });
};

export default worksRoute;
