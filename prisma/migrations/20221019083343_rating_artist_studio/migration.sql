/*
  Warnings:

  - You are about to drop the column `artistId` on the `Reaction` table. All the data in the column will be lost.
  - You are about to drop the column `studioId` on the `Reaction` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Reaction" DROP CONSTRAINT "Reaction_artistId_fkey";

-- DropForeignKey
ALTER TABLE "Reaction" DROP CONSTRAINT "Reaction_studioId_fkey";

-- AlterTable
ALTER TABLE "Reaction" DROP COLUMN "artistId",
DROP COLUMN "studioId";

-- CreateTable
CREATE TABLE "Rating" (
    "id" UUID NOT NULL,
    "rating" DECIMAL(65,30) NOT NULL,
    "profileId" UUID NOT NULL,
    "artistId" UUID,
    "studioId" UUID,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
