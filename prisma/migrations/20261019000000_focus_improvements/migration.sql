-- CreateEnum
CREATE TYPE "FloatMode" AS ENUM ('PIP', 'IN_APP', 'OFF');

-- CreateEnum
CREATE TYPE "AlertIntensity" AS ENUM ('SOFT', 'NORMAL', 'STRONG');

-- AlterTable
ALTER TABLE "study_preferences" ADD COLUMN "floatMode" "FloatMode" NOT NULL DEFAULT 'IN_APP',
ADD COLUMN "alertIntensity" "AlertIntensity" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN "soundVolume" INTEGER NOT NULL DEFAULT 80;
