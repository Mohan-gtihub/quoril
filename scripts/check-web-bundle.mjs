import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const banned = ['better-sqlite3', 'active-win', "require('electron')", 'from "electron"', "from 'electron'"]
const dir = 'dist/assets'
const offenders = []
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.js')) continue
  const txt = readFileSync(join(dir, f), 'utf8')
  for (const b of banned) if (txt.includes(b)) offenders.push(`${f}: ${b}`)
}
if (offenders.length) { console.error('Banned native refs in web bundle:\n' + offenders.join('\n')); process.exit(1) }
console.log('Web bundle clean.')
