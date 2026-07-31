"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import type { FounderBriefFinancials } from "@fruition/contracts/founder-brief";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import styles from "@/app/briefs/[token]/brief.module.css";

const config = {
  conservative: { label: "Conservative", color: "#788188" },
  base: { label: "Base", color: "#d4af37" },
  upside: { label: "Upside", color: "#f5f6f7" },
} satisfies ChartConfig;

function money(value: number, currency: string, compact = false) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}

export function FounderFinancialChart({
  financials,
}: {
  financials: FounderBriefFinancials;
}) {
  const scenarios = new Map(
    financials.scenarios.map((scenario) => [scenario.name, scenario]),
  );
  const data = [1, 2, 3].map((year) => ({
    year: `Year ${year}`,
    conservative:
      scenarios.get("conservative")?.years.find((item) => item.year === year)
        ?.revenue ?? null,
    base:
      scenarios.get("base")?.years.find((item) => item.year === year)
        ?.revenue ?? null,
    upside:
      scenarios.get("upside")?.years.find((item) => item.year === year)
        ?.revenue ?? null,
  }));
  const hasData = data.some((row) =>
    [row.conservative, row.base, row.upside].some((value) => value !== null),
  );

  if (!hasData) {
    return (
      <div className={styles.chartUnavailable}>
        <strong>No defensible scenario values yet.</strong>
        <p>
          The research did not support enough financial data to draw a useful
          chart. That evidence gap remains an explicit unknown.
        </p>
      </div>
    );
  }

  return (
    <>
      <ChartContainer
        aria-label="Three-year conservative, base, and upside revenue scenarios"
        className={styles.financialChart}
        config={config}
        role="img"
      >
        <LineChart
          accessibilityLayer
          data={data}
          margin={{ left: 8, right: 18, top: 12 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis axisLine={false} dataKey="year" tickLine={false} />
          <YAxis
            axisLine={false}
            tickFormatter={(value) =>
              money(Number(value), financials.currency, true)
            }
            tickLine={false}
            width={72}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) =>
                  money(Number(value), financials.currency)
                }
              />
            }
          />
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
      <div className={styles.chartLegend} aria-hidden="true">
        {Object.entries(config).map(([key, item]) => (
          <span key={key}>
            <i style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <div className={styles.chartTableWrap}>
        <table>
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
            {data.map((row) => (
              <tr key={row.year}>
                <th>{row.year}</th>
                <td>
                  {row.conservative === null
                    ? "Unknown"
                    : money(row.conservative, financials.currency)}
                </td>
                <td>
                  {row.base === null
                    ? "Unknown"
                    : money(row.base, financials.currency)}
                </td>
                <td>
                  {row.upside === null
                    ? "Unknown"
                    : money(row.upside, financials.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
