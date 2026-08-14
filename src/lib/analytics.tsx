/**
 * Lightweight, consent-gated analytics loader for GA4 and Meta Pixel.
 *
 * Nothing loads until the visitor has accepted cookies via <CookieConsent />
 * (see components/CookieConsent.tsx) — this keeps us honest with the
 * Privacy Policy and avoids setting any non-essential cookie before consent.
 *
 * Configure via public (VITE_-prefixed) env vars — safe to expose, these are
 * not secrets:
 *   VITE_GA_MEASUREMENT_ID   e.g. "G-XXXXXXXXXX"
 *   VITE_META_PIXEL_ID       e.g. "123456789012345"
 *
 * If neither is set, this is a complete no-op.
 */

export const CONSENT_KEY = "hp-cookie-consent"; // "granted" | "denied"
export const CONSENT_CHANGED_EVENT = "hp-cookie-consent-changed";

export function getStoredConsent(): "granted" | "denied" | null {
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

function injectScriptOnce(id: string, src: string, attrs: Record<string, string> = {}) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.async = true;
  s.src = src;
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  document.head.appendChild(s);
}

function injectInlineScriptOnce(id: string, code: string) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.textContent = code;
  document.head.appendChild(s);
}

function loadGoogleAnalytics(measurementId: string) {
  injectScriptOnce("hp-ga4-src", `https://www.googletagmanager.com/gtag/js?id=${measurementId}`);
  injectInlineScriptOnce(
    "hp-ga4-init",
    `window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', '${measurementId}', { anonymize_ip: true });
     window.__hpGtag = gtag;`,
  );
}

function loadMetaPixel(pixelId: string) {
  injectInlineScriptOnce(
    "hp-meta-pixel-init",
    `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
      document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId}');
      fbq('track', 'PageView');`,
  );
}

/** Call once consent is granted (or already was, on page load). No-ops if no IDs configured. */
export function loadAnalyticsIfConsented() {
  if (typeof window === "undefined") return;
  if (getStoredConsent() !== "granted") return;
  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
  const pixelId = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
  if (gaId) loadGoogleAnalytics(gaId);
  if (pixelId) loadMetaPixel(pixelId);
}

/** Track a page view after route changes (GA4 SPA pageviews; Pixel fires its own PageView on init only). */
export function trackPageView(path: string) {
  if (typeof window === "undefined") return;
  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
  const gtag = (window as unknown as { __hpGtag?: (...a: unknown[]) => void }).__hpGtag;
  if (gaId && gtag) gtag("event", "page_view", { page_path: path });
}
