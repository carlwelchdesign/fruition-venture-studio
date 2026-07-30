import { describe, expect, it } from "vitest";
import { describeResearchError } from "@/agents/research-errors";

describe("describeResearchError", () => {
  it("preserves standard errors", () => {
    expect(describeResearchError(new Error("Provider request failed."))).toBe(
      "Provider request failed.",
    );
  });

  it("preserves serialized workflow errors", () => {
    expect(
      describeResearchError({
        status: 400,
        error: {
          code: "invalid_json_schema",
          message: "The response schema is invalid.",
        },
      }),
    ).toBe("The response schema is invalid.");
  });

  it("preserves thrown strings", () => {
    expect(describeResearchError("Research timed out.")).toBe(
      "Research timed out.",
    );
  });

  it("uses a stable fallback for unrecognized failures", () => {
    expect(describeResearchError(null)).toBe("Unknown research failure");
  });
});
