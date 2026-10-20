import { useEffect, useRef, useState } from "react";
import { Cookie, Settings2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getConsentPreferences,
  setConsentPreferences,
  subscribeToConsent,
  COOKIE_SETTINGS_EVENT,
  type ConsentPreferences,
} from "@/lib/cookieConsent";

const defaults: ConsentPreferences = { analytics: false, marketing: false };

export function CookieConsent() {
  const [ready, setReady] = useState(false);
  const [show, setShow] = useState(false);
  const [settings, setSettings] = useState(false);
  const [preferences, setPreferences] = useState(defaults);
  const [error, setError] = useState("");
  const opener = useRef<HTMLElement | null>(null);

  const openSettings = () => {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setPreferences(getConsentPreferences() ?? defaults);
    setError("");
    setSettings(true);
  };

  useEffect(() => {
    const sync = () => {
      const saved = getConsentPreferences();
      setShow(saved === null);
      setPreferences(saved ?? defaults);
    };
    const open = () => openSettings();
    sync();
    setReady(true);
    const unsubscribe = subscribeToConsent(sync);
    window.addEventListener(COOKIE_SETTINGS_EVENT, open);
    return () => {
      unsubscribe();
      window.removeEventListener(COOKIE_SETTINGS_EVENT, open);
    };
  }, []);

  const save = (choice: ConsentPreferences) => {
    if (!setConsentPreferences(choice)) {
      setError(
        "Your browser could not save this choice. Please allow site storage and try again.",
      );
      return;
    }
    setError("");
    setShow(false);
    setSettings(false);
  };

  if (!ready) return null;

  return (
    <>
      {show && (
        <section
          aria-labelledby="cookie-banner-title"
          aria-describedby="cookie-banner-description"
          className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto border-t border-border bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-foreground shadow-2xl sm:p-5"
        >
          <div className="mx-auto w-full max-w-4xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Cookie className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 space-y-1">
                <h2
                  id="cookie-banner-title"
                  className="text-base font-semibold leading-6"
                >
                  We use cookies
                </h2>
                <p
                  id="cookie-banner-description"
                  className="text-sm leading-6 text-muted-foreground"
                >
                  We use essential cookies to keep UniDoxia working. Optional
                  analytics and marketing cookies help us improve the site and
                  measure adverts, with your permission.{" "}
                  <Link
                    to="/legal/privacy"
                    className="font-medium text-foreground underline underline-offset-4 focus-visible:outline focus-visible:outline-2"
                  >
                    Privacy and cookies
                  </Link>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-11 whitespace-normal rounded-lg px-4 py-2"
                onClick={openSettings}
              >
                <Settings2 className="h-4 w-4" aria-hidden="true" />
                Cookie preferences
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-11 whitespace-normal rounded-lg px-4 py-2"
                onClick={() => save(defaults)}
              >
                Essential only
              </Button>
              <Button
                type="button"
                className="h-auto min-h-11 whitespace-normal rounded-lg px-4 py-2"
                onClick={() => save({ analytics: true, marketing: true })}
              >
                Accept all
              </Button>
            </div>
            {error && (
              <p role="alert" className="text-sm leading-6 text-destructive">
                {error}
              </p>
            )}
          </div>
        </section>
      )}
      {!show && (
        <Button
          type="button"
          variant="outline"
          data-cookie-settings="true"
          className="fixed bottom-3 left-3 z-40 min-h-11 rounded-full bg-background px-4 shadow-md"
          onClick={openSettings}
        >
          <Cookie className="h-4 w-4" aria-hidden="true" />
          Cookie settings
        </Button>
      )}
      <Dialog open={settings} onOpenChange={setSettings}>
        <DialogContent
          className="[&>button:last-child]:flex [&>button:last-child]:h-11 [&>button:last-child]:w-11 [&>button:last-child]:items-center [&>button:last-child]:justify-center [&>button:last-child]:right-2 [&>button:last-child]:top-2 max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl p-5 text-foreground sm:p-6"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (opener.current?.isConnected) opener.current.focus();
            else
              document
                .querySelector<HTMLButtonElement>("[data-cookie-settings]")
                ?.focus();
          }}
        >
          <DialogHeader className="pr-6 text-left">
            <DialogTitle className="flex items-center gap-2 leading-7">
              <ShieldCheck
                className="h-5 w-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              Cookie preferences
            </DialogTitle>
            <DialogDescription className="text-sm leading-6">
              You’re in control. Optional cookies stay off until you choose
              them. Change your choice at any time using Cookie settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Essential cookies</h3>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-foreground">
                  Always on
                </span>
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Keep the site secure and working, and remember your cookie
                choice.
              </p>
            </div>
            {(
              [
                [
                  "analytics",
                  "Analytics",
                  "Help us understand how the site is used so we can improve it.",
                ],
                [
                  "marketing",
                  "Marketing and advertising",
                  "Help measure adverts and make advertising more relevant.",
                ],
              ] as const
            ).map(([key, label, description]) => (
              <label
                key={key}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{label}</span>
                  <span
                    id={`cookie-${key}-description`}
                    className="mt-1 block text-sm leading-6 text-muted-foreground"
                  >
                    {description}
                  </span>
                </span>
                <span className="flex min-h-11 min-w-11 shrink-0 items-center justify-center">
                  <input
                    type="checkbox"
                    aria-label={label}
                    aria-describedby={`cookie-${key}-description`}
                    checked={preferences[key]}
                    onChange={(event) =>
                      setPreferences((current) => ({
                        ...current,
                        [key]: event.target.checked,
                      }))
                    }
                    className="h-5 w-5 accent-[hsl(var(--primary))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                  />
                </span>
              </label>
            ))}
          </div>
          <Link
            to="/legal/privacy"
            className="text-sm underline underline-offset-4"
          >
            Privacy and cookies
          </Link>
          {error && (
            <p role="alert" className="text-sm leading-6 text-destructive">
              {error}
            </p>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="h-auto min-h-11 whitespace-normal py-2"
              onClick={() => save(defaults)}
            >
              Essential only
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-auto min-h-11 whitespace-normal py-2"
              onClick={() => save({ analytics: true, marketing: true })}
            >
              Accept all
            </Button>
            <Button
              type="button"
              className="h-auto min-h-11 whitespace-normal py-2 sm:col-span-2"
              onClick={() => save(preferences)}
            >
              Save preferences
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
