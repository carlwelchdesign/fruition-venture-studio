import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveContactSubmission: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/submissions", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/submissions")>();
  return {
    ...original,
    saveContactSubmission: mocks.saveContactSubmission,
  };
});
vi.mock("@/lib/resend", () => ({ sendEmail: mocks.sendEmail }));

import { IntakeRateLimitError } from "@/lib/submissions";
import { POST } from "./route";

const validSubmission = {
  name: "Ada Founder",
  email: "ada@example.com",
  organization: "Analytical Ventures",
  projectStage: "validation",
  projectDetails:
    "We are validating a workflow that removes a costly manual step for operators.",
  analysisConsent: true,
  website: "",
};

function request(
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Request("http://site:3000/api/contact", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "localhost:3100",
      origin: "http://localhost:3100",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.CONTACT_TO_EMAIL;
  mocks.sendEmail.mockResolvedValue({ delivered: true });
  mocks.saveContactSubmission.mockResolvedValue({
    ideaId: "idea-1",
    submitterId: "submitter-1",
    publicReference: "FVS-ABC123DEF456",
  });
});

describe("POST /api/contact", () => {
  it("accepts the external host when running behind a proxy", async () => {
    const response = await POST(request(validSubmission));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      submissionId: "idea-1",
      reference: "FVS-ABC123DEF456",
      status: "received",
      confirmationEmail: "sent",
    });
  });

  it("keeps a saved submission successful when its receipt cannot be sent", async () => {
    mocks.sendEmail.mockResolvedValue({
      delivered: false,
      reason: "not-configured",
    });

    const response = await POST(request(validSubmission));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      reference: "FVS-ABC123DEF456",
      status: "received",
      confirmationEmail: "unavailable",
    });
  });

  it("rejects a foreign origin", async () => {
    const response = await POST(
      request(validSubmission, { origin: "https://attacker.example" }),
    );

    expect(response.status).toBe(403);
    expect(mocks.saveContactSubmission).not.toHaveBeenCalled();
  });

  it("rejects oversized bodies before parsing", async () => {
    const response = await POST(
      request(validSubmission, { "content-length": "262145" }),
    );

    expect(response.status).toBe(413);
    expect(mocks.saveContactSubmission).not.toHaveBeenCalled();
  });

  it("rejects oversized bodies when content length is unavailable", async () => {
    const response = await POST(
      request({
        ...validSubmission,
        projectDetails: "A".repeat(262_145),
      }),
    );

    expect(response.status).toBe(413);
    expect(mocks.saveContactSubmission).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...validSubmission, analysisConsent: false }, 400],
    [{ ...validSubmission, website: "https://spam.example" }, 400],
  ])("rejects invalid and honeypot submissions", async (body, status) => {
    const response = await POST(request(body));

    expect(response.status).toBe(status);
    expect(mocks.saveContactSubmission).not.toHaveBeenCalled();
  });

  it("returns a stable 429 response for a database throttle", async () => {
    mocks.saveContactSubmission.mockRejectedValue(new IntakeRateLimitError());

    const response = await POST(request(validSubmission));

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      message:
        "We have received several recent submissions. Please wait before trying again.",
    });
  });

  it("logs safe database diagnostics without submission or error details", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.saveContactSubmission.mockRejectedValue({
      name: "error",
      code: "22021",
      severity: "ERROR",
      routine: "report_invalid_encoding",
      message: "Sensitive provider message",
      detail: "Sensitive database detail",
    });

    const response = await POST(
      request(validSubmission, { "x-vercel-id": "iad1::test-request" }),
    );

    expect(response.status).toBe(503);
    expect(errorLog).toHaveBeenCalledOnce();
    const serialized = String(errorLog.mock.calls[0][0]);
    expect(JSON.parse(serialized)).toEqual({
      level: "error",
      event: "contact_persistence_failed",
      requestId: "iad1::test-request",
      category: "UnknownError",
      code: "22021",
      severity: "ERROR",
      routine: "report_invalid_encoding",
    });
    expect(serialized).not.toContain(validSubmission.projectDetails);
    expect(serialized).not.toContain("Sensitive provider message");
    expect(serialized).not.toContain("Sensitive database detail");
  });
});
