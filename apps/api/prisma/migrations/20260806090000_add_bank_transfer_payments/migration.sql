-- AlterEnum
ALTER TYPE "PaymentGateway" ADD VALUE 'BANK_TRANSFER';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedByUserId" TEXT,
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "payerName" TEXT,
ADD COLUMN     "payerTaxId" TEXT,
ADD COLUMN     "staffNote" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_invoiceNumber_key" ON "Payment"("invoiceNumber");

