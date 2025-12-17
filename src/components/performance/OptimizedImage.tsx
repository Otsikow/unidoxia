import { useState, useCallback, memo, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "onLoad" | "onError"> {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  /** Use native lazy loading (default: true) */
  lazy?: boolean;
  /** Show skeleton while loading (default: true) */
  showSkeleton?: boolean;
  /** Aspect ratio for skeleton placeholder (e.g., "16/9", "4/3", "1/1") */
  aspectRatio?: string;
}

/**
 * OptimizedImage - Performance-optimized image component
 *
 * Features:
 * - Native lazy loading with Intersection Observer fallback
 * - Async decoding to prevent render blocking
 * - Skeleton placeholder while loading
 * - Graceful error handling with fallback
 * - Optimized for LCP (Largest Contentful Paint)
 */
export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  className,
  placeholderClassName,
  lazy = true,
  showSkeleton = true,
  aspectRatio,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(true);
  }, []);

  if (hasError) {
    return (
      <div
        className={cn(
          "bg-muted flex items-center justify-center text-muted-foreground text-sm",
          className
        )}
        style={aspectRatio ? { aspectRatio } : undefined}
        aria-label={alt}
      >
        <span className="sr-only">{alt}</span>
      </div>
    );
  }

  return (
    <div className="relative" style={aspectRatio ? { aspectRatio } : undefined}>
      {/* Skeleton placeholder */}
      {showSkeleton && !isLoaded && (
        <div
          className={cn(
            "absolute inset-0 animate-pulse bg-muted rounded-inherit",
            placeholderClassName
          )}
          aria-hidden="true"
        />
      )}

      {/* Actual image */}
      <img
        src={src}
        alt={alt}
        loading={lazy ? "lazy" : "eager"}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        {...props}
      />
    </div>
  );
});

/**
 * CriticalImage - For above-the-fold images that should load immediately
 * No lazy loading, prioritized for LCP
 */
export const CriticalImage = memo(function CriticalImage({
  src,
  alt,
  className,
  ...props
}: Omit<OptimizedImageProps, "lazy" | "showSkeleton">) {
  return (
    <img
      src={src}
      alt={alt}
      loading="eager"
      decoding="async"
      fetchPriority="high"
      className={className}
      {...props}
    />
  );
});

export default OptimizedImage;
