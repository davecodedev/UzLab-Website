-- Membership payments through Payme and Click.
--
-- Hand-written. The generated diff also wanted to drop both pg_trgm indexes,
-- because Prisma does not model GIN indexes and reads them as drift — that is
-- how the laboratory one was lost once already. They are deliberately absent
-- from this file.

-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('PAYME', 'CLICK');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'HELD', 'PAID', 'CANCELLED', 'REFUNDED');

-- AlterTable
-- French titles are not stored: the site has no French, so the column could
-- never be shown to anyone.
ALTER TABLE "IcsClass" DROP COLUMN IF EXISTS "titleFr";

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "membershipTypeId" TEXT NOT NULL,
    "gateway" "PaymentGateway" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "durationDays" INTEGER NOT NULL,
    "gatewayTransactionId" TEXT,
    "gatewayCreatedAt" BIGINT,
    "gatewayPerformedAt" BIGINT,
    "gatewayCancelledAt" BIGINT,
    "cancelReason" INTEGER,
    "paidAt" TIMESTAMP(3),
    "lastCallback" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Unique: a gateway retrying a callback must not create a second transaction.
CREATE UNIQUE INDEX "Payment_gatewayTransactionId_key" ON "Payment"("gatewayTransactionId");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_gateway_status_idx" ON "Payment"("gateway", "status");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_membershipTypeId_fkey" FOREIGN KEY ("membershipTypeId") REFERENCES "MembershipType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
