import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
function walk(d: string): string[] {
  return readdirSync(d).flatMap(f => {
    const p = join(d, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}
// Files allowed to reference window.electron* because they either (a) are the platform electron impl,
// (b) capability-guard the call behind platform.capabilities.appTracking (reports/dashboard/task usage),
// (c) are electron-only services using optional chaining (sync/backup), or (d) are a capability probe.
const ALLOW = [
  'services/platform/electron.ts',
  'hooks/useElectron.ts',
  'services/dataSyncService.ts',
  'services/backupService.ts',
  'services/localStorage.ts',
  'store/workspaceStore.ts',
  'components/dashboard/ActivityDashboard.tsx',
  'components/reports/components/AppUsageReport.tsx',
  'components/reports/hooks/useReportsData.ts',
  'hooks/useSessionDistraction.ts',
  'components/planner/TaskDetailsPanel.tsx',
  'components/focus/Settings.tsx',
]
describe('no unguarded electron access in feature code', () => {
  it('only allowlisted files reference window.electron*', () => {
    const files = walk('src').filter(f => /\.(ts|tsx)$/.test(f) && !f.includes('__tests__'))
    const offenders = files.filter(f =>
      /window\.electron(API)?/.test(readFileSync(f, 'utf8')) &&
      !ALLOW.some(a => f.replace(/\\/g, '/').endsWith(a))
    )
    expect(offenders).toEqual([])
  })
})
