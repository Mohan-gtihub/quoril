import { describe, expect, it } from 'vitest'
import { getConsoleBuffer, recordDiagnosticEvent } from '../consoleBuffer'

describe('consoleBuffer', () => {
    it('redacts credentials and private content before diagnostics are retained', () => {
        recordDiagnosticEvent('error', 'sync.row_rejected', {
            accessToken: 'super-secret-token',
            email: 'person@example.com',
            title: 'Private task name',
            metadata: { description: 'Private task description' },
            params: ['Private task description'],
        })

        const entry = getConsoleBuffer().at(-1)
        expect(entry?.message).toContain('accessToken=[redacted]')
        expect(entry?.message).toContain('email=[redacted]')
        expect(entry?.message).toContain('title=[redacted]')
        expect(entry?.message).toContain('description=[redacted]')
        expect(entry?.message).toContain('params=[redacted]')
        expect(entry?.message).not.toContain('super-secret-token')
        expect(entry?.message).not.toContain('person@example.com')
        expect(entry?.message).not.toContain('Private task')
    })
})
