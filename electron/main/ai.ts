import 'dotenv/config'
import { ipcMain } from 'electron'

/**
 * Main-process proxy for the NVIDIA (OpenAI-compatible) chat completions API.
 *
 * Why route through main instead of calling from the renderer?
 *  - No CORS: the renderer is a Chromium context subject to cross-origin rules;
 *    Node's fetch is not.
 *  - Keeps the HTTP round-trip off the UI thread.
 *
 * The renderer passes the build-time API key (Vite-inlined) with each call; we
 * also fall back to `NVIDIA_API_KEY` from the environment for local development.
 */

const NVIDIA_CHAT_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const GROQ_TRANSCRIBE_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
const DEFAULT_STT_MODEL = 'whisper-large-v3-turbo'

interface ChatArgs {
    messages: Array<{ role: string; content: string }>
    model: string
    apiKey?: string
    temperature?: number
    maxTokens?: number
}

interface TranscribeArgs {
    /** Raw audio bytes captured by the renderer (e.g. webm/opus from MediaRecorder). */
    audio: Uint8Array | ArrayBuffer
    mimeType?: string
    fileName?: string
    model?: string
    apiKey?: string
}

interface ChatCompletionResponse {
    choices?: Array<{ message?: { content?: string } }>
}

interface TranscriptionResponse {
    text?: string
}

export function registerAiIpc(): void {
    ipcMain.handle('ai:chat', async (_event, args: ChatArgs): Promise<string> => {
        const apiKey = (args.apiKey || process.env.NVIDIA_API_KEY || '').trim()
        if (!apiKey) {
            throw new Error('NVIDIA API key is not configured')
        }

        if (!Array.isArray(args.messages) || args.messages.length === 0) {
            throw new Error('No messages provided')
        }

        const res = await fetch(NVIDIA_CHAT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: args.model,
                messages: args.messages,
                max_tokens: args.maxTokens ?? 1024,
                temperature: args.temperature ?? 0.2,
                top_p: 0.95,
                stream: false,
            }),
        })

        if (!res.ok) {
            const text = await res.text().catch(() => '')
            throw new Error(`NVIDIA API error ${res.status}: ${text.slice(0, 300)}`)
        }

        const data = (await res.json()) as ChatCompletionResponse
        const content = data.choices?.[0]?.message?.content
        if (typeof content !== 'string') {
            throw new Error('NVIDIA API returned no message content')
        }
        return content
    })

    /**
     * Speech-to-text via Groq's OpenAI-compatible Whisper endpoint.
     *
     * The renderer records a short audio clip (MediaRecorder) and hands us the
     * raw bytes; we forward them as multipart/form-data. Routing through main
     * keeps GROQ_API_KEY out of the renderer bundle and sidesteps CORS — the
     * same rationale as ai:chat above.
     */
    ipcMain.handle('ai:transcribe', async (_event, args: TranscribeArgs): Promise<string> => {
        const apiKey = (args.apiKey || process.env.GROQ_API_KEY || '').trim()
        if (!apiKey) {
            throw new Error('Groq API key is not configured')
        }

        const bytes = args.audio instanceof Uint8Array ? args.audio : new Uint8Array(args.audio)
        if (!bytes || bytes.byteLength === 0) {
            throw new Error('No audio was recorded')
        }

        const form = new FormData()
        const blob = new Blob([bytes], { type: args.mimeType || 'audio/webm' })
        form.append('file', blob, args.fileName || 'recording.webm')
        form.append('model', args.model || DEFAULT_STT_MODEL)
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

        const data = (await res.json()) as TranscriptionResponse
        if (typeof data.text !== 'string') {
            throw new Error('Groq STT returned no transcript')
        }
        return data.text.trim()
    })
}
