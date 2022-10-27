/*
  Warnings:

  - You are about to drop the column `messageId` on the `Reaction` table. All the data in the column will be lost.
  - You are about to drop the column `workId` on the `Reaction` table. All the data in the column will be lost.
  - You are about to drop the `_ProfileToWork` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "ORDER" ADD VALUE 'cancelled';

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_p_messageId_fkey";

-- DropForeignKey
ALTER TABLE "Reaction" DROP CONSTRAINT "Reaction_messageId_fkey";

-- DropForeignKey
ALTER TABLE "Reaction" DROP CONSTRAINT "Reaction_workId_fkey";

-- DropForeignKey
ALTER TABLE "_ProfileToWork" DROP CONSTRAINT "_ProfileToWork_A_fkey";

-- DropForeignKey
ALTER TABLE "_ProfileToWork" DROP CONSTRAINT "_ProfileToWork_B_fkey";

-- AlterTable
ALTER TABLE "Reaction" DROP COLUMN "messageId",
DROP COLUMN "workId";

-- AlterTable
ALTER TABLE "Skill" ADD COLUMN     "parentId" UUID;

-- AlterTable
ALTER TABLE "Work" ALTER COLUMN "sellAs" DROP DEFAULT,
ALTER COLUMN "isSold" DROP NOT NULL,
ALTER COLUMN "isSold" DROP DEFAULT;

-- DropTable
DROP TABLE "_ProfileToWork";

-- CreateTable
CREATE TABLE "_Viewed" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateTable
CREATE TABLE "_Wishlist" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_Viewed_AB_unique" ON "_Viewed"("A", "B");

-- CreateIndex
CREATE INDEX "_Viewed_B_index" ON "_Viewed"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Wishlist_AB_unique" ON "_Wishlist"("A", "B");

-- CreateIndex
CREATE INDEX "_Wishlist_B_index" ON "_Wishlist"("B");

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_p_messageId_fkey" FOREIGN KEY ("p_messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Viewed" ADD CONSTRAINT "_Viewed_A_fkey" FOREIGN KEY ("A") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Viewed" ADD CONSTRAINT "_Viewed_B_fkey" FOREIGN KEY ("B") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Wishlist" ADD CONSTRAINT "_Wishlist_A_fkey" FOREIGN KEY ("A") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Wishlist" ADD CONSTRAINT "_Wishlist_B_fkey" FOREIGN KEY ("B") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
