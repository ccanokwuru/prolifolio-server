import { FastifyPluginAsync } from "fastify";
import { File } from "fastify-formidable";
import { existsSync, mkdirSync, renameSync } from "fs";
import { join } from "path";

interface UploadI {
  dest: string;
  file: File;
}

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
      // preHandler: fastify.auth(
      //   [
      //     // @ts-ignore
      //     fastify.authenticate,
      //   ],
      //   { run: "all" }
      // ),
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

        return { url };
      } catch (error) {
        console.log(error);
        return error;
        // return reply.internalServerError();
      }
    }
  );
};

export default resourceRoute;
