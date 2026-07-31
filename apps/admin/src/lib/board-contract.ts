export const boardSpecialistRoles = [
  "CUSTOMER_PROBLEM",
  "MARKET_COMPETITION",
  "PRODUCT_MVP",
  "TECHNICAL_AI",
  "BUSINESS_GTM",
  "MARKET_FINANCE",
  "RISK_TRUST",
] as const;

export type BoardSpecialistRole = (typeof boardSpecialistRoles)[number];
export type BoardChannel = "BOARD" | "DIRECT";
export type BoardProposalStatus = "PENDING" | "ACCEPTED" | "DISMISSED";

export const boardSpecialistLabels: Record<BoardSpecialistRole, string> = {
  CUSTOMER_PROBLEM: "Customer & Problem",
  MARKET_COMPETITION: "Market & Competition",
  PRODUCT_MVP: "Product & MVP",
  TECHNICAL_AI: "Technical & AI",
  BUSINESS_GTM: "Business & Go-to-Market",
  MARKET_FINANCE: "Market Economics & Finance",
  RISK_TRUST: "Risk & Trust",
};

export type BoardCitation = {
  url: string;
  title: string;
};

export type BoardScoreProposal = {
  id: string;
  dimensionKey: string;
  dimensionLabel: string;
  currentScore: number;
  proposedScore: number;
  rationale: string;
  evidence: string[];
  status: BoardProposalStatus;
};

export type BoardMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  speakerRole: BoardSpecialistRole | "STUDIO_SYNTHESIS" | null;
  contributors: BoardSpecialistRole[];
  body: string;
  citations: BoardCitation[];
  unknownVariables: string[];
  scoreProposals: BoardScoreProposal[];
  createdAt: string;
};

export type BoardSessionSnapshot = {
  id: string | null;
  researchRunId: string;
  researchVersion: number;
  channel: BoardChannel;
  specialistRole: BoardSpecialistRole | null;
  messages: BoardMessage[];
};

export function isBoardSpecialistRole(
  value: unknown,
): value is BoardSpecialistRole {
  return (
    typeof value === "string" &&
    boardSpecialistRoles.includes(value as BoardSpecialistRole)
  );
}
