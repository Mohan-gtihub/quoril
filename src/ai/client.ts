import type { ChatMessage } from './types'

/**
 * Transport for the NVIDIA-hosted, OpenAI-compatible chat completions API.
 *
 * Two paths, chosen automatically:
 *  1. Electron main process (preferred) — avoids browser CORS entirely and keeps
 *     the network call off the renderer thread. Used whenever `electronAPI.ai`
 *     is available (i.e. the packaged app and Electron dev).
 *  2. Direct `fetch` — fallback for running the renderer in a plain browser
 *     (e.g. opening the Vite dev URL in Chrome to test Web Speech recognition).
 *
 * The API key is supplied at build time via `VITE_NVIDIA_API_KEY` (Vite inlines
 * it into the bundle). This is a deliberate, documented trade-off for a
 * single-user desktop build — see docs/VOICE_TASKS.md.
 */

const NVIDIA_CHAT_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const GROQ_TRANSCRIBE_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
const DEFAULT_MODEL = 'meta/llama-3.3-70b-instruct'
const DEFAULT_STT_MODEL = 'whisper-large-v3-turbo'

function getModel(): string {
    const fromEnv = import.meta.env.VITE_NVIDIA_MODEL
    return fromEnv && fromEnv.trim().length > 0 ? fromEnv.trim() : DEFAULT_MODEL
}

function getSttModel(): string {
    const fromEnv = import.meta.env.VITE_GROQ_STT_MODEL
    return fromEnv && fromEnv.trim().length > 0 ? fromEnv.trim() : DEFAULT_STT_MODEL
}

function getApiKey(): string {
    return (import.meta.env.VITE_NVIDIA_API_KEY ?? '').trim()
}

function getGroqApiKey(): string {
    return (import.meta.env.VITE_GROQ_API_KEY ?? '').trim()
}

/** True when a usable API key is present in the build. */
export function isAiConfigured(): boolean {
    return getApiKey().length > 0
}

/**
 * True when speech-to-text can run here. In Electron the key lives in the main
 * process env (GROQ_API_KEY) so the renderer can't see it — there we assume STT
 * is available whenever the IPC bridge exists, and surface any missing-key error
 * at call time. In a plain browser we require the inlined VITE_GROQ_API_KEY.
 */
export function isSttConfigured(): boolean {
    if (typeof window !== 'undefined' && window.electronAPI?.ai?.transcribe) return true
    return getGroqApiKey().length > 0
}

export interface ChatParams {
    messages: ChatMessage[]
    /** Lower = more deterministic. Structured extraction wants low values. */
    temperature?: number
    maxTokens?: number
}

/** Shape of the OpenAI-compatible completion response we rely on. */
interface ChatCompletionResponse {
    choices?: Array<{ message?: { content?: string } }>
    error?: { message?: string } | string
}

function extractContent(data: ChatCompletionResponse): string {
    const content = data.choices?.[0]?.message?.content
    if (typeof content !== 'string') {
        throw new Error('NVIDIA API returned no message content')
    }
    return content
}

async function chatViaFetch(params: ChatParams): Promise<string> {
    const apiKey = getApiKey()
    if (!apiKey) throw new Error('Missing VITE_NVIDIA_API_KEY')

    const res = await fetch(NVIDIA_CHAT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: getModel(),
            messages: params.messages,
            max_tokens: params.maxTokens ?? 1024,
            temperature: params.temperature ?? 0.2,
            top_p: 0.95,
            stream: false,
        }),
    })

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`NVIDIA API error ${res.status}: ${text.slice(0, 300)}`)
    }

    const data = (await res.json()) as ChatCompletionResponse
    return extractContent(data)
}

/**
 * Send a chat completion request and return the assistant's raw text content.
 * Throws on transport/HTTP errors.
 */
export async function chat(params: ChatParams): Promise<string> {
    const ai = typeof window !== 'undefined' ? window.electronAPI?.ai : undefined

    if (ai?.chat) {
        return ai.chat({
            messages: params.messages,
            model: getModel(),
            apiKey: getApiKey(),
            temperature: params.temperature ?? 0.2,
            maxTokens: params.maxTokens ?? 1024,
        })
    }

    return chatViaFetch(params)
}

async function transcribeViaFetch(audio: Blob): Promise<string> {
    const apiKey = getGroqApiKey()
    if (!apiKey) throw new Error('Missing VITE_GROQ_API_KEY')

    const form = new FormData()
    form.append('file', audio, 'recording.webm')
    form.append('model', getSttModel())
    form.append('response_format', 'json')

    const res = await fetch(GROQ_TRANSCRIBE_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
    })

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Groq STT error ${res.status}: ${text.slice(0, 300)}`)
    }

    const data = (await res.json()) as { text?: string }
    if (typeof data.text !== 'string') throw new Error('Groq STT returned no transcript')
    return data.text.trim()
}

/**
 * Transcribe a recorded audio clip to text. Prefers the Electron main-process
 * proxy (keeps the key out of the bundle, no CORS); falls back to a direct Groq
 * fetch when running the renderer in a plain browser.
 */
export async function transcribe(audio: Blob): Promise<string> {
    const ai = typeof window !== 'undefined' ? window.electronAPI?.ai : undefined

    if (ai?.transcribe) {
        const buffer = await audio.arrayBuffer()
        return ai.transcribe({
            audio: new Uint8Array(buffer),
            mimeType: audio.type || 'audio/webm',
            fileName: 'recording.webm',
            model: getSttModel(),
        })
    }

    return transcribeViaFetch(audio)
}
