import { describe, expect, it } from "vitest";
import { z } from "zod";
import { generatedFounderBriefSchema } from "@/agents/founder-brief-schemas";

const validDraft = {
  title: "A credible workflow opportunity",
  content: {
    summary:
      "The opportunity addresses a recurring operating problem with enough evidence to justify a focused customer validation step.",
    promisingSignals: [
      {
        title: "Observable operating friction",
        detail:
          "Public evidence and the specialist review both indicate that the manual workflow creates measurable delays for operators.",
        evidenceUrls: ["https://example.com/evidence"],
      },
    ],
    marketLandscape:
      "The market contains established horizontal tools and narrower specialist alternatives, leaving differentiation dependent on workflow depth.",
    materialUnknowns: ["Whether the target buyer will pay to replace the current workaround."],
    assumptions: [
      {
        label: "Buyer urgency",
        rationale:
          "The initial commercial path depends on the operational pain being budget-worthy this year.",
      },
    ],
    validationExperiment: {
      objective:
        "Test whether qualified operators will commit time and budget to a focused pilot.",
      steps: ["Interview ten qualified operators using a consistent problem script."],
      successSignal:
        "At least three qualified buyers agree to a paid or explicitly budgeted pilot.",
    },
    founderQuestions: ["Which buyer currently owns the budget for this workflow?"],
    confidenceNote:
      "The problem evidence is stronger than the available pricing and adoption evidence.",
  },
};

describe("generatedFounderBriefSchema", () => {
  it("does not send unsupported URI formats to structured outputs", () => {
    const jsonSchema = JSON.stringify(
      z.toJSONSchema(generatedFounderBriefSchema),
    );
    expect(jsonSchema).not.toContain('"format":"uri"');
  });

  it("accepts a structured, evidence-linked founder draft", () => {
    expect(generatedFounderBriefSchema.parse(validDraft)).toEqual(validDraft);
  });

  it("rejects malformed evidence URLs after generation", () => {
    expect(() =>
      generatedFounderBriefSchema.parse({
        ...validDraft,
        content: {
          ...validDraft.content,
          promisingSignals: [
            {
              ...validDraft.content.promisingSignals[0],
              evidenceUrls: ["not a URL"],
            },
          ],
        },
      }),
    ).toThrow();
  });

  it("rejects non-http evidence URLs", () => {
    expect(() =>
      generatedFounderBriefSchema.parse({
        ...validDraft,
        content: {
          ...validDraft.content,
          promisingSignals: [
            {
              ...validDraft.content.promisingSignals[0],
              evidenceUrls: ["javascript:alert(1)"],
            },
          ],
        },
      }),
    ).toThrow();
  });

  it("requires explicit unknowns and founder questions", () => {
    expect(
      generatedFounderBriefSchema.safeParse({
        ...validDraft,
        content: {
          ...validDraft.content,
          materialUnknowns: [],
          founderQuestions: [],
        },
      }).success,
    ).toBe(false);
  });
});
