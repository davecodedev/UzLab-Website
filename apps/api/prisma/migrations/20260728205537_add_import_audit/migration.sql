-- CreateEnum
CREATE TYPE "ImportRunStatus" AS ENUM ('SUCCESS', 'NO_CHANGES', 'REFUSED', 'FAILED');

-- AlterTable
ALTER TABLE "Laboratory" ADD COLUMN     "disappearedAt" TIMESTAMP(3),
ADD COLUMN     "lastSeenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ImportRun" (
    "id" TEXT NOT NULL,
    "register" "NationalRegister" NOT NULL,
    "status" "ImportRunStatus" NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "scraped" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "disappeared" INTEGER NOT NULL DEFAULT 0,
    "reappeared" INTEGER NOT NULL DEFAULT 0,
    "fetchFailures" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "warnings" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "ImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportRun_register_startedAt_idx" ON "ImportRun"("register", "startedAt");

-- CreateIndex
CREATE INDEX "ImportRun_startedAt_idx" ON "ImportRun"("startedAt");

-- CreateIndex
CREATE INDEX "Laboratory_disappearedAt_idx" ON "Laboratory"("disappearedAt");

