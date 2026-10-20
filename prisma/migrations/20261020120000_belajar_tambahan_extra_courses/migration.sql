-- CreateEnum
CREATE TYPE "CourseKind" AS ENUM ('REGULAR', 'EXTRA');

-- CreateEnum
CREATE TYPE "CourseVisibility" AS ENUM ('CLASS', 'PRIVATE');

-- AlterTable
ALTER TABLE "courses" ADD COLUMN "kind" "CourseKind" NOT NULL DEFAULT 'REGULAR',
ADD COLUMN "visibility" "CourseVisibility" NOT NULL DEFAULT 'CLASS',
ADD COLUMN "ownerId" TEXT,
ADD COLUMN "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "courses_ownerId_idx" ON "courses"("ownerId");

-- CreateIndex
CREATE INDEX "courses_kind_visibility_idx" ON "courses"("kind", "visibility");

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Constraints
-- EXTRA wajib punya ownerId; REGULAR wajib visibility CLASS dan ownerId null.
ALTER TABLE "courses" ADD CONSTRAINT "courses_kind_visibility_owner_check" CHECK (
  ("kind" = 'EXTRA' AND "ownerId" IS NOT NULL) OR
  ("kind" = 'REGULAR' AND "visibility" = 'CLASS' AND "ownerId" IS NULL)
);
