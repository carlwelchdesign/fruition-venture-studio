-- Store privacy-preserving throttle events. Only keyed HMAC digests are stored.
CREATE TABLE "SecurityThrottle" (
    "id" BIGSERIAL NOT NULL,
    "kind" TEXT NOT NULL,
    "scopeHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityThrottle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SecurityThrottle_kind_scopeHash_createdAt_idx"
    ON "SecurityThrottle"("kind", "scopeHash", "createdAt");
CREATE INDEX "SecurityThrottle_createdAt_idx"
    ON "SecurityThrottle"("createdAt");

-- The public app can execute this single operation but receives no table access.
CREATE OR REPLACE FUNCTION public.submit_fruition_idea(
    p_name TEXT,
    p_email TEXT,
    p_organization TEXT,
    p_project_stage TEXT,
    p_project_details TEXT,
    p_analysis_consent BOOLEAN,
    p_email_scope_hash TEXT,
    p_ip_scope_hash TEXT
)
RETURNS TABLE ("ideaId" TEXT, "submitterId" TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now TIMESTAMP(3) := CURRENT_TIMESTAMP;
    v_submitter_id TEXT;
    v_idea_id TEXT := gen_random_uuid()::TEXT;
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
    IF length(p_project_details) < 20 OR length(p_project_details) > 2000 OR NOT p_analysis_consent THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_INTAKE';
    END IF;
    IF length(p_email_scope_hash) <> 64 OR length(p_ip_scope_hash) <> 64 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_INTAKE';
    END IF;

    -- Serialize requests for the same scopes so concurrent submissions cannot
    -- race past the limits.
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
        "id", "submitterId", "nameSnapshot", "emailSnapshot",
        "organization", "projectStage", "projectDetails",
        "analysisConsent", "consentedAt", "createdAt", "updatedAt"
    )
    VALUES (
        v_idea_id,
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

    RETURN QUERY SELECT v_idea_id, v_submitter_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_fruition_idea(
    TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT
) FROM PUBLIC;
