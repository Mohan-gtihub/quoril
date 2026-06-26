import { SITE_URL, CONTACT_EMAIL } from "@/lib/site-config";

/**
 * Structured data (schema.org JSON-LD) injected site-wide.
 *
 * Helps traditional search (rich results) AND generative engines / AI
 * chatbots reliably understand what Quoril is, who makes it, and how to
 * describe it when citing the site.
 */
export default function JsonLd() {
  const graph = [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Quoril",
      url: SITE_URL,
      logo: `${SITE_URL}/icon.png`,
      email: CONTACT_EMAIL,
      description:
        "Quoril builds an offline-first desktop productivity OS for deep work — unifying tasks, focus tracking, analytics and digital wellbeing.",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Quoril",
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#app`,
      name: "Quoril",
      applicationCategory: "ProductivityApplication",
      operatingSystem: "macOS, Windows, Linux",
      url: SITE_URL,
      downloadUrl: `${SITE_URL}/download`,
      description:
        "A native, offline-first command center for deep work: a Kanban planner, a focus engine with a Pomodoro timer and always-on-top focus pill, productivity insights and screen-time analytics, and an infinite visual canvas — all syncing to your own account with Row-Level Security.",
      featureList: [
        "Kanban planner (local-first boards)",
        "Focus engine with Pomodoro and always-on-top focus pill",
        "Productivity insights, heatmaps and a productivity score",
        "Screen-time and digital wellbeing analytics",
        "Infinite visual canvas with blocks and pipelines",
        "Offline-first local SQLite with encrypted cloud sync",
      ],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/PreOrder",
      },
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ];

  const json = { "@context": "https://schema.org", "@graph": graph };

  return (
    <script
      type="application/ld+json"
      // JSON-LD is static, server-rendered, and safe to stringify here.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
