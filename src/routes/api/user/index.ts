import { Contact, PrismaClient, User } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";
const prisma = new PrismaClient();

interface UserData extends User {
  email: string;
}

const userRoute: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // get user
  fastify.get<{ Params: { user: string } }>(
    "/u/:user",
    async function (request, reply) {
      const { user } = request.params;

      try {
        const userData = await prisma.user.findUnique({
          where: { id: user },
          select: {
            first_name: true,
            last_name: true,
            other_name: true,
            createdAt: true,
            updatedAt: true,
            avatar: true,
            id: true,
            auth: {
              select: {
                email: true,
                role: true,
              },
            },
          },
        });
        return {
          user: {
            ...userData,
            auth: undefined,
            email: userData?.auth?.email,
            role: userData?.auth?.role,
          },
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // update user
  fastify.post<{ Params: { user: string }; Body: UserData }>(
    "/u/:user/update",
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
      const { user } = request.params;
      const { email, first_name, last_name, other_name, avatar } = request.body;

      try {
        const userData = await prisma.user.update({
          where: { id: user },
          data: {
            first_name,
            last_name,
            other_name,
            avatar,
            auth: {
              update: {
                email,
              },
            },
          },
          select: {
            first_name: true,
            last_name: true,
            other_name: true,
            createdAt: true,
            updatedAt: true,
            avatar: true,
            id: true,
            auth: {
              select: {
                email: true,
                role: true,
              },
            },
          },
        });

        return {
          message: "successful",
          user: {
            ...userData,
            auth: undefined,
            email: userData?.auth?.email,
            role: userData?.auth?.role,
          },
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // delete user
  fastify.delete<{ Body: { userId: string } }>(
    "/delete",
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
      const { userId } = request.body;

      try {
        await prisma.auth.delete({
          where: { userId },
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
        const artist = await prisma.user.update({
          where: {
            // @ts-ignore
            id: request.user.userId,
          },
          data: {
            artist: {
              connectOrCreate: {
                where: {
                  // @ts-ignore
                  userId: request.userId,
                },
                create: {},
              },
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

  // add user contact
  fastify.post<{
    Body: Contact;
  }>(
    "/add-contact",
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
            userId: request.user?.userId,
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
  fastify.post<{
    Body: Contact;
    Params: {
      contact: string;
    };
  }>(
    "/edit-contact/:contact",
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
        const contact = await prisma.contact.findFirst({
          where: {
            id: request.body.id,
            user: {
              // @ts-ignore
              id: request.user.userId,
            },
          },
        });

        // @ts-ignore
        if (!contact)
          return reply.code(404).send({
            message: "Failed",
            errors: [`not found or owner only`],
          });
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }

      try {
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
  fastify.delete<{
    Body: { id: string };
  }>(
    "/delete-contact",
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
      const { id } = request.body;

      const errors: string[] = [];

      if (!id?.length) errors.push("phone number is required");

      if (errors.length)
        return reply.code(406).send({
          message: "Failed",
          errors,
        });

      try {
        const contact = await prisma.contact.findFirst({
          where: {
            id: request.body.id,
            user: {
              // @ts-ignore
              id: request.user.userId,
            },
          },
        });

        // @ts-ignore
        if (!contact)
          return reply.code(404).send({
            message: "Failed",
            errors: [`not found or owner only`],
          });
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }

      try {
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
  fastify.get<{
    Params: {
      contact: string;
    };
  }>(
    "/get-contact/:contact",
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
        const contact = await prisma.contact.findFirst({
          where: {
            id: request.params.contact,
            user: {
              // @ts-ignore
              id: request.user?.userId,
            },
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
            user: {
              // @ts-ignore
              id: request.user?.userId,
            },
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
  fastify.post<{ Body: { id?: string } }>(
    "/add-interest",
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
      const { id } = request.body;

      if (!id)
        return reply.code(406).send({
          message: "missing fields",
          errors: [`provide "id" of your interest`],
        });
      try {
        const interest = await prisma.user.update({
          where: {
            // @ts-ignore
            id: request.user.userId,
          },
          data: {
            interests: {
              connect: [{ id }],
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

      if (!ids?.length)
        return reply.code(406).send({
          message: "missing fields",
          errors: [`provide "ids" of your interest`],
        });
      try {
        const allIds: object[] = [];

        ids.forEach((id) => {
          allIds.push({ id });
        });
        const interest = await prisma.user.update({
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
  fastify.delete<{ Body: { id?: string } }>(
    "/remove-interest",
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
      const { id } = request.body;

      if (!id)
        return reply.code(406).send({
          message: "missing fields",
          errors: [`provide "id" of your interest`],
        });
      try {
        const interest = await prisma.user.update({
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
};

export default userRoute;
