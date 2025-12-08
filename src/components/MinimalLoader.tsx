/**
 * Minimal loading spinner with no external dependencies.
 * Use this for the initial app shell before i18n and other providers are ready.
 */
export const MinimalLoader = ({ message = "Loading..." }: { message?: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      {/* Pure CSS spinner - no Lucide dependency */}
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary"
        role="status"
        aria-label="Loading"
      />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  </div>
);

export default MinimalLoader;
