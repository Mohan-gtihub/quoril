import { describe, it, expect } from 'vitest'
import { shouldFireOvertimeAlert } from '../sessionUtils'

describe('shouldFireOvertimeAlert', () => {
    it('fires exactly when the countdown first reaches the goal', () => {
        expect(shouldFireOvertimeAlert(1499, 1500, false)).toBe(false) // 1s left
        expect(shouldFireOvertimeAlert(1500, 1500, false)).toBe(true)  // hit zero
        expect(shouldFireOvertimeAlert(1600, 1500, false)).toBe(true)  // already over
    })

    it('does not fire again once alerted for this crossing', () => {
        expect(shouldFireOvertimeAlert(1600, 1500, true)).toBe(false)
    })

    it('never fires in stopwatch mode (no goal)', () => {
        expect(shouldFireOvertimeAlert(9999, 0, false)).toBe(false)
        expect(shouldFireOvertimeAlert(9999, -1, false)).toBe(false)
    })

    it('stays quiet while still under the goal', () => {
        expect(shouldFireOvertimeAlert(0, 1500, false)).toBe(false)
        expect(shouldFireOvertimeAlert(300, 1500, false)).toBe(false)
    })
})
