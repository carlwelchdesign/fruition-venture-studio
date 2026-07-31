import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FruitionMark } from "@fruition/brand";
import { FounderFinancialChart } from "@/components/founder-financial-chart";
import { getPublishedFounderBrief } from "@/lib/founder-brief";
import styles from "./brief.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Private Opportunity Brief",
  description: "A private Fruition Opportunity Brief.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    noimageindex: true,
  },
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
});

export default async function FounderBriefPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const brief = await getPublishedFounderBrief(token);
  if (!brief) {
    notFound();
  }

  const sourceNumbers = new Map(
    brief.sources.map((source, index) => [source.url, index + 1]),
  );

  return (
    <main className={styles.report}>
      <header className={styles.header}>
        <FruitionMark />
        <div>
          <span>Private Opportunity Brief</span>
          <strong>{brief.reference}</strong>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroMeta}>
          <p>Founder edition</p>
          <span>Human reviewed · evidence led</span>
        </div>
        <h1>{brief.title}</h1>
        <p>{brief.content.summary}</p>
        <div className={styles.reportDates}>
          <span>
            Published {dateFormatter.format(new Date(brief.publishedAt))}
          </span>
          <span>Private link expires {dateFormatter.format(new Date(brief.expiresAt))}</span>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionLabel}>
          <span>01</span>
          <h2>Promising signals</h2>
        </div>
        <div className={styles.signalGrid}>
          {brief.content.promisingSignals.map((signal, index) => (
            <article key={`${signal.title}-${index}`}>
              <span>Signal {String(index + 1).padStart(2, "0")}</span>
              <h3>{signal.title}</h3>
              <p>{signal.detail}</p>
              {signal.evidenceUrls.length > 0 ? (
                <div className={styles.evidenceLinks}>
                  {signal.evidenceUrls.flatMap((url) => {
                    const sourceNumber = sourceNumbers.get(url);
                    return sourceNumber
                      ? [
                          <a
                            href={`#source-${sourceNumber}`}
                            key={`${url}-${sourceNumber}`}
                          >
                            Source {sourceNumber}
                          </a>,
                        ]
                      : [];
                  })}
                </div>
              ) : (
                <small>Interpretation requires further validation.</small>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionLabel}>
          <span>02</span>
          <h2>Market landscape</h2>
        </div>
        <div className={styles.prosePanel}>
          <p>{brief.content.marketLandscape}</p>
        </div>
      </section>

      {brief.financials ? (
        <section className={`${styles.section} ${styles.financialSection}`}>
          <div className={styles.sectionLabel}>
            <span>03</span>
            <h2>Scenario model</h2>
          </div>
          <div className={styles.financeHeading}>
            <div>
              <p>Three-year revenue possibilities</p>
              <h3>Decision model, not a forecast.</h3>
            </div>
            <span>{brief.financials.currency}</span>
          </div>
          <FounderFinancialChart financials={brief.financials} />
          {brief.financials.caveats.length > 0 ? (
            <details className={styles.caveats}>
              <summary>Financial caveats and evidence limits</summary>
              <ul>
                {brief.financials.caveats.map((caveat, index) => (
                  <li key={`${caveat}-${index}`}>{caveat}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionLabel}>
          <span>{brief.financials ? "04" : "03"}</span>
          <h2>Material unknowns</h2>
        </div>
        <ol className={styles.unknowns}>
          {brief.content.materialUnknowns.map((unknown, index) => (
            <li key={`${unknown}-${index}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{unknown}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionLabel}>
          <span>{brief.financials ? "05" : "04"}</span>
          <h2>Assumptions to test</h2>
        </div>
        <div className={styles.assumptionGrid}>
          {brief.content.assumptions.map((assumption, index) => (
            <article key={`${assumption.label}-${index}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{assumption.label}</h3>
              <p>{assumption.rationale}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.experimentSection}`}>
        <div className={styles.sectionLabel}>
          <span>{brief.financials ? "06" : "05"}</span>
          <h2>Recommended validation experiment</h2>
        </div>
        <div className={styles.experiment}>
          <div>
            <span>Objective</span>
            <p>{brief.content.validationExperiment.objective}</p>
          </div>
          <ol>
            {brief.content.validationExperiment.steps.map((step, index) => (
              <li key={`${step}-${index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
          <div>
            <span>Evidence of success</span>
            <p>{brief.content.validationExperiment.successSignal}</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionLabel}>
          <span>{brief.financials ? "07" : "06"}</span>
          <h2>Questions for the founder</h2>
        </div>
        <ul className={styles.questions}>
          {brief.content.founderQuestions.map((question, index) => (
            <li key={`${question}-${index}`}>{question}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionLabel}>
          <span>{brief.financials ? "08" : "07"}</span>
          <h2>Sources</h2>
        </div>
        <ol className={styles.sources}>
          {brief.sources.map((source, index) => (
            <li id={`source-${index + 1}`} key={source.url}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <a
                  href={source.url}
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  target="_blank"
                >
                  {source.title}
                </a>
                {source.snippet ? <p>{source.snippet}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.confidence}>
        <span>Evidence and confidence</span>
        <p>{brief.content.confidenceNote}</p>
      </section>

      <section className={styles.nextConversation}>
        <div>
          <p>What changes the picture?</p>
          <h2>Bring new evidence to the next conversation.</h2>
        </div>
        <p>
          Reply to the email that delivered this brief to correct an
          assumption, add missing context, or discuss a focused validation
          engagement.
        </p>
      </section>

      <footer className={styles.footer}>
        <FruitionMark />
        <p>{brief.content.disclaimer}</p>
        <span>From concept to company.</span>
      </footer>
    </main>
  );
}
