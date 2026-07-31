import { z } from "zod";

const httpUrlSchema = z
  .string()
  // OpenAI structured outputs reject JSON Schema's `format: "uri"`.
  // Keep the generated schema to supported string constraints and validate
  // the URL semantics when Zod parses the completed response.
  .min(1)
  .max(2048)
  .refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }, "Evidence URLs must use http or https.");

export const founderBriefContentSchema = z.object({
  summary: z.string().min(40).max(3000),
  promisingSignals: z
    .array(
      z.object({
        title: z.string().min(3).max(140),
        detail: z.string().min(20).max(1200),
        evidenceUrls: z.array(httpUrlSchema).max(6),
      }),
    )
    .min(1)
    .max(6),
  marketLandscape: z.string().min(20).max(2400),
  materialUnknowns: z.array(z.string().min(5).max(600)).min(1).max(10),
  assumptions: z
    .array(
      z.object({
        label: z.string().min(3).max(160),
        rationale: z.string().min(10).max(800),
      }),
    )
    .min(1)
    .max(10),
  validationExperiment: z.object({
    objective: z.string().min(10).max(600),
    steps: z.array(z.string().min(5).max(500)).min(1).max(8),
    successSignal: z.string().min(10).max(600),
  }),
  founderQuestions: z.array(z.string().min(5).max(600)).min(1).max(10),
  confidenceNote: z.string().min(10).max(800),
});

export const generatedFounderBriefSchema = z.object({
  title: z.string().min(5).max(180),
  content: founderBriefContentSchema,
});

export type GeneratedFounderBrief = z.infer<
  typeof generatedFounderBriefSchema
>;
