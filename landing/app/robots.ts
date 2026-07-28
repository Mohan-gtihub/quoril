import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";

/**
 * robots.txt — generated at build time.
 *
 * We explicitly welcome AI / answer-engine crawlers (ChatGPT, Claude,
 * Perplexity, Gemini, etc.) so Quoril can be cited in generative answers
 * (GEO). Admin and API paths are disallowed for everyone.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = ["/admin", "/api/"];

  // Answer-engine / LLM crawlers we want to allow for GEO + citation.
  const aiBots = [
    "GPTBot", // OpenAI training
    "OAI-SearchBot", // ChatGPT search
    "ChatGPT-User", // ChatGPT browsing on user request
    "ClaudeBot", // Anthropic crawler
    "anthropic-ai",
    "Claude-Web",
    "PerplexityBot",
    "Perplexity-User",
    "Google-Extended", // Gemini / Vertex grounding
    "Applebot-Extended",
    "CCBot", // Common Crawl (feeds many LLMs)
    "Bytespider",
    "Amazonbot",
    "Meta-ExternalAgent",
  ];

  return {
    rules: [
      // General search engines.
      { userAgent: "*", allow: "/", disallow },
      // AI answer engines — same access, called out explicitly so a future
      // tightening of "*" never accidentally blocks citation crawlers.
      ...aiBots.map((userAgent) => ({ userAgent, allow: "/", disallow })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
