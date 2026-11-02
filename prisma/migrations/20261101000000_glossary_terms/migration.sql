-- CreateTable
CREATE TABLE "glossary_terms" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "termKey" TEXT NOT NULL,
    "shortDefinition" TEXT,
    "body" TEXT NOT NULL,
    "courseId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "box" INTEGER NOT NULL DEFAULT 1,
    "nextReviewAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "glossary_terms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "glossary_terms_userId_termKey_key" ON "glossary_terms"("userId", "termKey");

-- CreateIndex
CREATE INDEX "glossary_terms_userId_archivedAt_idx" ON "glossary_terms"("userId", "archivedAt");

-- CreateIndex
CREATE INDEX "glossary_terms_userId_courseId_idx" ON "glossary_terms"("userId", "courseId");

-- CreateIndex (GIN on tags)
CREATE INDEX "glossary_terms_tags_idx" ON "glossary_terms" USING GIN ("tags");

-- AddForeignKey
ALTER TABLE "glossary_terms" ADD CONSTRAINT "glossary_terms_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "glossary_terms" ADD CONSTRAINT "glossary_terms_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enable Row Level Security (RLS) pada seluruh tabel baru (defense-in-depth, tanpa policy)
ALTER TABLE "glossary_terms" ENABLE ROW LEVEL SECURITY;
