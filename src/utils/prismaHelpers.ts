import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const softDelete = async (table: string, where: object) => {
  // @ts-ignore
  const deleteTemp = await prisma[table].update({
    where,
    data: {
      deletedAt: new Date(),
    },
  });

  return deleteTemp;
};

const findManyNotDeleted = async (table: string, where: object) => {
  // @ts-ignore
  const single = await prisma[table].findMany({
    where: {
      deletedAt: null,
    },
  });

  return single;
};

const findNotDeleted = async (table: string, where: object) => {
  // @ts-ignore
  const single = await prisma[table].findMany({
    where: {
      deletedAt: null,
    },
  });

  return single;
};

export { softDelete, findManyNotDeleted };
