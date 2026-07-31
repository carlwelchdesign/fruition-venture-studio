CREATE TYPE "BoardSourceStatus" AS ENUM (
  'VERIFIED',
  'BLOCKED',
  'UNAVAILABLE',
  'UNSUPPORTED'
);

CREATE TABLE "BoardVerifiedSource" (
  "id" TEXT NOT NULL,
  "boardMessageId" TEXT NOT NULL,
  "originalUrl" TEXT NOT NULL,
  "finalUrl" TEXT,
  "title" TEXT,
  "status" "BoardSourceStatus" NOT NULL,
  "statusDetail" TEXT,
  "mimeType" TEXT,
  "contentHash" TEXT,
  "extractedText" TEXT,
  "retrievedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BoardVerifiedSource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BoardVerifiedSource_boardMessageId_originalUrl_key"
  ON "BoardVerifiedSource"("boardMessageId", "originalUrl");
CREATE INDEX "BoardVerifiedSource_boardMessageId_status_idx"
  ON "BoardVerifiedSource"("boardMessageId", "status");
CREATE INDEX "BoardVerifiedSource_contentHash_idx"
  ON "BoardVerifiedSource"("contentHash");

ALTER TABLE "BoardVerifiedSource"
  ADD CONSTRAINT "BoardVerifiedSource_boardMessageId_fkey"
  FOREIGN KEY ("boardMessageId") REFERENCES "BoardMessage"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'fruition_admin_runtime'
  ) THEN
    GRANT SELECT, INSERT, UPDATE, DELETE
      ON TABLE "BoardVerifiedSource"
      TO fruition_admin_runtime;
  END IF;
END
$$;
