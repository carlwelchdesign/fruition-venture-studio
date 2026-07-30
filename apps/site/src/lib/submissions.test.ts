import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QueryResult } from "pg";
import {
  IntakeRateLimitError,
  saveContactSubmission,
} from "@/lib/submissions";

const submission = {
  name: "Test Founder",
  email: "founder@example.com",
  organization: "Test Venture",
  projectStage: "validation" as const,
  projectDetails:
    "A sufficiently detailed opportunity for deterministic intake testing.",
  analysisConsent: true as const,
};

beforeEach(() => {
  process.env.INTAKE_RATE_LIMIT_SECRET =
    "test-secret-that-is-longer-than-thirty-two-characters";
});

describe("saveContactSubmission", () => {
  it("uses the capability function and returns only saved identifiers", async () => {
    const execute = vi.fn().mockResolvedValue({
      rows: [{ ideaId: "idea-1", submitterId: "submitter-1" }],
    } as QueryResult<{ ideaId: string; submitterId: string }>);

    await expect(
      saveContactSubmission(submission, "203.0.113.10", execute),
    ).resolves.toEqual({
      ideaId: "idea-1",
      submitterId: "submitter-1",
    });

    expect(execute).toHaveBeenCalledOnce();
    const [statement, values] = execute.mock.calls[0];
    expect(statement).toContain("public.submit_fruition_idea");
    expect(statement).not.toContain('"Submitter"');
    expect(values).toHaveLength(8);
    expect(values[6]).toMatch(/^[a-f0-9]{64}$/);
    expect(values[7]).toMatch(/^[a-f0-9]{64}$/);
  });

  it("maps the database throttle signal to a stable domain error", async () => {
    const execute = vi.fn().mockRejectedValue({
      code: "P0001",
      message: "INTAKE_RATE_LIMIT",
    });

    await expect(
      saveContactSubmission(submission, "203.0.113.10", execute),
    ).rejects.toBeInstanceOf(IntakeRateLimitError);
  });
});
