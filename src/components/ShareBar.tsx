import { Facebook, Linkedin, MessageCircle, Send, Link2, Check, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/**
 * Shares a link to WhatsApp, Facebook, Telegram, LinkedIn, X, or via the
 * device's native share sheet — with a copy-link fallback. Any platform
 * that unfurls the shared URL (WhatsApp, Facebook, Telegram, etc.) will
 * automatically pick up the page's og:image / og:title / og:description
 * meta tags, so passing a real per-page URL is what makes rich previews
 * show up in the share.
 */
export function ShareBar({ url, title, label = "Share" }: { url: string; title: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent(url);
  const encTitle = encodeURIComponent(title);
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const links = [
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc}`, icon: Facebook },
    { label: "WhatsApp", href: `https://wa.me/?text=${encTitle}%20${enc}`, icon: MessageCircle },
    { label: "Telegram", href: `https://t.me/share/url?url=${enc}&text=${encTitle}`, icon: Send },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc}`, icon: Linkedin },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${enc}&text=${encTitle}`, icon: XIcon },
  ];

  function openShare(href: string, shareLabel: string) {
    // A plain <a target="_blank"> can be silently swallowed by some in-app
    // browsers (e.g. embedded webviews). Opening explicitly with window.open
    // and falling back to a manual navigation if popups are blocked is more
    // reliable, and lets us tell the person if it genuinely failed.
    const win = window.open(href, "_blank", "noopener,noreferrer,width=600,height=520");
    if (!win) {
      toast.error(`Couldn't open ${shareLabel} — your browser may be blocking pop-ups.`);
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, url });
    } catch {
      // AbortError when the person just dismisses the sheet — not an error.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}:</span>
      {canNativeShare && (
        <button
          type="button"
          onClick={nativeShare}
          aria-label="Share"
          className="grid h-9 w-9 place-items-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Share2 className="h-4 w-4" />
        </button>
      )}
      {links.map((l) => (
        <button
          key={l.label}
          type="button"
          onClick={() => openShare(l.href, l.label)}
          aria-label={`Share on ${l.label}`}
          className="grid h-9 w-9 place-items-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <l.icon className="h-4 w-4" />
        </button>
      ))}
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard?.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            toast.error("Couldn't copy the link — please copy it from the address bar.");
          }
        }}
        aria-label="Copy link"
        className="grid h-9 w-9 place-items-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary"
      >
        {copied ? <Check className="h-4 w-4 text-primary" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
