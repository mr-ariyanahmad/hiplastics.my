import { RouteError } from "@/components/RouteError";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Facebook, Linkedin, MessageCircle, Send, Link2, Check } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { fetchAllPublicData, type NewsItem } from "@/lib/cms.functions";
import { site, SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/news_/$slug")({
  loader: async ({ params }) => {
    const data = await fetchAllPublicData();
    const post = (data.news ?? []).find((n) => n.slug === params.slug && n.is_active !== false) ?? null;
    return { post };
  },
  head: ({ loaderData, params }) => {
    const post = loaderData?.post as NewsItem | null | undefined;
    const url = `${SITE_URL}/news/${params.slug}`;
    if (!post) {
      return {
        meta: [
          { title: `Article not found | ${site.name}` },
          { name: "robots", content: "noindex" },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const title = `${post.title} | ${site.name}`;
    const description = (post.excerpt || post.body || "").slice(0, 160).trim() || `Latest news from ${site.name}.`;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description,
      image: post.image_url ? [post.image_url] : undefined,
      datePublished: post.published_at || undefined,
      dateModified: post.published_at || undefined,
      author: { "@type": "Organization", name: site.name },
      publisher: { "@type": "Organization", name: site.name },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
    };
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:title", content: post.title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        ...(post.image_url
          ? [
              { property: "og:image", content: post.image_url },
              { property: "og:image:width", content: "1200" },
              { property: "og:image:height", content: "630" },
            ]
          : []),
        { name: "twitter:card", content: post.image_url ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: post.title },
        { name: "twitter:description", content: description },
        ...(post.image_url ? [{ name: "twitter:image", content: post.image_url }] : []),
        ...(post.published_at ? [{ property: "article:published_time", content: post.published_at }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
    };
  },
  errorComponent: ({ error }) => <RouteError error={error as Error} />,
  component: NewsDetailPage,
});

function ShareBar({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent(url);
  const encTitle = encodeURIComponent(title);
  // Note: the old "Messenger" button used Facebook's send dialog with
  // app_id=0, which Facebook rejects outright (it requires a real registered
  // app ID) — that's why it silently did nothing. Telegram's share intent
  // needs no app registration and works reliably everywhere, so it replaces
  // Messenger here.
  const links = [
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc}`, icon: Facebook },
    { label: "WhatsApp", href: `https://wa.me/?text=${encTitle}%20${enc}`, icon: MessageCircle },
    { label: "Telegram", href: `https://t.me/share/url?url=${enc}&text=${encTitle}`, icon: Send },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc}`, icon: Linkedin },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${enc}&text=${encTitle}`, icon: XIcon },
  ];

  function openShare(href: string, label: string) {
    // A plain <a target="_blank"> can be silently swallowed by some in-app
    // browsers (e.g. embedded webviews). Opening explicitly with window.open
    // and falling back to a manual navigation if popups are blocked is more
    // reliable, and lets us tell the person if it genuinely failed.
    const win = window.open(href, "_blank", "noopener,noreferrer,width=600,height=520");
    if (!win) {
      toast.error(`Couldn't open ${label} — your browser may be blocking pop-ups.`);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Share:</span>
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

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function NewsDetailPage() {
  const { post } = Route.useLoaderData() as { post: NewsItem | null };
  const { slug } = Route.useParams();
  const url = `${SITE_URL}/news/${slug}`;

  if (!post) {
    return (
      <SiteLayout>
        <section className="section-pad">
          <div className="container-page text-center">
            <h1 className="text-2xl font-bold text-foreground">Article not found</h1>
            <p className="mt-3 text-muted-foreground">This article doesn't exist or was removed.</p>
            <Link to="/news" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              ← Back to news
            </Link>
          </div>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <article className="section-pad">
        <div className="container-page mx-auto max-w-3xl">
          <Link to="/news" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to news
          </Link>

          <time className="text-xs uppercase tracking-wide text-muted-foreground">
            {post.published_at ? new Date(post.published_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : ""}
          </time>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{post.title}</h1>

          {post.image_url && (
            <div className="mt-6 aspect-[16/9] overflow-hidden rounded-xl border border-border bg-white">
              <img src={post.image_url} alt={post.title} className="h-full w-full object-contain p-2" />
            </div>
          )}

          {post.excerpt && <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{post.excerpt}</p>}
          {post.body && (
            <div className="mt-4 whitespace-pre-wrap leading-relaxed text-foreground/90">{post.body}</div>
          )}

          <div className="mt-10 border-t border-border pt-6">
            <ShareBar url={url} title={post.title} />
          </div>
        </div>
      </article>
    </SiteLayout>
  );
}
