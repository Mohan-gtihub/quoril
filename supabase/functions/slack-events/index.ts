import { json, serviceClient, slackSourceURL, taskTitle, verifySlackRequest } from "../_shared/slack.ts";

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

type TaskDraft = {
  eventKey: string;
  userID: string;
  sourceKind: "message_shortcut" | "app_mention";
  title: string;
  responseURL?: string;
  source: { teamID: string; teamName: string; channelID: string; timestamp: string; authorID?: string };
};

Deno.serve(async (req) => {
  const raw = await req.text();
  if (!(await verifySlackRequest(req, raw))) return json({ error: "Invalid Slack signature" }, 401);

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const envelope = JSON.parse(raw);
    if (envelope.type === "url_verification") return json({ challenge: envelope.challenge });
    if (envelope.type === "event_callback" && envelope.event?.type === "app_mention") {
      EdgeRuntime.waitUntil(promptMention(envelope));
    }
    return json({ ok: true });
  }

  const payloadText = new URLSearchParams(raw).get("payload");
  if (!payloadText) return json({ error: "Missing interaction payload" }, 400);
  const payload = JSON.parse(payloadText);

  if (payload.type === "message_action" && payload.callback_id === "send_to_quoril") {
    try {
      await openTaskModal(payload.trigger_id, await shortcutDraft(payload));
      return new Response(null, { status: 200 });
    } catch (error) {
      EdgeRuntime.waitUntil(replyToInteraction(payload.response_url, errorMessage(error)));
      return new Response(null, { status: 200 });
    }
  }

  if (payload.type === "block_actions" && payload.actions?.[0]?.action_id === "configure_quoril_task") {
    try {
      await openTaskModal(payload.trigger_id, JSON.parse(payload.actions[0].value));
    } catch (error) {
      EdgeRuntime.waitUntil(postEphemeral(payload, errorMessage(error)));
    }
    return new Response(null, { status: 200 });
  }

  if (payload.type === "view_submission" && payload.view?.callback_id === "create_quoril_task") {
    const title = payload.view.state.values.title.title.value?.trim();
    if (!title) return json({ response_action: "errors", errors: { title: "Give this task a title." } });
    EdgeRuntime.waitUntil(createFromSubmission(payload, title));
    return json({ response_action: "clear" });
  }

  return json({ ok: true });
});

async function installation(teamID: string, slackUserID: string) {
  const { data } = await serviceClient()
    .from("slack_installations")
    .select("user_id,slack_team_name,bot_user_id,access_token")
    .eq("slack_team_id", teamID)
    .eq("slack_user_id", slackUserID)
    .maybeSingle();
  return data;
}

async function shortcutDraft(payload: any): Promise<TaskDraft> {
  const install = await installation(payload.team.id, payload.user.id);
  if (!install) throw new Error("Connect this Slack account in Quoril Settings first.");
  const timestamp = payload.message_ts ?? payload.message?.ts;
  return {
    eventKey: `shortcut:${payload.team.id}:${payload.channel.id}:${timestamp}:${payload.user.id}`,
    userID: install.user_id,
    sourceKind: "message_shortcut",
    title: taskTitle(payload.message?.text ?? ""),
    responseURL: payload.response_url,
    source: {
      teamID: payload.team.id,
      teamName: install.slack_team_name,
      channelID: payload.channel.id,
      timestamp,
      authorID: payload.message?.user,
    },
  };
}

async function promptMention(envelope: any) {
  const event = envelope.event;
  const install = await installation(envelope.team_id, event.user);
  if (!install) return;
  const draft: TaskDraft = {
    eventKey: `event:${envelope.event_id}`,
    userID: install.user_id,
    sourceKind: "app_mention",
    title: taskTitle(event.text ?? "", install.bot_user_id),
    source: {
      teamID: envelope.team_id,
      teamName: install.slack_team_name,
      channelID: event.channel,
      timestamp: event.ts,
      authorID: event.user,
    },
  };
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { authorization: `Bearer ${install.access_token}`, "content-type": "application/json" },
    body: JSON.stringify({
      channel: event.channel,
      thread_ts: event.ts,
      text: `Set up “${draft.title}” before adding it to Quoril.`,
      blocks: [
        { type: "section", text: { type: "mrkdwn", text: `*Ready to capture:* ${draft.title}\nChoose when it is due and how much focus it deserves.` } },
        { type: "actions", elements: [{ type: "button", action_id: "configure_quoril_task", text: { type: "plain_text", text: "Set up task" }, style: "primary", value: JSON.stringify(draft) }] },
      ],
    }),
  });
}

async function openTaskModal(triggerID: string, draft: TaskDraft) {
  const install = await installation(draft.source.teamID, draft.source.authorID ?? "");
  const accessToken = install?.access_token ?? (await serviceClient()
    .from("slack_installations").select("access_token").eq("user_id", draft.userID).maybeSingle()).data?.access_token;
  if (!accessToken) throw new Error("Reconnect Slack from Quoril Settings.");

  const response = await fetch("https://slack.com/api/views.open", {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      trigger_id: triggerID,
      view: {
        type: "modal",
        callback_id: "create_quoril_task",
        private_metadata: JSON.stringify(draft),
        title: { type: "plain_text", text: "Add to Quoril" },
        submit: { type: "plain_text", text: "Create task" },
        close: { type: "plain_text", text: "Cancel" },
        blocks: [
          { type: "input", block_id: "title", label: { type: "plain_text", text: "Task" }, element: { type: "plain_text_input", action_id: "title", initial_value: draft.title } },
          { type: "input", block_id: "due", optional: true, label: { type: "plain_text", text: "Due date and time" }, element: { type: "datetimepicker", action_id: "due_at" } },
          { type: "input", block_id: "duration", label: { type: "plain_text", text: "Focus timer" }, element: { type: "static_select", action_id: "duration", initial_option: option("25 minutes · Pomodoro", "25"), options: [option("15 minutes · Quick sprint", "15"), option("25 minutes · Pomodoro", "25"), option("45 minutes", "45"), option("60 minutes", "60"), option("90 minutes · Deep work", "90")] } },
          { type: "input", block_id: "priority", label: { type: "plain_text", text: "Criticality" }, element: { type: "static_select", action_id: "priority", initial_option: option("Medium", "medium"), options: [option("Low", "low"), option("Medium", "medium"), option("High", "high"), option("Critical", "critical")] } },
        ],
      },
    }),
  });
  const result = await response.json();
  if (!result.ok) {
    const details = result.response_metadata?.messages?.join(" · ");
    console.error("Slack rejected Quoril task modal", JSON.stringify(result));
    throw new Error(details || result.error || "Could not open Quoril task setup.");
  }
}

function option(text: string, value: string) {
  return { text: { type: "plain_text", text }, value };
}

async function createFromSubmission(payload: any, title: string) {
  const draft: TaskDraft = JSON.parse(payload.view.private_metadata);
  const values = payload.view.state.values;
  const dueTimestamp = values.due?.due_at?.selected_date_time;
  const dueAt = dueTimestamp ? new Date(Number(dueTimestamp) * 1000).toISOString() : null;
  const estimate = Number(values.duration.duration.selected_option.value);
  const priority = values.priority.priority.selected_option.value;
  try {
    const created = await createTask(draft, title, dueAt, estimate, priority);
    const message = created ? `✓ Added *${title}* to Quoril` : "This message is already in Quoril.";
    if (draft.responseURL) await replyToInteraction(draft.responseURL, message);
    else await notifyMention(draft, message);
  } catch (error) {
    if (draft.responseURL) await replyToInteraction(draft.responseURL, errorMessage(error));
    else await notifyMention(draft, errorMessage(error));
  }
}

async function notifyMention(draft: TaskDraft, text: string) {
  const { data: install } = await serviceClient().from("slack_installations").select("access_token").eq("user_id", draft.userID).maybeSingle();
  if (!install) return;
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { authorization: `Bearer ${install.access_token}`, "content-type": "application/json" },
    body: JSON.stringify({ channel: draft.source.channelID, thread_ts: draft.source.timestamp, text }),
  }).catch(() => undefined);
}

async function replyToInteraction(responseURL: string | undefined, text: string) {
  if (!responseURL) return;
  await fetch(responseURL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ response_type: "ephemeral", replace_original: false, text }),
  }).catch(() => undefined);
}

async function postEphemeral(payload: any, text: string) {
  const install = await installation(payload.team.id, payload.user.id);
  if (!install) return;
  await fetch("https://slack.com/api/chat.postEphemeral", {
    method: "POST",
    headers: { authorization: `Bearer ${install.access_token}`, "content-type": "application/json" },
    body: JSON.stringify({ channel: payload.channel.id, user: payload.user.id, text }),
  }).catch(() => undefined);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Could not add this message to Quoril.";
}

async function createTask(draft: TaskDraft, title: string, dueAt: string | null, estimate: number, priority: string) {
  const db = serviceClient();
  const { error: reservationError } = await db.from("slack_captures").insert({ event_key: draft.eventKey, user_id: draft.userID, source_kind: draft.sourceKind });
  if (reservationError?.code === "23505") return false;
  if (reservationError) throw reservationError;

  const taskID = crypto.randomUUID();
  const { data: first } = await db.from("tasks").select("sort_order").eq("user_id", draft.userID).is("list_id", null).is("deleted_at", null).order("sort_order", { ascending: true }).limit(1).maybeSingle();
  const description = [
    `Captured from Slack · ${draft.source.teamName}`,
    draft.source.authorID ? `Author: <@${draft.source.authorID}>` : null,
    slackSourceURL(draft.source.teamID, draft.source.channelID, draft.source.timestamp),
  ].filter(Boolean).join("\n");
  const now = new Date().toISOString();
  const { error } = await db.from("tasks").insert({
    id: taskID,
    user_id: draft.userID,
    list_id: null,
    title,
    description,
    status: "todo",
    priority,
    estimate_m: estimate,
    spent_s: 0,
    due_at: dueAt,
    sort_order: (first?.sort_order ?? 0) - 1,
    created_at: now,
    updated_at: now,
  });
  if (error) {
    await db.from("slack_captures").delete().eq("event_key", draft.eventKey);
    throw error;
  }
  await db.from("slack_captures").update({ task_id: taskID }).eq("event_key", draft.eventKey);
  return true;
}
