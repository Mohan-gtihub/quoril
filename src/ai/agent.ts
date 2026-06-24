import type { AgentTurn, ChatMessage } from './types'
import { emptyDraft } from './types'
import { buildSystemPrompt } from './prompt'
import { safeParseJsonObject } from './json'
import { AgentParseError, parseAgentTurn, serializeAgentTurn } from './schema'

/**
 * Dependencies injected into the agent. Keeping the transport and clock
 * injectable makes the conversation logic fully unit-testable without a
 * network or real time.
 */
export interface AgentDeps {
    /** Sends chat messages and resolves with the assistant's raw text. */
    chat: (messages: ChatMessage[]) => Promise<string>
    /** Clock, overridable in tests. Defaults to `new Date()`. */
    now?: () => Date
}

/**
 * A stateful, multi-turn agent that turns spoken/typed utterances into a
 * structured task draft. It owns the conversation history so the model can
 * accumulate context across follow-up questions.
 */
export class TaskVoiceAgent {
    private history: ChatMessage[] = []

    constructor(private readonly deps: AgentDeps) {}

    /** Clear conversation state to start a fresh task. */
    reset(): void {
        this.history = []
    }

    /** Number of user/assistant turns exchanged so far (excludes the system prompt). */
    get turnCount(): number {
        return this.history.length
    }

    /**
     * Process one user utterance and return the normalized agent turn.
     *
     * Resilience: if the model returns unparseable output we don't throw at the
     * caller — instead we surface a `needs_input` turn that politely asks the
     * user to repeat, so the conversation can recover.
     */
    async send(utterance: string): Promise<AgentTurn> {
        const text = utterance.trim()
        if (!text) {
            return {
                status: 'needs_input',
                draft: emptyDraft(),
                question: "I didn't hear anything. What would you like to add?",
                message: null,
            }
        }

        const now = this.deps.now?.() ?? new Date()
        const system = buildSystemPrompt(now)

        this.history.push({ role: 'user', content: text })

        const messages: ChatMessage[] = [{ role: 'system', content: system }, ...this.history]

        const raw = await this.deps.chat(messages)

        let turn: AgentTurn
        try {
            turn = parseAgentTurn(safeParseJsonObject(raw))
        } catch (err) {
            if (!(err instanceof AgentParseError)) throw err
            turn = {
                status: 'needs_input',
                draft: emptyDraft(),
                question: "Sorry, I didn't quite catch that. Could you say it again?",
                message: null,
            }
        }

        // Persist a compact, canonical version of the reply — never the raw model
        // output, which for a reasoning model can carry a large chain-of-thought.
        // Replaying that on every later turn balloons the prompt and slows things
        // down; the normalized JSON keeps follow-ups small and fast.
        this.history.push({ role: 'assistant', content: serializeAgentTurn(turn) })

        return turn
    }
}
