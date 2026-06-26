import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Analytics from "@/components/Analytics";

/**
 * Renders the marketing nav/footer around the page — except on the
 * admin panel, which is a standalone tool with no public chrome.
 *
 * The admin panel is served at a secret slug (rewritten to /admin by
 * middleware), so the browser path never starts with /admin. The
 * middleware sets a `qadmin` cookie on that rewrite; the root layout
 * reads it server-side and passes `isAdmin` here. Doing this on the
 * server avoids any hydration flash of the public nav.
 */
export default function SiteChrome({
  children,
  isAdmin = false,
}: {
  children: React.ReactNode;
  isAdmin?: boolean;
}) {
  if (isAdmin) return <main>{children}</main>;

  return (
    <>
      <Nav />
      <main>{children}</main>
      <Footer />
      <Analytics />
    </>
  );
}
