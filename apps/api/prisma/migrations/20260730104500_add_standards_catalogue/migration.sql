-- Standards catalogue: the documents laboratories are accredited against.
--
-- Additive only. ImportRun gains a second discriminator and loses the NOT NULL
-- on `register`; existing rows keep their values and every existing query that
-- filters on `register` keeps working unchanged.

-- CreateEnum
CREATE TYPE "StandardRegister" AS ENUM ('MGS', 'UZSTI');

-- CreateEnum
CREATE TYPE "StandardStatus" AS ENUM ('IN_FORCE', 'SUPERSEDED', 'WITHDRAWN', 'NOT_YET_IN_FORCE', 'UNKNOWN');

-- AlterTable
ALTER TABLE "ImportRun" ALTER COLUMN "register" DROP NOT NULL;
ALTER TABLE "ImportRun" ADD COLUMN "standardRegister" "StandardRegister";

-- CreateTable
CREATE TABLE "Standard" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "register" "StandardRegister" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT,
    "status" "StandardStatus" NOT NULL DEFAULT 'UNKNOWN',
    "statusLabel" TEXT,
    "icsCode" TEXT,
    "icsLabel" TEXT,
    "category" TEXT,
    "language" TEXT,
    "year" INTEGER,
    "pageCount" INTEGER,
    "priceUzs" INTEGER,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "developer" TEXT,
    "technicalCommittee" TEXT,
    "adoptingStates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "detailFetchedAt" TIMESTAMP(3),
    "searchText" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "disappearedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Standard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Standard_slug_key" ON "Standard"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Standard_register_sourceId_key" ON "Standard"("register", "sourceId");

-- CreateIndex
CREATE INDEX "Standard_register_idx" ON "Standard"("register");

-- CreateIndex
CREATE INDEX "Standard_status_idx" ON "Standard"("status");

-- CreateIndex
CREATE INDEX "Standard_icsCode_idx" ON "Standard"("icsCode");

-- CreateIndex
CREATE INDEX "Standard_year_idx" ON "Standard"("year");

-- CreateIndex
CREATE INDEX "Standard_disappearedAt_idx" ON "Standard"("disappearedAt");

-- CreateIndex
CREATE INDEX "Standard_deletedAt_idx" ON "Standard"("deletedAt");

-- CreateIndex
CREATE INDEX "Standard_detailFetchedAt_idx" ON "Standard"("detailFetchedAt");

-- CreateIndex
CREATE INDEX "ImportRun_standardRegister_startedAt_idx" ON "ImportRun"("standardRegister", "startedAt");

-- The same trigram search the registry uses. Written out here because Prisma
-- does not model GIN/pg_trgm indexes: it reads them as drift and drops them,
-- which is exactly how the laboratory one was lost once already.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "Standard_searchText_trgm_idx" ON "Standard" USING GIN ("searchText" gin_trgm_ops);
