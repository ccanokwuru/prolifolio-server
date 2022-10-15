/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `Auth` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Skill` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Studio` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Work` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Auth" DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "Skill" DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "Studio" DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "Work" DROP COLUMN "deletedAt";
