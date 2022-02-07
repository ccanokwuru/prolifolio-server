/*
  Warnings:

  - You are about to drop the `_Recieved` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `toId` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_Recieved" DROP CONSTRAINT "_Recieved_A_fkey";

-- DropForeignKey
ALTER TABLE "_Recieved" DROP CONSTRAINT "_Recieved_B_fkey";

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "toId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "_Recieved";

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
