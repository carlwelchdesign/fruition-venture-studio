import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  anonymizeSubmitterAction,
  deleteSubmitterAction,
  mergeSubmitterAction,
} from "../../../actions";
import styles from "../../../admin.module.css";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

function formatDate(value: Date) {
  return dateFormatter.format(value);
}

export default async function SubmitterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const submitter = await prisma.submitter.findUnique({
    where: { id },
    include: {
      ideas: {
        orderBy: { createdAt: "desc" },
        include: {
          researchRuns: {
            orderBy: { version: "desc" },
            take: 1,
            include: { scorecard: true },
          },
        },
      },
    },
  });

  if (!submitter) {
    notFound();
  }

  return (
    <>
      <header className={styles.detailHeader}>
        <div>
          <Link className={styles.backLink} href="/admin">
            Idea inbox
          </Link>
          <p className={styles.kicker}>Submitter profile</p>
          <h1>{submitter.name}</h1>
          <p className={styles.detailSubhead}>
            {submitter.organization || "Independent founder"} ·{" "}
            {submitter.email}
          </p>
        </div>
        <a
          className={styles.exportLink}
          href={`/api/admin/submitters/${submitter.id}/export`}
        >
          Export record
        </a>
      </header>

      <div className={styles.profileGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <span>{submitter.ideas.length.toString().padStart(2, "0")}</span>
            <h2>Ideas over time</h2>
          </div>
          <div className={styles.timeline}>
            {submitter.ideas.map((idea) => {
              const scorecard = idea.researchRuns[0]?.scorecard;
              return (
                <article key={idea.id}>
                  <div>
                    <time>{formatDate(idea.createdAt)}</time>
                    <span>{idea.status.replaceAll("_", " ")}</span>
                  </div>
                  <h3>{idea.organization || idea.projectStage.replace("-", " ")}</h3>
                  <p>{idea.projectDetails}</p>
                  <footer>
                    <strong>
                      {scorecard
                        ? `${Math.round(scorecard.totalScore)}/100`
                        : "Not scored"}
                    </strong>
                    <Link href={`/admin/ideas/${idea.id}`}>Review idea</Link>
                  </footer>
                </article>
              );
            })}
          </div>
        </section>

        <aside className={styles.detailAside}>
          <section className={styles.sidePanel}>
            <h2>Merge profile</h2>
            <p>
              Move every idea to another existing profile, then remove this
              duplicate identity.
            </p>
            <form className={styles.stackedForm} action={mergeSubmitterAction}>
              <input
                type="hidden"
                name="sourceSubmitterId"
                value={submitter.id}
              />
              <label>
                Existing target email
                <input name="targetEmail" type="email" required />
              </label>
              <label>
                Reason
                <input name="reason" required />
              </label>
              <button type="submit">Merge profiles</button>
            </form>
          </section>

          <section className={styles.sidePanel}>
            <h2>Anonymize</h2>
            <p>
              Remove identifying information while preserving idea and
              research history.
            </p>
            <form
              className={styles.stackedForm}
              action={anonymizeSubmitterAction}
            >
              <input
                type="hidden"
                name="submitterId"
                value={submitter.id}
              />
              <label>
                Type ANONYMIZE
                <input name="confirm" required />
              </label>
              <label>
                Reason
                <input name="reason" required />
              </label>
              <button className={styles.quietButton} type="submit">
                Anonymize profile
              </button>
            </form>
          </section>

          <section className={styles.dangerPanel}>
            <h2>Delete permanently</h2>
            <p>
              This removes the profile, every submitted idea, research report,
              source, score, and note.
            </p>
            <form
              className={styles.stackedForm}
              action={deleteSubmitterAction}
            >
              <input
                type="hidden"
                name="submitterId"
                value={submitter.id}
              />
              <label>
                Type DELETE
                <input name="confirm" required />
              </label>
              <label>
                Reason
                <input name="reason" required />
              </label>
              <button type="submit">Delete all records</button>
            </form>
          </section>
        </aside>
      </div>
    </>
  );
}
