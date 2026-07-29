import { describe, expect, it } from "vitest";
import { validateContactSubmission } from "@/lib/contact";

const validSubmission = {
  name: "Ada Founder",
  email: "ADA@EXAMPLE.COM ",
  organization: "Analytical Ventures",
  projectStage: "validation",
  projectDetails:
    "We are validating a workflow that removes a costly manual step for operators.",
  analysisConsent: true,
  website: "",
};

describe("validateContactSubmission", () => {
  it("normalizes a complete submission", () => {
    const result = validateContactSubmission(validSubmission);

    expect(result).toEqual({
      success: true,
      data: {
        name: "Ada Founder",
        email: "ada@example.com",
        organization: "Analytical Ventures",
        projectStage: "validation",
        projectDetails:
          "We are validating a workflow that removes a costly manual step for operators.",
        analysisConsent: true,
      },
    });
  });

  it("requires explicit AI analysis consent", () => {
    const result = validateContactSubmission({
      ...validSubmission,
      analysisConsent: false,
    });

    expect(result).toEqual({
      success: false,
      message: "Please confirm how Fruition will use your submission.",
    });
  });

  it("rejects the honeypot field", () => {
    const result = validateContactSubmission({
      ...validSubmission,
      website: "https://spam.example",
    });

    expect(result).toEqual({
      success: false,
      message: "Unable to process this submission.",
    });
  });
});
