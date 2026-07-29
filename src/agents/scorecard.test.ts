import { describe, expect, it } from "vitest";
import type { ResearchSynthesis } from "@/agents/research-schemas";
import { buildScorecard, scoreDefinitions } from "@/agents/scorecard";

function synthesis(score = 4): ResearchSynthesis {
  return {
    summary: "A promising but still evidence-dependent opportunity.",
    recommendation: "EXPLORE",
    confidence: 0.72,
    dimensions: scoreDefinitions.map((definition) => ({
      key: definition.key,
      score,
      rationale: `Rationale for ${definition.key}`,
      confidence: 0.7,
      evidence: ["One cited signal"],
    })),
    nextSteps: ["Interview five target buyers."],
  };
}

describe("buildScorecard", () => {
  it("calculates the fixed weighted score out of 100", () => {
    const result = buildScorecard(synthesis(4));
    expect(result.totalScore).toBe(80);
    expect(result.dimensions).toHaveLength(7);
  });

  it("rejects duplicate or missing dimensions", () => {
    const invalid = synthesis();
    invalid.dimensions[6] = invalid.dimensions[0];

    expect(() => buildScorecard(invalid)).toThrow(
      "The synthesis must score every dimension exactly once.",
    );
  });
});
