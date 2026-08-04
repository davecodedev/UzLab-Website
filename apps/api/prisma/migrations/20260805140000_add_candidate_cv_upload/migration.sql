-- AlterTable
ALTER TABLE "CandidateProfile" ADD COLUMN     "cvData" BYTEA,
ADD COLUMN     "cvFilename" TEXT,
ADD COLUMN     "cvMimeType" TEXT,
ADD COLUMN     "cvSizeBytes" INTEGER;

