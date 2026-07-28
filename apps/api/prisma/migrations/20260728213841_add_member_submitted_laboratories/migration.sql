-- AlterTable
ALTER TABLE "Laboratory" ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "submittedByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "Laboratory" ADD CONSTRAINT "Laboratory_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

