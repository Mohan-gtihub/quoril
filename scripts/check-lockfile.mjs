/**
 * Verify package-lock.json is installable by the npm that CI actually runs.
 *
 * `npm ci` is the first step of every workflow and refuses to run when the lock
 * disagrees with package.json — so a bad lock fails the pipeline before it
 * builds anything, and costs a push/wait cycle to discover.
 *
 * Checking with the local npm is not enough. npm 11 and npm 10 disagree about
 * which nested entries a lock must contain: npm 11 wrote a lock omitting
 * vitest's bundled vite deps (esbuild, sass) that npm 10 then demanded. The
 * local `npm ci --dry-run` passed while CI failed on the identical tree, twice.
 *
 * So this pins the checker to CI_NPM and runs the real resolution.
 */

import { execFileSync } from 'node:child_process'
import process from 'node:process'

// Must match the npm bundled with the Node version in .github/workflows/*.yml.
// Node 22 ships npm 10.x.
export const CI_NPM = '10'

function main() {
    console.log(`Checking package-lock.json against npm@${CI_NPM} (what CI uses)...`)

    try {
        execFileSync('npx', ['-y', `npm@${CI_NPM}`, 'ci', '--dry-run'], {
            stdio: 'pipe',
            encoding: 'utf8',
        })
    } catch (error) {
        console.error('\n✗ package-lock.json is not installable by the npm CI uses.\n')
        const output = `${error.stdout ?? ''}${error.stderr ?? ''}`
        console.error(
            output
                .split('\n')
                .filter((l) => l.includes('Missing:') || l.includes('Invalid:'))
                .slice(0, 12)
                .join('\n') || output.slice(0, 800),
        )
        console.error(
            `\nRegenerate it with the same npm, so the result is what CI will see:\n` +
            `  npx -y npm@${CI_NPM} install --package-lock-only\n`,
        )
        process.exit(1)
    }

    console.log('✓ lockfile is in sync')
}

main()
