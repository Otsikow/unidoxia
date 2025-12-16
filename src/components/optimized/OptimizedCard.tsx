import { memo, ReactNode } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface OptimizedCardProps {
  title?: ReactNode;
  description?: ReactNode;
  content?: ReactNode;
  footer?: ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * Memoized card component for better performance
 * Only re-renders when props actually change
 */
export const OptimizedCard = memo<OptimizedCardProps>(({
  title,
  description,
  content,
  footer,
  className,
  onClick,
}) => {
  return (
    <Card className={className} onClick={onClick}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      {content && <CardContent>{content}</CardContent>}
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.title === nextProps.title &&
    prevProps.description === nextProps.description &&
    prevProps.content === nextProps.content &&
    prevProps.footer === nextProps.footer &&
    prevProps.className === nextProps.className &&
    prevProps.onClick === nextProps.onClick
  );
});

OptimizedCard.displayName = "OptimizedCard";
