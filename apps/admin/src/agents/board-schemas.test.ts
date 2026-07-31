import { describe, expect, it } from "vitest";
import { boardResponseSchema } from "@/agents/board-schemas";

const validResponse = {
  answer: "The strongest next step is a paid customer-discovery test.",
  contributors: ["CUSTOMER_PROBLEM", "BUSINESS_GTM"],
  unknownVariables: ["Whether the buyer controls an existing budget."],
  citations: [
    {
      url: "https://example.com/market",
      title: "Market evidence",
    },
  ],
  scoreProposals: [
    {
      dimensionKey: "problem_strength",
      proposedScore: 4,
      rationale: "Three signed design partners materially reduce demand risk.",
      evidence: ["Founder supplied signed letters from three design partners."],
    },
  ],
};

describe("boardResponseSchema", () => {
  it("accepts evidence-aware board responses and score proposals", () => {
    expect(boardResponseSchema.parse(validResponse)).toEqual(validResponse);
  });

  it("rejects unsafe citation protocols", () => {
    expect(() =>
      boardResponseSchema.parse({
        ...validResponse,
        citations: [{ url: "javascript:alert(1)", title: "Unsafe" }],
      }),
    ).toThrow();
  });

  it("rejects out-of-range score proposals", () => {
    expect(() =>
      boardResponseSchema.parse({
        ...validResponse,
        scoreProposals: [
          { ...validResponse.scoreProposals[0], proposedScore: 6 },
        ],
      }),
    ).toThrow();
  });
});
