import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const json = (value: unknown, status = 200) => new Response(
  JSON.stringify(value),
  { status, headers: { "content-type": "application/json; charset=utf-8" } },
);

export const serviceClient = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export async function authenticatedUser(req: Request) {
  const authorization = req.headers.get("authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await serviceClient().auth.getUser(token);
  return error ? null : data.user;
}

const encoder = new TextEncoder();

export async function verifySlackRequest(req: Request, rawBody: string) {
  const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";
  const supplied = req.headers.get("x-slack-signature") ?? "";
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(Deno.env.get("SLACK_SIGNING_SECRET") ?? ""),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`v0:${timestamp}:${rawBody}`),
  );
  const expected = `v0=${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  return timingSafeEqual(expected, supplied);
}

function timingSafeEqual(left: string, right: string) {
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export function slackSourceURL(team: string, channel: string, timestamp: string) {
  return `https://app.slack.com/client/${team}/${channel}/${timestamp}`;
}

export function taskTitle(text: string, botUserID?: string | null) {
  let clean = text;
  if (botUserID) clean = clean.replaceAll(`<@${botUserID}>`, "");
  clean = clean.replace(/^\s*(task|todo|to-do)\s*[:—-]?\s*/i, "").trim();
  clean = clean.replace(/\s+/g, " ");
  if (!clean) return "Follow up from Slack";
  return clean.length > 180 ? `${clean.slice(0, 177)}…` : clean;
}
