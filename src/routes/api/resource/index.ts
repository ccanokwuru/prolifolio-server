import { FastifyPluginAsync } from "fastify";
import { File } from "fastify-formidable";
import { rename } from "fs";

interface UploadI {
  dest: string;
  file: File;
}

const setPath = async (data: UploadI) => {
  const { dest, file } = data;

  const fileType = file?.mimetype;
  const locType = fileType?.split("/")[0];
  const newPath = `../../../uploads${dest}/${
    locType === "video" || locType === "image" ? locType : "others"
  }/${file.newFilename}`;

  let info: boolean = false;

  rename(file.filepath, newPath, (err) => {
    console.error(err);
    if (err) return console.error(err);
    console.log("success!");
    info = true;
  });

  return info ? { ...file, filepath: newPath } : file;
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
        return reply.internalServerError();
      }
    }
  );
};

export default resourceRoute;
