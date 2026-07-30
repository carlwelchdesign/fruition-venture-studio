"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import type { TooltipValueType } from "recharts";
import styles from "./chart.module.css";

const themes = { light: "", dark: ".dark" } as const;
const initialDimension = { width: 640, height: 280 } as const;
type TooltipNameType = number | string;

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof themes, string> }
  )
>;

const ChartContext = React.createContext<ChartConfig | null>(null);

function useChart() {
  const config = React.useContext(ChartContext);
  if (!config) {
    throw new Error("useChart must be used within a ChartContainer.");
  }
  return config;
}

export function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replaceAll(":", "")}`;

  return (
    <ChartContext.Provider value={config}>
      <div
        className={`${styles.container} ${className ?? ""}`}
        data-chart={chartId}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer
          initialDimension={initialDimension}
        >
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(
    ([, item]) => item.theme ?? item.color,
  );
  if (!colorConfig.length) {
    return null;
  }

  const css = Object.entries(themes)
    .map(([theme, prefix]) => {
      const variables = colorConfig
        .map(([key, item]) => {
          const color =
            item.theme?.[theme as keyof typeof item.theme] ?? item.color;
          return color ? `--color-${key}: ${color};` : "";
        })
        .join("");
      return `${prefix} [data-chart="${id}"] {${variables}}`;
    })
    .join("\n");

  return <style>{css}</style>;
}

export const ChartTooltip = RechartsPrimitive.Tooltip;

export function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  formatter,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  Omit<
    RechartsPrimitive.DefaultTooltipContentProps<
      TooltipValueType,
      TooltipNameType
    >,
    "accessibilityLayer"
  >) {
  const config = useChart();
  if (!active || !payload?.length) {
    return null;
  }

  const displayLabel = labelFormatter
    ? labelFormatter(label, payload)
    : label;

  return (
    <div className={styles.tooltip}>
      {displayLabel ? (
        <div className={styles.tooltipLabel}>{displayLabel}</div>
      ) : null}
      <div className={styles.tooltipItems}>
        {payload
          .filter((item) => item.type !== "none")
          .map((item, index) => {
            const key = String(item.dataKey ?? item.name ?? "value");
            const itemConfig = config[key];
            const color = item.color ?? item.payload?.fill;

            return (
              <div className={styles.tooltipItem} key={`${key}-${index}`}>
                <span
                  className={styles.tooltipIndicator}
                  style={{ backgroundColor: color }}
                />
                <span>{itemConfig?.label ?? item.name}</span>
                <span className={styles.tooltipValue}>
                  {formatter && item.value !== undefined && item.name
                    ? formatter(item.value, item.name, item, index, item.payload)
                    : typeof item.value === "number"
                      ? item.value.toLocaleString()
                      : String(item.value ?? "Unknown")}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}

export const ChartLegend = RechartsPrimitive.Legend;

export function ChartLegendContent({
  payload,
}: RechartsPrimitive.DefaultLegendContentProps) {
  const config = useChart();
  if (!payload?.length) {
    return null;
  }

  return (
    <div className={styles.legend}>
      {payload
        .filter((item) => item.type !== "none")
        .map((item, index) => {
          const key = String(item.dataKey ?? item.value ?? "value");
          return (
            <div className={styles.legendItem} key={`${key}-${index}`}>
              <span
                className={styles.legendIndicator}
                style={{ backgroundColor: item.color }}
              />
              {config[key]?.label ?? item.value}
            </div>
          );
        })}
    </div>
  );
}
