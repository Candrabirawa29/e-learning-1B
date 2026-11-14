-- CreateIndex
CREATE INDEX IF NOT EXISTS "focus_sessions_status_startedAt_idx" ON "focus_sessions"("status", "startedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "focus_sessions_startedAt_idx" ON "focus_sessions"("startedAt");

