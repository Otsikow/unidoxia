import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useNavigationHistory } from "@/hooks/useNavigationHistory";
import { ArrowLeft, Clock, ChevronDown, Trash2 } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export interface BackButtonProps extends React.ComponentProps<typeof Button> {
  fallback?: string;
  label?: string;
  wrapperClassName?: string;
  labelClassName?: string;
  showHistoryMenu?: boolean;
}

export default function BackButton({
  fallback = "/",
  label,
  className,
  wrapperClassName,
  labelClassName,
  showHistoryMenu = true,
  onClick,
  variant,
  size,
  disabled,
  ...buttonProps
}: BackButtonProps) {
  const navigate = useNavigate();
  const { history, currentEntry, navigateTo, clearHistory } = useNavigationHistory();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const { t } = useTranslation();

  const previousEntries = React.useMemo(() => (history.length > 1 ? history.slice(0, -1).reverse() : []), [history]);

  const hasHistory = previousEntries.length > 0;
  const immediatePrevious = hasHistory ? previousEntries[0] : null;
  const currentFullPath = React.useMemo(() => {
    if (!currentEntry) {
      return "";
    }

    const pathname = currentEntry.pathname ?? "";
    const search = currentEntry.search ?? "";
    const hash = currentEntry.hash ?? "";

    const combined = `${pathname}${search}${hash}`;

    return combined.length > 0 ? combined : "/";
  }, [currentEntry]);

  const handleFallbackNavigation = React.useCallback(() => {
    navigate(fallback);
  }, [fallback, navigate]);

  const handleNavigateToEntry = React.useCallback(
    (entry: typeof previousEntries[number]) => {
      try {
        setMenuOpen(false);
        navigateTo(entry);
      } catch (error) {
        console.error("Failed to navigate to history entry", error);
        handleFallbackNavigation();
      }
    },
    [handleFallbackNavigation, navigateTo],
  );

  const handlePrimaryClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (event.defaultPrevented || disabled) {
        return;
      }

      try {
        // If we have a previous entry in our custom navigation history, use it
        if (immediatePrevious) {
          navigateTo(immediatePrevious);
          return;
        }

        // Otherwise, always use the fallback route
        // Note: We don't rely on window.history.length because it may include
        // external pages or pages from before the user entered our app
        handleFallbackNavigation();
      } catch (error) {
        console.error("Back navigation failed, using fallback", error);
        handleFallbackNavigation();
      }
    },
    [disabled, handleFallbackNavigation, immediatePrevious, navigateTo, onClick],
  );

  const handleClearHistory = React.useCallback(
    (event: Event) => {
      event.preventDefault();
      clearHistory();
      setMenuOpen(false);
    },
    [clearHistory],
  );

  const historyButtonVariant = variant;
  const historyButtonSize = size;

  return (
    <div className={cn("inline-flex items-stretch", wrapperClassName)}>
      <Button
        {...buttonProps}
        variant={variant}
        size={size}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2",
          showHistoryMenu && hasHistory && "rounded-r-none",
          className,
        )}
        onClick={handlePrimaryClick}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className={labelClassName}>{label ?? t("common.actions.goBack")}</span>
      </Button>
      {showHistoryMenu ? (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant={historyButtonVariant}
              size={historyButtonSize}
              disabled={!hasHistory || disabled}
              className={cn(
                "px-2 shadow-none",
                hasHistory ? "rounded-l-none border-l border-border/50" : "hidden",
                size === "sm" ? "px-1" : null,
              )}
              aria-label={t("common.labels.showRecentPages")}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="flex max-h-[min(70vh,26rem)] w-[min(85vw,22rem)] flex-col gap-1.5 overflow-y-auto rounded-lg border border-border/60 bg-popover p-2 text-popover-foreground shadow-lg sm:w-[22rem] sm:p-3"
          >
            <DropdownMenuLabel className="flex flex-col gap-1 rounded-md bg-muted/40 px-3 py-2 text-left !font-normal">
              <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                {t("components.emptyState.currentPage")}
              </span>
              <span className="text-sm font-medium leading-snug text-pretty">
                {currentEntry?.label ?? t("components.emptyState.currentPage")}
              </span>
              {currentFullPath ? (
                <span className="text-xs text-muted-foreground break-all">{currentFullPath}</span>
              ) : null}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {hasHistory ? (
              previousEntries.map((entry) => {
                const fullPath = `${entry.pathname ?? ""}${entry.search ?? ""}${entry.hash ?? ""}`;

                return (
                  <DropdownMenuItem
                    key={entry.id}
                    onSelect={(event) => {
                      event.preventDefault();
                      handleNavigateToEntry(entry);
                    }}
                    className="flex w-full flex-col gap-1 rounded-md px-2 py-2 text-left leading-snug hover:translate-x-0 focus:translate-x-0 sm:px-3"
                  >
                    <div className="flex w-full items-start gap-2">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="flex flex-1 flex-col gap-1">
                        <span className="text-sm font-medium leading-snug text-pretty" title={entry.label}>
                          {entry.label}
                        </span>
                        <span className="text-xs text-muted-foreground break-all" title={fullPath}>
                          {fullPath || "/"}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                );
              })
            ) : (
              <DropdownMenuItem disabled className="px-2 py-2 text-sm text-muted-foreground hover:translate-x-0 focus:translate-x-0">
                {t("components.emptyState.noRecentPages")}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                handleFallbackNavigation();
                setMenuOpen(false);
              }}
              className="flex items-center gap-2 px-2 py-2 text-sm hover:translate-x-0 focus:translate-x-0 sm:px-3"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("components.emptyState.goToFallback")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={handleClearHistory}
              className="flex items-center gap-2 px-2 py-2 text-sm text-destructive hover:translate-x-0 focus:text-destructive focus:translate-x-0 sm:px-3"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("components.emptyState.clearHistory")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
