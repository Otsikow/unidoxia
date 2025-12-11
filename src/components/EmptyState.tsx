import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, action, actionLabel, onAction }: EmptyStateProps) {
  const { t } = useTranslation();
  const resolvedAction = action ?? (actionLabel && onAction ? { label: actionLabel, onClick: onAction } : undefined);
  return (
    <Card className="text-center">
      <CardContent className="pt-10 pb-10">
        {icon && <div className="mb-4 flex items-center justify-center text-muted-foreground">{icon}</div>}
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        {description && <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">{description}</p>}
        {resolvedAction && (
          <Button onClick={resolvedAction.onClick} className="mx-auto">
            {resolvedAction.label ?? t("common.actions.submit")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
