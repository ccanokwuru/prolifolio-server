/*
  Warnings:

  - You are about to alter the column `rating` on the `Rating` table. The data in that column could be lost. The data in that column will be cast from `Real` to `Decimal`.

*/
-- AlterTable
ALTER TABLE "Rating" ALTER COLUMN "rating" SET DATA TYPE DECIMAL;
