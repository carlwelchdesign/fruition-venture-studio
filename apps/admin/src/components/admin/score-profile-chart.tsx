"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import styles from "@/app/admin.module.css";

const chartConfig = {
  score: {
    label: "Effective score",
    color: "var(--gold-dark)",
  },
} satisfies ChartConfig;

export function ScoreProfileChart({
  dimensions,
}: {
  dimensions: Array<{ label: string; score: number }>;
}) {
  const chartData = dimensions.map((dimension) => ({
    dimension: dimension.label,
    score: dimension.score,
  }));

  return (
    <div className={styles.scoreProfile}>
      <div>
        <h3>Opportunity profile</h3>
        <p>Effective scores, including any saved human overrides.</p>
      </div>
      <ChartContainer
        aria-label="Horizontal bar chart of opportunity scores from zero to five"
        className={styles.scoreProfileChart}
        config={chartConfig}
        role="img"
      >
        <BarChart
          accessibilityLayer
          data={chartData}
          layout="vertical"
          margin={{ left: 6, right: 18 }}
        >
          <CartesianGrid horizontal={false} />
          <XAxis
            axisLine={false}
            domain={[0, 5]}
            tickCount={6}
            tickLine={false}
            type="number"
          />
          <YAxis
            axisLine={false}
            dataKey="dimension"
            tickLine={false}
            type="category"
            width={155}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => `${Number(value).toFixed(1)} / 5`}
              />
            }
            cursor={{ fill: "rgb(212 175 55 / 8%)" }}
          />
          <Bar
            dataKey="score"
            fill="var(--color-score)"
            maxBarSize={18}
            radius={[0, 3, 3, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
