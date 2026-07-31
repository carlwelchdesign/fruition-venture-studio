import "server-only";

import { createHmac } from "node:crypto";
import { Pool } from "pg";
import type { QueryResult } from "pg";
import type { QueryResultRow } from "pg";
import type { ContactSubmission } from "@fruition/contracts/contact";

type SavedSubmission = {
  ideaId: string;
  submitterId: string;
  publicReference: string;
};

type QueryExecutor = (
  text: string,
  values: readonly unknown[],
) => Promise<QueryResult<SavedSubmission>>;

export class IntakeRateLimitError extends Error {
  constructor() {
    super("INTAKE_RATE_LIMIT");
    this.name = "IntakeRateLimitError";
  }
}

const globalForIntake = globalThis as unknown as {
  intakePool?: Pool;
};

function normalizeConnectionString(value: string) {
  return value.replace(
    /([?&])sslmode=(prefer|require|verify-ca)(?=&|$)/i,
    "$1sslmode=verify-full",
  );
}

function getPool() {
  const connectionString = process.env.INTAKE_DATABASE_URL;
  if (!connectionString) {
    throw new Error("INTAKE_DATABASE_URL is required.");
  }

  if (!globalForIntake.intakePool) {
    globalForIntake.intakePool = new Pool({
      connectionString: normalizeConnectionString(connectionString),
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    });
  }

  return globalForIntake.intakePool;
}

export function executeIntakeCapability<Row extends QueryResultRow>(
  text: string,
  values: readonly unknown[],
) {
  return getPool().query<Row>(text, [...values]);
}

function scopeHash(secret: string, kind: "email" | "ip", value: string) {
  return createHmac("sha256", secret)
    .update(`${kind}:${value}`)
    .digest("hex");
}

function isDatabaseError(error: unknown): error is {
  code?: string;
  message?: string;
} {
  return Boolean(error && typeof error === "object");
}

export async function saveContactSubmission(
  submission: ContactSubmission,
  clientAddress: string,
  execute?: QueryExecutor,
) {
  const secret = process.env.INTAKE_RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("INTAKE_RATE_LIMIT_SECRET must be at least 32 characters.");
  }

  const emailScopeHash = scopeHash(secret, "email", submission.email);
  const ipScopeHash = scopeHash(
    secret,
    "ip",
    clientAddress || submission.email,
  );
  const query = execute ?? getPool().query.bind(getPool());

  try {
    const result = await query(
      `
        SELECT "ideaId", "submitterId", "publicReference"
        FROM public.submit_fruition_idea(
          $1, $2, $3, $4, $5, $6, $7, $8
        )
      `,
      [
        submission.name,
        submission.email,
        submission.organization,
        submission.projectStage,
        submission.projectDetails,
        submission.analysisConsent,
        emailScopeHash,
        ipScopeHash,
      ],
    );

    const saved = result.rows[0];
    if (!saved) {
      throw new Error("Intake function did not return a saved submission.");
    }
    return saved;
  } catch (error) {
    if (
      isDatabaseError(error) &&
      error.code === "P0001" &&
      error.message === "INTAKE_RATE_LIMIT"
    ) {
      throw new IntakeRateLimitError();
    }
    throw error;
  }
}
