-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP');

-- CreateEnum
CREATE TYPE "VacancyStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "Vacancy" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "laboratoryId" TEXT,
    "title" TEXT NOT NULL,
    "organisationName" TEXT NOT NULL,
    "region" TEXT,
    "city" TEXT,
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "salary" TEXT,
    "description" TEXT NOT NULL,
    "requirements" TEXT,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "status" "VacancyStatus" NOT NULL DEFAULT 'PUBLISHED',
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vacancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "cvUrl" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "employerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vacancy_slug_key" ON "Vacancy"("slug");

-- CreateIndex
CREATE INDEX "Vacancy_status_publishedAt_idx" ON "Vacancy"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Vacancy_userId_idx" ON "Vacancy"("userId");

-- CreateIndex
CREATE INDEX "Vacancy_region_idx" ON "Vacancy"("region");

-- CreateIndex
CREATE INDEX "JobApplication_vacancyId_status_idx" ON "JobApplication"("vacancyId", "status");

-- CreateIndex
CREATE INDEX "JobApplication_userId_idx" ON "JobApplication"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "JobApplication_vacancyId_userId_key" ON "JobApplication"("vacancyId", "userId");

-- AddForeignKey
ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

