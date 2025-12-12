import { ReactNode, KeyboardEvent, MouseEvent, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning" | "info";
  footer?: ReactNode;
  to?: string;
  onClick?: () => void;
}

const toneStyles: Record<Required<MetricCardProps>["tone"], {
  card: string;
  accent: string;
  value: string;
}> = {
  default: {
    card: "border-border",
    accent: "bg-primary/10 text-primary",
    value: "text-foreground",
  },
  success: {
    card: "border-success/30",
    accent: "bg-success/10 text-success",
    value: "text-success",
  },
  warning: {
    card: "border-warning/30",
    accent: "bg-warning/10 text-warning",
    value: "text-warning",
  },
  info: {
    card: "border-info/30",
    accent: "bg-info/10 text-info",
    value: "text-info",
  },
};

export const MetricCard = ({
  label,
  value,
  description,
  icon,
  tone = "default",
  footer,
  to,
  onClick,
}: MetricCardProps) => {
  const toneConfig = toneStyles[tone];
  const navigate = useNavigate();
  const isClickable = Boolean(to || onClick);

  const handleNavigate = useCallback(() => {
    if (onClick) onClick();
    if (to) navigate(to);
  }, [navigate, onClick, to]);

  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (!isClickable) return;

      const target = event.target as HTMLElement | null;
      if (target?.closest("a,button,[role='button'],input,select,textarea")) {
        return;
      }

      handleNavigate();
    },
    [handleNavigate, isClickable],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isClickable) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleNavigate();
      }
    },
    [handleNavigate, isClickable],
  );

  return (
    <Card
      className={cn(
        "h-full overflow-hidden rounded-2xl bg-card text-card-foreground shadow-sm transition-shadow duration-200 hover:shadow-md",
        toneConfig.card,
        isClickable &&
          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
      role={isClickable ? "link" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `Open ${label}` : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {icon ? (
          <div className={cn("rounded-xl p-2", toneConfig.accent)}>
            {icon}
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        <p className={cn("text-3xl font-semibold tracking-tight", toneConfig.value)}>{value}</p>
        {footer ? <div className="mt-4 text-xs text-muted-foreground">{footer}</div> : null}
      </CardContent>
    </Card>
  );
};
