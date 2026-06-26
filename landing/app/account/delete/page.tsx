import LegalLayout, {
  P,
  UL,
  Mail,
  type LegalSection,
} from "@/components/LegalLayout";

export const metadata = {
  title: "Data & Account Deletion — Quoril",
  description:
    "How to delete your Quoril account and erase your data — from within the app or by request. Your right to erasure, made simple.",
};

const UPDATED = "27 June 2026";

const sections: LegalSection[] = [
  {
    id: "in-app",
    heading: "Delete from within the app",
    body: (
      <>
        <P>
          The fastest way to remove your account and data is from inside Quoril:
        </P>
        <UL
          items={[
            "Open Quoril and go to Settings → Account.",
            "Choose “Delete account”.",
            "Confirm. This removes your account and your synced data from our systems.",
          ]}
        />
        <P className="text-ink-faint">
          {/* TODO: confirm the exact in-app path matches the shipped Settings UI. */}
          <em>
            Note: confirm the menu path above matches your current build before
            publishing.
          </em>
        </P>
      </>
    ),
  },
  {
    id: "by-request",
    heading: "Request deletion by email",
    body: (
      <>
        <P>
          You can also ask us to delete your account and data. Email <Mail />{" "}
          from the address associated with your account with the subject
          &ldquo;Delete my account&rdquo;. We may ask you to verify your identity
          before acting on the request.
        </P>
        <P>
          We will action verified requests within the timeframe required by
          applicable law (typically within 30 days).
        </P>
      </>
    ),
  },
  {
    id: "what-happens",
    heading: "What gets deleted",
    body: (
      <>
        <UL
          items={[
            "Your account and authentication record.",
            "Your synced content — tasks, lists, notes, canvases and focus sessions.",
            "Associated usage and session data we hold.",
          ]}
        />
        <P>
          Deletes are first applied as recoverable &ldquo;soft&rdquo; deletes,
          then permanently removed. Some records may be retained for a limited
          period only where required by law (for example, billing records). Data
          stored locally on your own device is removed when you uninstall the app
          or clear its local database.
        </P>
      </>
    ),
  },
  {
    id: "export",
    heading: "Export your data first",
    body: (
      <P>
        Deletion is permanent. If you want a copy of your data before deleting,
        export it from within the app, or request an export by emailing <Mail />.
        See our{" "}
        <a
          href="/privacy"
          className="font-medium text-ink underline-offset-2 hover:underline"
        >
          Privacy Policy
        </a>{" "}
        for the full list of rights over your data.
      </P>
    ),
  },
];

export default function DeleteAccountPage() {
  return (
    <LegalLayout
      eyebrow="Your data"
      title="Data & Account Deletion"
      updated={UPDATED}
      intro={
        <>
          You&rsquo;re always in control of your data. Here&rsquo;s exactly how to
          delete your Quoril account and erase what we hold — in the app, or by
          asking us.
        </>
      }
      sections={sections}
    />
  );
}
