import { z } from "zod";

const generatedUrlSchema = z.string().min(1).max(2048);

export const sourceSchema = z.object({
  url: generatedUrlSchema,
  title: z.string().min(1).max(300),
  snippet: z.string().max(800),
  publishedAt: z.string().nullable(),
});

export const findingSchema = z.object({
  claim: z.string().min(1).max(1200),
  evidence: z.string().min(1).max(1600),
  sourceUrls: z.array(generatedUrlSchema).max(8),
});

export const specialistReportSchema = z.object({
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(2400),
  findings: z.array(findingSchema).min(2).max(10),
  risks: z.array(z.string().min(1).max(600)).max(8),
  openQuestions: z.array(z.string().min(1).max(600)).max(8),
  confidence: z.number().min(0).max(1),
  sources: z.array(sourceSchema).max(20),
});

export type SpecialistReport = z.infer<typeof specialistReportSchema>;

function assertHttpUrl(value: string, field: string) {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${field} must be a valid source URL.`);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${field} must use http or https.`);
  }
}

export function validateSpecialistReportUrls(report: SpecialistReport) {
  report.sources.forEach((source, index) => {
    assertHttpUrl(source.url, `Source ${index + 1}`);
  });

  report.findings.forEach((finding, findingIndex) => {
    finding.sourceUrls.forEach((url, sourceIndex) => {
      assertHttpUrl(
        url,
        `Finding ${findingIndex + 1}, source ${sourceIndex + 1}`,
      );
    });
  });

  return report;
}

export const scoreDimensionKeys = [
  "problem_strength",
  "founder_advantage",
  "market_opportunity",
  "differentiation",
  "technical_feasibility",
  "revenue_path",
  "studio_fit",
] as const;

export const synthesisSchema = z.object({
  summary: z.string().min(1).max(3000),
  recommendation: z.enum(["EXPLORE", "HOLD", "DECLINE"]),
  confidence: z.number().min(0).max(1),
  dimensions: z
    .array(
      z.object({
        key: z.enum(scoreDimensionKeys),
        score: z.number().min(0).max(5),
        rationale: z.string().min(1).max(1200),
        confidence: z.number().min(0).max(1),
        evidence: z.array(z.string().min(1).max(500)).max(8),
      }),
    )
    .length(scoreDimensionKeys.length),
  nextSteps: z.array(z.string().min(1).max(500)).min(1).max(8),
});

export type ResearchSynthesis = z.infer<typeof synthesisSchema>;
