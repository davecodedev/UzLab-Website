-- ISO open data: the deliverables metadata and the ICS classification.
--
-- Additive only. `icsCodes` defaults to an empty array so existing rows are
-- unaffected, and the enum gains a value without touching the ones in use.

-- AlterEnum
ALTER TYPE "StandardRegister" ADD VALUE 'ISO';

-- AlterTable
ALTER TABLE "Standard" ADD COLUMN "icsCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "IcsClass" (
    "code" TEXT NOT NULL,
    "parent" TEXT,
    "titleEn" TEXT NOT NULL,
    "titleFr" TEXT,
    "scopeEn" TEXT,
    "level" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IcsClass_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE INDEX "IcsClass_parent_idx" ON "IcsClass"("parent");

-- CreateIndex
CREATE INDEX "IcsClass_level_idx" ON "IcsClass"("level");
