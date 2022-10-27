-- CreateEnum
CREATE TYPE "APPLICATION" AS ENUM ('pending', 'accepted', 'declined');

-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "status" "APPLICATION" DEFAULT 'pending';
