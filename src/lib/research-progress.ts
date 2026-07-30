export const researchRunStatuses = [
  "QUEUED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
] as const;

export type ResearchRunStatus = (typeof researchRunStatuses)[number];

export type ResearchRunSnapshot = {
  id: string;
  version: number;
  status: ResearchRunStatus;
  model: string;
  reportCount: number;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

export type ResearchActionState =
  | {
      outcome: "idle";
      message: null;
      run: null;
    }
  | {
      outcome: "started";
      message: string;
      run: ResearchRunSnapshot;
    }
  | {
      outcome: "error";
      message: string;
      run: ResearchRunSnapshot | null;
    };

export type ResearchPhase =
  | "commissioning"
  | "researching"
  | "synthesizing"
  | "ready"
  | "failed";

export function isResearchActive(status: ResearchRunStatus) {
  return status === "QUEUED" || status === "RUNNING";
}

export function isResearchRunSnapshot(
  value: unknown,
): value is ResearchRunSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const run = value as Record<string, unknown>;
  return (
    typeof run.id === "string" &&
    typeof run.version === "number" &&
    researchRunStatuses.includes(run.status as ResearchRunStatus) &&
    typeof run.model === "string" &&
    typeof run.reportCount === "number" &&
    (run.errorMessage === null || typeof run.errorMessage === "string") &&
    typeof run.createdAt === "string" &&
    (run.startedAt === null || typeof run.startedAt === "string") &&
    (run.completedAt === null || typeof run.completedAt === "string") &&
    typeof run.updatedAt === "string"
  );
}

export function getResearchPhase(
  run: Pick<ResearchRunSnapshot, "status" | "reportCount">,
): ResearchPhase {
  if (run.status === "FAILED") {
    return "failed";
  }
  if (run.status === "COMPLETED") {
    return "ready";
  }
  if (run.status === "QUEUED") {
    return "commissioning";
  }
  if (run.reportCount > 0) {
    return "synthesizing";
  }
  return "researching";
}

export function formatElapsedTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}
