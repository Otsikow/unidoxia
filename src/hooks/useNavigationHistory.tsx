import React from "react";
import { Location, useLocation, useNavigate } from "react-router-dom";

const MAX_HISTORY_ENTRIES = 10;

export interface NavigationHistoryEntry {
  id: string;
  pathname: string;
  search: string;
  hash: string;
  state: unknown;
  label: string;
  title?: string | null;
  timestamp: number;
}

interface NavigationHistoryContextValue {
  history: NavigationHistoryEntry[];
  currentEntry: NavigationHistoryEntry | null;
  navigateTo: (entry: NavigationHistoryEntry) => void;
  clearHistory: () => void;
}

const NavigationHistoryContext = React.createContext<NavigationHistoryContextValue | null>(null);

const buildEntryId = (location: Location) => `${location.pathname}${location.search}${location.hash}`;

const toTitleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const formatLabelFromLocation = (location: Location, title?: string | null) => {
  if (title && title.trim().length > 0) {
    return title;
  }

  if (location.pathname === "/") {
    return "Home";
  }

  const segments = location.pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment))
    .map((segment) => segment.replace(/[-_]+/g, " "))
    .map((segment) => segment.split(" ").map((part) => (part ? toTitleCase(part) : part)).join(" "));

  if (segments.length === 0) {
    return "Home";
  }

  return segments.join(" / ");
};

const createEntry = (location: Location): NavigationHistoryEntry => {
  const title = typeof document !== "undefined" ? document.title : null;
  return {
    id: buildEntryId(location),
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
    state: location.state,
    title,
    label: formatLabelFromLocation(location, title),
    timestamp: Date.now(),
  };
};

export const NavigationHistoryProvider = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [history, setHistory] = React.useState<NavigationHistoryEntry[]>(() => [createEntry(location)]);

  React.useEffect(() => {
    setHistory((prev) => {
      const entry = createEntry(location);
      const existingIndex = prev.findIndex((item) => item.id === entry.id);

      if (existingIndex !== -1) {
        // Returning to a page already in the stack: truncate forward entries so
        // the Back button never bounces between two pages.
        const next = prev.slice(0, existingIndex + 1);
        next[existingIndex] = { ...entry, label: prev[existingIndex].label, title: prev[existingIndex].title };
        return next;
      }

      const next = [...prev, entry];
      if (next.length > MAX_HISTORY_ENTRIES) {
        return next.slice(next.length - MAX_HISTORY_ENTRIES);
      }

      return next;
    });

    // Page titles are set after render, so refresh the label once the new page settled.
    const timer = window.setTimeout(() => {
      const title = typeof document !== "undefined" ? document.title : null;
      if (!title) return;
      setHistory((prev) => {
        if (prev.length === 0) return prev;
        const lastIndex = prev.length - 1;
        const last = prev[lastIndex];
        if (last.id !== buildEntryId(location)) return prev;
        const label = formatLabelFromLocation(location, title);
        if (last.label === label && last.title === title) return prev;
        const next = [...prev];
        next[lastIndex] = { ...last, title, label };
        return next;
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [location]);


  const currentEntry = React.useMemo(() => history.at(-1) ?? null, [history]);

  const navigateTo = React.useCallback(
    (entry: NavigationHistoryEntry) => {
      navigate(`${entry.pathname}${entry.search}${entry.hash}`, {
        state: entry.state,
        // This is a Back action. Replacing the current entry prevents the
        // page being exited from remaining directly behind the destination.
        replace: true,
      });
    },
    [navigate],
  );

  const clearHistory = React.useCallback(() => {
    setHistory((prev) => (prev.length > 0 ? [prev[prev.length - 1]] : []));
  }, []);

  const value = React.useMemo<NavigationHistoryContextValue>(
    () => ({
      history,
      currentEntry,
      navigateTo,
      clearHistory,
    }),
    [history, currentEntry, navigateTo, clearHistory],
  );

  return <NavigationHistoryContext.Provider value={value}>{children}</NavigationHistoryContext.Provider>;
};

export const useNavigationHistory = () => {
  const context = React.useContext(NavigationHistoryContext);
  if (!context) {
    throw new Error("useNavigationHistory must be used within a NavigationHistoryProvider");
  }
  return context;
};
