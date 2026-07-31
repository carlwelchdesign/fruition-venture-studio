import Link from "next/link";
import { notFound } from "next/navigation";
import { IdeaReports } from "@/components/admin/idea-reports";
import { ResearchCommission } from "@/components/admin/research-commission";
import { IdeaScorecard } from "@/components/admin/idea-scorecard";
import { IdeaSidebar } from "@/components/admin/idea-sidebar";
import { VentureFinanceAnalysis } from "@/components/admin/venture-finance-analysis";
import { BoardRoom } from "@/components/admin/board-room";
import { ventureFinancialsSchema } from "@/agents/research-schemas";
import { prisma } from "@fruition/database";
import styles from "../../../admin.module.css";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function IdeaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const idea = await prisma.idea.findUnique({
    where: { id },
    include: {
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: true },
      },
      researchRuns: {
        orderBy: { version: "desc" },
        include: {
          reports: {
            orderBy: { role: "asc" },
            include: { sources: true },
          },
          scorecard: {
            include: { dimensions: { orderBy: { weight: "desc" } } },
          },
        },
      },
    },
  });

  if (!idea) {
    notFound();
  }

  const latestRun = idea.researchRuns[0];
  const financeReport = latestRun?.reports.find(
    (report) => report.role === "MARKET_FINANCE",
  );
  const financeResult = ventureFinancialsSchema.safeParse(
    financeReport?.structuredData,
  );
  const financials = financeResult.success ? financeResult.data : null;

  return (
    <>
      <header className={styles.detailHeader}>
        <div>
          <Link className={styles.backLink} href="/">
            Idea inbox
          </Link>
          <p className={styles.kicker}>Submitted opportunity</p>
          <h1>{idea.organization || idea.nameSnapshot}</h1>
          <p className={styles.detailSubhead}>
            {idea.projectStage.replace("-", " ")} · Submitted{" "}
            {dateTimeFormatter.format(idea.createdAt)}
          </p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.status}>
            {idea.status.replaceAll("_", " ")}
          </span>
          <Link href={`/submitters/${idea.submitterId}`}>
            View submitter history
          </Link>
        </div>
      </header>

      <div className={styles.detailGrid}>
        <div className={styles.detailPrimary}>
          <section className={styles.panel}>
            <div className={styles.panelHeading}>
              <span>01</span>
              <h2>The submission</h2>
            </div>
            <p className={styles.submissionText}>{idea.projectDetails}</p>
            <dl className={styles.definitionGrid}>
              <div>
                <dt>Submitter</dt>
                <dd>{idea.nameSnapshot}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{idea.emailSnapshot}</dd>
              </div>
              <div>
                <dt>Organization</dt>
                <dd>{idea.organization || "Not provided"}</dd>
              </div>
              <div>
                <dt>AI analysis consent</dt>
                <dd>{idea.analysisConsent ? "Confirmed" : "Not confirmed"}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeading}>
              <span>02</span>
              <h2>Research commission</h2>
            </div>
            <p className={styles.panelIntro}>
              Seven specialists research the opportunity. An eighth agent
              synthesizes the evidence into a transparent studio scorecard.
              Nothing runs until you authorize it.
            </p>
            <ResearchCommission
              ideaId={idea.id}
              initialRun={
                latestRun
                  ? {
                      id: latestRun.id,
                      version: latestRun.version,
                      status: latestRun.status,
                      model: latestRun.model,
                      reportCount: latestRun.reports.length,
                      errorMessage: latestRun.errorMessage,
                      createdAt: latestRun.createdAt.toISOString(),
                      startedAt: latestRun.startedAt?.toISOString() ?? null,
                      completedAt: latestRun.completedAt?.toISOString() ?? null,
                      updatedAt: latestRun.updatedAt.toISOString(),
                    }
                  : null
              }
            />
          </section>

          {latestRun?.scorecard ? (
            <IdeaScorecard
              ideaId={idea.id}
              scorecard={latestRun.scorecard}
            />
          ) : null}
          {latestRun?.scorecard ? (
            <BoardRoom
              ideaId={idea.id}
              researchRunId={latestRun.id}
              researchVersion={latestRun.version}
            />
          ) : null}
          {financials ? (
            <VentureFinanceAnalysis
              financials={financials}
              sectionNumber="05"
            />
          ) : null}
          <IdeaReports
            reports={latestRun?.reports ?? []}
            sectionNumber={financials ? "06" : "05"}
          />
        </div>

        <IdeaSidebar idea={idea} />
      </div>
    </>
  );
}
