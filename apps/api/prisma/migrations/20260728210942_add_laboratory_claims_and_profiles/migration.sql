-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "LaboratoryClaim" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "laboratoryId" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "evidence" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaboratoryClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaboratoryProfile" (
    "id" TEXT NOT NULL,
    "laboratoryId" TEXT NOT NULL,
    "publicPhone" TEXT,
    "publicEmail" TEXT,
    "publicWebsite" TEXT,
    "contactPerson" TEXT,
    "description" TEXT,
    "servicesText" TEXT,
    "workingHours" TEXT,
    "specialisations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "logoUrl" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaboratoryProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LaboratoryClaim_status_idx" ON "LaboratoryClaim"("status");

-- CreateIndex
CREATE INDEX "LaboratoryClaim_laboratoryId_idx" ON "LaboratoryClaim"("laboratoryId");

-- CreateIndex
CREATE UNIQUE INDEX "LaboratoryClaim_userId_laboratoryId_key" ON "LaboratoryClaim"("userId", "laboratoryId");

-- CreateIndex
CREATE UNIQUE INDEX "LaboratoryProfile_laboratoryId_key" ON "LaboratoryProfile"("laboratoryId");

-- AddForeignKey
ALTER TABLE "LaboratoryClaim" ADD CONSTRAINT "LaboratoryClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaboratoryClaim" ADD CONSTRAINT "LaboratoryClaim_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaboratoryProfile" ADD CONSTRAINT "LaboratoryProfile_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

