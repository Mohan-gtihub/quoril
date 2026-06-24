import type { VoiceAgentStatus } from './useTaskVoiceAgent'

/**
 * What a tap on the mic button should do, derived purely from the current
 * agent state. Extracted from the widget so the interaction logic is unit-
 * testable without a DOM.
 *
 *  - `stop`   – we're listening; end capture.
 *  - `resume` – continue the existing conversation (answer a follow-up), keeping
 *               context. Used both to barge in while a question is being spoken
 *               and to retry when a spoken question failed to auto-resume the mic.
 *  - `start`  – begin a fresh capture (no pending question), resetting context.
 *  - `ignore` – mid-flight ('thinking'); a tap would drop the in-progress turn.
 */
export type MicAction = 'start' | 'resume' | 'stop' | 'ignore'

export function nextMicAction(
    status: VoiceAgentStatus,
    hasPendingQuestion: boolean
): MicAction {
    switch (status) {
        case 'listening':
            return 'stop'
        case 'speaking':
            return 'resume'
        case 'thinking':
            return 'ignore'
        default:
            // idle / error
            return hasPendingQuestion ? 'resume' : 'start'
    }
}
