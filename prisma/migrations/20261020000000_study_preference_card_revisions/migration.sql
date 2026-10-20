-- AlterTable
ALTER TABLE "study_preferences" ADD COLUMN "showTargetRemaining" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "activeDaysTarget" INTEGER NOT NULL DEFAULT 5;
