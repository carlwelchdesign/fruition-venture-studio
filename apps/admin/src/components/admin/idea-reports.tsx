import type { Prisma } from "@fruition/database";
import styles from "@/app/admin.module.css";

type Report = {
  id: string;
  role: string;
  title: string;
  summary: string;
  confidence: number;
  findings: Prisma.JsonValue;
  risks: Prisma.JsonValue;
  sources: Array<{ id: string; url: string; title: string }>;
};

function stringArray(value: Prisma.JsonValue) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function findings(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (
      item &&
      typeof item === "object" &&
      !Array.isArray(item) &&
      typeof item.claim === "string" &&
      typeof item.evidence === "string"
    ) {
      return [{ claim: item.claim, evidence: item.evidence }];
    }
    return [];
  });
}

export function IdeaReports({ reports }: { reports: Report[] }) {
  if (reports.length === 0) {
    return null;
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <span>04</span>
        <h2>Specialist reports</h2>
      </div>
      <div className={styles.reportList}>
        {reports.map((report) => (
          <details key={report.id}>
            <summary>
              <span>{report.role.replaceAll("_", " ")}</span>
              <strong>{Math.round(report.confidence * 100)}%</strong>
            </summary>
            <div className={styles.reportBody}>
              <h3>{report.title}</h3>
              <p>{report.summary}</p>
              <h4>Findings</h4>
              <ul>
                {findings(report.findings).map((finding) => (
                  <li key={`${finding.claim}-${finding.evidence}`}>
                    <strong>{finding.claim}</strong>
                    <span>{finding.evidence}</span>
                  </li>
                ))}
              </ul>
              {stringArray(report.risks).length ? (
                <>
                  <h4>Risks</h4>
                  <ul>
                    {stringArray(report.risks).map((risk) => (
                      <li key={risk}>{risk}</li>
                    ))}
                  </ul>
                </>
              ) : null}
              {report.sources.length ? (
                <>
                  <h4>Sources</h4>
                  <ol className={styles.sourceList}>
                    {report.sources.map((source) => (
                      <li key={source.id}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {source.title}
                        </a>
                      </li>
                    ))}
                  </ol>
                </>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
