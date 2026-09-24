import { authenticatedUser, json, serviceClient } from "../_shared/slack.ts";

const clientID = Deno.env.get("SLACK_CLIENT_ID") ?? "";
const clientSecret = Deno.env.get("SLACK_CLIENT_SECRET") ?? "";
const functionURL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/slack-integration`;

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (url.searchParams.has("code") || url.searchParams.has("error")) return oauthCallback(url);

  const user = await authenticatedUser(req);
  if (!user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  switch (body.action) {
    case "status": return status(user.id);
    case "disconnect": return disconnect(user.id);
    case "start": return start(user.id);
    default: return json({ error: "Unknown action" }, 400);
  }
});

async function status(userID: string) {
  const { data, error } = await serviceClient()
    .from("slack_installations")
    .select("slack_team_name,installed_at")
    .eq("user_id", userID)
    .maybeSingle();
  if (error) return json({ error: "Could not read Slack connection" }, 500);
  return json({ connected: Boolean(data), team_name: data?.slack_team_name ?? null, installed_at: data?.installed_at ?? null });
}

async function start(userID: string) {
  if (!clientID) return json({ error: "Slack is not configured on the server" }, 503);
  const state = crypto.randomUUID().replaceAll("-", "");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { error } = await serviceClient().from("slack_oauth_states").insert({ state, user_id: userID, expires_at: expiresAt });
  if (error) return json({ error: "Could not begin Slack connection" }, 500);

  const authorize = new URL("https://slack.com/oauth/v2/authorize");
  authorize.searchParams.set("client_id", clientID);
  authorize.searchParams.set("scope", "commands,app_mentions:read,chat:write");
  authorize.searchParams.set("redirect_uri", functionURL);
  authorize.searchParams.set("state", state);
  return json({ url: authorize.toString() });
}

async function disconnect(userID: string) {
  const db = serviceClient();
  const { data } = await db.from("slack_installations").select("access_token").eq("user_id", userID).maybeSingle();
  if (data?.access_token) {
    await fetch("https://slack.com/api/auth.revoke", {
      method: "POST",
      headers: { authorization: `Bearer ${data.access_token}`, "content-type": "application/x-www-form-urlencoded" },
    }).catch(() => undefined);
  }
  const { error } = await db.from("slack_installations").delete().eq("user_id", userID);
  return error ? json({ error: "Could not disconnect Slack" }, 500) : json({ connected: false });
}

async function oauthCallback(url: URL) {
  const state = url.searchParams.get("state") ?? "";
  if (url.searchParams.get("error")) return resultRedirect(false, "Slack connection was cancelled.");
  const code = url.searchParams.get("code") ?? "";
  const db = serviceClient();
  const { data: pending } = await db.from("slack_oauth_states").select("user_id,expires_at").eq("state", state).maybeSingle();
  await db.from("slack_oauth_states").delete().eq("state", state);
  if (!pending || new Date(pending.expires_at) < new Date()) return resultRedirect(false, "This connection link expired. Start again from Quoril.");

  const credentials = btoa(`${clientID}:${clientSecret}`);
  const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { authorization: `Basic ${credentials}`, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, redirect_uri: functionURL }),
  });
  const token = await tokenResponse.json();
  if (!token.ok || !token.access_token || !token.team?.id || !token.authed_user?.id) {
    return resultRedirect(false, "Slack did not complete the connection.");
  }

  const { error } = await db.from("slack_installations").upsert({
    user_id: pending.user_id,
    slack_team_id: token.team.id,
    slack_team_name: token.team.name ?? "Slack workspace",
    slack_user_id: token.authed_user.id,
    bot_user_id: token.bot_user_id ?? null,
    access_token: token.access_token,
    scopes: token.scope ?? "",
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  return error
    ? resultRedirect(false, "Quoril could not save the Slack connection.")
    : resultRedirect(true, `${token.team.name ?? "Slack"} is connected to Quoril.`, token.team.name ?? undefined);
}

function resultRedirect(success: boolean, message: string, teamName?: string) {
  const deepLink = new URL(`quoril://slack/${success ? "connected" : "error"}`);
  deepLink.searchParams.set("message", message);
  if (teamName) deepLink.searchParams.set("team", teamName);
  return new Response(null, {
    status: 303,
    headers: {
      location: deepLink.toString(),
      "cache-control": "no-store",
    },
  });
}
