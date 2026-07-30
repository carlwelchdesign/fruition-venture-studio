import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  specialistReportSchema,
  validateSpecialistReportUrls,
  type SpecialistReport,
} from "@/agents/research-schemas";

const report: SpecialistReport = {
  title: "Test report",
  summary: "A test summary.",
  findings: [
    {
      claim: "A supported claim.",
      evidence: "Evidence for the claim.",
      sourceUrls: ["https://example.com/evidence"],
    },
    {
      claim: "Another supported claim.",
      evidence: "More evidence for the claim.",
      sourceUrls: [],
    },
  ],
  risks: [],
  openQuestions: [],
  confidence: 0.7,
  sources: [
    {
      url: "https://example.com/evidence",
      title: "Example source",
      snippet: "Example source text.",
      publishedAt: null,
    },
  ],
};

describe("specialistReportSchema", () => {
  it("does not send unsupported URI formats to structured outputs", () => {
    const jsonSchema = JSON.stringify(z.toJSONSchema(specialistReportSchema));
    expect(jsonSchema).not.toContain('"format":"uri"');
  });
});

describe("validateSpecialistReportUrls", () => {
  it("accepts http and https evidence URLs", () => {
    expect(validateSpecialistReportUrls(report)).toBe(report);
  });

  it("rejects non-web source URLs after generation", () => {
    expect(() =>
      validateSpecialistReportUrls({
        ...report,
        sources: [{ ...report.sources[0], url: "file:///private/source" }],
      }),
    ).toThrow("Source 1 must use http or https.");
  });
});
