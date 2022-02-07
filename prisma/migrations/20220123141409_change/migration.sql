/*
  Warnings:

  - You are about to drop the column `mainImage` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `images` on the `Work` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Post" DROP COLUMN "mainImage",
ADD COLUMN     "thumbnail" VARCHAR(500);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatar" VARCHAR(500);

-- AlterTable
ALTER TABLE "Work" DROP COLUMN "images",
ADD COLUMN     "files" JSONB;
