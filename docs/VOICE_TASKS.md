# Voice Task Capture

Add tasks by speaking (or typing) a natural-language description. An LLM parses
the utterance into the "New Focus Mission" form, asks follow-up questions aloud
when something essential is missing, and can auto-start a focus session.

## How it works

```
 ┌──────────┐   transcript   ┌──────────────────┐   JSON draft   ┌─────────────┐
 │  Mic /   │ ─────────────▶ │  TaskVoiceAgent  │ ─────────────▶ │ Create Task │
 │  typed   │                │  (NVIDIA LLM)    │                │   form      │
 └──────────┘                └──────────────────┘                └─────────────┘
       ▲                              │ question (needs_input)            │
       │           speaks aloud       ▼                                   │ auto-start
       └──────────  TTS  ◀────────────┘                                   ▼ focus session
```

1. **STT** — the browser Web Speech API (`SpeechRecognition`) transcribes speech.
2. **Agent** — `TaskVoiceAgent` sends the transcript + running history to the
   NVIDIA OpenAI-compatible chat API and gets back a structured task draft.
3. **Form** — each turn autofills the form. When the draft is complete, the task
   is created (and a focus session starts if the user asked to begin now).
4. **TTS** — when a required field is missing, the agent's question is read aloud
   via `speechSynthesis`, then the mic re-opens for the answer.

## The module — `src/ai/`

Self-contained and dependency-injected so the core is unit-tested without a
network or the DOM:

| File | Responsibility |
| --- | --- |
| `agent.ts` | `TaskVoiceAgent` — the multi-turn slot-filling conversation |
| `client.ts` | NVIDIA transport (Electron IPC, or `fetch` in a browser) |
| `schema.ts` | Zod validation + normalization of model output |
| `json.ts` | Robust JSON extraction from messy model replies |
| `prompt.ts` | System prompt |
| `voice/` | `useSpeechRecognition` (STT) + `useSpeechSynthesis` (TTS) hooks |
| `react/useTaskVoiceAgent.ts` | Orchestration hook used by the UI |

Tests live in `src/ai/__tests__/`. Run them with `npm test`.

## Configuration

Set in `.env` (copy from `.env.example`):

```bash
VITE_NVIDIA_API_KEY=nvapi-...          # required to enable the feature
VITE_NVIDIA_MODEL=minimaxai/minimax-m3 # optional override
NVIDIA_API_KEY=nvapi-...               # dev-only fallback for the main process
```

`VITE_NVIDIA_API_KEY` is inlined into the renderer bundle at build time. This is
a deliberate trade-off appropriate for single-user desktop builds; do **not**
publish a build containing a shared key. For public distribution, move the call
behind a server proxy (e.g. a Supabase Edge Function) instead.

## Known limitations

- **Speech recognition is disabled in the Electron app (dev and packaged).**
  `SpeechRecognition` depends on a Google cloud endpoint bundled into Chrome but
  not into Electron's Chromium, and the main process denies microphone access by
  default — so the constructor exists yet every `start()` errors. The hooks
  detect Electron (via the user-agent / `electronAPI`) and report STT as
  unsupported, so the widget shows a **typed input** that feeds the exact same
  LLM pipeline. Text-to-speech (the spoken confirmations/questions) works
  everywhere. This is why the desktop experience is "type a task, the assistant
  parses it and reads back a confirmation."
- **To exercise real microphone input, open the Vite dev URL in Chrome** — but
  note the LLM call from a plain browser uses a direct `fetch` to NVIDIA, which
  does **not** return CORS headers, so that request is blocked by the browser.
  Reaching the model from a browser therefore requires a CORS-enabled proxy
  (e.g. a Supabase Edge Function). In the Electron app there is no such problem:
  the call is routed through the main process (`ai:chat` IPC), which has no CORS
  restriction and keeps the request off the UI thread.
