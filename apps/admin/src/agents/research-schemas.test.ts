import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  financeReportSchema,
  specialistReportSchema,
  validateFinanceReportUrls,
  validateSpecialistReportUrls,
  type FinanceReport,
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

const estimate = {
  value: 100_000,
  basis: "A bounded test assumption.",
  confidence: 0.5,
  sourceUrls: ["https://example.com/evidence"],
};

const financeReport: FinanceReport = {
  ...report,
  financials: {
    currency: "USD",
    methodology: "A bottom-up model using customer and pricing assumptions.",
    marketSizing: { tam: estimate, sam: estimate, som: estimate },
    unitEconomics: {
      annualRevenuePerCustomer: estimate,
      grossMarginPercent: { ...estimate, value: 70 },
      customerAcquisitionCost: estimate,
      lifetimeValue: estimate,
      paybackMonths: { ...estimate, value: 12 },
    },
    annualCostDrivers: [{ label: "Engineering", estimate }],
    scenarios: ["conservative", "base", "upside"].map((name) => ({
      name: name as "conservative" | "base" | "upside",
      description: `${name} operating case.`,
      capitalRequired: estimate,
      years: [1, 2, 3].map((year) => ({
        year,
        revenue: estimate,
        operatingCosts: estimate,
        customers: estimate,
      })),
    })),
    keyAssumptions: ["Customers pay annually."],
    caveats: ["No primary customer interviews were available."],
  },
};

describe("specialistReportSchema", () => {
  it("does not send unsupported URI formats to structured outputs", () => {
    const jsonSchema = JSON.stringify(z.toJSONSchema(specialistReportSchema));
    expect(jsonSchema).not.toContain('"format":"uri"');
  });

  it("accepts an internally consistent structured finance report", () => {
    expect(financeReportSchema.parse(financeReport)).toEqual(financeReport);
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

  it("validates URLs embedded in financial estimates", () => {
    expect(validateFinanceReportUrls(financeReport)).toBe(financeReport);
    expect(() =>
      validateFinanceReportUrls({
        ...financeReport,
        financials: {
          ...financeReport.financials,
          marketSizing: {
            ...financeReport.financials.marketSizing,
            tam: {
              ...financeReport.financials.marketSizing.tam,
              sourceUrls: ["file:///private/forecast"],
            },
          },
        },
      }),
    ).toThrow("Market sizing tam, source 1 must use http or https.");
  });

  it("rejects duplicate scenarios and incomplete three-year models", () => {
    expect(() =>
      validateFinanceReportUrls({
        ...financeReport,
        financials: {
          ...financeReport.financials,
          scenarios: financeReport.financials.scenarios.map(
            (scenario, index) =>
              index === 2 ? { ...scenario, name: "base" } : scenario,
          ),
        },
      }),
    ).toThrow(
      "Financial scenarios must include one conservative, base, and upside case.",
    );

    expect(() =>
      validateFinanceReportUrls({
        ...financeReport,
        financials: {
          ...financeReport.financials,
          scenarios: financeReport.financials.scenarios.map((scenario) =>
            scenario.name === "base"
              ? {
                  ...scenario,
                  years: scenario.years.map((year, index) =>
                    index === 2 ? { ...year, year: 2 } : year,
                  ),
                }
              : scenario,
          ),
        },
      }),
    ).toThrow("base scenario must include one model for years 1, 2, and 3.");
  });
});
