import { memo, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface LoadingStateProps {
  message?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
} as const;

// Pure CSS spinner - no external icon dependency for faster initial render
const CSSSpinner = memo(function CSSSpinner({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const spinnerSize = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
  }[size];

  return (
    <div
      className={`${spinnerSize} animate-spin rounded-full border-primary/20 border-t-primary`}
      role="status"
      aria-label="Loading"
    />
  );
});

export const LoadingState = memo(function LoadingState({
  message,
  showRetry = false,
  onRetry,
  className = "",
  size = "md",
}: LoadingStateProps) {
  const { t } = useTranslation();
  const displayMessage = message ?? t("components.loadingState.defaultMessage");

  const handleRetry = useCallback(() => {
    onRetry?.();
  }, [onRetry]);

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <CSSSpinner size={size} />
      <p className="text-muted-foreground text-sm">{displayMessage}</p>
      {showRetry && onRetry && (
        <Button variant="outline" size="sm" onClick={handleRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("components.loadingState.retry")}
        </Button>
      )}
    </div>
  );
});

interface LoadingCardProps {
  message?: string;
  className?: string;
}

export const LoadingCard = memo(function LoadingCard({ message, className = "" }: LoadingCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <LoadingState message={message} />
      </CardContent>
    </Card>
  );
});

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export const Skeleton = memo(function Skeleton({ className = '', lines = 1 }: SkeletonProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-muted shimmer rounded"
          style={{ width: `${100 - i * 10}%` }}
        />
      ))}
    </div>
  );
});

export const SkeletonCard = memo(function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <Skeleton lines={2} />
          <div className="space-y-2">
            <Skeleton lines={1} />
            <Skeleton lines={1} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});