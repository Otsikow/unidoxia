import type { CSSProperties } from "react";

export const universityChartTooltipStyles = {
  contentStyle: {
    background: "hsl(var(--popover))",
    borderColor: "hsl(var(--border))",
    borderRadius: "12px",
    color: "hsl(var(--popover-foreground))",
    boxShadow: "var(--shadow-lg)",
    padding: "0.75rem 0.875rem",
  } satisfies CSSProperties,
  labelStyle: {
    color: "hsl(var(--muted-foreground))",
    fontWeight: 600,
    marginBottom: "0.25rem",
  } satisfies CSSProperties,
  itemStyle: {
    color: "hsl(var(--popover-foreground))",
    fontWeight: 600,
  } satisfies CSSProperties,
} as const;
