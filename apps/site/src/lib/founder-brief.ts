import "server-only";

import { createHash } from "node:crypto";
import type {
  FounderBriefContent,
  FounderBriefFinancials,
  FounderBriefSource,
  PublishedFounderBrief,
} from "@fruition/contracts/founder-brief";
import { executeIntakeCapability } from "@/lib/submissions";

type FounderBriefRow = {
  reference: string;
  title: string;
  content: unknown;
  financials: unknown;
  sources: unknown;
  publishedAt: Date;
  expiresAt: Date;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function httpUrl(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function urlArray(value: unknown) {
  return stringArray(value).flatMap((item) => {
    const parsed = httpUrl(item);
    return parsed ? [parsed] : [];
  });
}

function parseContent(value: unknown): FounderBriefContent | null {
  if (!isRecord(value) || !isRecord(value.validationExperiment)) {
    return null;
  }
  const signals = Array.isArray(value.promisingSignals)
    ? value.promisingSignals.flatMap((signal) =>
        isRecord(signal) &&
        typeof signal.title === "string" &&
        typeof signal.detail === "string"
          ? [
              {
                title: signal.title,
                detail: signal.detail,
                evidenceUrls: urlArray(signal.evidenceUrls),
              },
            ]
          : [],
      )
    : [];
  const assumptions = Array.isArray(value.assumptions)
    ? value.assumptions.flatMap((assumption) =>
        isRecord(assumption) &&
        typeof assumption.label === "string" &&
        typeof assumption.rationale === "string"
          ? [
              {
                label: assumption.label,
                rationale: assumption.rationale,
              },
            ]
          : [],
      )
    : [];
  const experiment = value.validationExperiment;
  if (
    typeof value.summary !== "string" ||
    typeof value.marketLandscape !== "string" ||
    typeof value.confidenceNote !== "string" ||
    typeof value.disclaimer !== "string" ||
    typeof experiment.objective !== "string" ||
    typeof experiment.successSignal !== "string"
  ) {
    return null;
  }
  return {
    summary: value.summary,
    promisingSignals: signals,
    marketLandscape: value.marketLandscape,
    materialUnknowns: stringArray(value.materialUnknowns),
    assumptions,
    validationExperiment: {
      objective: experiment.objective,
      steps: stringArray(experiment.steps),
      successSignal: experiment.successSignal,
    },
    founderQuestions: stringArray(value.founderQuestions),
    confidenceNote: value.confidenceNote,
    disclaimer: value.disclaimer,
  };
}

function parseSources(value: unknown): FounderBriefSource[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((source) => {
    if (!isRecord(source) || typeof source.title !== "string") {
      return [];
    }
    const url = httpUrl(source.url);
    return url
      ? [
          {
            url,
            title: source.title,
            snippet: typeof source.snippet === "string" ? source.snippet : null,
          },
        ]
      : [];
  });
}

function parseFinancials(value: unknown): FounderBriefFinancials | null {
  if (
    !isRecord(value) ||
    typeof value.currency !== "string" ||
    !Array.isArray(value.scenarios)
  ) {
    return null;
  }
  const scenarios = value.scenarios.flatMap((scenario) => {
    if (
      !isRecord(scenario) ||
      !["conservative", "base", "upside"].includes(String(scenario.name)) ||
      !Array.isArray(scenario.years)
    ) {
      return [];
    }
    const years = scenario.years.flatMap((year) =>
      isRecord(year) && typeof year.year === "number"
        ? [
            {
              year: year.year,
              revenue:
                typeof year.revenue === "number" ? year.revenue : null,
              operatingCosts:
                typeof year.operatingCosts === "number"
                  ? year.operatingCosts
                  : null,
            },
          ]
        : [],
    );
    return [
      {
        name: scenario.name as "conservative" | "base" | "upside",
        years,
      },
    ];
  });
  return {
    currency: value.currency,
    scenarios,
    caveats: stringArray(value.caveats),
  };
}

export async function getPublishedFounderBrief(
  token: string,
): Promise<PublishedFounderBrief | null> {
  if (!/^[A-Za-z0-9_-]{40,80}$/.test(token)) {
    return null;
  }
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const result = await executeIntakeCapability<FounderBriefRow>(
    `
      SELECT "reference", "title", "content", "financials", "sources",
             "publishedAt", "expiresAt"
      FROM public.get_published_founder_brief($1)
    `,
    [tokenHash],
  );
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  const content = parseContent(row.content);
  if (!content) {
    return null;
  }
  return {
    reference: row.reference,
    title: row.title,
    content,
    financials: parseFinancials(row.financials),
    sources: parseSources(row.sources),
    publishedAt: row.publishedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  };
}
