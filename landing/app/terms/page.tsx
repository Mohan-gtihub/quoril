import LegalLayout, {
  P,
  UL,
  Mail,
  type LegalSection,
} from "@/components/LegalLayout";

export const metadata = {
  title: "Terms of Service — Quoril",
  description:
    "The terms that govern your use of Quoril — your account, acceptable use, AI features, intellectual property, disclaimers and liability.",
};

const UPDATED = "27 June 2026";

const sections: LegalSection[] = [
  {
    id: "agreement",
    heading: "Agreement to these terms",
    body: (
      <>
        <P>
          These Terms of Service (&ldquo;Terms&rdquo;) are a binding agreement
          between you and Quoril, operated by Erik Vale
          (&ldquo;Quoril&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), governing
          your access to and use of the Quoril desktop app, web app, this website
          and related services (the &ldquo;Service&rdquo;).
        </P>
        <P>
          By creating an account, joining the waitlist, or using the Service,
          you agree to these Terms and to our{" "}
          <a
            href="/privacy"
            className="font-medium text-ink underline-offset-2 hover:underline"
          >
            Privacy Policy
          </a>
          . If you do not agree, do not use the Service.
        </P>
      </>
    ),
  },
  {
    id: "eligibility",
    heading: "Eligibility & accounts",
    body: (
      <>
        <P>
          You must be at least 16 years old (or the age of digital consent in
          your country) to use Quoril. When you create an account you agree to:
        </P>
        <UL
          items={[
            "Provide accurate information and keep it up to date.",
            "Keep your login credentials confidential and secure.",
            "Be responsible for all activity that occurs under your account.",
            "Notify us promptly at hello@quoril.in of any unauthorised use.",
          ]}
        />
      </>
    ),
  },
  {
    id: "acceptable-use",
    heading: "Acceptable use",
    body: (
      <>
        <P>You agree not to, and not to permit anyone else to:</P>
        <UL
          items={[
            "Use the Service for any unlawful, harmful, fraudulent or abusive purpose.",
            "Upload or transmit malware, or attempt to breach, probe or disrupt the Service or its security.",
            "Reverse engineer, decompile or attempt to extract source code, except where permitted by law.",
            "Access another user's account or data without authorisation, or circumvent Row-Level Security or usage limits.",
            "Resell, sublicense or commercially exploit the Service without our written permission.",
            "Use automated means to overload, scrape or abuse the Service.",
          ]}
        />
        <P>
          We may suspend or terminate accounts that violate these Terms or that
          create risk or legal exposure for us or other users.
        </P>
      </>
    ),
  },
  {
    id: "your-content",
    heading: "Your content & ownership",
    body: (
      <>
        <P>
          You own the content you create in Quoril (your tasks, notes, canvases
          and other data). We do not claim ownership of it. You grant us a
          limited licence to host, store, process and transmit your content
          solely to operate and provide the Service to you (for example, to sync
          it across your devices).
        </P>
        <P>
          You are responsible for your content and for having the rights to use
          it. You can export or delete your content as described in our{" "}
          <a
            href="/privacy"
            className="font-medium text-ink underline-offset-2 hover:underline"
          >
            Privacy Policy
          </a>
          .
        </P>
      </>
    ),
  },
  {
    id: "ai",
    heading: "AI-assisted features",
    body: (
      <>
        <P>
          Quoril may offer AI-assisted features. When you use them, content you
          submit may be processed by third-party AI providers to generate a
          response. You acknowledge that:
        </P>
        <UL
          items={[
            "AI output may be inaccurate, incomplete or unsuitable, and is provided on an \"as is\" basis.",
            "You are responsible for reviewing AI output before relying on it, and must not treat it as professional advice.",
            "You will not submit content to AI features that you are not permitted to share with a third-party processor.",
          ]}
        />
      </>
    ),
  },
  {
    id: "ip",
    heading: "Our intellectual property",
    body: (
      <P>
        The Service, including its software, design, branding, logos and content
        (excluding your content), is owned by Quoril and protected by
        intellectual-property laws. We grant you a limited, non-exclusive,
        non-transferable, revocable licence to use the Service for your personal
        or internal business use, subject to these Terms. All rights not
        expressly granted are reserved.
      </P>
    ),
  },
  {
    id: "fees",
    heading: "Plans, fees & changes",
    body: (
      <P>
        Some features may be offered for free and others as paid plans. Where
        fees apply, the price, billing cycle and any refund terms will be
        presented to you before you purchase. We may change features, plans or
        pricing over time; we will give reasonable notice of material changes
        that affect a paid plan you hold.
      </P>
    ),
  },
  {
    id: "availability",
    heading: "Availability & changes to the Service",
    body: (
      <P>
        We work to keep Quoril available and reliable, but the Service is
        provided without any guarantee of uninterrupted or error-free
        operation. We may modify, suspend or discontinue features at any time.
        Because Quoril is offline-first, your local data remains on your device
        even if cloud sync is temporarily unavailable.
      </P>
    ),
  },
  {
    id: "disclaimer",
    heading: "Disclaimers",
    body: (
      <P>
        THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS
        AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR
        IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
        PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE
        SERVICE WILL BE UNINTERRUPTED, SECURE OR ERROR-FREE, OR THAT DATA WILL
        NOT BE LOST. YOU ARE RESPONSIBLE FOR MAINTAINING YOUR OWN BACKUPS WHERE
        IMPORTANT.
      </P>
    ),
  },
  {
    id: "liability",
    heading: "Limitation of liability",
    body: (
      <P>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, QUORIL AND ITS OPERATORS WILL NOT
        BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR
        PUNITIVE DAMAGES, OR FOR ANY LOSS OF DATA, PROFITS OR GOODWILL, ARISING
        FROM OR RELATED TO YOUR USE OF THE SERVICE. OUR TOTAL AGGREGATE LIABILITY
        FOR ANY CLAIM RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER OF THE
        AMOUNT YOU PAID US IN THE 12 MONTHS BEFORE THE CLAIM, OR USD 50. SOME
        JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS, SO SOME OF THE ABOVE MAY
        NOT APPLY TO YOU.
      </P>
    ),
  },
  {
    id: "indemnity",
    heading: "Indemnity",
    body: (
      <P>
        You agree to indemnify and hold harmless Quoril and its operators from
        any claims, damages, losses and expenses (including reasonable legal
        fees) arising out of your content, your use of the Service, or your
        breach of these Terms or of any law or third-party right.
      </P>
    ),
  },
  {
    id: "termination",
    heading: "Termination",
    body: (
      <P>
        You may stop using Quoril and delete your account at any time. We may
        suspend or terminate your access if you breach these Terms or to protect
        the Service or other users. On termination, your right to use the Service
        ends; you may export or delete your data as described in our Privacy
        Policy. Sections that by their nature should survive (e.g. ownership,
        disclaimers, liability, indemnity) will survive termination.
      </P>
    ),
  },
  {
    id: "governing-law",
    heading: "Governing law & disputes",
    body: (
      <P className="text-ink-faint">
        {/* TODO: set your governing law / jurisdiction before launch. */}
        <em>
          These Terms are governed by the laws of{" "}
          <strong>[ADD GOVERNING JURISDICTION, e.g. India]</strong>, and the
          courts of <strong>[ADD CITY/STATE]</strong> will have exclusive
          jurisdiction over any dispute, without regard to conflict-of-laws
          rules.
        </em>
      </P>
    ),
  },
  {
    id: "changes",
    heading: "Changes to these terms",
    body: (
      <P>
        We may update these Terms from time to time. We will revise the
        &ldquo;Last updated&rdquo; date above and, for material changes, provide
        additional notice. Continued use of the Service after changes take effect
        means you accept the revised Terms.
      </P>
    ),
  },
  {
    id: "contact",
    heading: "Contact",
    body: (
      <P>
        Questions about these Terms? Email <Mail />.
      </P>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Terms of Service"
      updated={UPDATED}
      intro={
        <>
          These terms set out the rules for using Quoril — your responsibilities,
          our commitments, and the legal bits that protect both sides. Please
          read them; by using Quoril you agree to them.
        </>
      }
      sections={sections}
    />
  );
}
