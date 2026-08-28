import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WithTranslation, withTranslation } from "react-i18next";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

type PropsWithTranslation = Props & WithTranslation;

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

class ErrorBoundaryComponent extends Component<PropsWithTranslation, State> {
  private maxRetries = 3;

    constructor(props: PropsWithTranslation) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    if (process.env.NODE_ENV === "production") {
      this.logErrorToService(error, errorInfo);
    }
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    console.error("Error logged to service:", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
  };

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState((prevState) => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    });
  };

  private getErrorMessage = (error: Error): string => {
    const { t } = this.props;

    if (error.message.includes("NetworkError") || error.message.includes("fetch"))
      return t("app.errorBoundary.networkMessage");

    if (error.message.includes("ChunkLoadError") || error.message.includes("Loading chunk"))
      return t("app.errorBoundary.chunkMessage");

    if (error.message.includes("Permission denied") || error.message.includes("403"))
      return t("app.errorBoundary.permissionMessage");

    if (error.message.includes("Not found") || error.message.includes("404"))
      return t("app.errorBoundary.notFoundMessage");

    if (error.message.includes("Unauthorized") || error.message.includes("401"))
      return t("app.errorBoundary.unauthorizedMessage");

    if (error.message.includes("Supabase") || error.message.includes("database"))
      return t("app.errorBoundary.databaseMessage");

    // Never surface raw runtime exception text (e.g. "Input is not defined") to
    // end users. The real error is still logged and reported for diagnostics.
    if (process.env.NODE_ENV === "development" && error.message.length < 100 && !error.message.includes("Error:"))
      return error.message;

    return t("app.errorBoundary.genericMessage");
  };


  private getErrorTitle = (error: Error): string => {
    const { t } = this.props;

    if (error.message.includes("NetworkError") || error.message.includes("fetch"))
      return t("app.errorBoundary.networkTitle");

    if (error.message.includes("ChunkLoadError") || error.message.includes("Loading chunk"))
      return t("app.errorBoundary.chunkTitle");

    if (error.message.includes("Permission denied") || error.message.includes("403"))
      return t("app.errorBoundary.permissionTitle");

    if (error.message.includes("Not found") || error.message.includes("404"))
      return t("app.errorBoundary.notFoundTitle");

    if (error.message.includes("Unauthorized") || error.message.includes("401"))
      return t("app.errorBoundary.unauthorizedTitle");

    if (error.message.includes("Supabase") || error.message.includes("database"))
      return t("app.errorBoundary.databaseTitle");

    return t("app.errorBoundary.genericTitle");
  };

  render() {
    const { t, fallback } = this.props;

    if (this.state.hasError) {
      if (fallback) return fallback;

      const { error, retryCount } = this.state;
      const errorMessage = error
        ? this.getErrorMessage(error)
        : t("app.errorBoundary.fallbackMessage");
      const errorTitle = error
        ? this.getErrorTitle(error)
        : t("app.errorBoundary.fallbackTitle");
      const canRetry = retryCount < this.maxRetries;
      const remainingRetries = this.maxRetries - retryCount;

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">{errorTitle}</CardTitle>
              <CardDescription className="text-base">{errorMessage}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === "development" && error && (
                <Alert>
                  <Bug className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-muted-foreground">
                        {t("app.errorBoundary.technicalDetails")}
                      </summary>
                      <pre className="mt-2 max-h-32 overflow-auto text-xs text-muted-foreground">{error.stack}</pre>
                    </details>
                  </AlertDescription>
                </Alert>
              )}


              <div className="flex flex-col gap-2 sm:flex-row">
                {canRetry && (
                  <Button onClick={this.handleRetry} className="flex-1">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t("app.errorBoundary.tryAgainCount", { count: remainingRetries })}
                  </Button>
                )}
                <Button variant="outline" onClick={this.handleReset} className="flex-1">
                  <Home className="mr-2 h-4 w-4" />
                  {t("app.errorBoundary.goHome")}
                </Button>
              </div>

              {!canRetry && (
                <div className="text-center text-sm text-muted-foreground">
                  {t("app.errorBoundary.maxRetriesReached")}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// ✅ Hook for functional components to trigger ErrorBoundary
export const useErrorHandler = () => {
  return (error: Error, errorInfo?: string) => {
    console.error("Error caught by useErrorHandler:", error, errorInfo);
    throw error;
  };
};

const TranslatedErrorBoundary = withTranslation()(ErrorBoundaryComponent);

export { TranslatedErrorBoundary as ErrorBoundary };
export default TranslatedErrorBoundary;
