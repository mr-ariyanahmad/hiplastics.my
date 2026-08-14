import { RouteError } from "@/components/RouteError";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { usePublicData } from "@/hooks/usePublicData";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "News & Blog — Hiplastics Malaysia" },
      { name: "description", content: "Latest news, product launches and articles from Hiplastics Malaysia." },
      { property: "og:title", content: "News & Blog — Hiplastics Malaysia" },
      { property: "og:description", content: "Updates from Hiplastics Malaysia." },
      { property: "og:url", content: "https://hiplastics.my/news" },
    ],
    links: [{ rel: "canonical", href: "https://hiplastics.my/news" }],
  }),
  errorComponent: ({ error }) => <RouteError error={error as Error} />,
  component: NewsPage,
});

function NewsPage() {
  const { news } = usePublicData();

  return (
    <SiteLayout>
      <section className="bg-hero">
        <div className="container-page py-14 lg:py-20">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Updates</span>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">News & Blog</h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
            Product launches, factory updates and articles from the Hiplastics team.
          </p>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-page">
          {news.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              No articles published yet. Check back soon.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {news.map((n) => (
                <article key={n.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-soft transition-shadow hover:shadow-elevated">
                  <Link to="/news/$slug" params={{ slug: n.slug }} className="block">
                    {n.image_url && (
                      <div className="aspect-[16/9] overflow-hidden bg-white">
                        <img src={n.image_url} alt={n.title} loading="lazy" className="h-full w-full object-contain p-2" />
                      </div>
                    )}
                    <div className="p-5">
                      <time className="text-xs uppercase tracking-wide text-muted-foreground">
                        {n.published_at ? new Date(n.published_at).toLocaleDateString() : ""}
                      </time>
                      <h2 className="mt-1 text-lg font-semibold text-foreground hover:text-primary">{n.title}</h2>
                      {n.excerpt && <p className="mt-2 text-sm text-muted-foreground">{n.excerpt}</p>}
                      <span className="mt-3 inline-block text-sm font-semibold text-primary">Read more →</span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
