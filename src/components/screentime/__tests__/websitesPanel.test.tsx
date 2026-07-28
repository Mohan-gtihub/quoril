import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * ScreenTime is a single large component wired to the whole screen-time data
 * pipeline, so rendering it in isolation would test the mocking more than the
 * behaviour. These assertions instead pin the decisions that were actually
 * wrong in the shipped build, at the source level:
 *
 *   - the panel keyed off the combined detailAvailable flag, so enabling window
 *     titles alone would have shown an empty Websites list
 *   - "Open settings" navigated to /settings, which lands on Appearance
 *   - the copy claimed macOS could not do this at all
 *
 * The three-state rendering itself is covered behaviourally in
 * DetailedTrackingSettings.test.tsx and useTrackingDetail.test.ts.
 */
const SOURCE = readFileSync('src/components/screentime/ScreenTime.tsx', 'utf8')
const DASHBOARD = readFileSync('src/components/dashboard/ActivityDashboard.tsx', 'utf8')

describe('Websites panel gating', () => {
    it('keys off the urls capability, not the combined detail flag', () => {
        // detailAvailable is (titles || urls); using it here would show an empty
        // list to anyone who enabled only window titles.
        expect(SOURCE).toContain('urlsLive')
        expect(SOURCE).toMatch(/urlsLive\s*\?/)
    })

    it('derives urlsLive from both the opt-in and the OS grant', () => {
        expect(SOURCE).toMatch(/urls\.enabled\s*&&\s*trackingDetail\.urls\.granted/)
    })

    it('distinguishes "off" from "waiting on permission"', () => {
        expect(SOURCE).toContain('urlsPending')
        expect(SOURCE).toMatch(/urls\.enabled\s*&&\s*!trackingDetail\.urls\.granted/)
    })
})

describe('settings deep link', () => {
    it('points at the App Tracking section rather than dumping the user on Appearance', () => {
        expect(SOURCE).toContain('?section=about')
    })

    it('Settings honours the section parameter', () => {
        const settings = readFileSync('src/components/focus/Settings.tsx', 'utf8')
        expect(settings).toContain('useSearchParams')
        expect(settings).toMatch(/searchParams\.get\('section'\)/)
        // Must fall back rather than render a blank pane for a bogus value.
        expect(settings).toMatch(/SECTIONS\.some/)
    })

    it('"about" is the App Tracking section id, which the link depends on', () => {
        const settings = readFileSync('src/components/focus/Settings.tsx', 'utf8')
        expect(settings).toMatch(/id:\s*'about',\s*label:\s*'App Tracking'/)
    })
})

describe('copy is no longer false', () => {
    it('no surface still claims website detail is impossible on macOS', () => {
        for (const [name, src] of [['ScreenTime', SOURCE], ['ActivityDashboard', DASHBOARD]] as const) {
            expect(src, `${name} still says detail is unavailable on macOS`)
                .not.toMatch(/available on macOS/)
        }
    })

    it('tells the user a restart may be needed, since a grant can go unnoticed', () => {
        expect(SOURCE).toMatch(/restart/i)
    })
})
