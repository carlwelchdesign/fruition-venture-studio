import { z } from "zod";
import { scoreDimensionKeys } from "@/agents/research-schemas";
import { boardSpecialistRoles } from "@/lib/board-contract";

const httpUrl = z
  .string()
  .max(2048)
  .refine((value) => {
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, "Citations must use a valid HTTP or HTTPS URL.");

export const boardResponseSchema = z.object({
  answer: z.string().min(1).max(6000),
  contributors: z.array(z.enum(boardSpecialistRoles)).max(7),
  unknownVariables: z.array(z.string().min(1).max(600)).max(8),
  citations: z
    .array(
      z.object({
        url: httpUrl,
        title: z.string().min(1).max(300),
      }),
    )
    .max(16),
  scoreProposals: z
    .array(
      z.object({
        dimensionKey: z.enum(scoreDimensionKeys),
        proposedScore: z.number().min(0).max(5),
        rationale: z.string().min(1).max(1200),
        evidence: z.array(z.string().min(1).max(500)).max(8),
      }),
    )
    .max(4),
});

export type BoardAgentResponse = z.infer<typeof boardResponseSchema>;
