CREATE TYPE "FounderBriefStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'REVOKED');

ALTER TABLE "Idea" ADD COLUMN "publicReference" TEXT;

UPDATE "Idea"
SET "publicReference" = 'FVS-' || upper(substr(md5("id" || ':' || "createdAt"::TEXT), 1, 12))
WHERE "publicReference" IS NULL;

ALTER TABLE "Idea" ALTER COLUMN "publicReference" SET NOT NULL;
CREATE UNIQUE INDEX "Idea_publicReference_key" ON "Idea"("publicReference");

CREATE TABLE "FounderBrief" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "researchRunId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "FounderBriefStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "financials" JSONB,
    "sources" JSONB NOT NULL,
    "tokenHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "firstViewedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "deliveryStatus" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "deliveryError" TEXT,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FounderBrief_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FounderBrief_tokenHash_key" ON "FounderBrief"("tokenHash");
CREATE UNIQUE INDEX "FounderBrief_ideaId_version_key" ON "FounderBrief"("ideaId", "version");
CREATE INDEX "FounderBrief_ideaId_status_createdAt_idx" ON "FounderBrief"("ideaId", "status", "createdAt");
CREATE INDEX "FounderBrief_researchRunId_idx" ON "FounderBrief"("researchRunId");

ALTER TABLE "FounderBrief"
ADD CONSTRAINT "FounderBrief_ideaId_fkey"
FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FounderBrief"
ADD CONSTRAINT "FounderBrief_researchRunId_fkey"
FOREIGN KEY ("researchRunId") REFERENCES "ResearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FounderBrief"
ADD CONSTRAINT "FounderBrief_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP FUNCTION public.submit_fruition_idea(
    TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT
);

CREATE FUNCTION public.submit_fruition_idea(
    p_name TEXT,
    p_email TEXT,
    p_organization TEXT,
    p_project_stage TEXT,
    p_project_details TEXT,
    p_analysis_consent BOOLEAN,
    p_email_scope_hash TEXT,
    p_ip_scope_hash TEXT
)
RETURNS TABLE ("ideaId" TEXT, "submitterId" TEXT, "publicReference" TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now TIMESTAMP(3) := CURRENT_TIMESTAMP;
    v_submitter_id TEXT;
    v_idea_id TEXT := gen_random_uuid()::TEXT;
    v_public_reference TEXT := 'FVS-' || upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 12));
    v_email_count INTEGER;
    v_ip_count INTEGER;
BEGIN
    IF length(p_name) < 2 OR length(p_name) > 80 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_INTAKE';
    END IF;
    IF length(p_email) > 254 OR p_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_INTAKE';
    END IF;
    IF length(COALESCE(p_organization, '')) > 100 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_INTAKE';
    END IF;
    IF p_project_stage NOT IN ('idea', 'validation', 'prototype', 'existing-business') THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_INTAKE';
    END IF;
    IF length(p_project_details) < 20 OR length(p_project_details) > 50000 OR NOT p_analysis_consent THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_INTAKE';
    END IF;
    IF length(p_email_scope_hash) <> 64 OR length(p_ip_scope_hash) <> 64 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_INTAKE';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('email:' || p_email_scope_hash, 0));
    PERFORM pg_advisory_xact_lock(hashtextextended('ip:' || p_ip_scope_hash, 0));

    DELETE FROM "SecurityThrottle"
    WHERE "createdAt" < v_now - INTERVAL '48 hours';

    SELECT count(*) INTO v_email_count
    FROM "SecurityThrottle"
    WHERE "kind" = 'INTAKE_EMAIL'
      AND "scopeHash" = p_email_scope_hash
      AND "createdAt" > v_now - INTERVAL '24 hours';

    SELECT count(*) INTO v_ip_count
    FROM "SecurityThrottle"
    WHERE "kind" = 'INTAKE_IP'
      AND "scopeHash" = p_ip_scope_hash
      AND "createdAt" > v_now - INTERVAL '24 hours';

    IF v_email_count >= 5 OR v_ip_count >= 20 THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INTAKE_RATE_LIMIT';
    END IF;

    INSERT INTO "SecurityThrottle" ("kind", "scopeHash", "createdAt")
    VALUES
        ('INTAKE_EMAIL', p_email_scope_hash, v_now),
        ('INTAKE_IP', p_ip_scope_hash, v_now);

    INSERT INTO "Submitter" (
        "id", "normalizedEmail", "email", "name", "organization",
        "createdAt", "updatedAt"
    )
    VALUES (
        gen_random_uuid()::TEXT,
        lower(p_email),
        lower(p_email),
        p_name,
        NULLIF(p_organization, ''),
        v_now,
        v_now
    )
    ON CONFLICT ("normalizedEmail") DO UPDATE SET
        "email" = EXCLUDED."email",
        "name" = EXCLUDED."name",
        "organization" = COALESCE(EXCLUDED."organization", "Submitter"."organization"),
        "updatedAt" = v_now
    RETURNING "id" INTO v_submitter_id;

    INSERT INTO "Idea" (
        "id", "publicReference", "submitterId", "nameSnapshot", "emailSnapshot",
        "organization", "projectStage", "projectDetails",
        "analysisConsent", "consentedAt", "createdAt", "updatedAt"
    )
    VALUES (
        v_idea_id,
        v_public_reference,
        v_submitter_id,
        p_name,
        lower(p_email),
        NULLIF(p_organization, ''),
        p_project_stage,
        p_project_details,
        TRUE,
        v_now,
        v_now,
        v_now
    );

    RETURN QUERY SELECT v_idea_id, v_submitter_id, v_public_reference;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_fruition_idea(
    TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT
) FROM PUBLIC;

CREATE FUNCTION public.get_published_founder_brief(p_token_hash TEXT)
RETURNS TABLE (
    "reference" TEXT,
    "title" TEXT,
    "content" JSONB,
    "financials" JSONB,
    "sources" JSONB,
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF length(p_token_hash) <> 64 THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH viewed AS (
        UPDATE "FounderBrief" brief
        SET
            "firstViewedAt" = COALESCE(brief."firstViewedAt", CURRENT_TIMESTAMP),
            "lastViewedAt" = CURRENT_TIMESTAMP,
            "viewCount" = brief."viewCount" + 1
        WHERE brief."tokenHash" = p_token_hash
          AND brief."status" = 'PUBLISHED'
          AND brief."expiresAt" > CURRENT_TIMESTAMP
        RETURNING brief.*
    )
    SELECT
        idea."publicReference",
        viewed."title",
        viewed."content",
        viewed."financials",
        viewed."sources",
        viewed."publishedAt",
        viewed."expiresAt"
    FROM viewed
    JOIN "Idea" idea ON idea."id" = viewed."ideaId";
END;
$$;

REVOKE ALL ON FUNCTION public.get_published_founder_brief(TEXT) FROM PUBLIC;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fruition_intake_api') THEN
        GRANT EXECUTE ON FUNCTION public.submit_fruition_idea(
            TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT
        ) TO fruition_intake_api;
        GRANT EXECUTE ON FUNCTION public.get_published_founder_brief(TEXT)
        TO fruition_intake_api;
    END IF;
END
$$;
