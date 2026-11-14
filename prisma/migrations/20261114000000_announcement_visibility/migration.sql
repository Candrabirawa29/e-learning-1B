-- CreateEnum
CREATE TYPE "AnnouncementVisibility" AS ENUM ('PUBLIC', 'AUTHENTICATED');

-- AlterTable
ALTER TABLE "announcements" ADD COLUMN "visibility" "AnnouncementVisibility" NOT NULL DEFAULT 'AUTHENTICATED';

-- CreateIndex
CREATE INDEX "announcements_visibility_idx" ON "announcements"("visibility");

-- AlterTable
ALTER TABLE "materials" ALTER COLUMN "visibility" SET DEFAULT 'AUTHENTICATED';

