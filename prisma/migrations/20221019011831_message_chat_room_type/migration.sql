-- CreateEnum
CREATE TYPE "CHAT" AS ENUM ('group', 'personal');

-- AlterTable
ALTER TABLE "ChatRoom" ADD COLUMN     "name" VARCHAR(200),
ADD COLUMN     "type" "CHAT" NOT NULL DEFAULT 'personal';
