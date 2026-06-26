import type { Metadata } from "next";
import { Inter, Poppins, Indie_Flower } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

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
  metadataBase: new URL("https://quoril.app"),
  title: "Quoril — The productivity OS for deep work",
  description:
    "Quoril unifies tasks, focus tracking, app analytics, and digital wellbeing into one offline-first desktop command center. Join the waitlist.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.ico",
    apple: "/icon.png",
  },
  keywords: [
    "productivity",
    "focus timer",
    "kanban",
    "deep work",
    "time tracking",
    "screen time",
    "pomodoro",
  ],
  openGraph: {
    title: "Quoril — The productivity OS for deep work",
    description:
      "Tasks, focus, analytics & digital wellbeing in one native desktop app. Join the waitlist.",
    type: "website",
    siteName: "Quoril",
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
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable} ${indie.variable}`}
    >
      <body className="font-sans antialiased">
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
