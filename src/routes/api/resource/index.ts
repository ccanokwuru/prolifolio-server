import { FastifyPluginAsync } from "fastify";
import { File } from "fastify-formidable";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  renameSync,
  statSync,
} from "fs";
import { join } from "path";

import MimeType = require("mime-types");
import { Type } from "@sinclair/typebox";
import { PrismaClient } from "@prisma/client";

interface UploadI {
  dest: "profile" | "art" | "article" | "chat";
  file: File;
}
const prisma = new PrismaClient();

const setPath = async (data: UploadI) => {
  const { dest, file } = data;

  const fileType = file?.mimetype;
  const locType = fileType?.split("/")[0];
  const newPath = join(
    __dirname,
    `../../../uploads/${dest}/${
      locType === "video" || locType === "image" ? locType : "others"
    }`
  );

  let info: boolean = false;

  try {
    const dirExists = existsSync(newPath);
    console.log({ dirExists });

    if (!dirExists) {
      const dir = mkdirSync(newPath, { recursive: true });
      console.log({ dir });
    }

    renameSync(file.filepath, `${newPath}/${file.newFilename}`);
    info = true;
  } catch (err) {
    throw err;
  }

  return info ? { ...file, filepath: `${newPath}/${file.newFilename}` } : file;
};

const resourceRoute: FastifyPluginAsync = async (
  fastify,
  opts
): Promise<void> => {
  // upload profile image
  fastify.post<{ Body: { avatar: Blob | object } }>(
    "/upload-avatar",
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
        await request.parseMultipart();
        const files = request.files;

        const file = await setPath({
          // @ts-ignore
          file: files?.avatar,
          dest: "profile",
        });

        const url = file.filepath.split("/uploads")[1];

        await prisma.profile.update({
          where: {
            // @ts-ignore
            userId: request.user.id,
          },
          data: {
            avatar: `http://localhost:5000/api/resource${url}`,
          },
        });

        return {
          message: "successfull",
        };
      } catch (error) {
        console.log(error);
        // return error;
        return reply.internalServerError();
      }
    }
  );

  // upload work files
  fastify.post<{
    Body: { files?: Blob | object };
    Querystring: { type?: string };
  }>(
    "/upload-art",
    {
      preHandler: fastify.auth(
        [
          // @ts-ignore
          fastify.authenticate,
          // @ts-ignore
          fastify.is_artist_admin,
        ],
        { run: "all" }
      ),
      schema: {
        querystring: Type.Object({
          type: Type.Optional(Type.String({ default: "image" })),
        }),
      },
    },
    async function (request, reply) {
      try {
        await request.parseMultipart();
        const files = request.files;

        const file = await setPath({
          // @ts-ignore
          file: files?.file,
          dest: "art",
        });

        const url = file.filepath.split("/uploads")[1];

        return {
          type: request.query.type,
          url,
        };
      } catch (error) {
        console.log(error);
        return reply.internalServerError();
      }
    }
  );

  // upload article image
  fastify.post<{ Body: { file: Blob | object } }>(
    "/upload-article",
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
        await request.parseMultipart();
        const files = request.files;

        const file = await setPath({
          // @ts-ignore
          file: files?.file,
          dest: "article",
        });

        const url = file.filepath.split("/uploads")[1];

        return { url };
      } catch (error) {
        console.log(error);
        // return error;
        return reply.internalServerError();
      }
    }
  );

  // upload chat image
  fastify.post<{ Body: { file: Blob | object } }>(
    "/upload-chat",
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
        await request.parseMultipart();
        const files = request.files;

        const file = await setPath({
          // @ts-ignore
          file: files?.file,
          dest: "article",
        });

        const url = file.filepath.split("/uploads")[1];

        return { url };
      } catch (error) {
        console.log(error);
        // return error;
        return reply.internalServerError();
      }
    }
  );

  // get resource file
  fastify.get("/*", async function (request, reply) {
    const url = request.url;
    const path = url.split("/resource")[1];
    const file = join(__dirname, `../../../uploads/${path}`);
    try {
      const is = existsSync(file);
      if (!is) return reply.notFound();
      const mime = MimeType.lookup(file);
      const stat = statSync(file);
      reply.raw.writeHead(200, {
        "Content-Type": `${mime}`,
        "Content-Length": stat.size,
      });

      createReadStream(file).pipe(reply.raw);

      return;
    } catch (error) {
      console.log(error);
      return reply.notFound();
    }
  });
};

export default resourceRoute;
