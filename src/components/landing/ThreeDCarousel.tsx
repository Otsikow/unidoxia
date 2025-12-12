import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type ThreeDCarouselCard = {
  title: string;
  description: string;
  metricValue?: string;
  metricLabel?: string;
  actionLabel?: string;
  actionHref?: string;
  image: string;
  gradient?: string;
  accent?: string;
};

type Position = "center" | "left" | "right" | "hidden";

type ThreeDCarouselProps = {
  cards: ThreeDCarouselCard[];
  autoPlay?: boolean;
  duration?: number;
  showDots?: boolean;
  className?: string;
};

const clampIndex = (index: number, total: number) =>
  ((index % total) + total) % total;

export const ThreeDCarousel = ({
  cards,
  autoPlay = true,
  duration = 5500,
  showDots = true,
  className
}: ThreeDCarouselProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const timerRef = useRef<number | null>(null);

  const cardCount = cards.length;

  /* ------------------ Detect Mobile ------------------ */
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  /* ------------------ Auto Play ------------------ */
  useEffect(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!autoPlay || isHovering || cardCount <= 1) return;

    const id = window.setInterval(() => {
      setActiveIndex((prev) => clampIndex(prev + 1, cardCount));
    }, duration);

    timerRef.current = id;

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [autoPlay, duration, isHovering, cardCount]);

  /* ------------------ Helpers ------------------ */
  const handlePointerEnter = () => setIsHovering(true);
  const handlePointerLeave = () => setIsHovering(false);

  const moveTo = (index: number) => setActiveIndex(clampIndex(index, cardCount));
  const next = () => moveTo(activeIndex + 1);
  const prev = () => moveTo(activeIndex - 1);

  const positionFor = (index: number): Position => {
    const relative = clampIndex(index - activeIndex, cardCount);
    if (relative === 0) return "center";
    if (relative === 1) return "right";
    if (relative === cardCount - 1) return "left";
    return "hidden";
  };

  const peekOffset = isMobile ? 56 : 82;
  const sideScale = isMobile ? 0.88 : 0.84;
  const overlayOpacity = isMobile ? 0.38 : 0.46;

  const depthPositions: Record<Position, number> = {
    center: 120,
    left: -80,
    right: -80,
    hidden: -300
  };

  /* ------------------ Animation Transition ------------------ */
  const transition = useMemo(
    () => ({
      duration: 0.48,
      ease: [0.33, 1, 0.68, 1]
    }),
    []
  );

  /* ------------------ Render ------------------ */
  if (cardCount === 0) return null;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0B0A1A]/80 via-[#0F0E2A]/70 to-[#0C0B1E]/90",
        "ring-1 ring-white/5 backdrop-blur-xl",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(143,105,255,0.20),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(77,196,255,0.18),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(255,210,119,0.14),transparent_28%)]" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/30 to-transparent" />

      <div className="relative px-4 py-12 sm:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Cinematic Cards</p>
            <h3 className="text-2xl font-semibold text-white sm:text-3xl">
              Neo-style 3D journeys for UniDoxia learners
            </h3>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-white/80 ring-1 ring-white/10 backdrop-blur-lg">
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-amber-300" />
            Live momentum carousel
          </div>
        </div>

        {/* ------------------ Carousel Container ------------------ */}
        <div
          className="relative mt-10"
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onFocusCapture={handlePointerEnter}
          onBlurCapture={handlePointerLeave}
        >
          <div className="pointer-events-none absolute -inset-8 hidden rounded-[32px] bg-gradient-to-r from-[#6E3DFF]/15 via-transparent to-[#FFD166]/10 blur-3xl sm:block" />

          <div
            className="relative flex items-center justify-center"
            style={{ perspective: 1800, transformStyle: "preserve-3d", minHeight: "420px" }}
          >
            <AnimatePresence initial={false}>
              {cards.map((card, index) => {
                const position = positionFor(index);
                const isCenter = position === "center";

                const xPos: Record<Position, number> = {
                  center: 0,
                  left: -peekOffset,
                  right: peekOffset,
                  hidden: 0
                };

                const rotateY: Record<Position, number> = {
                  center: 0,
                  left: 16,
                  right: -16,
                  hidden: 0
                };

                const scale: Record<Position, number> = {
                  center: 1,
                  left: sideScale,
                  right: sideScale,
                  hidden: 0.72
                };

                const opacity: Record<Position, number> = {
                  center: 1,
                  left: 0.6,
                  right: 0.6,
                  hidden: 0
                };

                return (
                  <motion.div
                    key={card.title}
                    layout
                    className="absolute w-full max-w-3xl"
                    style={{ transformStyle: "preserve-3d" }}
                    initial={{
                      opacity: opacity[position],
                      x: xPos[position],
                      scale: scale[position],
                      rotateY: rotateY[position],
                      z: depthPositions[position]
                    }}
                    animate={{
                      opacity: opacity[position],
                      x: xPos[position],
                      scale: scale[position],
                      rotateY: rotateY[position],
                      z: depthPositions[position],
                      zIndex: position === "center" ? 30 : position === "hidden" ? 0 : 15,
                      filter: isCenter ? "brightness(1)" : "brightness(0.85)"
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.8,
                      rotateY: rotateY[position],
                      z: depthPositions[position]
                    }}
                    transition={transition}
                  >
                    {/* ------------------ Card ------------------ */}
                    <div
                      className={cn(
                        "relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br text-white backdrop-blur-xl",
                        card.gradient ?? "from-[#201537] via-[#1A0E2B] to-[#0E0A1A]"
                      )}
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.08),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(255,214,102,0.12),transparent_30%)]" />
                      <div className="absolute inset-0 bg-black/10" />

                      <div
                        className={cn(
                          "absolute inset-0 transition-opacity",
                          isCenter ? "opacity-60" : "opacity-0",
                          card.accent ?? "bg-purple-400/10"
                        )}
                      />

                      <div className="relative grid gap-6 px-6 py-8 sm:grid-cols-[1.3fr_1fr] sm:gap-8 sm:px-10 sm:py-12">
                        <div className="space-y-4">
                          {card.metricValue && (
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-amber-100 ring-1 ring-white/15">
                              <span className="text-lg text-white">{card.metricValue}</span>
                              <span className="text-xs text-white/80">{card.metricLabel}</span>
                            </div>
                          )}

                          <h4 className="text-2xl font-semibold leading-tight sm:text-3xl">
                            {card.title}
                          </h4>

                          <p className="text-base text-white/75 sm:text-lg">
                            {card.description}
                          </p>

                          {card.actionLabel && card.actionHref && (
                            <a
                              href={card.actionHref}
                              className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-white/20"
                            >
                              {card.actionLabel}
                              <span className="text-lg">→</span>
                            </a>
                          )}
                        </div>

                        {/* ------------------ Image ------------------ */}
                        <div className="relative">
                          <div className="absolute -left-6 top-6 h-28 w-28 rounded-full bg-gradient-to-br from-amber-300/40 via-fuchsia-200/40 to-purple-400/30 blur-2xl" />
                          <div className="absolute -right-4 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-cyan-200/50 via-purple-300/40 to-transparent blur-2xl" />

                          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 ring-1 ring-white/10 backdrop-blur-lg">
                            <img src={card.image} alt={card.title} className="h-full w-full object-cover" />

                            {!isCenter && (
                              <div
                                className="absolute inset-0 bg-gradient-to-t from-black/40 via-[#0B0820]/40 to-transparent"
                                style={{ opacity: overlayOpacity }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* ------------------ Prev Button ------------------ */}
          <button
            type="button"
            onClick={prev}
            className="group absolute left-2 top-1/2 -translate-y-1/2 rounded-2xl bg-white/10 p-3 text-white ring-1 ring-white/15 backdrop-blur-xl transition hover:-translate-x-1 hover:scale-105 hover:bg-white/20"
            aria-label="Previous"
          >
            <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </motion.span>
          </button>

          {/* ------------------ Next Button ------------------ */}
          <button
            type="button"
            onClick={next}
            className="group absolute right-2 top-1/2 -translate-y-1/2 rounded-2xl bg-white/10 p-3 text-white ring-1 ring-white/15 backdrop-blur-xl transition hover:translate-x-1 hover:scale-105 hover:bg-white/20"
            aria-label="Next"
          >
            <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </motion.span>
          </button>
        </div>

        {/* ------------------ Dots ------------------ */}
        {showDots && cardCount > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            {cards.map((card, index) => {
              const isActive = index === activeIndex;

              return (
                <button
                  key={`${card.title}-${index}`}
                  type="button"
                  onClick={() => moveTo(index)}
                  className="group relative h-3 w-3 rounded-full bg-white/20"
                  aria-label={`Go to slide ${index + 1}`}
                >
                  <span
                    className={cn(
                      "absolute inset-0 rounded-full transition",
                      isActive
                        ? "scale-125 bg-gradient-to-r from-[#8F6BFF] via-[#A06CFF] to-[#FFD166]"
                        : "scale-75 bg-white/30 group-hover:bg-white/50"
                    )}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
