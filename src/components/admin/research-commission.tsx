"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { approveAndResearchAction } from "@/app/admin/actions";
import {
  formatElapsedTime,
  getResearchPhase,
  isResearchActive,
  isResearchRunSnapshot,
  type ResearchActionState,
  type ResearchPhase,
  type ResearchRunSnapshot,
} from "@/lib/research-progress";
import styles from "@/app/admin/admin.module.css";

const initialActionState: ResearchActionState = {
  outcome: "idle",
  message: null,
  run: null,
};

const phaseOrder = [
  "commissioning",
  "researching",
  "synthesizing",
  "ready",
] as const;

const phaseLabels = {
  commissioning: "Commission",
  researching: "Specialist research",
  synthesizing: "Studio synthesis",
  ready: "Assessment ready",
} satisfies Record<(typeof phaseOrder)[number], string>;

function phasePosition(phase: ResearchPhase) {
  if (phase === "failed") {
    return -1;
  }
  return phaseOrder.indexOf(phase);
}

function statusCopy(run: ResearchRunSnapshot) {
  const phase = getResearchPhase(run);

  if (phase === "commissioning") {
    return {
      eyebrow: "Commission accepted",
      title: "Preparing the research team.",
      body: "The six specialist briefs are queued and will begin automatically.",
    };
  }

  if (phase === "researching") {
    return {
      eyebrow: "Research in progress",
      title: "Six specialists are working in parallel.",
      body: "Customer, market, product, technical, business, and risk evidence is being gathered from public sources.",
    };
  }

  if (phase === "synthesizing") {
    return {
      eyebrow: "Evidence collected",
      title: "Building the studio assessment.",
      body: `${run.reportCount} specialist reports are ready. The final evaluator is synthesizing the scorecard and recommendation.`,
    };
  }

  if (phase === "ready") {
    return {
      eyebrow: "Research complete",
      title: "The assessment is ready for your judgment.",
      body: "The scorecard and specialist reports are available below. AI findings remain advisory until you make the venture decision.",
    };
  }

  return {
    eyebrow: "Research interrupted",
    title: "The run needs your attention.",
    body:
      run.errorMessage ??
      "The workflow stopped before completing. Review the error and retry when ready.",
  };
}

function actionLabel(run: ResearchRunSnapshot | null) {
  if (run?.status === "FAILED") {
    return "Retry research";
  }
  if (run) {
    return "Run new research version";
  }
  return "Approve research";
}

export function ResearchCommission({
  ideaId,
  initialRun,
}: {
  ideaId: string;
  initialRun: ResearchRunSnapshot | null;
}) {
  const router = useRouter();
  const [actionState, formAction, isPending] = useActionState(
    approveAndResearchAction,
    initialActionState,
  );
  const [polledRun, setPolledRun] = useState<ResearchRunSnapshot | null>(null);
  const [elapsed, setElapsed] = useState({ runId: "", seconds: 0 });
  const [liveUpdateError, setLiveUpdateError] = useState<{
    runId: string;
    message: string;
  } | null>(null);
  const baseRun = actionState.run ?? initialRun;
  const run = polledRun?.id === baseRun?.id ? polledRun : baseRun;

  const runId = run?.id ?? null;
  const runStatus = run?.status ?? null;

  useEffect(() => {
    if (!runId || !runStatus || !isResearchActive(runStatus)) {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const activeRunId = runId;

    async function poll() {
      try {
        const response = await fetch(`/api/admin/research-runs/${activeRunId}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (response.status === 401) {
          setLiveUpdateError({
            runId: activeRunId,
            message:
              "Your admin session expired. Sign in again to continue receiving live updates.",
          });
          return;
        }

        if (!response.ok) {
          throw new Error("Research status is temporarily unavailable.");
        }

        const payload: unknown = await response.json();
        if (!isResearchRunSnapshot(payload)) {
          throw new Error("Research status returned an invalid response.");
        }
        const nextRun = payload;
        if (cancelled) {
          return;
        }

        setPolledRun(nextRun);
        setLiveUpdateError(null);

        if (isResearchActive(nextRun.status)) {
          timeoutId = setTimeout(poll, 2500);
        } else {
          router.refresh();
        }
      } catch (error) {
        if (cancelled || controller.signal.aborted) {
          return;
        }

        setLiveUpdateError({
          runId: activeRunId,
          message:
            error instanceof Error
              ? error.message
              : "Live updates paused. Retrying automatically.",
        });
        timeoutId = setTimeout(poll, 5000);
      }
    }

    timeoutId = setTimeout(poll, 800);

    return () => {
      cancelled = true;
      controller.abort();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [router, runId, runStatus]);

  const startedAt = run?.startedAt ?? run?.createdAt ?? null;

  useEffect(() => {
    if (!startedAt || !runStatus || !isResearchActive(runStatus)) {
      return;
    }

    function updateElapsed() {
      setElapsed({
        runId: runId ?? "",
        seconds: Math.max(
          0,
          Math.floor((Date.now() - Date.parse(startedAt!)) / 1000),
        ),
      });
    }

    const intervalId = setInterval(updateElapsed, 1000);
    return () => clearInterval(intervalId);
  }, [runId, runStatus, startedAt]);

  const phase = run ? getResearchPhase(run) : null;
  const copy = run ? statusCopy(run) : null;
  const currentPosition = phase ? phasePosition(phase) : -1;
  const active = run ? isResearchActive(run.status) : false;
  const actionError =
    actionState.outcome === "error" ? actionState.message : null;
  const currentLiveUpdateError =
    liveUpdateError?.runId === runId ? liveUpdateError.message : null;
  const elapsedSeconds = elapsed.runId === runId ? elapsed.seconds : 0;

  return (
    <div className={styles.researchConsole}>
      {run && copy ? (
        <div
          className={`${styles.researchStatus} ${
            phase === "failed" ? styles.researchStatusError : ""
          }`}
          aria-live="polite"
          aria-atomic="true"
        >
          <div className={styles.researchStatusHeader}>
            <div>
              <p className={styles.researchEyebrow}>{copy.eyebrow}</p>
              <h3>{copy.title}</h3>
            </div>
            {active ? (
              <div className={styles.liveSignal}>
                <span aria-hidden="true" />
                Live
              </div>
            ) : null}
          </div>

          <p className={styles.researchStatusBody}>{copy.body}</p>

          {phase !== "failed" ? (
            <>
              <div
                className={styles.researchProgressTrack}
                data-phase={phase}
                aria-hidden="true"
              >
                <span />
              </div>
              <ol className={styles.researchPhases}>
                {phaseOrder.map((item, index) => {
                  const isCurrent = index === currentPosition;
                  const isComplete = index < currentPosition;
                  return (
                    <li
                      className={
                        isCurrent
                          ? styles.researchPhaseCurrent
                          : isComplete
                            ? styles.researchPhaseComplete
                            : undefined
                      }
                      key={item}
                    >
                      <span>{(index + 1).toString().padStart(2, "0")}</span>
                      {phaseLabels[item]}
                    </li>
                  );
                })}
              </ol>
            </>
          ) : null}

          <div className={styles.researchTelemetry}>
            <span>Version {run.version}</span>
            <span>{run.model}</span>
            {active ? (
              <span>Elapsed {formatElapsedTime(elapsedSeconds)}</span>
            ) : null}
            {run.reportCount > 0 ? (
              <span>
                {run.reportCount} specialist{" "}
                {run.reportCount === 1 ? "report" : "reports"}
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <div className={styles.researchEmpty}>
          <span className={styles.researchEmptyRule} />
          <h3>Ready when you are.</h3>
          <p>
            Authorizing research commissions six specialists and one final
            evaluator. Results remain advisory and private to the studio.
          </p>
        </div>
      )}

      {currentLiveUpdateError ? (
        <p className={styles.researchUpdateError} role="status">
          {currentLiveUpdateError}{" "}
          {currentLiveUpdateError.includes("session expired") ? (
            <a href="/admin/sign-in">Sign in again</a>
          ) : (
            "We’ll keep trying."
          )}
        </p>
      ) : null}

      {actionError ? (
        <p className={styles.researchUpdateError} role="alert">
          {actionError}
        </p>
      ) : null}

      {!active ? (
        <form action={formAction} className={styles.researchAction}>
          <input type="hidden" name="ideaId" value={ideaId} />
          <button
            className={styles.primaryButton}
            type="submit"
            disabled={isPending}
          >
            {isPending ? "Commissioning research…" : actionLabel(run)}
          </button>
          <p>
            {isPending
              ? "Creating the durable workflow and assigning the research team."
              : "You can leave this page after the run begins. Progress will continue in the background."}
          </p>
        </form>
      ) : (
        <p className={styles.researchAutoUpdate}>
          This page updates automatically. You can safely leave and return
          later—the research continues in the background.
        </p>
      )}
    </div>
  );
}
