/*
  Warnings:

  - You are about to drop the column `p_reviewId` on the `Review` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_p_reviewId_fkey";

-- AlterTable
ALTER TABLE "Review" DROP COLUMN "p_reviewId",
ADD COLUMN     "originalId" UUID;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_originalId_fkey" FOREIGN KEY ("originalId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;
