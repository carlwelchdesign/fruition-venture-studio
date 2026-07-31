CREATE TYPE "BoardChannel" AS ENUM ('BOARD', 'DIRECT');
CREATE TYPE "BoardMessageRole" AS ENUM ('USER', 'ASSISTANT');
CREATE TYPE "BoardProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DISMISSED');

CREATE TABLE "BoardSession" (
    "id" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "researchRunId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "channel" "BoardChannel" NOT NULL,
    "specialistRole" "AgentRole",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BoardSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BoardMessage" (
    "id" TEXT NOT NULL,
    "boardSessionId" TEXT NOT NULL,
    "role" "BoardMessageRole" NOT NULL,
    "speakerRole" "AgentRole",
    "body" TEXT NOT NULL,
    "contributors" JSONB NOT NULL,
    "citations" JSONB NOT NULL,
    "unknownVariables" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BoardMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BoardScoreProposal" (
    "id" TEXT NOT NULL,
    "boardMessageId" TEXT NOT NULL,
    "scoreDimensionId" TEXT NOT NULL,
    "proposedScore" DOUBLE PRECISION NOT NULL,
    "rationale" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "status" "BoardProposalStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BoardScoreProposal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BoardSession_sessionKey_key" ON "BoardSession"("sessionKey");
CREATE INDEX "BoardSession_ideaId_updatedAt_idx" ON "BoardSession"("ideaId", "updatedAt");
CREATE INDEX "BoardSession_researchRunId_channel_idx" ON "BoardSession"("researchRunId", "channel");
CREATE INDEX "BoardMessage_boardSessionId_createdAt_idx" ON "BoardMessage"("boardSessionId", "createdAt");
CREATE INDEX "BoardScoreProposal_boardMessageId_idx" ON "BoardScoreProposal"("boardMessageId");
CREATE INDEX "BoardScoreProposal_scoreDimensionId_status_idx" ON "BoardScoreProposal"("scoreDimensionId", "status");

ALTER TABLE "BoardSession" ADD CONSTRAINT "BoardSession_ideaId_fkey"
  FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoardSession" ADD CONSTRAINT "BoardSession_researchRunId_fkey"
  FOREIGN KEY ("researchRunId") REFERENCES "ResearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoardSession" ADD CONSTRAINT "BoardSession_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BoardMessage" ADD CONSTRAINT "BoardMessage_boardSessionId_fkey"
  FOREIGN KEY ("boardSessionId") REFERENCES "BoardSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoardScoreProposal" ADD CONSTRAINT "BoardScoreProposal_boardMessageId_fkey"
  FOREIGN KEY ("boardMessageId") REFERENCES "BoardMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoardScoreProposal" ADD CONSTRAINT "BoardScoreProposal_scoreDimensionId_fkey"
  FOREIGN KEY ("scoreDimensionId") REFERENCES "ScoreDimension"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoardScoreProposal" ADD CONSTRAINT "BoardScoreProposal_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
