-- CreateEnum
CREATE TYPE "ConformityBodyType" AS ENUM ('TESTING_LAB', 'METROLOGY_SERVICE', 'CALIBRATION_LAB', 'NDT_LAB', 'MEDICAL_LAB', 'PRODUCT_CERTIFICATION', 'MANAGEMENT_CERTIFICATION', 'SERVICE_CERTIFICATION', 'PERSONNEL_CERTIFICATION', 'INSPECTION_BODY', 'PROFICIENCY_PROVIDER', 'REFERENCE_MATERIAL_PRODUCER', 'OTHER_BODY');

-- AlterEnum
ALTER TYPE "AccreditationStatus" ADD VALUE 'WITHDRAWN';

-- AlterTable
ALTER TABLE "Laboratory" ADD COLUMN     "accreditationDate" TIMESTAMP(3),
ADD COLUMN     "bodyType" "ConformityBodyType",
ADD COLUMN     "bodyTypeLabel" TEXT,
ADD COLUMN     "certificateUrl" TEXT,
ADD COLUMN     "directions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "externalId" INTEGER,
ADD COLUMN     "externalUid" TEXT,
ADD COLUMN     "isLaboratory" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "legalEntityAddress" TEXT,
ADD COLUMN     "legalEntityName" TEXT,
ADD COLUMN     "reAccreditationDate" TIMESTAMP(3),
ADD COLUMN     "scopeText" TEXT,
ADD COLUMN     "scopeUrl" TEXT,
ADD COLUMN     "standard" TEXT,
ADD COLUMN     "statusDate" TIMESTAMP(3),
ADD COLUMN     "supervisorName" TEXT;

-- CreateIndex
CREATE INDEX "Laboratory_bodyType_idx" ON "Laboratory"("bodyType");

-- CreateIndex
CREATE INDEX "Laboratory_isLaboratory_idx" ON "Laboratory"("isLaboratory");

-- CreateIndex
CREATE INDEX "Laboratory_taxId_idx" ON "Laboratory"("taxId");

