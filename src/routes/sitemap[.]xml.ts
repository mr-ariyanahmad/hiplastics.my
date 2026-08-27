import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { fetchAllPublicData } from "@/lib/cms.functions";

const BASE_URL = "https://hiplastics.my";

interface SitemapEntry {
  path: string;
  changefreq?: "weekly" | "monthly" | "yearly";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/products", changefreq: "weekly", priority: "0.9" },
          { path: "/industries", changefreq: "monthly", priority: "0.7" },
          { path: "/about", changefreq: "monthly", priority: "0.6" },
          { path: "/news", changefreq: "weekly", priority: "0.6" },
          { path: "/contact", changefreq: "monthly", priority: "0.7" },
          { path: "/refund-policy", changefreq: "yearly", priority: "0.3" },
          { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
          { path: "/terms-of-service", changefreq: "yearly", priority: "0.3" },
          { path: "/track", changefreq: "yearly", priority: "0.3" },
        ];

        try {
          const data = await fetchAllPublicData();
          for (const p of data.products ?? []) {
            if (p.is_active === false) continue;
            entries.push({ path: `/products/${p.slug}`, changefreq: "weekly", priority: "0.8" });
          }
          for (const n of data.news ?? []) {
            if (n.is_active === false) continue;
            entries.push({ path: `/news/${n.slug}`, changefreq: "monthly", priority: "0.5" });
          }
        } catch {
          // If the DB is briefly unreachable, still serve the static pages above
          // rather than failing the whole sitemap.
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ].filter(Boolean).join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
