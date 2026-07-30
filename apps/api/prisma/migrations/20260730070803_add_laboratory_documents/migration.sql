-- CreateEnum
CREATE TYPE "LaboratoryDocumentKind" AS ENUM ('CERTIFICATE', 'SCOPE');

-- CreateTable
CREATE TABLE "LaboratoryDocument" (
    "id" TEXT NOT NULL,
    "laboratoryId" TEXT NOT NULL,
    "kind" "LaboratoryDocumentKind" NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "extractedText" TEXT,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LaboratoryDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LaboratoryDocument_laboratoryId_idx" ON "LaboratoryDocument"("laboratoryId");

-- CreateIndex
CREATE UNIQUE INDEX "LaboratoryDocument_laboratoryId_kind_key" ON "LaboratoryDocument"("laboratoryId", "kind");

-- AddForeignKey
ALTER TABLE "LaboratoryDocument" ADD CONSTRAINT "LaboratoryDocument_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- The trigram index backing keyword search is created in raw SQL (Prisma has
-- no schema syntax for gin_trgm_ops), so `migrate diff` sees it as drift and
-- proposes dropping it. Recreate it here so replaying this migration on a
-- fresh database leaves search indexed.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "Laboratory_searchText_trgm_idx"
  ON "Laboratory" USING GIN ("searchText" gin_trgm_ops);
