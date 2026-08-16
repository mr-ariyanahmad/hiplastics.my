import { RouteError } from "@/components/RouteError";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { ShareBar } from "@/components/ShareBar";
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
