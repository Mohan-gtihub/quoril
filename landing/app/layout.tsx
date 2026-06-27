import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, Poppins, Indie_Flower } from "next/font/google";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import AnnouncementBar from "@/components/AnnouncementBar";
import CookieConsent from "@/components/CookieConsent";
import JsonLd from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site-config";

// Type system mirrors donethat.ai: Inter for body/UI (variable 100–900),
// Poppins for headings (400 / 600), Indie Flower for handwritten accents.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const indie = Indie_Flower({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-handwriting",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Quoril — The productivity OS for deep work",
    template: "%s — Quoril",
  },
  description:
    "Quoril unifies tasks, focus tracking, app analytics, and digital wellbeing into one offline-first desktop command center. Join the waitlist.",
  applicationName: "Quoril",
  alternates: { canonical: "/" },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.ico",
    apple: "/icon.png",
  },
  keywords: [
    "productivity",
    "productivity app",
    "focus timer",
    "kanban",
    "deep work",
    "time tracking",
    "screen time",
    "pomodoro",
    "digital wellbeing",
    "offline-first",
    "desktop productivity app",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "Quoril — The productivity OS for deep work",
    description:
      "Tasks, focus, analytics & digital wellbeing in one native desktop app. Join the waitlist.",
    url: SITE_URL,
    type: "website",
    siteName: "Quoril",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quoril — The productivity OS for deep work",
    description:
      "Tasks, focus, analytics & digital wellbeing in one native desktop app.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Admin panel is served at a secret slug rewritten to /admin; the
  // middleware marks it with the `qadmin` cookie so we can strip the
  // public chrome here on the server (no hydration flash).
  const isAdmin = cookies().get("qadmin")?.value === "1";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${poppins.variable} ${indie.variable}`}
    >
      <head>
        {/* No-flash theme init: apply the saved theme before first paint.
            Light is the default; dark only when the user explicitly chose it. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('quoril-theme');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        {!isAdmin && <JsonLd />}
        {!isAdmin && <AnnouncementBar />}
        <SiteChrome isAdmin={isAdmin}>{children}</SiteChrome>
        {!isAdmin && <CookieConsent />}
      </body>
    </html>
  );
}
