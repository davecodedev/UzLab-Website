-- CreateEnum
CREATE TYPE "CandidateVisibility" AS ENUM ('HIDDEN', 'PUBLISHED');

-- CreateTable
CREATE TABLE "CandidateProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "region" TEXT,
    "city" TEXT,
    "fields" "LaboratoryField"[] DEFAULT ARRAY[]::"LaboratoryField"[],
    "yearsExperience" INTEGER,
    "summary" TEXT NOT NULL,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "education" TEXT,
    "certifications" TEXT,
    "cvUrl" TEXT,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "visibility" "CandidateVisibility" NOT NULL DEFAULT 'HIDDEN',
    "openToWork" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CandidateProfile_userId_key" ON "CandidateProfile"("userId");

-- CreateIndex
CREATE INDEX "CandidateProfile_visibility_openToWork_idx" ON "CandidateProfile"("visibility", "openToWork");

-- CreateIndex
CREATE INDEX "CandidateProfile_region_idx" ON "CandidateProfile"("region");

-- AddForeignKey
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

