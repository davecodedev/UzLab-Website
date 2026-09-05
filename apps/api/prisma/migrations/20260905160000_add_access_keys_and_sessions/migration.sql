-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activeSessionAt" TIMESTAMP(3),
ADD COLUMN     "activeSessionId" TEXT,
ADD COLUMN     "activeSessionLabel" TEXT;

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "accessKeyHash" TEXT,
ADD COLUMN     "accessKeyHint" TEXT,
ADD COLUMN     "accessKeyIssuedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Member_accessKeyHash_key" ON "Member"("accessKeyHash");

