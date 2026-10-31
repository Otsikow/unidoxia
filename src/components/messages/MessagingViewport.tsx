import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/** Fit below the actual dashboard header, including browser zoom and keyboard changes. */
export function MessagingViewport({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>();
  const [screen, setScreen] = useState({
    height: undefined as number | undefined,
    top: 0,
  });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const viewport = window.visualViewport;
      const screenHeight = viewport?.height ?? window.innerHeight;
      const top = viewport?.offsetTop ?? 0;
      const bottom = screenHeight + top;
      setScreen((current) =>
        current.height === screenHeight && current.top === top
          ? current
          : { height: screenHeight, top },
      );
      const bottomPadding = Math.max(
        16,
        element.parentElement
          ? parseFloat(getComputedStyle(element.parentElement).paddingBottom) ||
              0
          : 0,
      );
      setHeight(
        Math.max(
          220,
          Math.floor(
            bottom -
              Math.max(0, element.getBoundingClientRect().top) -
              bottomPadding,
          ),
        ),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (element.parentElement) observer.observe(element.parentElement);
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("scroll", measure);
    };
  }, []);
  return (
    <div
      ref={ref}
      style={
        {
          height,
          "--messaging-screen-height": screen.height
            ? `${screen.height}px`
            : undefined,
          "--messaging-screen-top": `${screen.top}px`,
        } as CSSProperties
      }
      className="flex h-[calc(100dvh-9rem)] min-h-0 min-w-0 flex-col overflow-hidden bg-background"
    >
      {children}
    </div>
  );
}
