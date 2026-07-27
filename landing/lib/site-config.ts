/**
 * Launch-time site toggles. Flip these without touching component code.
 *
 * - `announcement` drives the top AnnouncementBar (launch + early-access).
 * - `analyticsEnabled` drives the CookieConsent banner: it stays dormant
 *   (renders nothing) until you actually load analytics/tracking, at which
 *   point set this to `true` and the consent banner appears as legally needed.
 */

/** Canonical production origin — single source of truth for all SEO URLs. */
export const SITE_URL = "https://quoril.in";

/** Public contact address surfaced in metadata / structured data. */
export const CONTACT_EMAIL = "hello@quoril.in";

export const siteConfig = {
  /** Top announcement / early-access bar. Set `enabled: false` to hide it. */
  announcement: {
    enabled: true,
    /** Short label shown as a pill on the left. */
    tag: "V1 free",
    /** Main message. Keep it tight — this is a single-line bar. */
    message: "Join from this site and get Quoril V1 free at launch.",
    /** Call-to-action link. */
    cta: { label: "Get V1 free", href: "/waitlist" },
    /**
     * Bump this when you change the copy and want previously-dismissed
     * visitors to see the bar again (the dismissal is keyed on it).
     */
    version: "2026-07-free-v1",
  },

  /**
   * Set to `true` ONLY once you load analytics/non-essential cookies.
   * While `false`, the cookie-consent banner never renders (you don't need
   * consent for a site that sets no non-essential cookies).
   */
  analyticsEnabled: false,
} as const;
