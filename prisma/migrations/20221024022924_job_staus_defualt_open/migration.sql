-- AlterTable
ALTER TABLE "Job" ALTER COLUMN "status" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'open';
