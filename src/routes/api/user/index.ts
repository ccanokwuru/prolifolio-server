import { Type } from "@sinclair/typebox";
import { Contact, PrismaClient, Profile } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";
import { PAGINATION_ITEMS } from "../../../utils/paginationHelper";
const prisma = new PrismaClient();

interface UserData extends Profile {
  email: string;
}

const userRoute: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // update user
  fastify.put<{ Params: { user: string }; Body: UserData }>(
    "/update-profile",
    {
      schema: {
        body: Type.Object({
          email: Type.String({ format: "email", maxLength: 500 }),
          first_name: Type.String({ minLength: 2, maxLength: 200 }),
          last_name: Type.String({ minLength: 2, maxLength: 200 }),
          avatar: Type.Optional(Type.String({ minLength: 5, maxLength: 500 })),
          display_name: Type.Optional(
            Type.String({ minLength: 2, maxLength: 200 })
          ),
        }),
      },
      preHandler: fastify.auth(
        [
          // @ts-ignore
          fastify.authenticate,
        ],
        { run: "all" }
      ),
    },
    async function (request, reply) {
      const { email, first_name, last_name, other_name, avatar, display_name } =
        request.body;

      try {
        const profile = await prisma.profile.update({
          // @ts-ignore
          where: { id: request.user.userId },
          data: {
            first_name,
            last_name,
            other_name,
            avatar,
            display_name,
            user: {
              update: {
                email,
              },
            },
          },
          include: {
            user: {
              select: {
                email: true,
                role: true,
              },
            },
          },
        });

        return {
          message: "successful",
          profile,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // delete user
  fastify.delete(
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
      try {
        await prisma.profile.delete({
          where: {
            // @ts-ignore
            id: request.user.userId,
          },
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

  // become artist user
  fastify.post(
    "/become-artist",
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
      try {
        const isAreadyArtist = await prisma.artist.findFirst({
          where: {
            // @ts-ignore
            profileId: request.user.userId,
          },
          include: {
            profile: true,
          },
        });
        if (isAreadyArtist)
          return reply.send({
            message: "your are an existing artist on this platform",
            artist: isAreadyArtist,
          });
        const artist = await prisma.artist.create({
          data: {
            // @ts-ignore
            profileId: request.user.userId,
          },
          include: {
            profile: true,
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

  // get all my orders
  fastify.get<{ Querystring: { page?: number } }>(
    "/get-jobs",
    {
      schema: {
        querystring: Type.Optional(
          Type.Object({
            page: Type.Optional(Type.Number({ default: 1 })),
          })
        ),
      },
      preHandler: fastify.auth([
        // @ts-ignore
        fastify.authenticate,
      ]),
    },
    async function (request, reply) {
      try {
        const count = await prisma.job.count({
          where: {
            // @ts-ignore
            userId: request.user.userId,
          },
        });
        const { page } = request.query;
        const skip = page ? Number(page - 1) * PAGINATION_ITEMS : 0;

        const orders = await prisma.job.groupBy({
          by: ["categoryId", "createdAt"],
          skip,
          take: PAGINATION_ITEMS,
          where: {
            OR: [
              {
                // @ts-ignore
                ownerId: request.user.userId,
              },
            ],
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        return {
          orders,
          total: count,
          pages: count / PAGINATION_ITEMS,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get all my orders
  fastify.get<{ Querystring: { page?: number } }>(
    "/get-orders",
    {
      schema: {
        querystring: Type.Optional(
          Type.Object({
            page: Type.Optional(Type.Number({ default: 1 })),
          })
        ),
      },
      preHandler: fastify.auth([
        // @ts-ignore
        fastify.authenticate,
      ]),
    },
    async function (request, reply) {
      try {
        const count = await prisma.order.count({
          where: {
            // @ts-ignore
            userId: request.user.userId,
          },
        });
        const { page } = request.query;
        const skip = page ? Number(page - 1) * PAGINATION_ITEMS : 0;

        const orders = await prisma.order.groupBy({
          by: ["status", "createdAt"],
          skip,
          take: PAGINATION_ITEMS,
          where: {
            OR: [
              {
                // @ts-ignore
                userId: request.user.userId,
              },
            ],
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        return {
          orders,
          total: count,
          pages: count / PAGINATION_ITEMS,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // add user contact
  fastify.post<{ Body: Contact }>(
    "/add-contact",
    {
      schema: {
        body: Type.Object({
          phone: Type.String({ minLength: 5, maxLength: 20 }),
          email: Type.Optional(
            Type.String({ format: "email", maxLength: 500 })
          ),
          address: Type.String({ minLength: 5, maxLength: 500 }),
          city: Type.String({ minLength: 5, maxLength: 100 }),
          state: Type.String({ minLength: 5, maxLength: 100 }),
          country: Type.String({ minLength: 5, maxLength: 100 }),
          zipcode: Type.String({ minLength: 5, maxLength: 10 }),
          position: Type.Optional(
            Type.String({ minLength: 2, maxLength: 100 })
          ),
        }),
      },
      preHandler: fastify.auth(
        [
          // @ts-ignore
          fastify.authenticate,
        ],
        { run: "all" }
      ),
    },
    async function (request, reply) {
      const { phone, position, address, zipcode, city, state, country } =
        request.body;

      const errors: string[] = [];

      if (!phone.length) errors.push("phone number is required");
      if (!address.length) errors.push("address is required");
      if (!city.length) errors.push("city is required");
      if (!state.length) errors.push("state is required");
      if (!country.length) errors.push("address is required");
      if (!zipcode.length) errors.push("zipcode is required");

      if (errors.length)
        return reply.code(406).send({
          message: "Failed",
          errors,
        });

      try {
        const contact = await prisma.contact.create({
          data: {
            city,
            type: request.body.type,
            phone,
            email: request.body.email,
            position,
            address,
            zipcode,
            state,
            country,
            // @ts-ignore
            ownerId: request.user?.userId,
          },
        });
        return {
          message: contact ? "successful" : "failed",
          contact,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // edit user contact
  fastify.put<{ Body: Contact; Params: { contact: string } }>(
    "/edit-contact/:contact",
    {
      schema: {
        body: Type.Object({
          phone: Type.String({ minLength: 5, maxLength: 20 }),
          email: Type.Optional(
            Type.String({ format: "email", maxLength: 500 })
          ),
          address: Type.String({ minLength: 5, maxLength: 500 }),
          city: Type.String({ minLength: 5, maxLength: 100 }),
          state: Type.String({ minLength: 5, maxLength: 100 }),
          country: Type.String({ minLength: 5, maxLength: 100 }),
          zipcode: Type.String({ minLength: 5, maxLength: 10 }),
          position: Type.Optional(
            Type.String({ minLength: 2, maxLength: 100 })
          ),
        }),
      },
      preHandler: fastify.auth(
        [
          // @ts-ignore
          fastify.authenticate,
        ],
        { run: "all" }
      ),
    },
    async function (request, reply) {
      const { phone, position, address, zipcode, city, state, country } =
        request.body;

      const errors: string[] = [];

      if (!phone?.length) errors.push("phone number is required");
      if (!address?.length) errors.push("address is required");
      if (!city?.length) errors.push("city is required");
      if (!state?.length) errors.push("state is required");
      if (!country?.length) errors.push("address is required");
      if (!zipcode?.length) errors.push("zipcode is required");

      if (errors.length)
        return reply.code(406).send({
          message: "Failed",
          errors,
        });

      try {
        const contactExits = await prisma.contact.findFirst({
          where: {
            id: request.body.id,
            // @ts-ignore
            ownerId: request.user.userId,
          },
        });

        // @ts-ignore
        if (!contactExits) return reply.unauthorized();

        const contact = await prisma.contact.update({
          where: {
            id: request.params.contact,
          },
          data: {
            city,
            type: request.body.type,
            phone,
            email: request.body.email,
            position,
            address,
            zipcode,
            state,
            country,
          },
        });
        return reply.send({
          message: contact ? "successful" : "failed",
          contact,
        });
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // delete user contact
  fastify.delete<{ Body: { id: string } }>(
    "/delete-contact",
    {
      schema: {
        body: Type.Object({
          id: Type.String({ format: "uuid" }),
        }),
      },
      preHandler: fastify.auth(
        [
          // @ts-ignore
          fastify.authenticate,
        ],
        { run: "all" }
      ),
    },
    async function (request, reply) {
      const { id } = request.body;

      const errors: string[] = [];

      if (!id?.length) errors.push("phone number is required");

      if (errors.length)
        return reply.code(406).send({
          message: "Failed",
          errors,
        });

      try {
        const contactExits = await prisma.contact.findFirst({
          where: {
            id: request.body.id,
            // @ts-ignore
            ownerId: request.user.userId,
          },
        });

        // @ts-ignore
        if (!contactExits) return reply.unauthorized();

        const contact = await prisma.contact.delete({
          where: {
            id: request.body.id,
          },
        });
        return reply.send({
          message: contact ? "successful" : "failed",
          contact,
        });
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get one user contact
  fastify.get<{ Params: { contact: string } }>(
    "/get-contact/:contact",
    {
      schema: {
        params: Type.Object({
          contact: Type.String({ format: "uuid" }),
        }),
      },
      preHandler: fastify.auth(
        [
          // @ts-ignore
          fastify.authenticate,
        ],
        { run: "all" }
      ),
    },
    async function (request, reply) {
      try {
        const contact = await prisma.contact.findFirst({
          where: {
            id: request.params.contact,
            // @ts-ignore
            ownerId: request.user?.userId,
          },
        });

        // @ts-ignore
        return reply.code(contact ? 200 : 404).send({
          message: contact ? "successful" : "not found",
          contact,
        });
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get all user contact
  fastify.get(
    "/all-contact/",
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
      try {
        const contacts = await prisma.contact.findMany({
          where: {
            // @ts-ignore
            ownerId: request.user?.userId,
          },
        });

        // @ts-ignore
        return reply.code(contacts ? 200 : 404).send({
          message: contacts ? "successful" : "not found",
          contacts,
        });
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get all user interests
  fastify.get(
    "/all-interests/",
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
      try {
        const interests = await prisma.skill.findMany({
          where: {
            users: {
              some: {
                // @ts-ignore
                id: request.user?.userId,
              },
            },
          },
        });

        // @ts-ignore
        return reply.code(interests ? 200 : 404).send({
          message: interests ? "successful" : "not found",
          interests,
        });
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get one user interest
  fastify.get<{ Params: { interest: string } }>(
    "/get-interest/:interest",
    {
      schema: {
        params: Type.Object({
          interest: Type.String({ format: "uuid" }),
        }),
      },
      preHandler: fastify.auth(
        [
          // @ts-ignore
          fastify.authenticate,
        ],
        { run: "all" }
      ),
    },
    async function (request, reply) {
      try {
        const interest = await prisma.skill.findFirst({
          where: {
            id: request.params.interest,
            users: {
              some: {
                // @ts-ignore
                id: request.user?.userId,
              },
            },
          },
          include: {
            category: {
              include: { works: true },
            },
          },
        });

        // @ts-ignore
        return reply.code(interest ? 200 : 404).send({
          message: interest ? "successful" : "not found",
          interest,
        });
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // add user interest
  fastify.post<{ Body: { id: string } }>(
    "/add-interest",
    {
      schema: {
        body: Type.Object({
          intererst: Type.String({ format: "uuid" }),
        }),
      },
      preHandler: fastify.auth(
        [
          // @ts-ignore
          fastify.authenticate,
        ],
        { run: "all" }
      ),
    },
    async function (request, reply) {
      const { id } = request.body;

      try {
        const interest = await prisma.profile.update({
          where: {
            // @ts-ignore
            id: request.user.userId,
          },
          data: {
            interests: {
              connect: { id },
            },
          },
        });

        // @ts-ignore
        return reply.code(interest ? 200 : 404).send({
          message: interest ? "successful" : "not found",
          interest,
        });
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // add many user interests
  fastify.post<{ Body: { ids: string[] } }>(
    "/add-interest/multiple",
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
      const { ids } = request.body;

      try {
        const allIds: object[] = [];

        ids.forEach((id) => {
          allIds.push({ id });
        });
        const interest = await prisma.profile.update({
          where: {
            // @ts-ignore
            id: request.user?.userId,
          },
          data: {
            interests: {
              connect: allIds,
            },
          },
        });

        // @ts-ignore
        return reply.code(interest ? 200 : 404).send({
          message: interest ? "successful" : "not found",
          interest,
        });
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // remove user interest
  fastify.delete<{ Body: { id: string } }>(
    "/remove-interest",
    {
      schema: {
        body: Type.Object({
          id: Type.String({ format: "uuid" }),
        }),
      },
      preHandler: fastify.auth(
        [
          // @ts-ignore
          fastify.authenticate,
        ],
        { run: "all" }
      ),
    },
    async function (request, reply) {
      const { id } = request.body;

      try {
        const interest = await prisma.profile.update({
          where: {
            // @ts-ignore
            id: request.user.userId,
          },
          data: {
            interests: {
              disconnect: {
                id,
              },
            },
          },
        });

        // @ts-ignore
        return reply.code(interest ? 200 : 404).send({
          message: interest ? "successful" : "not found",
          interest,
        });
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // get user
  fastify.get<{ Params: { user: string } }>(
    "/:user",
    {
      schema: {
        params: Type.Object({
          user: Type.String({ format: "uuid" }),
        }),
      },
    },
    async function (request, reply) {
      const { user } = request.params;

      try {
        const profile = await prisma.profile.findUnique({
          where: { id: user },
          include: {
            user: {
              select: {
                email: true,
                role: true,
              },
            },
          },
        });
        return {
          profile,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );
};

export default userRoute;
