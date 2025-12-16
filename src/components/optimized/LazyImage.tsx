import { useState, useEffect } from "react";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { cn } from "@/lib/utils";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  containerClassName?: string;
}

/**
 * Optimized lazy-loading image component
 * Only loads when visible in viewport
 * Shows placeholder until loaded
 * Prevents layout shift with aspect ratio container
 */
export const LazyImage = ({
  src,
  alt,
  placeholder = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f0f0f0'/%3E%3C/svg%3E",
  className,
  containerClassName,
  ...props
}: LazyImageProps) => {
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>({
    freezeOnceVisible: true,
    rootMargin: "100px", // Start loading 100px before visible
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState(placeholder);

  useEffect(() => {
    if (isVisible && imageSrc === placeholder) {
      setImageSrc(src);
    }
  }, [isVisible, src, placeholder, imageSrc]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden bg-muted",
        containerClassName
      )}
    >
      <img
        src={imageSrc}
        alt={alt}
        onLoad={handleLoad}
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        loading="lazy"
        decoding="async"
        {...props}
      />
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}
    </div>
  );
};

/**
 * Example usage:
 * 
 * <LazyImage
 *   src="/images/hero.jpg"
 *   alt="Hero image"
 *   className="w-full h-auto"
 * />
 */
