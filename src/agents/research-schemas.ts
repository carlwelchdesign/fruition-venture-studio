import { z } from "zod";

export const sourceSchema = z.object({
  url: z.url(),
  title: z.string().min(1).max(300),
  snippet: z.string().max(800),
  publishedAt: z.string().nullable(),
});

export const findingSchema = z.object({
  claim: z.string().min(1).max(1200),
  evidence: z.string().min(1).max(1600),
  sourceUrls: z.array(z.url()).max(8),
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
