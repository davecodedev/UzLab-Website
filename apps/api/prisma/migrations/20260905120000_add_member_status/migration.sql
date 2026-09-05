-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'FROZEN');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedByUserId" TEXT,
ADD COLUMN     "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "statusNote" TEXT;

-- CreateIndex
CREATE INDEX "Member_status_idx" ON "Member"("status");

