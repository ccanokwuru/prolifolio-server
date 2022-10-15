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
          include: { auth: true },
        });
        return {
          user: {
            ...userData,
            auth: undefined,
            email: userData?.auth?.email,
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
          include: { auth: true },
        });

        return {
          message: "successful",
          user: { ...userData, email, auth: undefined },
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // delete user
  fastify.post<{ Body: { userId: string } }>(
    "/u/:user/delete",
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

      const userData = await prisma.auth.delete({
        where: { userId: userId },
      });

      if (!userData) reply.internalServerError();
      return {
        message: "successful",
      };
    }
  );

  // add user contact
  fastify.post<{
    Body: Contact;
    Params: {
      user: string;
    };
  }>(
    "/u/:user/add-contact",
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
            userId: request.params.user,
          },
          include: { user: true },
        });
        return {
          message: "successful",
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
      user: string;
      contact: string;
    };
  }>(
    "/u/:user/edit-contact/:contact",
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
          include: { user: true },
        });
        return {
          message: "successful",
          contact,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );
};

export default userRoute;
