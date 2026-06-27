import LegalLayout, {
  P,
  UL,
  H3,
  Mail,
  type LegalSection,
} from "@/components/LegalLayout";

export const metadata = {
  title: "Privacy Policy — Quoril",
  description:
    "How Quoril collects, uses, stores and protects your data. Offline-first by design — your productivity data lives on your device and syncs only to your own account.",
};

const UPDATED = "27 June 2026";

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    heading: "Who we are",
    body: (
      <>
        <P>
          Quoril (&ldquo;Quoril&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;,
          &ldquo;our&rdquo;) is a desktop and web productivity application for
          tasks, focus tracking, planning and digital wellbeing, operated by
          Erik Vale. This Privacy Policy explains what data we collect, why,
          how we protect it, and the choices and rights you have.
        </P>
        <P>
          For the purposes of data-protection law (including the EU/UK GDPR), we
          are the data controller for the personal data described below. If you
          have any questions, contact us at <Mail />.
        </P>
        <P className="text-ink-faint">
          {/* TODO: replace with your registered legal entity / sole-proprietor
              name and business address before launch. */}
          <em>
            Operating entity and registered address:{" "}
            <strong>[ADD LEGAL ENTITY NAME &amp; POSTAL ADDRESS]</strong>.
          </em>
        </P>
      </>
    ),
  },
  {
    id: "what-we-collect",
    heading: "Data we collect",
    body: (
      <>
        <H3>Waitlist &amp; marketing site</H3>
        <P>
          When you join the waitlist on this site, we collect the information
          you submit and a small amount of technical context:
        </P>
        <UL
          items={[
            "Your email address.",
            "Optional: your role and the platform you're interested in.",
            "The referring URL and the time you signed up.",
          ]}
        />
        <P>
          We use this solely to notify you about availability, send product
          updates you asked for, and understand demand. We do not sell this
          information.
        </P>

        <H3>Quoril account &amp; app</H3>
        <P>When you create an account and use the app, we process:</P>
        <UL
          items={[
            "Account data — your email address and authentication credentials (passwords are hashed by our authentication provider; we never see them in plain text), or your Google account identifier if you sign in with Google.",
            "Your content — tasks, lists, notes, canvas/workspace data, focus sessions and related productivity data you create.",
            "Usage & wellbeing data — focus-session timing and, where you enable it, screen-time and activity metrics used to power your insights.",
            "Technical & security data — a device/browser fingerprint, session metadata, timestamps and limited logs used to keep your account secure (e.g. rate limiting, session validity, crash recovery).",
          ]}
        />
        <P>
          Quoril is offline-first: your content is written to a local database
          on your own device first, and only synced to your account in the cloud
          so you can access it across devices.
        </P>

        <H3>Cookies &amp; analytics</H3>
        <P>
          This marketing site uses only the cookies and local storage strictly
          necessary to remember preferences such as your theme. We do not use
          advertising cookies or sell data to advertisers. If we introduce
          optional analytics in the future, we will request consent where
          required and update this policy.
        </P>
      </>
    ),
  },
  {
    id: "how-we-use",
    heading: "How we use your data",
    body: (
      <>
        <P>We use the data above to:</P>
        <UL
          items={[
            "Provide, sync and maintain the Quoril service and your account.",
            "Authenticate you and keep your account and data secure.",
            "Generate your personal productivity insights and reports.",
            "Respond to support requests and important service notices.",
            "Send product updates and waitlist communications you have opted into.",
            "Comply with legal obligations and enforce our Terms of Service.",
          ]}
        />
        <P>
          Our legal bases are: performance of our contract with you (providing
          the service), your consent (marketing emails and optional features),
          our legitimate interests (security, abuse prevention, product
          improvement), and legal compliance.
        </P>
      </>
    ),
  },
  {
    id: "ai-features",
    heading: "AI-assisted features",
    body: (
      <>
        <P>
          Where Quoril offers AI-assisted features, the specific content you
          submit to those features (for example text you ask the assistant to
          act on) may be sent to a third-party AI provider to generate a
          response. We send only the content needed to fulfil your request, and
          only when you actively use such a feature.
        </P>
        <UL
          items={[
            "AI output can be inaccurate or incomplete — do not rely on it as professional, legal, medical or financial advice.",
            "Do not submit information to AI features that you are not comfortable sharing with a third-party processor.",
            "Our AI processing providers are listed under \"Sub-processors\" below.",
          ]}
        />
      </>
    ),
  },
  {
    id: "sharing",
    heading: "Sharing & sub-processors",
    body: (
      <>
        <P>
          We do not sell your personal data. We share it only with service
          providers (&ldquo;sub-processors&rdquo;) who help us run Quoril, under
          contracts that require them to protect it:
        </P>
        <UL
          items={[
            "Supabase — authentication, database and cloud sync (stores your account and synced content).",
            "Vercel — hosting and delivery of this website and related services.",
            "Google — sign-in (OAuth) when you choose Google as your login method.",
            "AI providers (e.g. NVIDIA, Groq) — process content you submit to AI-assisted features, where offered.",
          ]}
        />
        <P>
          We may also disclose data if required by law, to protect our rights or
          users&rsquo; safety, or in connection with a merger or acquisition (in
          which case we will notify you).
        </P>
      </>
    ),
  },
  {
    id: "storage-transfers",
    heading: "Storage, retention & international transfers",
    body: (
      <>
        <P>
          Your content lives locally on your device and, when synced, in
          infrastructure operated by our sub-processors. We keep your data for
          as long as your account is active and as needed to provide the
          service. Deletes in the app are &ldquo;soft&rdquo; (recoverable for a
          period) before being permanently removed.
        </P>
        <P>
          Our providers may process data in regions outside your own. Where
          personal data is transferred internationally, we rely on appropriate
          safeguards such as our providers&rsquo; standard contractual clauses.
        </P>
      </>
    ),
  },
  {
    id: "security",
    heading: "How we protect your data",
    body: (
      <>
        <P>
          Security is built into Quoril&rsquo;s design. Measures include
          authenticated, encrypted sync; Row-Level Security so a record is only
          readable by the account that owns it; hashed credentials; session
          rate-limiting, inactivity timeouts and capped session lengths. See our{" "}
          <a
            href="/security"
            className="font-medium text-ink underline-offset-2 hover:underline"
          >
            Security &amp; Privacy
          </a>{" "}
          overview for detail. No system is perfectly secure, but we work hard to
          protect your information and will notify you of any breach as required
          by law.
        </P>
      </>
    ),
  },
  {
    id: "your-rights",
    heading: "Your rights & choices",
    body: (
      <>
        <P>
          Depending on where you live, you have rights over your personal data,
          including to:
        </P>
        <UL
          items={[
            "Access a copy of the data we hold about you.",
            "Correct inaccurate data.",
            "Delete your data and account (the right to erasure).",
            "Export your data in a portable format.",
            "Object to or restrict certain processing, and withdraw consent at any time.",
            "Unsubscribe from marketing emails using the link in any such email.",
          ]}
        />
        <P>
          You can delete your account and associated data from within the app,
          or by emailing <Mail /> — see our{" "}
          <a
            href="/account/delete"
            className="font-medium text-ink underline-offset-2 hover:underline"
          >
            data &amp; account deletion
          </a>{" "}
          page. To exercise any other right, contact <Mail /> and we will respond
          within the timeframe required by applicable law.
        </P>
      </>
    ),
  },
  {
    id: "children",
    heading: "Children",
    body: (
      <P>
        Quoril is not directed to children under 16, and we do not knowingly
        collect their personal data. If you believe a child has provided us
        data, contact <Mail /> and we will delete it.
      </P>
    ),
  },
  {
    id: "changes",
    heading: "Changes to this policy",
    body: (
      <P>
        We may update this Privacy Policy as the product evolves. We will revise
        the &ldquo;Last updated&rdquo; date above and, for material changes,
        provide additional notice. Continued use of Quoril after an update means
        you accept the revised policy.
      </P>
    ),
  },
  {
    id: "contact",
    heading: "Contact us",
    body: (
      <P>
        For privacy questions or to exercise your rights, email <Mail />. We aim
        to respond promptly and within any period required by law.
      </P>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Privacy Policy"
      updated={UPDATED}
      intro={
        <>
          Your trust matters. This policy explains what we collect and why — in
          plain language. The short version: Quoril is offline-first, your
          productivity data stays on your device and syncs only to your own
          account, and we never sell your data.
        </>
      }
      sections={sections}
    />
  );
}
