/**
 * Image optimization utilities for UniDoxia
 * Helps with lazy loading, responsive images, and performance
 */

/**
 * Generate srcset for responsive images
 */
export const generateSrcSet = (
  baseUrl: string,
  widths: number[] = [320, 640, 768, 1024, 1280, 1920]
): string => {
  return widths
    .map((width) => `${baseUrl}?w=${width} ${width}w`)
    .join(", ");
};

/**
 * Generate sizes attribute for responsive images
 */
export const generateSizes = (
  breakpoints: Array<{ minWidth: string; size: string }>
): string => {
  return breakpoints
    .map(({ minWidth, size }) => `(min-width: ${minWidth}) ${size}`)
    .join(", ");
};

/**
 * Lazy load image with intersection observer
 */
export const lazyLoadImage = (
  img: HTMLImageElement,
  options?: IntersectionObserverInit
) => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const target = entry.target as HTMLImageElement;
        const src = target.dataset.src;
        const srcset = target.dataset.srcset;

        if (src) target.src = src;
        if (srcset) target.srcset = srcset;

        target.classList.remove("lazy");
        observer.unobserve(target);
      }
    });
  }, options || { rootMargin: "50px" });

  observer.observe(img);
  return observer;
};

/**
 * Preload critical images
 */
export const preloadImage = (src: string, as: "image" = "image"): void => {
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = as;
  link.href = src;
  document.head.appendChild(link);
};

/**
 * Convert image to WebP format (client-side)
 */
export const convertToWebP = async (
  file: File,
  quality = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to convert image"));
          },
          "image/webp",
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Compress image before upload
 */
export const compressImage = async (
  file: File,
  maxWidth = 1920,
  quality = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        
        // Resize if needed
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to compress image"));
          },
          file.type,
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Check if browser supports WebP
 */
export const supportsWebP = (): boolean => {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;
};

/**
 * Generate blur placeholder data URL
 */
export const generateBlurDataURL = (
  width = 10,
  height = 10
): string => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  
  // Create gradient blur
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "rgba(200, 200, 200, 0.1)");
  gradient.addColorStop(1, "rgba(150, 150, 150, 0.1)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL("image/png");
};

/**
 * Image component props generator for optimal loading
 */
export const getOptimalImageProps = (
  src: string,
  alt: string,
  priority = false
) => {
  return {
    src,
    alt,
    loading: priority ? "eager" : ("lazy" as const),
    decoding: "async" as const,
    // Add blur placeholder for better UX
    style: { backgroundColor: "#f0f0f0" },
  };
};
