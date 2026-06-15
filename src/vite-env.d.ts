/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    /** NVIDIA API key for the voice task agent (build-time inlined). */
    readonly VITE_NVIDIA_API_KEY?: string
    /** Optional model override; defaults to minimaxai/minimax-m3. */
    readonly VITE_NVIDIA_MODEL?: string
    /** Groq API key for speech-to-text (used as a browser fallback; Electron uses GROQ_API_KEY in main). */
    readonly VITE_GROQ_API_KEY?: string
    /** Optional STT model override; defaults to whisper-large-v3-turbo. */
    readonly VITE_GROQ_STT_MODEL?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

// Electron API types defined in src/types/electron.d.ts

export { }
