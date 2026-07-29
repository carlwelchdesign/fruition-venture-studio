import type { Prisma } from "@/generated/prisma/client";
import { overrideScoreAction } from "@/app/admin/actions";
import styles from "@/app/admin/admin.module.css";

type Dimension = {
  id: string;
  label: string;
  weight: number;
  aiScore: number;
  aiRationale: string;
  overrideScore: number | null;
  overrideReason: string | null;
};

type Scorecard = {
  totalScore: number;
  recommendation: string;
  confidence: number;
  summary: string;
  nextSteps: Prisma.JsonValue;
  dimensions: Dimension[];
};

function stringArray(value: Prisma.JsonValue) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function effectiveTotal(dimensions: Dimension[]) {
  return dimensions.reduce(
    (total, dimension) =>
      total +
      ((dimension.overrideScore ?? dimension.aiScore) / 5) * dimension.weight,
    0,
  );
}

export function IdeaScorecard({
  ideaId,
  scorecard,
}: {
  ideaId: string;
  scorecard: Scorecard;
}) {
  const total = effectiveTotal(scorecard.dimensions);

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <span>03</span>
        <h2>Studio scorecard</h2>
      </div>
      <div className={styles.scoreHero}>
        <strong>{Math.round(total)}</strong>
        <span>/ 100</span>
        <div>
          <p>{scorecard.recommendation.toLowerCase()}</p>
          <small>
            {Math.round(scorecard.confidence * 100)}% synthesis confidence
          </small>
        </div>
      </div>
      <p className={styles.scoreSummary}>{scorecard.summary}</p>
      <div className={styles.scoreDimensions}>
        {scorecard.dimensions.map((dimension) => {
          const effective = dimension.overrideScore ?? dimension.aiScore;
          return (
            <article key={dimension.id}>
              <div className={styles.dimensionHeading}>
                <div>
                  <h3>{dimension.label}</h3>
                  <span>{dimension.weight}% weight</span>
                </div>
                <strong>{effective.toFixed(1)} / 5</strong>
              </div>
              <div className={styles.scoreTrack} aria-hidden="true">
                <span style={{ width: `${effective * 20}%` }} />
              </div>
              <p>{dimension.aiRationale}</p>
              {dimension.overrideReason ? (
                <div className={styles.overrideNotice}>
                  Human override: {dimension.overrideReason}
                </div>
              ) : null}
              <form className={styles.inlineForm} action={overrideScoreAction}>
                <input
                  type="hidden"
                  name="dimensionId"
                  value={dimension.id}
                />
                <input type="hidden" name="ideaId" value={ideaId} />
                <label>
                  Override
                  <select name="score" defaultValue={effective.toString()}>
                    {[0, 1, 2, 3, 4, 5].map((score) => (
                      <option key={score} value={score}>
                        {score}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Reason
                  <input name="reason" required maxLength={500} />
                </label>
                <button type="submit">Save override</button>
              </form>
            </article>
          );
        })}
      </div>
      <div className={styles.nextSteps}>
        <h3>Recommended next steps</h3>
        <ol>
          {stringArray(scorecard.nextSteps).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}
