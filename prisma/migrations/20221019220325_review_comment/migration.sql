/*
  Warnings:

  - You are about to drop the column `originalId` on the `Review` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_originalId_fkey";

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "reviewId" UUID,
ALTER COLUMN "postId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Review" DROP COLUMN "originalId";

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;
