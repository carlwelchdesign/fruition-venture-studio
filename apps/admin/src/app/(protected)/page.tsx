import Link from "next/link";
import { prisma } from "@fruition/database";
import styles from "../admin.module.css";

const statusLabels: Record<string, string> = {
  NEW: "New",
  APPROVED: "Approved",
  RESEARCHING: "Researching",
  REVIEW_REQUIRED: "Review required",
  DECIDED: "Decided",
  RESEARCH_FAILED: "Research failed",
  ARCHIVED: "Archived",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(value: Date) {
  return dateFormatter.format(value);
}

export default async function AdminDashboard() {
  const [ideas, submitterCount, activeResearch] = await Promise.all([
    prisma.idea.findMany({
      where: { status: { not: "ARCHIVED" } },
      orderBy: { createdAt: "desc" },
      include: {
        submitter: { include: { _count: { select: { ideas: true } } } },
        researchRuns: {
          orderBy: { version: "desc" },
          take: 1,
          include: { scorecard: true },
        },
      },
    }),
    prisma.submitter.count(),
    prisma.researchRun.count({
      where: { status: { in: ["QUEUED", "RUNNING"] } },
    }),
  ]);

  const newCount = ideas.filter((idea) => idea.status === "NEW").length;

  return (
    <>
      <header className={styles.adminHeader}>
        <div>
          <p className={styles.kicker}>Idea intelligence</p>
          <h1>Opportunity inbox</h1>
        </div>
        <p>
          Human decisions, supported by evidence.
          <br />
          No research runs without your approval.
        </p>
      </header>

      <section className={styles.metrics} aria-label="Inbox summary">
        <article>
          <span>New ideas</span>
          <strong>{newCount.toString().padStart(2, "0")}</strong>
        </article>
        <article>
          <span>Submitters</span>
          <strong>{submitterCount.toString().padStart(2, "0")}</strong>
        </article>
        <article>
          <span>Research in progress</span>
          <strong>{activeResearch.toString().padStart(2, "0")}</strong>
        </article>
      </section>

      <section className={styles.inboxSection}>
        <div className={styles.sectionHeading}>
          <h2>Submitted opportunities</h2>
          <span>{ideas.length} active</span>
        </div>

        {ideas.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyRule} />
            <h3>The inbox is clear.</h3>
            <p>New contact submissions will appear here automatically.</p>
          </div>
        ) : (
          <div className={styles.ideaList}>
            {ideas.map((idea) => {
              const latestRun = idea.researchRuns[0];
              return (
                <article className={styles.ideaRow} key={idea.id}>
                  <div className={styles.ideaMeta}>
                    <span className={styles.status}>
                      {statusLabels[idea.status] ?? idea.status}
                    </span>
                    <span>{formatDate(idea.createdAt)}</span>
                  </div>
                  <div className={styles.ideaIdentity}>
                    <h3>{idea.nameSnapshot}</h3>
                    <p>
                      {idea.organization || "Independent founder"} ·{" "}
                      {idea.projectStage.replace("-", " ")}
                    </p>
                  </div>
                  <p className={styles.ideaExcerpt}>{idea.projectDetails}</p>
                  <div className={styles.ideaSignals}>
                    <Link href={`/submitters/${idea.submitterId}`}>
                      {idea.submitter._count.ideas}{" "}
                      {idea.submitter._count.ideas === 1 ? "idea" : "ideas"}
                    </Link>
                    <strong>
                      {latestRun?.scorecard
                        ? `${Math.round(latestRun.scorecard.totalScore)}/100`
                        : "Not scored"}
                    </strong>
                  </div>
                  <Link
                    className={styles.rowLink}
                    href={`/ideas/${idea.id}`}
                    aria-label={`Review idea from ${idea.nameSnapshot}`}
                  >
                    Review
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
