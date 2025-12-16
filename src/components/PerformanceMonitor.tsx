import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
  domContentLoaded?: number;
  loadComplete?: number;
}

/**
 * Performance monitoring component for development
 * Shows Web Vitals and page load metrics
 */
export const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (import.meta.env.PROD) return;

    // Toggle visibility with Ctrl/Cmd + Shift + P
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "P") {
        setIsVisible((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    // Collect performance metrics
    const collectMetrics = () => {
      const perfData = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      
      if (perfData) {
        setMetrics((prev) => ({
          ...prev,
          ttfb: perfData.responseStart - perfData.requestStart,
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
        }));
      }

      // Web Vitals using Performance Observer
      if ("PerformanceObserver" in window) {
        // LCP
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1] as any;
            setMetrics((prev) => ({ ...prev, lcp: lastEntry.renderTime || lastEntry.loadTime }));
          });
          lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
        } catch (e) {
          console.warn("LCP observer failed:", e);
        }

        // FID
        try {
          const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
              setMetrics((prev) => ({ ...prev, fid: entry.processingStart - entry.startTime }));
            });
          });
          fidObserver.observe({ entryTypes: ["first-input"] });
        } catch (e) {
          console.warn("FID observer failed:", e);
        }

        // CLS
        try {
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as any[]) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
                setMetrics((prev) => ({ ...prev, cls: clsValue }));
              }
            }
          });
          clsObserver.observe({ entryTypes: ["layout-shift"] });
        } catch (e) {
          console.warn("CLS observer failed:", e);
        }

        // FCP
        try {
          const fcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
              if (entry.name === "first-contentful-paint") {
                setMetrics((prev) => ({ ...prev, fcp: entry.startTime }));
              }
            });
          });
          fcpObserver.observe({ entryTypes: ["paint"] });
        } catch (e) {
          console.warn("FCP observer failed:", e);
        }
      }
    };

    if (document.readyState === "complete") {
      collectMetrics();
    } else {
      window.addEventListener("load", collectMetrics);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      window.removeEventListener("load", collectMetrics);
    };
  }, []);

  if (!isVisible || import.meta.env.PROD) return null;

  const getScore = (value: number | undefined, thresholds: { good: number; needsImprovement: number }) => {
    if (value === undefined) return "unknown";
    if (value <= thresholds.good) return "good";
    if (value <= thresholds.needsImprovement) return "needsImprovement";
    return "poor";
  };

  const getScoreColor = (score: string) => {
    switch (score) {
      case "good":
        return "bg-green-500";
      case "needsImprovement":
        return "bg-yellow-500";
      case "poor":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const fcpScore = getScore(metrics.fcp, { good: 1800, needsImprovement: 3000 });
  const lcpScore = getScore(metrics.lcp, { good: 2500, needsImprovement: 4000 });
  const fidScore = getScore(metrics.fid, { good: 100, needsImprovement: 300 });
  const clsScore = getScore(metrics.cls, { good: 0.1, needsImprovement: 0.25 });

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="shadow-2xl border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            Performance Monitor
            <button
              onClick={() => setIsVisible(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </CardTitle>
          <CardDescription className="text-xs">
            Press Ctrl/Cmd + Shift + P to toggle
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="font-semibold mb-1">Core Web Vitals</div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span>FCP</span>
                  <Badge className={getScoreColor(fcpScore)}>
                    {metrics.fcp ? `${metrics.fcp.toFixed(0)}ms` : "-"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>LCP</span>
                  <Badge className={getScoreColor(lcpScore)}>
                    {metrics.lcp ? `${metrics.lcp.toFixed(0)}ms` : "-"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>FID</span>
                  <Badge className={getScoreColor(fidScore)}>
                    {metrics.fid ? `${metrics.fid.toFixed(0)}ms` : "-"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>CLS</span>
                  <Badge className={getScoreColor(clsScore)}>
                    {metrics.cls ? metrics.cls.toFixed(3) : "-"}
                  </Badge>
                </div>
              </div>
            </div>
            <div>
              <div className="font-semibold mb-1">Load Metrics</div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span>TTFB</span>
                  <Badge variant="outline">
                    {metrics.ttfb ? `${metrics.ttfb.toFixed(0)}ms` : "-"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>DCL</span>
                  <Badge variant="outline">
                    {metrics.domContentLoaded ? `${metrics.domContentLoaded.toFixed(0)}ms` : "-"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Load</span>
                  <Badge variant="outline">
                    {metrics.loadComplete ? `${metrics.loadComplete.toFixed(0)}ms` : "-"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t text-[10px] text-muted-foreground">
            <div>Good: Green | Needs Work: Yellow | Poor: Red</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
