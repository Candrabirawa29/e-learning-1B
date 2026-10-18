-- CreateEnum
CREATE TYPE "FocusMode" AS ENUM ('FOCUS', 'STOPWATCH');

-- CreateEnum
CREATE TYPE "FocusSessionStatus" AS ENUM ('RUNNING', 'PAUSED', 'COMPLETED', 'STOPPED_EARLY', 'CANCELLED');

-- CreateTable
CREATE TABLE "focus_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientSessionId" TEXT NOT NULL,
    "courseId" TEXT,
    "taskId" TEXT,
    "mode" "FocusMode" NOT NULL DEFAULT 'FOCUS',
    "plannedSec" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "lastResumedAt" TIMESTAMP(3),
    "accumulatedSec" INTEGER NOT NULL DEFAULT 0,
    "endedAt" TIMESTAMP(3),
    "status" "FocusSessionStatus" NOT NULL DEFAULT 'RUNNING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "focus_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "focusDuration" INTEGER NOT NULL DEFAULT 1500,
    "shortBreakDuration" INTEGER NOT NULL DEFAULT 300,
    "longBreakDuration" INTEGER NOT NULL DEFAULT 900,
    "longBreakInterval" INTEGER NOT NULL DEFAULT 4,
    "weeklyTargetMin" INTEGER NOT NULL DEFAULT 600,
    "minActiveDayMin" INTEGER NOT NULL DEFAULT 25,
    "aiConsent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "focus_sessions_userId_startedAt_idx" ON "focus_sessions"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "focus_sessions_userId_status_idx" ON "focus_sessions"("userId", "status");

-- CreateIndex
CREATE INDEX "focus_sessions_courseId_idx" ON "focus_sessions"("courseId");

-- CreateIndex
CREATE INDEX "focus_sessions_taskId_idx" ON "focus_sessions"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "focus_sessions_userId_clientSessionId_key" ON "focus_sessions"("userId", "clientSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "study_preferences_userId_key" ON "study_preferences"("userId");

-- CreateIndex
CREATE INDEX "ai_usages_userId_idx" ON "ai_usages"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_usages_userId_date_key" ON "ai_usages"("userId", "date");

-- AddForeignKey
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_preferences" ADD CONSTRAINT "study_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usages" ADD CONSTRAINT "ai_usages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable Row Level Security (RLS) pada seluruh tabel baru (defense-in-depth, tanpa policy)
ALTER TABLE "focus_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "study_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_usages" ENABLE ROW LEVEL SECURITY;
