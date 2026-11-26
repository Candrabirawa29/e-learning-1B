-- CreateEnum
CREATE TYPE "AiPersonaMode" AS ENUM ('COACH', 'PARTNER');

-- AlterTable
ALTER TABLE "study_preferences" ADD COLUMN "aiMode" "AiPersonaMode" NOT NULL DEFAULT 'COACH',
ADD COLUMN "aiPartnerConfig" JSONB;

-- CreateTable
CREATE TABLE "ai_chat_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mode" "AiPersonaMode" NOT NULL DEFAULT 'COACH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_chat_messages_userId_mode_createdAt_idx" ON "ai_chat_messages"("userId", "mode", "createdAt");

-- AddForeignKey
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
