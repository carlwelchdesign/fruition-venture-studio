"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import type { VentureFinancials } from "@/agents/research-schemas";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import styles from "@/app/admin.module.css";

const scenarioConfig = {
  conservative: {
    label: "Conservative",
    color: "#788188",
  },
  base: {
    label: "Base",
    color: "var(--gold-dark)",
  },
  upside: {
    label: "Upside",
    color: "#24343d",
  },
} satisfies ChartConfig;

const costConfig = {
  value: {
    label: "Annual cost",
    color: "var(--gold-dark)",
  },
} satisfies ChartConfig;

function compactMoney(value: number | null, currency: string) {
  if (value === null) {
    return "Unknown";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function fullMoney(value: number | null, currency: string) {
  if (value === null) {
    return "Unknown";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function confidenceLabel(confidence: number) {
  if (confidence >= 0.75) {
    return "Higher confidence";
  }
  if (confidence >= 0.5) {
    return "Moderate confidence";
  }
  return "Low confidence";
}

export function VentureFinanceAnalysis({
  financials,
}: {
  financials: VentureFinancials;
}) {
  const scenarios = new Map(
    financials.scenarios.map((scenario) => [scenario.name, scenario]),
  );
  const revenueData = [1, 2, 3].map((year) => ({
    year: `Year ${year}`,
    conservative:
      scenarios.get("conservative")?.years.find((item) => item.year === year)
        ?.revenue.value ?? null,
    base:
      scenarios.get("base")?.years.find((item) => item.year === year)?.revenue
        .value ?? null,
    upside:
      scenarios.get("upside")?.years.find((item) => item.year === year)?.revenue
        .value ?? null,
  }));
  const hasRevenueData = revenueData.some((row) =>
    [row.conservative, row.base, row.upside].some((value) => value !== null),
  );
  const costData = financials.annualCostDrivers
    .filter((driver) => driver.estimate.value !== null)
    .map((driver) => ({
      label: driver.label,
      value: driver.estimate.value,
    }));
  const marketSizes = [
    ["TAM", financials.marketSizing.tam],
    ["SAM", financials.marketSizing.sam],
    ["Initial SOM", financials.marketSizing.som],
  ] as const;
  const unitEconomics = [
    [
      "Annual revenue / customer",
      compactMoney(
        financials.unitEconomics.annualRevenuePerCustomer.value,
        financials.currency,
      ),
      financials.unitEconomics.annualRevenuePerCustomer,
    ],
    [
      "Gross margin",
      financials.unitEconomics.grossMarginPercent.value === null
        ? "Unknown"
        : `${financials.unitEconomics.grossMarginPercent.value.toFixed(0)}%`,
      financials.unitEconomics.grossMarginPercent,
    ],
    [
      "Acquisition cost",
      compactMoney(
        financials.unitEconomics.customerAcquisitionCost.value,
        financials.currency,
      ),
      financials.unitEconomics.customerAcquisitionCost,
    ],
    [
      "Lifetime value",
      compactMoney(
        financials.unitEconomics.lifetimeValue.value,
        financials.currency,
      ),
      financials.unitEconomics.lifetimeValue,
    ],
    [
      "Payback period",
      financials.unitEconomics.paybackMonths.value === null
        ? "Unknown"
        : `${financials.unitEconomics.paybackMonths.value.toFixed(0)} months`,
      financials.unitEconomics.paybackMonths,
    ],
  ] as const;

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <span>04</span>
        <h2>Market economics and venture finance</h2>
      </div>
      <div className={styles.financeNotice}>
        <strong>Decision model, not a forecast.</strong>
        <p>
          Values combine public evidence and explicit assumptions. Unknowns
          remain unfilled, and every estimate carries a confidence level.
        </p>
      </div>

      <div className={styles.financeSection}>
        <div className={styles.financeSectionHeading}>
          <div>
            <p>Market sizing</p>
            <h3>How large could the reachable opportunity be?</h3>
          </div>
          <span>{financials.currency}</span>
        </div>
        <div className={styles.financeMetricGrid}>
          {marketSizes.map(([label, estimate]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>
                {compactMoney(estimate.value, financials.currency)}
              </strong>
              <small>{confidenceLabel(estimate.confidence)}</small>
              <p>{estimate.basis}</p>
            </article>
          ))}
        </div>
      </div>

      <div className={styles.financeSection}>
        <div className={styles.financeSectionHeading}>
          <div>
            <p>Scenario model</p>
            <h3>Three-year revenue possibilities</h3>
          </div>
          <span>Assumption-led</span>
        </div>
        {hasRevenueData ? (
          <>
            <ChartContainer
              aria-label="Line chart comparing conservative, base, and upside revenue scenarios over three years"
              className={styles.financeChart}
              config={scenarioConfig}
              role="img"
            >
              <LineChart
                accessibilityLayer
                data={revenueData}
                margin={{ left: 8, right: 18, top: 12 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="year"
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  tickFormatter={(value) =>
                    compactMoney(Number(value), financials.currency)
                  }
                  tickLine={false}
                  width={72}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        fullMoney(Number(value), financials.currency)
                      }
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                {(["conservative", "base", "upside"] as const).map((name) => (
                  <Line
                    connectNulls={false}
                    dataKey={name}
                    dot={{ r: 3 }}
                    key={name}
                    stroke={`var(--color-${name})`}
                    strokeWidth={name === "base" ? 3 : 2}
                    type="monotone"
                  />
                ))}
              </LineChart>
            </ChartContainer>
            <div className={styles.chartTableWrap}>
              <table className={styles.chartTable}>
                <caption>Revenue scenario values</caption>
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Conservative</th>
                    <th>Base</th>
                    <th>Upside</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueData.map((row) => (
                    <tr key={row.year}>
                      <th>{row.year}</th>
                      <td data-label="Conservative">
                        {fullMoney(row.conservative, financials.currency)}
                      </td>
                      <td data-label="Base">
                        {fullMoney(row.base, financials.currency)}
                      </td>
                      <td data-label="Upside">
                        {fullMoney(row.upside, financials.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className={styles.chartEmpty}>
            Public evidence did not support a responsible revenue projection.
          </div>
        )}

        <div className={styles.capitalGrid}>
          {financials.scenarios.map((scenario) => (
            <article key={scenario.name}>
              <span>{scenario.name} capital requirement</span>
              <strong>
                {compactMoney(
                  scenario.capitalRequired.value,
                  financials.currency,
                )}
              </strong>
              <p>{scenario.description}</p>
            </article>
          ))}
        </div>
      </div>

      <div className={styles.financeSection}>
        <div className={styles.financeSectionHeading}>
          <div>
            <p>Unit economics</p>
            <h3>What must become true for the business to work?</h3>
          </div>
        </div>
        <div className={styles.unitEconomicsGrid}>
          {unitEconomics.map(([label, value, estimate]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{confidenceLabel(estimate.confidence)}</small>
              <p>{estimate.basis}</p>
            </article>
          ))}
        </div>
      </div>

      {costData.length ? (
        <div className={styles.financeSection}>
          <div className={styles.financeSectionHeading}>
            <div>
              <p>Cost structure</p>
              <h3>Estimated annual operating cost drivers</h3>
            </div>
          </div>
          <ChartContainer
            aria-label="Horizontal bar chart of estimated annual cost drivers"
            className={styles.costChart}
            config={costConfig}
            role="img"
          >
            <BarChart
              accessibilityLayer
              data={costData}
              layout="vertical"
              margin={{ left: 8, right: 18 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis
                axisLine={false}
                tickFormatter={(value) =>
                  compactMoney(Number(value), financials.currency)
                }
                tickLine={false}
                type="number"
              />
              <YAxis
                axisLine={false}
                dataKey="label"
                tickLine={false}
                type="category"
                width={140}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) =>
                      fullMoney(Number(value), financials.currency)
                    }
                  />
                }
              />
              <Bar
                dataKey="value"
                fill="var(--color-value)"
                maxBarSize={18}
                radius={[0, 3, 3, 0]}
              />
            </BarChart>
          </ChartContainer>
        </div>
      ) : null}

      <div className={styles.financeNotes}>
        <div>
          <h3>Key assumptions</h3>
          <ul>
            {financials.keyAssumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Uncertainty and caveats</h3>
          <ul>
            {financials.caveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className={styles.financeMethodology}>
        <strong>Method:</strong> {financials.methodology}
      </p>
    </section>
  );
}
