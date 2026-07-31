import { describe, expect, it } from "vitest";
import { restrictBoardResponseCitations } from "@/agents/board-provenance";

const response = {
  answer: "The supplied evidence changes one assumption.",
  contributors: ["MARKET_COMPETITION" as const],
  unknownVariables: [],
  citations: [
    { url: "https://saved.example/report", title: "Saved report" },
    { url: "https://verified.example/article#detail", title: "Verified page" },
    { url: "https://searched.example/result", title: "Search result" },
    { url: "https://invented.example/claim", title: "Unverified claim" },
    { url: "https://blocked.example/private", title: "Blocked page" },
  ],
  scoreProposals: [],
};

describe("restrictBoardResponseCitations", () => {
  it("keeps only saved, fetched, or provider-observed citations", () => {
    const result = restrictBoardResponseCitations(
      {
        reports: [
          {
            sources: [
              { url: "https://saved.example/report", title: "Saved report" },
            ],
          },
        ],
        verifiedSources: [
          {
            originalUrl: "https://verified.example/article",
            finalUrl: "https://verified.example/article",
            title: "Verified page",
            status: "VERIFIED",
            statusDetail: null,
            extractedText: "Evidence",
            retrievedAt: new Date().toISOString(),
          },
          {
            originalUrl: "https://blocked.example/private",
            finalUrl: null,
            title: null,
            status: "BLOCKED",
            statusDetail: "Blocked",
            extractedText: null,
            retrievedAt: null,
          },
        ],
      },
      response,
      [
        {
          output: [
            {
              content: [
                {
                  providerData: {
                    annotations: [
                      {
                        type: "url_citation",
                        url: "https://searched.example/result",
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    );

    expect(result.citations.map((citation) => citation.url)).toEqual([
      "https://saved.example/report",
      "https://verified.example/article#detail",
      "https://searched.example/result",
    ]);
  });
});
