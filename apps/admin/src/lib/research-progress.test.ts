import { describe, expect, it } from "vitest";
import {
  formatElapsedTime,
  getResearchPhase,
  isResearchActive,
  isResearchRunSnapshot,
} from "@/lib/research-progress";

describe("research progress", () => {
  it("maps durable run state to honest UI phases", () => {
    expect(getResearchPhase({ status: "QUEUED", reportCount: 0 })).toBe(
      "commissioning",
    );
    expect(getResearchPhase({ status: "RUNNING", reportCount: 0 })).toBe(
      "researching",
    );
    expect(getResearchPhase({ status: "RUNNING", reportCount: 6 })).toBe(
      "synthesizing",
    );
    expect(getResearchPhase({ status: "COMPLETED", reportCount: 6 })).toBe(
      "ready",
    );
    expect(getResearchPhase({ status: "FAILED", reportCount: 0 })).toBe(
      "failed",
    );
  });

  it("recognizes only queued and running research as active", () => {
    expect(isResearchActive("QUEUED")).toBe(true);
    expect(isResearchActive("RUNNING")).toBe(true);
    expect(isResearchActive("COMPLETED")).toBe(false);
    expect(isResearchActive("FAILED")).toBe(false);
  });

  it("formats elapsed time without implying precision beyond seconds", () => {
    expect(formatElapsedTime(9)).toBe("9s");
    expect(formatElapsedTime(65)).toBe("1m 05s");
    expect(formatElapsedTime(-10)).toBe("0s");
  });

  it("rejects malformed polling responses", () => {
    expect(
      isResearchRunSnapshot({
        id: "run-1",
        version: 1,
        status: "RUNNING",
        model: "gpt-test",
        reportCount: 0,
        errorMessage: null,
        createdAt: "2026-07-30T00:00:00.000Z",
        startedAt: "2026-07-30T00:00:01.000Z",
        completedAt: null,
        updatedAt: "2026-07-30T00:00:01.000Z",
      }),
    ).toBe(true);

    expect(
      isResearchRunSnapshot({
        id: "run-1",
        status: "RUNNING",
        reportCount: "six",
      }),
    ).toBe(false);
  });
});
