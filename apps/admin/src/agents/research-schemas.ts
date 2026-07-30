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

const estimateSchema = z.object({
  value: z.number().min(0).nullable(),
  basis: z.string().min(1).max(800),
  confidence: z.number().min(0).max(1),
  sourceUrls: z.array(generatedUrlSchema).max(8),
});

const scenarioYearSchema = z.object({
  year: z.number().int().min(1).max(5),
  revenue: estimateSchema,
  operatingCosts: estimateSchema,
  customers: estimateSchema,
});

export const ventureFinancialsSchema = z.object({
  currency: z.string().regex(/^[A-Z]{3}$/),
  methodology: z.string().min(1).max(1600),
  marketSizing: z.object({
    tam: estimateSchema,
    sam: estimateSchema,
    som: estimateSchema,
  }),
  unitEconomics: z.object({
    annualRevenuePerCustomer: estimateSchema,
    grossMarginPercent: estimateSchema,
    customerAcquisitionCost: estimateSchema,
    lifetimeValue: estimateSchema,
    paybackMonths: estimateSchema,
  }),
  annualCostDrivers: z
    .array(
      z.object({
        label: z.string().min(1).max(120),
        estimate: estimateSchema,
      }),
    )
    .max(8),
  scenarios: z
    .array(
      z.object({
        name: z.enum(["conservative", "base", "upside"]),
        description: z.string().min(1).max(600),
        capitalRequired: estimateSchema,
        years: z.array(scenarioYearSchema).length(3),
      }),
    )
    .length(3),
  keyAssumptions: z.array(z.string().min(1).max(600)).max(12),
  caveats: z.array(z.string().min(1).max(600)).max(12),
});

export const financeReportSchema = specialistReportSchema.extend({
  financials: ventureFinancialsSchema,
});

export type VentureFinancials = z.infer<typeof ventureFinancialsSchema>;
export type FinanceReport = z.infer<typeof financeReportSchema>;
export type ResearchSpecialistReport = SpecialistReport | FinanceReport;

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

function validateEstimateUrls(
  estimate: z.infer<typeof estimateSchema>,
  field: string,
) {
  estimate.sourceUrls.forEach((url, index) => {
    assertHttpUrl(url, `${field}, source ${index + 1}`);
  });
}

export function validateFinanceReportUrls(report: FinanceReport) {
  validateSpecialistReportUrls(report);

  const expectedScenarioNames = ["conservative", "base", "upside"] as const;
  const scenarioNames = new Set(
    report.financials.scenarios.map((scenario) => scenario.name),
  );
  if (
    scenarioNames.size !== expectedScenarioNames.length ||
    expectedScenarioNames.some((name) => !scenarioNames.has(name))
  ) {
    throw new Error(
      "Financial scenarios must include one conservative, base, and upside case.",
    );
  }

  Object.entries(report.financials.marketSizing).forEach(([key, estimate]) => {
    validateEstimateUrls(estimate, `Market sizing ${key}`);
  });
  Object.entries(report.financials.unitEconomics).forEach(([key, estimate]) => {
    validateEstimateUrls(estimate, `Unit economics ${key}`);
  });
  report.financials.annualCostDrivers.forEach((driver, index) => {
    validateEstimateUrls(driver.estimate, `Cost driver ${index + 1}`);
  });
  report.financials.scenarios.forEach((scenario) => {
    const years = scenario.years.map((year) => year.year).sort();
    if (years.some((year, index) => year !== index + 1)) {
      throw new Error(
        `${scenario.name} scenario must include one model for years 1, 2, and 3.`,
      );
    }
    validateEstimateUrls(
      scenario.capitalRequired,
      `${scenario.name} capital required`,
    );
    scenario.years.forEach((year) => {
      validateEstimateUrls(
        year.revenue,
        `${scenario.name} year ${year.year} revenue`,
      );
      validateEstimateUrls(
        year.operatingCosts,
        `${scenario.name} year ${year.year} operating costs`,
      );
      validateEstimateUrls(
        year.customers,
        `${scenario.name} year ${year.year} customers`,
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
  "financial_viability",
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
