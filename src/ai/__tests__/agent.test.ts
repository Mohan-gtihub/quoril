import { describe, it, expect, vi } from 'vitest'
import { TaskVoiceAgent } from '../agent'
import type { ChatMessage } from '../types'

/** Build an agent whose transport replays a queued list of raw model replies. */
function makeAgent(replies: string[]) {
    const calls: ChatMessage[][] = []
    let i = 0
    const chat = vi.fn(async (messages: ChatMessage[]) => {
        calls.push(messages)
        return replies[Math.min(i++, replies.length - 1)]
    })
    const agent = new TaskVoiceAgent({ chat, now: () => new Date('2026-06-12T10:00:00Z') })
    return { agent, chat, calls }
}

describe('TaskVoiceAgent', () => {
    it('short-circuits empty utterances without calling the model', async () => {
        const { agent, chat } = makeAgent(['{}'])
        const turn = await agent.send('   ')
        expect(chat).not.toHaveBeenCalled()
        expect(turn.status).toBe('needs_input')
        expect(agent.turnCount).toBe(0)
    })

    it('parses a complete turn and records history', async () => {
        const reply = JSON.stringify({
            status: 'complete',
            title: 'Write the report',
            minutes: 45,
            priority: 'high',
            auto_start: false,
            message: 'Got it.',
        })
        const { agent, chat } = makeAgent([reply])

        const turn = await agent.send('Write the report for 45 minutes, high priority')

        expect(chat).toHaveBeenCalledOnce()
        expect(turn.status).toBe('complete')
        expect(turn.draft.title).toBe('Write the report')
        expect(turn.draft.minutes).toBe(45)
        // one user + one assistant message retained
        expect(agent.turnCount).toBe(2)
    })

    it('always sends a system prompt and carries prior history forward', async () => {
        const ask = JSON.stringify({ status: 'needs_input', question: 'What is the task?' })
        const done = JSON.stringify({ status: 'complete', title: 'Call mom' })
        const { agent, calls } = makeAgent([ask, done])

        await agent.send('add a task')
        await agent.send('call mom')

        // First call: system + first user
        expect(calls[0][0].role).toBe('system')
        expect(calls[0]).toHaveLength(2)

        // Second call carries: system + user1 + assistant1 + user2
        const second = calls[1]
        expect(second[0].role).toBe('system')
        expect(second).toHaveLength(4)
        expect(second[1]).toEqual({ role: 'user', content: 'add a task' })
        expect(second[2].role).toBe('assistant')
        expect(second[3]).toEqual({ role: 'user', content: 'call mom' })
    })

    it('recovers gracefully from unparseable model output', async () => {
        const { agent } = makeAgent(['I cannot help with that.'])
        const turn = await agent.send('do something')
        expect(turn.status).toBe('needs_input')
        expect(turn.question).toMatch(/say it again/i)
    })

    it('resets conversation history', async () => {
        const { agent } = makeAgent([JSON.stringify({ title: 'x' })])
        await agent.send('x')
        expect(agent.turnCount).toBe(2)
        agent.reset()
        expect(agent.turnCount).toBe(0)
    })
})
