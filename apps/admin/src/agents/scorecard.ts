import type { ResearchSynthesis } from "@/agents/research-schemas";

export const scoreDefinitions = [
  {
    key: "problem_strength",
    label: "Problem strength and customer urgency",
    weight: 13,
  },
  {
    key: "founder_advantage",
    label: "Founder or domain advantage",
    weight: 12,
  },
  {
    key: "market_opportunity",
    label: "Market evidence and opportunity",
    weight: 14,
  },
  {
    key: "differentiation",
    label: "Differentiation and defensibility",
    weight: 13,
  },
  {
    key: "technical_feasibility",
    label: "Technical feasibility and architecture risk",
    weight: 13,
  },
  {
    key: "revenue_path",
    label: "Revenue model and path to market",
    weight: 14,
  },
  {
    key: "financial_viability",
    label: "Venture economics and capital efficiency",
    weight: 13,
  },
  {
    key: "studio_fit",
    label: "Fruition studio fit and shared-upside potential",
    weight: 8,
  },
] as const;

export function buildScorecard(synthesis: ResearchSynthesis) {
  const dimensionsByKey = new Map(
    synthesis.dimensions.map((dimension) => [dimension.key, dimension]),
  );

  if (dimensionsByKey.size !== scoreDefinitions.length) {
    throw new Error("The synthesis must score every dimension exactly once.");
  }

  const dimensions = scoreDefinitions.map((definition) => {
    const result = dimensionsByKey.get(definition.key);
    if (!result) {
      throw new Error(`Missing score dimension: ${definition.key}`);
    }

    return {
      ...definition,
      aiScore: result.score,
      aiRationale: result.rationale,
      confidence: result.confidence,
      evidence: result.evidence,
    };
  });

  const totalScore = dimensions.reduce(
    (total, dimension) =>
      total + (dimension.aiScore / 5) * dimension.weight,
    0,
  );

  return {
    totalScore: Math.round(totalScore * 10) / 10,
    recommendation: synthesis.recommendation,
    confidence: synthesis.confidence,
    summary: synthesis.summary,
    nextSteps: synthesis.nextSteps,
    dimensions,
  };
}
