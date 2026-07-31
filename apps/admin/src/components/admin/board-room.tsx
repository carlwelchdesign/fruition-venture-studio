"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  boardSpecialistLabels,
  boardSpecialistRoles,
  type BoardChannel,
  type BoardSessionSnapshot,
  type BoardSpecialistRole,
} from "@/lib/board-contract";
import styles from "@/app/admin.module.css";

const starterQuestions = [
  "Which unknown variable could change this decision most?",
  "What evidence would most strengthen—or weaken—the current score?",
  "Where are the specialists disagreeing?",
];

const messageTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

function boardEndpoint({
  ideaId,
  researchRunId,
  channel,
  specialistRole,
}: {
  ideaId: string;
  researchRunId: string;
  channel: BoardChannel;
  specialistRole: BoardSpecialistRole;
}) {
  const search = new URLSearchParams({ researchRunId, channel });
  if (channel === "DIRECT") {
    search.set("specialistRole", specialistRole);
  }
  return `/api/admin/ideas/${encodeURIComponent(ideaId)}/board?${search}`;
}

function speakerLabel(
  role: BoardSessionSnapshot["messages"][number]["speakerRole"],
) {
  if (role === "STUDIO_SYNTHESIS") {
    return "Board Chair";
  }
  return role ? boardSpecialistLabels[role] : "You";
}

async function responseJson<T>(response: Response): Promise<T> {
  const value = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new Error(value.message ?? "The request could not be completed.");
  }
  return value;
}

export function BoardRoom({
  ideaId,
  researchRunId,
  researchVersion,
  sectionNumber = "04",
}: {
  ideaId: string;
  researchRunId: string;
  researchVersion: number;
  sectionNumber?: string;
}) {
  const router = useRouter();
  const [channel, setChannel] = useState<BoardChannel>("BOARD");
  const [specialistRole, setSpecialistRole] =
    useState<BoardSpecialistRole>("MARKET_COMPETITION");
  const [snapshot, setSnapshot] = useState<BoardSessionSnapshot | null>(null);
  const [message, setMessage] = useState("");
  const [pendingMessage, setPendingMessage] = useState("");
  const [allowWebResearch, setAllowWebResearch] = useState(false);
  const [sending, setSending] = useState(false);
  const [reviewingProposal, setReviewingProposal] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");
  const transcriptEnd = useRef<HTMLDivElement>(null);

  const endpoint = boardEndpoint({
    ideaId,
    researchRunId,
    channel,
    specialistRole,
  });

  useEffect(() => {
    const controller = new AbortController();
    void fetch(endpoint, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(responseJson<BoardSessionSnapshot>)
      .then(setSnapshot)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") {
          return;
        }
        setError(
          reason instanceof Error
            ? reason.message
            : "The conversation could not be loaded.",
        );
      });
    return () => controller.abort();
  }, [endpoint]);

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [snapshot?.messages.length, sending]);

  async function submitMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = message.trim();
    if (body.length < 2 || sending) {
      return;
    }

    setSending(true);
    setError("");
    setMessage("");
    setPendingMessage(body);

    try {
      const response = await fetch(
        `/api/admin/ideas/${encodeURIComponent(ideaId)}/board`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            researchRunId,
            channel,
            specialistRole: channel === "DIRECT" ? specialistRole : null,
            message: body,
            allowWebResearch,
          }),
        },
      );
      setSnapshot(await responseJson<BoardSessionSnapshot>(response));
      setPendingMessage("");
    } catch (reason) {
      setMessage(body);
      setPendingMessage("");
      setError(
        reason instanceof Error
          ? reason.message
          : "The board could not complete this turn.",
      );
    } finally {
      setSending(false);
    }
  }

  async function reviewProposal(
    proposalId: string,
    decision: "ACCEPTED" | "DISMISSED",
  ) {
    setReviewingProposal(proposalId);
    setError("");
    try {
      await responseJson(
        await fetch(
          `/api/admin/board-proposals/${encodeURIComponent(proposalId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ decision }),
          },
        ),
      );
      const refreshed = await responseJson<BoardSessionSnapshot>(
        await fetch(endpoint, { cache: "no-store" }),
      );
      setSnapshot(refreshed);
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The proposal could not be reviewed.",
      );
    } finally {
      setReviewingProposal(null);
    }
  }

  const messages = snapshot?.messages ?? [];
  const loading = snapshot === null && !error;

  function selectChannel(nextChannel: BoardChannel) {
    setSnapshot(null);
    setError("");
    setChannel(nextChannel);
  }

  function selectSpecialist(role: BoardSpecialistRole) {
    setSnapshot(null);
    setError("");
    setSpecialistRole(role);
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <span>{sectionNumber}</span>
        <h2>Venture board room</h2>
      </div>
      <div className={styles.boardIntroduction}>
        <div>
          <p className={styles.kicker}>Research version {researchVersion}</p>
          <h3>Interrogate the recommendation.</h3>
          <p>
            Add founder knowledge, challenge assumptions, and ask what would
            materially change the opportunity. The board may propose score
            changes; only you can approve them.
          </p>
        </div>
        <span>Private · persistent · owner controlled</span>
      </div>

      <div className={styles.boardModeTabs} role="tablist" aria-label="Board conversation">
        <button
          aria-selected={channel === "BOARD"}
          disabled={sending}
          onClick={() => selectChannel("BOARD")}
          role="tab"
          type="button"
        >
          Moderated board
        </button>
        <button
          aria-selected={channel === "DIRECT"}
          disabled={sending}
          onClick={() => selectChannel("DIRECT")}
          role="tab"
          type="button"
        >
          Direct specialist
        </button>
      </div>

      {channel === "DIRECT" ? (
        <div className={styles.specialistSelector} aria-label="Choose a specialist">
          {boardSpecialistRoles.map((role) => (
            <button
              aria-pressed={specialistRole === role}
              disabled={sending}
              key={role}
              onClick={() => selectSpecialist(role)}
              type="button"
            >
              {boardSpecialistLabels[role]}
            </button>
          ))}
        </div>
      ) : (
        <div className={styles.boardRoster}>
          <span>Chair calls the relevant seats:</span>
          <p>
            Customer · Market · Product · Technical · Go-to-market · Finance ·
            Risk
          </p>
        </div>
      )}

      <div className={styles.boardTranscript} aria-live="polite">
        {loading ? (
          <div className={styles.boardLoading}>
            <span />
            <p>Opening the research record and prior discussion…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.boardEmpty}>
            <p className={styles.kicker}>Begin the deliberation</p>
            <h3>
              {channel === "BOARD"
                ? "Put a question to the board."
                : `Meet with ${boardSpecialistLabels[specialistRole]}.`}
            </h3>
            <div className={styles.boardPrompts}>
              {starterQuestions.map((question) => (
                <button
                  key={question}
                  onClick={() => setMessage(question)}
                  type="button"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((item) => (
            <article
              className={`${styles.boardMessage} ${
                item.role === "USER"
                  ? styles.boardMessageOwner
                  : styles.boardMessageAgent
              }`}
              key={item.id}
            >
              <header>
                <strong>{speakerLabel(item.speakerRole)}</strong>
                <time dateTime={item.createdAt}>
                  {messageTimeFormatter.format(new Date(item.createdAt))}
                </time>
              </header>
              {item.contributors.length > 0 ? (
                <p className={styles.boardContributors}>
                  Consulted:{" "}
                  {item.contributors
                    .map((role) => boardSpecialistLabels[role])
                    .join(" · ")}
                </p>
              ) : null}
              <p className={styles.boardMessageBody}>{item.body}</p>
              {item.unknownVariables.length > 0 ? (
                <div className={styles.boardUnknowns}>
                  <h4>Variables that could change the decision</h4>
                  <ul>
                    {item.unknownVariables.map((variable) => (
                      <li key={variable}>{variable}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {item.scoreProposals.map((proposal) => (
                <div className={styles.scoreProposal} key={proposal.id}>
                  <div>
                    <p>Score change proposed</p>
                    <h4>{proposal.dimensionLabel}</h4>
                  </div>
                  <div className={styles.scoreProposalShift}>
                    <span>{proposal.currentScore.toFixed(1)}</span>
                    <i aria-hidden="true" />
                    <strong>{proposal.proposedScore.toFixed(1)}</strong>
                  </div>
                  <p>{proposal.rationale}</p>
                  {proposal.evidence.length > 0 ? (
                    <ul>
                      {proposal.evidence.map((evidence) => (
                        <li key={evidence}>{evidence}</li>
                      ))}
                    </ul>
                  ) : null}
                  {proposal.status === "PENDING" ? (
                    <div className={styles.proposalActions}>
                      <button
                        disabled={reviewingProposal === proposal.id}
                        onClick={() =>
                          reviewProposal(proposal.id, "ACCEPTED")
                        }
                        type="button"
                      >
                        Accept score change
                      </button>
                      <button
                        disabled={reviewingProposal === proposal.id}
                        onClick={() =>
                          reviewProposal(proposal.id, "DISMISSED")
                        }
                        type="button"
                      >
                        Dismiss
                      </button>
                    </div>
                  ) : (
                    <span className={styles.proposalDecision}>
                      {proposal.status === "ACCEPTED"
                        ? "Accepted by you"
                        : "Dismissed by you"}
                    </span>
                  )}
                </div>
              ))}
              {item.citations.length > 0 ? (
                <details className={styles.boardSources}>
                  <summary>{item.citations.length} cited sources</summary>
                  <ol>
                    {item.citations.map((citation) => (
                      <li key={`${citation.url}-${citation.title}`}>
                        <a
                          href={citation.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {citation.title}
                        </a>
                      </li>
                    ))}
                  </ol>
                </details>
              ) : null}
            </article>
          ))
        )}

        {pendingMessage ? (
          <article
            className={`${styles.boardMessage} ${styles.boardMessageOwner}`}
          >
            <header>
              <strong>You</strong>
              <span className={styles.boardPendingLabel}>Sending</span>
            </header>
            <p className={styles.boardMessageBody}>{pendingMessage}</p>
          </article>
        ) : null}

        {sending ? (
          <div className={styles.boardThinking} role="status">
            <span className={styles.boardPulse} aria-hidden="true" />
            <div>
              <strong>
                {channel === "BOARD"
                  ? "The chair is consulting the board."
                  : `${boardSpecialistLabels[specialistRole]} is reviewing the evidence.`}
              </strong>
              <p>
                {allowWebResearch
                  ? "The team is also researching current public evidence and will return citations."
                  : "The team is reasoning from the saved research record and the context you provided."}
              </p>
            </div>
          </div>
        ) : null}
        <div ref={transcriptEnd} />
      </div>

      {error ? (
        <p className={styles.boardError} role="alert">
          {error}
        </p>
      ) : null}

      <form className={styles.boardComposer} onSubmit={submitMessage}>
        <label htmlFor="board-message">
          {channel === "BOARD"
            ? "Question or new information for the board"
            : `Question for ${boardSpecialistLabels[specialistRole]}`}
        </label>
        <textarea
          disabled={sending}
          id="board-message"
          maxLength={12000}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Add an unknown variable, challenge an assumption, or ask what evidence would change the decision…"
          rows={5}
          value={message}
        />
        <div className={styles.boardComposerFooter}>
          <label className={styles.researchToggle}>
            <input
              checked={allowWebResearch}
              disabled={sending}
              onChange={(event) => setAllowWebResearch(event.target.checked)}
              type="checkbox"
            />
            <span>
              <strong>Research current public evidence</strong>
              <small>Slower; the response will include source links.</small>
            </span>
          </label>
          <div>
            <span>{message.length.toLocaleString()} / 12,000</span>
            <button disabled={sending || message.trim().length < 2} type="submit">
              {sending ? "Deliberating…" : "Send to board"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
