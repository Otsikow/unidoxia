import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { ExternalLink, ShieldCheck, Clock } from "lucide-react";

const sanitizeRedirectUrl = (value: string | null) => {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
  } catch (error) {
    console.error("Invalid redirect url", error);
  }
  return null;
};

const formatCountdownLabel = (countdown: number) => {
  if (countdown <= 0) return "Redirecting now...";
  return `${countdown} second${countdown === 1 ? "" : "s"}`;
};

export default function ScholarshipShareLanding() {
  const [searchParams] = useSearchParams();
  const scholarshipTitle = searchParams.get("title") ?? "Scholarship opportunity";
  const institution = searchParams.get("institution") ?? "";
  const country = searchParams.get("country") ?? undefined;
  const awardAmount = searchParams.get("award") ?? undefined;
  const safeRedirectUrl = useMemo(() => sanitizeRedirectUrl(searchParams.get("redirect")), [searchParams]);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!safeRedirectUrl) return undefined;
    setCountdown(5);
    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          window.location.href = safeRedirectUrl;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [safeRedirectUrl]);

  const description = `Preview ${scholarshipTitle} on UniDoxia before continuing to the official scholarship site.`;

  return (
    <div className="py-16">
      <SEO title={`${scholarshipTitle} | UniDoxia`} description={description} />
      <div className="container mx-auto max-w-3xl px-4">
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
            <ShieldCheck className="h-4 w-4" /> Verified scholarship redirect
          </div>
          <h1 className="text-3xl font-bold text-foreground">Stay on UniDoxia before you go</h1>
          <p className="text-muted-foreground">We guide every student through UniDoxia so you always land on trusted opportunities.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{scholarshipTitle}</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              {institution && <span>{institution}</span>}
              {country ? (
                <Badge variant="secondary" className="rounded-full text-xs">
                  {country}
                </Badge>
              ) : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {awardAmount ? (
              <div className="rounded-xl border bg-muted/40 p-4">
                <p className="text-sm font-semibold text-foreground">Funding snapshot</p>
                <p className="text-sm text-muted-foreground">{awardAmount}</p>
              </div>
            ) : null}

            <Alert>
              <AlertTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> You're viewing this via UniDoxia
              </AlertTitle>
              <AlertDescription>
                We confirm each scholarship before sending you on. This quick stop keeps students safe from outdated or fraudulent listings.
              </AlertDescription>
            </Alert>

            {safeRedirectUrl ? (
              <div className="rounded-2xl border bg-muted/40 p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" /> Redirecting in {formatCountdownLabel(countdown)}
                </div>
                <Button asChild className="w-full gap-2">
                  <a href={safeRedirectUrl} target="_blank" rel="noopener noreferrer">
                    Continue to scholarship <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <p className="text-xs text-muted-foreground">
                  The official site opens in a new tab so you can return to UniDoxia anytime.
                </p>
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertTitle>We couldn't find the official link</AlertTitle>
                <AlertDescription>
                  This share link is missing a destination. Ask your advisor to resend it or explore verified scholarships on UniDoxia.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">Want to compare more options first?</span>
            <Button variant="outline" asChild>
              <Link to="/scholarships">Browse scholarships</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
