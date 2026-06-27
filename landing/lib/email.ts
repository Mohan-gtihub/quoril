import { Resend } from "resend";

/**
 * Transactional email — backed by Resend.
 *
 * Sends the waitlist confirmation from the verified quoril.in domain.
 * Failures are swallowed by the caller so a flaky email provider never
 * blocks a signup from being recorded.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Verified sender on the quoril.in domain in Resend.
const FROM = process.env.WAITLIST_FROM_EMAIL ?? "Quoril <hello@quoril.in>";

// Canonical origin — keep in sync with lib/site-config.ts (SITE_URL).
const SITE_URL = "https://quoril.in";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!RESEND_API_KEY) {
    throw new Error(
      "Resend is not configured. Set RESEND_API_KEY in the landing environment.",
    );
  }
  if (!_resend) _resend = new Resend(RESEND_API_KEY);
  return _resend;
}

export function isEmailConfigured(): boolean {
  return Boolean(RESEND_API_KEY);
}

export async function sendWaitlistConfirmation(to: string): Promise<void> {
  const { error } = await getResend().emails.send({
    from: FROM,
    to: [to],
    subject: "You're on the Quoril waitlist 🎉",
    html: confirmationHtml(),
    text: confirmationText(),
  });
  if (error) throw error;
}

/**
 * Confirmation email — mirrors the marketing "Daylight" system:
 * warm paper page, white elevated card, hairline borders, near-black
 * ink, generous whitespace, no chromatic brand accent.
 *
 * Built table-first with fully inline styles so it renders consistently
 * across Gmail / Apple Mail / Outlook and reflows cleanly on mobile.
 */
function confirmationHtml(): string {
  // Daylight palette (from tailwind.config.ts).
  const paper = "#FBFBFA";
  const surface = "#FFFFFF";
  const sunken = "#F4F4F2";
  const line = "#EBEAE6";
  const ink = "#16160F";
  const inkMuted = "#6B6A63";
  const inkFaint = "#9C9B92";
  const sans =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>You're on the Quoril waitlist</title>
<style>
  body{margin:0;padding:0;background:${paper};}
  table{border-collapse:collapse;}
  img{border:0;line-height:100%;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
  a{color:${ink};}
  @media only screen and (max-width:600px){
    .container{width:100% !important;}
    .px{padding-left:24px !important;padding-right:24px !important;}
    .py{padding-top:32px !important;padding-bottom:32px !important;}
    .h1{font-size:26px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${paper};font-family:${sans};">
  <!-- preheader (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
    You're on the list — one launch email, early-access pricing, and a say in the roadmap.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${paper};">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:560px;">

          <!-- Wordmark -->
          <tr>
            <td align="center" style="padding:0 0 24px;">
              <img src="${SITE_URL}/logo.png" alt="Quoril" width="120" style="display:block;width:120px;height:auto;" />
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td class="px py" style="background:${surface};border:1px solid ${line};border-radius:18px;padding:48px 44px;box-shadow:0 1px 2px rgba(22,22,15,0.04);">

              <!-- Pill -->
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:${sunken};border:1px solid ${line};border-radius:999px;padding:6px 14px;font-size:12px;font-weight:600;letter-spacing:0.02em;color:${inkMuted};">
                    Early access
                  </td>
                </tr>
              </table>

              <h1 class="h1" style="margin:22px 0 0;font-size:32px;line-height:1.08;letter-spacing:-0.03em;font-weight:600;color:${ink};">
                You're on the list.
              </h1>

              <p style="margin:18px 0 0;font-size:16px;line-height:1.65;color:${inkMuted};">
                Thanks for joining the Quoril waitlist. You're now first in line to
                turn your desktop into a focus machine.
              </p>

              <!-- What you get -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                ${benefitRow(ink, inkMuted, line, "One launch email", "We'll reach out the moment your invite is ready — no spam in between.")}
                ${benefitRow(ink, inkMuted, line, "Early-access pricing", "Lock in founder pricing when we go live.")}
                ${benefitRow(ink, inkMuted, line, "A say in the roadmap", "Your feedback shapes what we build next.", true)}
              </table>

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:32px;">
                <tr>
                  <td style="border-radius:999px;background:${ink};">
                    <a href="${SITE_URL}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#FBFBFA;text-decoration:none;border-radius:999px;">
                      Explore Quoril →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 12px 0;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:${inkFaint};">
                You're receiving this because you joined the waitlist at
                <a href="${SITE_URL}" style="color:${inkMuted};text-decoration:underline;">quoril.in</a>.
              </p>
              <p style="margin:10px 0 0;font-size:13px;color:${inkFaint};">
                — The Quoril team
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

function benefitRow(
  ink: string,
  inkMuted: string,
  line: string,
  title: string,
  body: string,
  last = false,
): string {
  return `<tr>
    <td style="padding:16px 0;${last ? "" : `border-bottom:1px solid ${line};`}">
      <p style="margin:0;font-size:15px;font-weight:600;color:${ink};">${title}</p>
      <p style="margin:5px 0 0;font-size:14px;line-height:1.55;color:${inkMuted};">${body}</p>
    </td>
  </tr>`;
}

function confirmationText(): string {
  return [
    "You're on the list.",
    "",
    "Thanks for joining the Quoril waitlist. You're now first in line to turn your desktop into a focus machine.",
    "",
    "What you get:",
    "• One launch email — we'll reach out the moment your invite is ready, no spam in between.",
    "• Early-access pricing — lock in founder pricing when we go live.",
    "• A say in the roadmap — your feedback shapes what we build next.",
    "",
    `Explore Quoril: ${SITE_URL}`,
    "",
    "— The Quoril team",
  ].join("\n");
}
