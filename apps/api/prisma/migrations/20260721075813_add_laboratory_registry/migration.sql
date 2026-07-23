-- CreateEnum
CREATE TYPE "LaboratoryField" AS ENUM ('TESTING', 'METROLOGY', 'MEDICINE', 'ECOLOGY', 'INDUSTRY', 'AGRICULTURE', 'FOOD', 'CONSTRUCTION', 'OTHER');

-- CreateEnum
CREATE TYPE "AccreditationStatus" AS ENUM ('ACCREDITED', 'SUSPENDED', 'EXPIRED', 'PENDING', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "LaboratorySource" AS ENUM ('SELF_REGISTERED', 'GOVERNMENT_IMPORT', 'MANUAL_ENTRY');

-- CreateTable
CREATE TABLE "Laboratory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "fields" "LaboratoryField"[] DEFAULT ARRAY[]::"LaboratoryField"[],
    "accreditationNumber" TEXT,
    "accreditationBody" TEXT,
    "accreditationStatus" "AccreditationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "accreditedUntil" TIMESTAMP(3),
    "taxId" TEXT,
    "region" TEXT,
    "city" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "description" TEXT,
    "isUzLabMember" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "source" "LaboratorySource" NOT NULL DEFAULT 'MANUAL_ENTRY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Laboratory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Laboratory_slug_key" ON "Laboratory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Laboratory_accreditationNumber_key" ON "Laboratory"("accreditationNumber");

-- CreateIndex
CREATE INDEX "Laboratory_region_idx" ON "Laboratory"("region");

-- CreateIndex
CREATE INDEX "Laboratory_accreditationStatus_idx" ON "Laboratory"("accreditationStatus");

-- CreateIndex
CREATE INDEX "Laboratory_isPublished_idx" ON "Laboratory"("isPublished");

-- CreateIndex
CREATE INDEX "Laboratory_deletedAt_idx" ON "Laboratory"("deletedAt");

