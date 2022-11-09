/*
  Warnings:

  - You are about to drop the column `read` on the `Message` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Bidding" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "read",
ADD COLUMN     "forwarded" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "_readBy" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_readBy_AB_unique" ON "_readBy"("A", "B");

-- CreateIndex
CREATE INDEX "_readBy_B_index" ON "_readBy"("B");

-- AddForeignKey
ALTER TABLE "_readBy" ADD CONSTRAINT "_readBy_A_fkey" FOREIGN KEY ("A") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_readBy" ADD CONSTRAINT "_readBy_B_fkey" FOREIGN KEY ("B") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
