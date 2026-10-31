import { useEffect, useState, type ReactNode } from "react";
const KEY = "unidoxia.admin.sidebar.width";
const MIN = 240;
const MAX = 420;
const DEFAULT = 288;
const clamp = (width: number) => Math.max(MIN, Math.min(MAX, width));
function savedWidth() {
  try {
    const value = localStorage.getItem(KEY);
    const width = value === null ? DEFAULT : Number(value);
    return Number.isFinite(width) ? clamp(width) : DEFAULT;
  } catch {
    return DEFAULT;
  }
}
export function ResizableAdminSidebar({
  collapsed,
  children,
}: {
  collapsed: boolean;
  children: ReactNode;
}) {
  const [width, setWidth] = useState(savedWidth);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, String(width));
    } catch {
      /* Optional preference. */
    }
  }, [width]);
  return (
    <aside
      aria-label="Admin sidebar"
      style={{ width: collapsed ? 80 : width }}
      className="sticky top-0 z-40 hidden h-dvh shrink-0 self-start overflow-visible md:flex"
    >
      {children}
      {!collapsed && (
        <div
          role="separator"
          aria-label="Resize sidebar"
          aria-orientation="vertical"
          aria-valuemin={MIN}
          aria-valuemax={MAX}
          aria-valuenow={width}
          tabIndex={0}
          title="Drag to resize. Use arrow keys when focused; double-click to reset."
          className="absolute bottom-0 top-28 -right-1 z-30 w-2 touch-none cursor-col-resize hover:bg-primary/20 focus-visible:bg-primary/30 focus-visible:outline-none"
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
            const left =
              event.currentTarget.parentElement?.getBoundingClientRect().left ??
              0;
            setWidth(clamp(event.clientX - left));
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onDoubleClick={() => setWidth(DEFAULT)}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            setWidth((current) =>
              event.key === "Home"
                ? MIN
                : event.key === "End"
                  ? MAX
                  : clamp(current + (event.key === "ArrowRight" ? 16 : -16)),
            );
          }}
        />
      )}
    </aside>
  );
}
