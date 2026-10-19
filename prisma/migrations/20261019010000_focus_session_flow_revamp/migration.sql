-- AlterTable
ALTER TABLE "focus_sessions" ADD COLUMN "lastSeenAt" TIMESTAMP(3),
ADD COLUMN "isCorrected" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "study_preferences" ADD COLUMN "lastCourseId" TEXT,
ADD COLUMN "lastTaskId" TEXT,
ADD COLUMN "lastMode" "FocusMode",
ADD COLUMN "autoStartBreak" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "autoStartNextFocus" BOOLEAN NOT NULL DEFAULT false;
