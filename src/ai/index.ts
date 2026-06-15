/**
 * Public surface of the voice-task AI module.
 *
 * The rest of the app only needs the orchestration hook and the draft shape it
 * produces; everything else (transport, schema, prompt, agent) is an internal
 * detail imported directly by the module's own files and tests.
 */

export type { TaskDraft, TaskPriority } from './types'

export { useTaskVoiceAgent } from './react/useTaskVoiceAgent'
export type {
    VoiceAgentStatus,
    TaskVoiceAgentApi,
    UseTaskVoiceAgentOptions,
} from './react/useTaskVoiceAgent'
