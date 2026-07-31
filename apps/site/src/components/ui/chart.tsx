"use client";

import * as React from "react";
import * as Recharts from "recharts";
import type { TooltipValueType } from "recharts";
import styles from "./chart.module.css";

type TooltipNameType = number | string;

export type ChartConfig = Record<
  string,
  { label: React.ReactNode; color: string }
>;

const ChartContext = React.createContext<ChartConfig | null>(null);

function useChart() {
  const config = React.useContext(ChartContext);
  if (!config) {
    throw new Error("Chart components require ChartContainer.");
  }
  return config;
}

export function ChartContainer({
  children,
  config,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof Recharts.ResponsiveContainer>["children"];
}) {
  const id = `chart-${React.useId().replaceAll(":", "")}`;
  const variables = Object.entries(config)
    .map(([key, item]) => `--color-${key}: ${item.color};`)
    .join("");

  return (
    <ChartContext.Provider value={config}>
      <div
        className={`${styles.container} ${className ?? ""}`}
        data-chart={id}
        {...props}
      >
        <style>{`[data-chart="${id}"] {${variables}}`}</style>
        <Recharts.ResponsiveContainer
          initialDimension={{ width: 720, height: 320 }}
        >
          {children}
        </Recharts.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export const ChartTooltip = Recharts.Tooltip;

export function ChartTooltipContent({
  active,
  payload,
  label,
  formatter,
}: React.ComponentProps<typeof Recharts.Tooltip> &
  Omit<
    Recharts.DefaultTooltipContentProps<TooltipValueType, TooltipNameType>,
    "accessibilityLayer"
  >) {
  const config = useChart();
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className={styles.tooltip}>
      <strong>{label}</strong>
      {payload.map((item, index) => {
        const key = String(item.dataKey ?? item.name ?? "value");
        return (
          <div className={styles.tooltipItem} key={`${key}-${index}`}>
            <span style={{ backgroundColor: item.color }} />
            <p>{config[key]?.label ?? item.name}</p>
            <b>
              {formatter && item.value !== undefined && item.name
                ? formatter(item.value, item.name, item, index, item.payload)
                : String(item.value ?? "Unknown")}
            </b>
          </div>
        );
      })}
    </div>
  );
}
