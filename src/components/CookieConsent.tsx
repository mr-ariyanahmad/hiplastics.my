import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie } from "lucide-react";
import { CONSENT_KEY, CONSENT_CHANGED_EVENT, getStoredConsent, loadAnalyticsIfConsented } from "@/lib/analytics";

/**
 * PDPA/cookie-law banner. Shown once until the visitor makes a choice.
 * Re-openable any time via the "Cookie preferences" link in the footer,
 * which dispatches a "hp-open-cookie-preferences" window event.
 *
 * Nothing analytics-related loads until "Accept" is pressed — see
 * lib/analytics.tsx, which this component calls into once consent is
 * granted.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getStoredConsent() === null) setVisible(true);
    else loadAnalyticsIfConsented();

    const reopen = () => setVisible(true);
    window.addEventListener("hp-open-cookie-preferences", reopen);
    return () => window.removeEventListener("hp-open-cookie-preferences", reopen);
  }, []);

  function choose(value: "granted" | "denied") {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: value }));
    if (value === "granted") loadAnalyticsIfConsented();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/98 p-4 shadow-elevated backdrop-blur sm:p-5">
      <div className="container-page flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            We use essential cookies to run this site (sign-in, cart) and, with your consent, analytics
            cookies to understand how it's used. See our{" "}
            <Link to="/privacy-policy" className="font-semibold text-primary underline">Privacy Policy</Link>.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose("denied")}
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose("granted")}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-glow"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
