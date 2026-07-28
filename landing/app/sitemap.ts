import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";

/**
 * sitemap.xml — generated at build time.
 * Priorities reflect launch intent: home + waitlist + download lead.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/waitlist", priority: 0.9, changeFrequency: "weekly" },
    { path: "/download", priority: 0.9, changeFrequency: "weekly" },
    { path: "/features", priority: 0.8, changeFrequency: "monthly" },
    { path: "/features/planner", priority: 0.7, changeFrequency: "monthly" },
    { path: "/features/focus", priority: 0.7, changeFrequency: "monthly" },
    { path: "/insights", priority: 0.7, changeFrequency: "monthly" },
    { path: "/canvas", priority: 0.7, changeFrequency: "monthly" },
    { path: "/security", priority: 0.6, changeFrequency: "monthly" },
    { path: "/about", priority: 0.6, changeFrequency: "monthly" },
    { path: "/changelog", priority: 0.5, changeFrequency: "weekly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/account/delete", priority: 0.3, changeFrequency: "yearly" },
  ];

  return routes.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
