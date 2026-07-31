"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FounderBriefContent } from "@fruition/contracts/founder-brief";
import styles from "@/app/admin.module.css";

type FounderBriefSnapshot = {
  id: string;
  version: number;
  status: "DRAFT" | "PUBLISHED" | "REVOKED";
  title: string;
  content: FounderBriefContent;
  reviewed: boolean;
  deliveryStatus: string | null;
  deliveryError: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  viewCount: number;
  firstViewedAt: string | null;
};

type RequestState = {
  pending: "generate" | "save" | "publish" | "revoke" | null;
  outcome: "idle" | "success" | "error";
  message: string;
};

const initialState: RequestState = {
  pending: null,
  outcome: "idle",
  message: "",
};

function lines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function FounderBriefWorkspace({
  ideaId,
  researchReady,
  publishingEnabled,
  brief,
  activePublishedBrief,
  sectionNumber = "07",
}: {
  ideaId: string;
  researchReady: boolean;
  publishingEnabled: boolean;
  brief: FounderBriefSnapshot | null;
  activePublishedBrief: FounderBriefSnapshot | null;
  sectionNumber?: string;
}) {
  const router = useRouter();
  const [requestState, setRequestState] = useState(initialState);
  const endpoint = `/api/admin/ideas/${encodeURIComponent(ideaId)}/founder-brief`;

  async function send(
    action: NonNullable<RequestState["pending"]>,
    payload: Record<string, unknown> = {},
  ) {
    setRequestState({ pending: action, outcome: "idle", message: "" });
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(
          result.message ?? "The request could not be completed.",
        );
      }
      setRequestState({
        pending: null,
        outcome: "success",
        message: result.message ?? "The Opportunity Brief was updated.",
      });
      router.refresh();
    } catch (error) {
      setRequestState({
        pending: null,
        outcome: "error",
        message:
          error instanceof Error
            ? error.message
            : "The request could not be completed.",
      });
    }
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!brief) {
      return;
    }
    const data = new FormData(event.currentTarget);
    const signals = brief.content.promisingSignals.map((_, index) => ({
      title: String(data.get(`signalTitle-${index}`) ?? "").trim(),
      detail: String(data.get(`signalDetail-${index}`) ?? "").trim(),
      evidenceUrls: brief.content.promisingSignals[index].evidenceUrls,
    }));
    const assumptions = brief.content.assumptions.map((_, index) => ({
      label: String(data.get(`assumptionLabel-${index}`) ?? "").trim(),
      rationale: String(
        data.get(`assumptionRationale-${index}`) ?? "",
      ).trim(),
    }));
    void send("save", {
      briefId: brief.id,
      brief: {
        title: String(data.get("title") ?? "").trim(),
        content: {
          summary: String(data.get("summary") ?? "").trim(),
          promisingSignals: signals,
          marketLandscape: String(data.get("marketLandscape") ?? "").trim(),
          materialUnknowns: lines(
            String(data.get("materialUnknowns") ?? ""),
          ),
          assumptions,
          validationExperiment: {
            objective: String(
              data.get("validationObjective") ?? "",
            ).trim(),
            steps: lines(String(data.get("validationSteps") ?? "")),
            successSignal: String(data.get("successSignal") ?? "").trim(),
          },
          founderQuestions: lines(
            String(data.get("founderQuestions") ?? ""),
          ),
          confidenceNote: String(data.get("confidenceNote") ?? "").trim(),
        },
      },
    });
  }

  const pending = requestState.pending !== null;
  const canGenerate = researchReady && !pending;

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <span>{sectionNumber}</span>
        <h2>Founder Opportunity Brief</h2>
      </div>

      <div className={styles.briefIntroduction}>
        <div>
          <p className={styles.kicker}>Founder-facing deliverable</p>
          <h3>Publish the evidence, not the internal decision.</h3>
          <p>
            Generate a sanitized brief from completed specialist research.
            Internal scores, notes, dispositions, and board conversations are
            excluded. Nothing reaches the founder until you review and publish
            it.
          </p>
        </div>
        <span>Draft · human reviewed · private link</span>
      </div>

      {activePublishedBrief ? (
        <div className={styles.briefActiveLink}>
          <div>
            <span>Currently live · version {activePublishedBrief.version}</span>
            <strong>{activePublishedBrief.title}</strong>
            <p>
              This link remains active while you review the newer draft. It has
              {` ${activePublishedBrief.viewCount} `}
              recorded view(s) and expires{" "}
              {activePublishedBrief.expiresAt
                ? new Date(activePublishedBrief.expiresAt).toLocaleDateString()
                : "on its configured date"}
              .
            </p>
          </div>
          <div className={styles.briefActiveActions}>
            <button
              disabled={pending || !publishingEnabled}
              onClick={() =>
                void send("publish", {
                  briefId: activePublishedBrief.id,
                })
              }
              type="button"
            >
              Reissue current link
            </button>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const reason = String(
                  new FormData(event.currentTarget).get("reason") ?? "",
                );
                void send("revoke", {
                  briefId: activePublishedBrief.id,
                  reason,
                });
              }}
            >
              <input
                aria-label="Reason for revoking the current live brief"
                name="reason"
                placeholder="Revocation reason"
                required
                minLength={3}
              />
              <button disabled={pending} type="submit">
                Revoke
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {!brief ? (
        <div className={styles.briefEmpty}>
          <h3>
            {researchReady
              ? "Research is ready for a founder-safe draft."
              : "Complete research before creating a brief."}
          </h3>
          <p>
            Generation uses the latest completed specialist reports and their
            recorded sources. It does not use the private board room.
          </p>
          <button
            className={styles.primaryButton}
            disabled={!canGenerate}
            onClick={() => void send("generate")}
            type="button"
          >
            {requestState.pending === "generate"
              ? "Generating reviewed draft…"
              : "Generate Opportunity Brief"}
          </button>
        </div>
      ) : null}

      {brief?.status === "DRAFT" ? (
        <form className={styles.briefEditor} onSubmit={save}>
          <div className={styles.briefStatusRow}>
            <div>
              <span>Draft version {brief.version}</span>
              <strong>
                {brief.reviewed ? "Reviewed draft" : "AI draft · review required"}
              </strong>
            </div>
            <button
              disabled={pending}
              onClick={() => void send("generate")}
              type="button"
            >
              Generate new version
            </button>
          </div>

          <label>
            Report title
            <input defaultValue={brief.title} name="title" required />
          </label>
          <label>
            Opportunity summary
            <textarea
              defaultValue={brief.content.summary}
              name="summary"
              rows={6}
              required
            />
          </label>

          <fieldset>
            <legend>Promising signals</legend>
            {brief.content.promisingSignals.map((signal, index) => (
              <div className={styles.briefPair} key={`${signal.title}-${index}`}>
                <label>
                  Signal {index + 1}
                  <input
                    defaultValue={signal.title}
                    name={`signalTitle-${index}`}
                    required
                  />
                </label>
                <label>
                  Evidence-led interpretation
                  <textarea
                    defaultValue={signal.detail}
                    name={`signalDetail-${index}`}
                    rows={3}
                    required
                  />
                </label>
                <p>{signal.evidenceUrls.length} linked source(s)</p>
              </div>
            ))}
          </fieldset>

          <label>
            Market landscape
            <textarea
              defaultValue={brief.content.marketLandscape}
              name="marketLandscape"
              rows={5}
              required
            />
          </label>
          <label>
            Material unknowns
            <span>One item per line</span>
            <textarea
              defaultValue={brief.content.materialUnknowns.join("\n")}
              name="materialUnknowns"
              rows={6}
              required
            />
          </label>

          <fieldset>
            <legend>Key assumptions</legend>
            {brief.content.assumptions.map((assumption, index) => (
              <div
                className={styles.briefPair}
                key={`${assumption.label}-${index}`}
              >
                <label>
                  Assumption {index + 1}
                  <input
                    defaultValue={assumption.label}
                    name={`assumptionLabel-${index}`}
                    required
                  />
                </label>
                <label>
                  Why it matters
                  <textarea
                    defaultValue={assumption.rationale}
                    name={`assumptionRationale-${index}`}
                    rows={3}
                    required
                  />
                </label>
              </div>
            ))}
          </fieldset>

          <fieldset>
            <legend>Recommended validation experiment</legend>
            <label>
              Objective
              <textarea
                defaultValue={brief.content.validationExperiment.objective}
                name="validationObjective"
                rows={3}
                required
              />
            </label>
            <label>
              Steps
              <span>One item per line</span>
              <textarea
                defaultValue={brief.content.validationExperiment.steps.join(
                  "\n",
                )}
                name="validationSteps"
                rows={5}
                required
              />
            </label>
            <label>
              Success signal
              <textarea
                defaultValue={brief.content.validationExperiment.successSignal}
                name="successSignal"
                rows={3}
                required
              />
            </label>
          </fieldset>

          <label>
            Questions for the founder
            <span>One item per line</span>
            <textarea
              defaultValue={brief.content.founderQuestions.join("\n")}
              name="founderQuestions"
              rows={6}
              required
            />
          </label>
          <label>
            Confidence and evidence limits
            <textarea
              defaultValue={brief.content.confidenceNote}
              name="confidenceNote"
              rows={4}
              required
            />
          </label>

          <div className={styles.briefReviewNotice}>
            <strong>Required human review</strong>
            <p>
              Saving confirms that you reviewed the language, sources,
              assumptions, and disclaimer. Publication remains a separate
              action.
            </p>
          </div>

          <div className={styles.briefActions}>
            <button disabled={pending} type="submit">
              {requestState.pending === "save"
                ? "Saving review…"
                : "Save reviewed draft"}
            </button>
            <button
              disabled={pending || !brief.reviewed || !publishingEnabled}
              onClick={() =>
                void send("publish", {
                  briefId: brief.id,
                })
              }
              type="button"
            >
              {requestState.pending === "publish"
                ? "Publishing and emailing…"
                : "Publish private brief"}
            </button>
          </div>
          {!publishingEnabled ? (
            <p className={styles.briefGateNotice}>
              External delivery is currently disabled. Approve the public
              report copy and legal terms, then set{" "}
              <code>FOUNDER_BRIEF_PUBLISHING_ENABLED=true</code> in the admin
              deployment.
            </p>
          ) : null}
        </form>
      ) : null}

      {brief?.status === "PUBLISHED" ? (
        <div className={styles.briefPublished}>
          <div className={styles.briefStatusRow}>
            <div>
              <span>Published version {brief.version}</span>
              <strong>{brief.title}</strong>
            </div>
            <span>{brief.deliveryStatus?.replaceAll("_", " ")}</span>
          </div>
          <dl>
            <div>
              <dt>Published</dt>
              <dd>
                {brief.publishedAt
                  ? new Date(brief.publishedAt).toLocaleString()
                  : "Not recorded"}
              </dd>
            </div>
            <div>
              <dt>Expires</dt>
              <dd>
                {brief.expiresAt
                  ? new Date(brief.expiresAt).toLocaleDateString()
                  : "Not recorded"}
              </dd>
            </div>
            <div>
              <dt>Views</dt>
              <dd>{brief.viewCount}</dd>
            </div>
            <div>
              <dt>First viewed</dt>
              <dd>
                {brief.firstViewedAt
                  ? new Date(brief.firstViewedAt).toLocaleString()
                  : "Not yet viewed"}
              </dd>
            </div>
          </dl>
          {brief.deliveryError ? (
            <p className={styles.briefError}>{brief.deliveryError}</p>
          ) : null}
          <div className={styles.briefActions}>
            <button
              disabled={pending || !publishingEnabled}
              onClick={() =>
                void send("publish", {
                  briefId: brief.id,
                })
              }
              type="button"
            >
              {requestState.pending === "publish"
                ? "Creating replacement link…"
                : "Reissue link and email"}
            </button>
            <button
              disabled={pending}
              onClick={() =>
                void send("generate", {
                  briefId: brief.id,
                })
              }
              type="button"
            >
              Generate new version
            </button>
          </div>
          {!publishingEnabled ? (
            <p className={styles.briefGateNotice}>
              Link reissue is disabled by the founder-delivery feature gate.
            </p>
          ) : null}
          <form
            className={styles.briefRevoke}
            onSubmit={(event) => {
              event.preventDefault();
              const reason = String(
                new FormData(event.currentTarget).get("reason") ?? "",
              );
              void send("revoke", { briefId: brief.id, reason });
            }}
          >
            <label>
              Revocation reason
              <input name="reason" required minLength={3} />
            </label>
            <button disabled={pending} type="submit">
              Revoke private link
            </button>
          </form>
        </div>
      ) : null}

      {brief?.status === "REVOKED" ? (
        <div className={styles.briefEmpty}>
          <h3>Version {brief.version} has been revoked.</h3>
          <p>
            Its previous private link no longer returns the report. Generate a
            new version when you are ready to reconsider it.
          </p>
          <button
            className={styles.primaryButton}
            disabled={!canGenerate}
            onClick={() => void send("generate")}
            type="button"
          >
            Generate new version
          </button>
        </div>
      ) : null}

      {requestState.message ? (
        <p
          className={
            requestState.outcome === "error"
              ? styles.briefRequestError
              : styles.briefRequestSuccess
          }
          role={requestState.outcome === "error" ? "alert" : "status"}
        >
          {requestState.message}
        </p>
      ) : null}
    </section>
  );
}
