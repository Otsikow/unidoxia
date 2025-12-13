import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MessagingUnavailableProps {
  reason?: string;
  title?: string;
  redirectHref?: string;
  redirectLabel?: string;
  onRetry?: () => void;
}

export function MessagingUnavailable({
  reason = "Messaging is temporarily unavailable. Please try again later.",
  title = "Messaging is temporarily unavailable",
  redirectHref = "/",
  redirectLabel = "Go home",
  onRetry,
}: MessagingUnavailableProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md sm:max-w-xl text-center shadow-lg">
        <CardHeader className="space-y-3 sm:space-y-4 px-4 sm:px-6">
          <div className="mx-auto flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
          </div>
          <CardTitle className="text-base sm:text-xl font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6">
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{reason}</p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {onRetry && (
              <Button variant="outline" onClick={onRetry} data-testid="messaging-retry" className="h-8 sm:h-9 text-xs sm:text-sm">
                Try again
              </Button>
            )}
            <Button onClick={() => navigate(redirectHref)} data-testid="messaging-redirect" className="h-8 sm:h-9 text-xs sm:text-sm">
              {redirectLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MessagingUnavailable;
