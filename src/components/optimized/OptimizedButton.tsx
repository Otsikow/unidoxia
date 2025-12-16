import { memo, forwardRef } from "react";
import { Button, ButtonProps } from "@/components/ui/button";

/**
 * Memoized button component for better performance
 * Only re-renders when props actually change
 */
export const OptimizedButton = memo(
  forwardRef<HTMLButtonElement, ButtonProps>(
    (props, ref) => {
      return <Button ref={ref} {...props} />;
    }
  ),
  (prevProps, nextProps) => {
    // Custom comparison for better performance
    return (
      prevProps.children === nextProps.children &&
      prevProps.variant === nextProps.variant &&
      prevProps.size === nextProps.size &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.onClick === nextProps.onClick &&
      prevProps.className === nextProps.className
    );
  }
);

OptimizedButton.displayName = "OptimizedButton";
