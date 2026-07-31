export type FounderBriefSignal = {
  title: string;
  detail: string;
  evidenceUrls: string[];
};

export type FounderBriefAssumption = {
  label: string;
  rationale: string;
};

export type FounderBriefContent = {
  summary: string;
  promisingSignals: FounderBriefSignal[];
  marketLandscape: string;
  materialUnknowns: string[];
  assumptions: FounderBriefAssumption[];
  validationExperiment: {
    objective: string;
    steps: string[];
    successSignal: string;
  };
  founderQuestions: string[];
  confidenceNote: string;
  disclaimer: string;
};

export type FounderBriefSource = {
  url: string;
  title: string;
  snippet: string | null;
};

export type FounderBriefFinancials = {
  currency: string;
  scenarios: Array<{
    name: "conservative" | "base" | "upside";
    years: Array<{
      year: number;
      revenue: number | null;
      operatingCosts: number | null;
    }>;
  }>;
  caveats: string[];
};

export type PublishedFounderBrief = {
  reference: string;
  title: string;
  content: FounderBriefContent;
  financials: FounderBriefFinancials | null;
  sources: FounderBriefSource[];
  publishedAt: string;
  expiresAt: string;
};

export type ContactSuccessResponse = {
  submissionId: string;
  reference: string;
  status: "received";
  message: string;
  confirmationEmail: "sent" | "unavailable";
};
