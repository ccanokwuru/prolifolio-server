/*
  Warnings:

  - You are about to drop the `_ArtistToJob` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `status` to the `Job` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "JOB" AS ENUM ('open', 'locked', 'taken', 'closed');

-- DropForeignKey
ALTER TABLE "_ArtistToJob" DROP CONSTRAINT "_ArtistToJob_A_fkey";

-- DropForeignKey
ALTER TABLE "_ArtistToJob" DROP CONSTRAINT "_ArtistToJob_B_fkey";

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "status" "JOB" NOT NULL;

-- DropTable
DROP TABLE "_ArtistToJob";

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" UUID NOT NULL,
    "jobId" UUID,
    "cover" TEXT,
    "artistId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
