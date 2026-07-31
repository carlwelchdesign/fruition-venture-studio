import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  executeIntakeCapability: vi.fn(),
}));

vi.mock("@/lib/submissions", () => ({
  executeIntakeCapability: mocks.executeIntakeCapability,
}));

import { getPublishedFounderBrief } from "@/lib/founder-brief";

const content = {
  summary: "A clear founder-facing summary.",
  promisingSignals: [
    {
      title: "Strong problem evidence",
      detail: "Operators repeatedly describe the same costly workflow.",
      evidenceUrls: ["https://example.com/evidence"],
    },
  ],
  marketLandscape: "A fragmented market with several indirect alternatives.",
  materialUnknowns: ["Willingness to pay"],
  assumptions: [{ label: "Urgency", rationale: "Budget exists this year." }],
  validationExperiment: {
    objective: "Test a paid pilot.",
    steps: ["Interview buyers"],
    successSignal: "Three paid commitments",
  },
  founderQuestions: ["Who owns the budget?"],
  confidenceNote: "Commercial evidence remains limited.",
  disclaimer: "Informational only.",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPublishedFounderBrief", () => {
  it("returns a minimal published brief through the capability function", async () => {
    mocks.executeIntakeCapability.mockResolvedValue({
      rows: [
        {
          reference: "FVS-ABC123DEF456",
          title: "Opportunity Brief",
          content,
          financials: null,
          sources: [
            {
              url: "https://example.com/evidence",
              title: "Evidence",
              snippet: "Public source.",
            },
          ],
          publishedAt: new Date("2026-07-30T12:00:00Z"),
          expiresAt: new Date("2026-10-28T12:00:00Z"),
        },
      ],
    });

    await expect(
      getPublishedFounderBrief("A".repeat(43)),
    ).resolves.toMatchObject({
      reference: "FVS-ABC123DEF456",
      title: "Opportunity Brief",
      content,
    });
    expect(mocks.executeIntakeCapability).toHaveBeenCalledOnce();
    expect(mocks.executeIntakeCapability.mock.calls[0][0]).toContain(
      "get_published_founder_brief",
    );
    expect(mocks.executeIntakeCapability.mock.calls[0][1][0]).toMatch(
      /^[a-f0-9]{64}$/,
    );
  });

  it("rejects malformed tokens without touching the database", async () => {
    await expect(getPublishedFounderBrief("not-a-token")).resolves.toBeNull();
    expect(mocks.executeIntakeCapability).not.toHaveBeenCalled();
  });

  it("drops unsafe source and evidence URLs", async () => {
    mocks.executeIntakeCapability.mockResolvedValue({
      rows: [
        {
          reference: "FVS-ABC123DEF456",
          title: "Opportunity Brief",
          content: {
            ...content,
            promisingSignals: [
              {
                ...content.promisingSignals[0],
                evidenceUrls: ["javascript:alert(1)"],
              },
            ],
          },
          financials: null,
          sources: [
            {
              url: "javascript:alert(1)",
              title: "Unsafe",
              snippet: null,
            },
          ],
          publishedAt: new Date(),
          expiresAt: new Date(Date.now() + 1000),
        },
      ],
    });

    const result = await getPublishedFounderBrief("B".repeat(43));
    expect(result?.sources).toEqual([]);
    expect(result?.content.promisingSignals[0].evidenceUrls).toEqual([]);
  });
});
