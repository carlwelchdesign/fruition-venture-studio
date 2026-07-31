import type { BoardAgentResponse } from "@/agents/board-schemas";

type ProvenanceContext = {
  reports: Array<{
    sources: Array<{ url: string; title?: string }>;
  }>;
  verifiedSources: Array<{
    originalUrl: string;
    finalUrl: string | null;
    status: "VERIFIED" | "BLOCKED" | "UNAVAILABLE" | "UNSUPPORTED";
    title?: string | null;
    statusDetail?: string | null;
    extractedText?: string | null;
    retrievedAt?: string | null;
  }>;
};

function normalizedUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function collectProviderCitationUrls(
  value: unknown,
  urls: Set<string>,
  seen = new WeakSet<object>(),
  depth = 0,
) {
  if (!value || typeof value !== "object" || depth > 12 || seen.has(value)) {
    return;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item) =>
      collectProviderCitationUrls(item, urls, seen, depth + 1),
    );
    return;
  }
  const record = value as Record<string, unknown>;
  if (record.type === "url_citation" && typeof record.url === "string") {
    const url = normalizedUrl(record.url);
    if (url) {
      urls.add(url);
    }
  }
  Object.values(record).forEach((item) =>
    collectProviderCitationUrls(item, urls, seen, depth + 1),
  );
}

export function restrictBoardResponseCitations(
  context: ProvenanceContext,
  response: BoardAgentResponse,
  rawResponses: unknown,
): BoardAgentResponse {
  const allowedUrls = new Set<string>();
  context.reports.forEach((report) =>
    report.sources.forEach((source) => {
      const url = normalizedUrl(source.url);
      if (url) {
        allowedUrls.add(url);
      }
    }),
  );
  context.verifiedSources.forEach((source) => {
    if (source.status !== "VERIFIED") {
      return;
    }
    [source.originalUrl, source.finalUrl].forEach((value) => {
      if (!value) {
        return;
      }
      const url = normalizedUrl(value);
      if (url) {
        allowedUrls.add(url);
      }
    });
  });
  collectProviderCitationUrls(rawResponses, allowedUrls);

  return {
    ...response,
    citations: response.citations.filter((citation) => {
      const url = normalizedUrl(citation.url);
      return Boolean(url && allowedUrls.has(url));
    }),
  };
}
