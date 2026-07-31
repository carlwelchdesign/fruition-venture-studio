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

export const maxBoardLinksPerMessage = 3;

export type BoardVerifiedSourceStatus =
  | "VERIFIED"
  | "BLOCKED"
  | "UNAVAILABLE"
  | "UNSUPPORTED";

export type BoardVerifiedSource = {
  id: string;
  originalUrl: string;
  finalUrl: string | null;
  title: string | null;
  status: BoardVerifiedSourceStatus;
  statusDetail: string | null;
  mimeType: string | null;
  contentHash: string | null;
  retrievedAt: string | null;
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
  verifiedSources: BoardVerifiedSource[];
  unknownVariables: string[];
  scoreProposals: BoardScoreProposal[];
  createdAt: string;
};

const linkPattern = /https?:\/\/[^\s<>"'`]+/gi;
const trailingLinkPunctuation = /[),.;:!?]+$/;

export function extractBoardLinks(message: string): string[] {
  const links = new Set<string>();
  for (const match of message.match(linkPattern) ?? []) {
    const candidate = match.replace(trailingLinkPunctuation, "");
    try {
      const url = new URL(candidate);
      if (!["http:", "https:"].includes(url.protocol)) {
        continue;
      }
      url.hash = "";
      links.add(url.toString());
    } catch {
      // Invalid URL-like text remains part of the message, but is not fetched.
    }
  }
  return [...links];
}

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
