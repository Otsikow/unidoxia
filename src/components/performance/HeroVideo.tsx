import { useState, useEffect, useRef, memo, useCallback } from "react";
import { cn } from "@/lib/utils";

interface HeroVideoProps {
  videoSrc: string;
  posterSrc: string;
  fallbackImageSrc: string;
  className?: string;
  overlayClassName?: string;
  /** Delay before loading video (ms) - default 0 for instant */
  loadDelay?: number;
}

/**
 * HeroVideo - Ultra-optimized hero video component
 *
 * Performance features:
 * - Immediate poster display (no layout shift)
 * - Video preloads metadata only, then starts immediately
 * - Respects user preferences (reduced motion, save data)
 * - Uses requestIdleCallback for non-blocking load
 * - GPU-accelerated playback with will-change
 * - Graceful fallback to static image
 */
export const HeroVideo = memo(function HeroVideo({
  videoSrc,
  posterSrc,
  fallbackImageSrc,
  className,
  overlayClassName,
  loadDelay = 0,
}: HeroVideoProps) {
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Check if we should skip video entirely
  const shouldSkipVideo = useCallback(() => {
    if (typeof window === "undefined") return true;

    // Check reduced motion preference
    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return true;

    // Check network conditions
    const conn = (navigator as any).connection;
    if (conn?.saveData) return true;
    if (["slow-2g", "2g"].includes(conn?.effectiveType ?? "")) return true;

    return false;
  }, []);

  // Initialize video loading
  useEffect(() => {
    if (shouldSkipVideo()) {
      setShouldLoadVideo(false);
      return;
    }

    // Use requestIdleCallback for non-blocking initialization
    const enableVideo = () => setShouldLoadVideo(true);

    if (loadDelay === 0) {
      // Load immediately but non-blocking
      if ("requestIdleCallback" in window) {
        const id = (window as any).requestIdleCallback(enableVideo, { timeout: 100 });
        return () => (window as any).cancelIdleCallback?.(id);
      }
      // Fallback: microtask queue
      queueMicrotask(enableVideo);
    } else {
      // Delayed load
      const timeoutId = setTimeout(enableVideo, loadDelay);
      return () => clearTimeout(timeoutId);
    }
  }, [loadDelay, shouldSkipVideo]);

  // Auto-play video when it's ready
  const handleCanPlay = useCallback(() => {
    setVideoReady(true);
    videoRef.current?.play().catch(() => {
      // Autoplay blocked - keep showing poster
      setVideoError(true);
    });
  }, []);

  const handleError = useCallback(() => {
    setVideoError(true);
  }, []);

  // Render static image if video should be skipped or errored
  const showStaticImage = !shouldLoadVideo || videoError;

  return (
    <div className={cn("hero-video-container", className)}>
      {/* Static poster/fallback - always visible initially for instant display */}
      <img
        src={showStaticImage ? fallbackImageSrc : posterSrc}
        alt=""
        className={cn(
          "hero-video",
          "transition-opacity duration-500",
          videoReady && !videoError ? "opacity-0" : "opacity-100"
        )}
        decoding="async"
        aria-hidden="true"
        // Critical image - load eagerly
        loading="eager"
        fetchPriority="high"
      />

      {/* Video element - only mount when we should load */}
      {shouldLoadVideo && !videoError && (
        <video
          ref={videoRef}
          className={cn(
            "hero-video",
            "transition-opacity duration-500",
            videoReady ? "opacity-100" : "opacity-0"
          )}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster={posterSrc}
          onCanPlay={handleCanPlay}
          onError={handleError}
          // GPU acceleration hints
          style={{
            willChange: videoReady ? "auto" : "opacity",
            transform: "translateZ(0)",
          }}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}

      {/* Dark overlay */}
      <div className={cn("hero-video-overlay", overlayClassName)} />
    </div>
  );
});

/**
 * useHeroVideoPreload - Preload video in the background
 * Use this hook to start loading video before user scrolls to it
 */
export function useHeroVideoPreload(videoSrc: string) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const conn = (navigator as any).connection;
    if (conn?.saveData || ["slow-2g", "2g"].includes(conn?.effectiveType ?? "")) {
      return;
    }

    // Create a link preload for the video
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "video";
    link.href = videoSrc;
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, [videoSrc]);
}

export default HeroVideo;
