-- CreateEnum
CREATE TYPE "NationalRegister" AS ENUM ('AKKRED', 'DEPSTAN');

-- AlterTable
ALTER TABLE "Laboratory" ADD COLUMN     "register" "NationalRegister",
ADD COLUMN     "registerStatusLabel" TEXT;

-- CreateIndex
CREATE INDEX "Laboratory_register_idx" ON "Laboratory"("register");

