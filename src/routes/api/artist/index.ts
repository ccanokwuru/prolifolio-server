import { PrismaClient, Skill, Work } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";
const prisma = new PrismaClient();

interface WorkI extends Work {
  files: {
    images: string[];
    videos?: string[];
  };
  skills: string[];
}

const artistRoute: FastifyPluginAsync = async (
  fastify,
  opts
): Promise<void> => {
  // get artist
  fastify.get<{ Params: { artist: string } }>(
    "/a/:artist",
    async function (request, reply) {
      const { artist } = request.params;

      try {
        const artistData = await prisma.artist.findUnique({
          where: { id: artist },
          include: {
            profile: true,
            skills: {
              select: {
                id: true,
                name: true,
                categoryId: true,
              },
            },
            _count: {
              select: {
                works: true,
              },
            },
          },
        });
        return {
          artist: artistData,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get all artists
  fastify.get("/get-all", async function (request, reply) {
    try {
      const artists = await prisma.artist.findMany({
        include: {
          profile: {
            select: {
              display_name: true,
            },
          },
          skills: {
            select: {
              id: true,
              name: true,
              categoryId: true,
            },
          },
          _count: {
            select: {
              works: true,
            },
          },
        },
      });
      return {
        artists,
      };
    } catch (error) {
      console.log(error);
      return reply.internalServerError();
    }
  });

  // delete artist account
  fastify.delete<{ Body: { artistId: string } }>(
    "/delete",
    {
      preHandler: fastify.auth(
        [
          // @ts-ignore
          fastify.authenticate,
        ],
        { run: "all" }
      ),
    },
    async function (request, reply) {
      const { artistId } = request.body;
      if (!artistId) return reply.notAcceptable("artistId is required");

      try {
        await prisma.artist.delete({
          where: { id: artistId },
        });
        return {
          message: "successful",
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // add artist skill
  fastify.post<{
    Body: Skill;
  }>(
    "/new-skill",
    {
      preHandler: fastify.auth(
        [
          // @ts-ignore
          fastify.authenticate,
        ],
        { run: "all" }
      ),
    },
    async function (request, reply) {
      const errors: string[] = [];
      const { name, description, categoryId } = request.body;

      // check for required field
      if (!name?.length) errors.push("name of skill is required");
      if (!description?.length) errors.push("description of skill is required");
      if (!categoryId?.length) errors.push("categoryId of skill is required");

      if (errors.length)
        return reply.code(406).send({
          message: "Failed",
          errors,
        });

      // check if skill already exit under the same category connect or create skill
      try {
        const skillCheck = await prisma.skill.findFirst({
          where: {
            name: {
              equals: name,
              mode: "insensitive",
            },
            categoryId,
          },
        });

        const artist = await prisma.artist.update({
          where: {
            // @ts-ignore
            userId: request.user.userId,
          },
          data: {
            skills: {
              connectOrCreate: {
                where: skillCheck ? skillCheck : { id: "" },
                create: {
                  name,
                  description,
                  categoryId,
                },
              },
            },
          },
          include: { skills: true },
        });

        return {
          message: "successful",
          artist,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // link to skills
  fastify.post<{
    Body: { skills: string[] };
  }>(
    "/link-skills",
    {
      preHandler: fastify.auth(
        [
          // @ts-ignore
          fastify.authenticate,
          // @ts-ignore
          fastify.is_owner,
        ],
        { run: "all" }
      ),
    },
    async function (request, reply) {
      const errors: string[] = [];
      const { skills } = request.body;

      // check for required field
      if (!skills?.length) errors.push("ids of skill(s) is required");

      if (errors.length)
        return reply.code(406).send({
          message: "Failed",
          errors,
        });

      const allIds: object[] = [];

      skills.forEach((id) => {
        allIds.push({ id });
      });

      // check if skill already exit under the same category connect or create skill
      try {
        const artist = await prisma.artist.update({
          where: {
            // @ts-ignore
            userId: request.user.userId,
          },
          data: {
            skills: {
              connect: allIds,
            },
          },
        });

        return {
          message: "successful",
          artist,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // remove a skill
  fastify.delete<{
    Body: { id: string };
  }>(
    "/remove-skills",
    {
      preHandler: fastify.auth(
        [
          // @ts-ignore
          fastify.authenticate,
        ],
        { run: "all" }
      ),
    },
    async function (request, reply) {
      if (!request.body.id) return reply.notAcceptable("skill id is required");
      // check disconnect skill from artist
      try {
        const artist = await prisma.artist.update({
          where: {
            // @ts-ignore
            userId: request.user.userId,
          },
          data: {
            skills: {
              disconnect: {
                id: request.body.id,
              },
            },
          },
          include: {
            skills: true,
          },
        });

        return {
          message: "successful",
          artist,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get all artist work
  fastify.get<{ Params: { artist: string } }>(
    "/a/:artist/all-works",
    async function (request, reply) {
      try {
        const artist = await prisma.artist.findUnique({
          where: { id: request.params.artist },
          include: {
            works: true,
          },
        });
        return {
          artist,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // add artist work
  fastify.post<{
    Body: WorkI;
  }>(
    "/add-work",
    {
      preHandler: fastify.auth(
        [
          // @ts-ignore
          fastify.authenticate,
        ],
        { run: "all" }
      ),
    },
    async function (request, reply) {
      const errors: string[] = [];
      const { categoryId, title, files, skills } = request.body;

      // check for required field
      if (!title?.length) errors.push("title of work is required");
      if (!files?.images)
        errors.push("files for work is/are required required");
      if (!categoryId?.length) errors.push("categoryId of skill is required");

      if (errors.length)
        return reply.code(406).send({
          message: "Failed",
          errors,
        });

      const allIds: object[] = [];

      skills.forEach((id) => {
        allIds.push({ id });
      });

      // check if skill already exit under the same category connect or create skill
      try {
        const work = await prisma.work.create({
          data: {
            ...request.body,
            files: JSON.stringify(files),
            skills: {
              connect: allIds,
            },
          },
          include: {
            skills: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                description: true,
                p_category: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                  },
                },
              },
            },
          },
        });

        return {
          message: "successful",
          work,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // edit artist work
  fastify.put<{
    Params: {
      work: string;
    };
    Body: WorkI;
  }>(
    "/edit-work/:work",
    {
      preHandler: fastify.auth(
        [
          // @ts-ignore
          fastify.authenticate,
        ],
        { run: "all" }
      ),
    },
    async function (request, reply) {
      const errors: string[] = [];
      const { categoryId, title, files, skills } = request.body;

      // check for required field
      if (!title?.length) errors.push("title of work is required");
      if (!files?.images)
        errors.push("files for work is/are required required");
      if (!categoryId?.length) errors.push("categoryId of skill is required");

      if (errors.length)
        return reply.code(406).send({
          message: "Failed",
          errors,
        });

      const allIds: object[] = [];

      skills.forEach((id) => {
        allIds.push({ id });
      });

      // check if skill already exit under the same category connect or create skill
      try {
        const validateOwnership = await prisma.work.findFirst({
          where: {
            id: request.params.work,
            artist: {
              // @ts-ignore
              userId: request.user.userId,
            },
          },
        });
        if (!validateOwnership)
          return reply.unauthorized("not found or you lack ownership right");

        const work = await prisma.work.update({
          where: {
            id: request.params.work,
          },
          data: {
            ...request.body,
            files: JSON.stringify(files),
            skills: {
              connect: allIds,
            },
          },
          include: {
            skills: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                description: true,
                p_category: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                  },
                },
              },
            },
          },
        });

        return {
          message: "successful",
          work,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // delete artist work
  fastify.delete<{
    Body: { id: string };
  }>(
    "/delete-work/",
    {
      preHandler: fastify.auth(
        [
          // @ts-ignore
          fastify.authenticate,
        ],
        { run: "all" }
      ),
    },
    async function (request, reply) {
      // check for required field

      if (request.body?.id?.length)
        return reply.code(406).send({
          message: "Failed",
          errors: ["work id is required"],
        });

      // check if skill already exit under the same category connect or create skill
      try {
        const validateOwnership = await prisma.work.findFirst({
          where: {
            id: request.body.id,
            artist: {
              // @ts-ignore
              userId: request.user.userId,
            },
          },
        });
        if (!validateOwnership)
          return reply.unauthorized("not found or you lack ownership right");

        const work = await prisma.work.delete({
          where: {
            id: request.body.id,
          },
        });

        return {
          message: "successful",
          work,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );
};

export default artistRoute;
