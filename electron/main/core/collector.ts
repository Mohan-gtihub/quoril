import activeWin from 'active-win'
import { powerMonitor } from 'electron'
import { execFile } from 'node:child_process'

const IDLE_THRESHOLD_S = 180 // 3 minutes

export interface ActiveWindow {
    appName: string
    title: string
    rawApp: string
    rawPath?: string
    isIdle: boolean
    category: 'Work' | 'Web' | 'Development' | 'Communication' | 'Entertainment' | 'Social' | 'News' | 'Gaming' | 'Other' | 'Idle'
    domain?: string
}

// Categories treated as attention leaks. Keep in sync with DISTRACTING_CATEGORIES
// in electron/main/db.ts and DISTRACTING in src/services/insights/buildSummary.ts.
export const DISTRACTING_CATEGORIES = ['Social', 'Entertainment', 'Gaming', 'News'] as const

/* ---------------- PATTERNS ---------------- */

const CATEGORY_MAP: Record<string, ActiveWindow['category']> = {
    'chrome': 'Web',
    'msedge': 'Web',
    'firefox': 'Web',
    'brave': 'Web',
    'safari': 'Web',
    'opera': 'Web',
    'code': 'Development',
    'cursor': 'Development',
    'windsurf': 'Development',
    'intellij': 'Development',
    'pycharm': 'Development',
    'webstorm': 'Development',
    'android studio': 'Development',
    'discord': 'Communication',
    'slack': 'Communication',
    'whatsapp': 'Communication',
    'telegram': 'Communication',
    'zoom': 'Communication',
    'teams': 'Communication',
    'spotify': 'Entertainment',
    'netflix': 'Entertainment',
    'youtube': 'Entertainment',
    'outlook': 'Work',
    'excel': 'Work',
    'word': 'Work',
    'powerpoint': 'Work',
    'acrobat': 'Work',
    'adobe': 'Work',
    'photoshop': 'Entertainment',
    'illustrator': 'Work',
    'figma': 'Work',
    'canva': 'Work',
    'monday': 'Work',
    'asana': 'Work',
    'clickup': 'Work',
    'trello': 'Work',
    'box': 'Work',
    'dropbox': 'Work',
    'slack.exe': 'Communication',
    'huggingface': 'Development',
    'copilot': 'Development',
    'postgres': 'Development',
    'tableplus': 'Development',
    'postman': 'Development',
    'terminal': 'Development',
    'iterm': 'Development',
    'powershell': 'Development',
    'cmd': 'Development',
    // Gaming clients / launchers
    'steam': 'Gaming',
    'epicgameslauncher': 'Gaming',
    'epic games launcher': 'Gaming',
    'riotclientservices': 'Gaming',
    'league of legends': 'Gaming',
    'valorant': 'Gaming',
    'minecraft': 'Gaming',
    'roblox': 'Gaming',
    'battle.net': 'Gaming',
    'origin': 'Gaming',
    'gog galaxy': 'Gaming',
    // Social desktop apps
    'instagram': 'Social',
    'tiktok': 'Social',
}

const SITE_TO_CATEGORY: Record<string, ActiveWindow['category']> = {
    'YouTube': 'Entertainment',
    'Netflix': 'Entertainment',
    'Twitch': 'Entertainment',
    'Spotify': 'Entertainment',
    'ChatGPT': 'Development',
    'Claude': 'Development',
    'GitHub': 'Development',
    'Stack Overflow': 'Development',
    'GitLab': 'Development',
    'Bitbucket': 'Development',
    'Notion': 'Work',
    'Figma': 'Work',
    'Linear': 'Work',
    'Jira': 'Work',
    'Asana': 'Work',
    'Monday': 'Work',
    'Google Docs': 'Work',
    'Google Sheets': 'Work',
    'Google Slides': 'Work',
    'LinkedIn': 'Web',
    'Twitter/X': 'Social',
    'Instagram': 'Social',
    'Facebook': 'Social',
    'Reddit': 'Social',
    'TikTok': 'Social',
    'Snapchat': 'Social',
    'Threads': 'Social',
    'BBC': 'News',
    'CNN': 'News',
    'NYTimes': 'News',
    'The Guardian': 'News',
    'Steam': 'Gaming',
    'Epic Games': 'Gaming',
    'IGN': 'Gaming',
    'Amazon': 'Other',
    'eBay': 'Other',
}

const SITE_PATTERNS = [
    { name: 'YouTube', match: /youtube/i },
    { name: 'Netflix', match: /netflix/i },
    { name: 'ChatGPT', match: /chatgpt|openai/i },
    { name: 'Claude', match: /claude|anthropic/i },
    { name: 'GitHub', match: /github/i },
    { name: 'Stack Overflow', match: /stackoverflow/i },
    { name: 'LinkedIn', match: /linkedin/i },
    { name: 'Notion', match: /notion/i },
    { name: 'Figma', match: /figma/i },
    { name: 'Linear', match: /linear/i },
    { name: 'WhatsApp', match: /whatsapp/i },
    { name: 'Discord', match: /discord/i },
    { name: 'Twitter/X', match: /twitter|x\.com/i },
    { name: 'Instagram', match: /instagram/i },
    { name: 'Facebook', match: /facebook|fb\.com/i },
    { name: 'Reddit', match: /reddit/i },
    { name: 'TikTok', match: /tiktok/i },
    { name: 'Snapchat', match: /snapchat/i },
    { name: 'Threads', match: /threads\.net/i },
    { name: 'BBC', match: /bbc\.com|bbc news/i },
    { name: 'CNN', match: /cnn\.com/i },
    { name: 'NYTimes', match: /nytimes|new york times/i },
    { name: 'The Guardian', match: /theguardian/i },
    { name: 'Steam', match: /steampowered|steamcommunity/i },
    { name: 'Epic Games', match: /epicgames\.com/i },
    { name: 'IGN', match: /ign\.com/i },
    { name: 'Gmail', match: /gmail|mail\.google/i },
    { name: 'Meet', match: /meet\.google/i },
]

/* ---------------- HELPERS ---------------- */

function normalize(name: string) {
    return name
        .replace(/(\.exe|\.app)$/i, '')
        .toLowerCase()
        .trim()
}

function detectSite(title: string) {
    for (const s of SITE_PATTERNS) {
        if (s.match.test(title)) return s.name
    }
    return null
}

/**
 * Resolve a window's category (and optional site/domain) from the app name and,
 * when available, its title. Title is optional — the permission-free fallback
 * only knows the app name, and still gets a sensible category from CATEGORY_MAP.
 */
export function categorize(
    rawApp: string,
    title: string = "",
): { category: ActiveWindow["category"]; domain?: string } {
    const normalizedApp = normalize(rawApp)

    // 1. Base category from the app name.
    let category: ActiveWindow["category"] = CATEGORY_MAP[normalizedApp] || "Other"
    let domain: string | undefined

    // 2. Browser → detect the site from the title (needs a title).
    if (category === "Web" || normalizedApp.includes("browser") || normalizedApp.includes("chrome")) {
        const site = detectSite(title)
        if (site) {
            domain = site
            category = SITE_TO_CATEGORY[site] || "Web"
        }
    }

    // 3. Title-based override for generically-named apps.
    if (category === "Other") {
        if (/visual studio|intellij|pycharm|webstorm|sublime|atom/i.test(title)) {
            category = "Development"
        } else if (/word|excel|powerpoint|outlook|onenote|pdf/i.test(title)) {
            category = "Work"
        }
    }

    return { category, domain }
}

function idleWindow(rawApp: string, rawPath?: string): ActiveWindow {
    return {
        appName: "Idle",
        title: "Away from Keyboard",
        rawApp,
        rawPath,
        isIdle: true,
        category: "Idle",
    }
}

/**
 * Parse the app name out of `lsappinfo info -only name <asn>` output, which looks
 * like:  "LSDisplayName"="Google Chrome"
 */
export function parseLsAppName(stdout: string): string | null {
    const m = stdout.match(/"LSDisplayName"\s*=\s*"([^"]+)"/)
    return m ? m[1].trim() || null : null
}

function run(cmd: string, args: string[], timeout = 1500): Promise<string> {
    return new Promise((resolve) => {
        try {
            execFile(cmd, args, { timeout }, (err, stdout) => {
                resolve(err ? "" : String(stdout))
            })
        } catch {
            resolve("")
        }
    })
}

/**
 * Permission-free frontmost app on macOS. `lsappinfo` reports the foreground app
 * without any TCC permission (no Accessibility / Screen Recording prompt), so app
 * level tracking keeps working even when the user hasn't granted access. The
 * trade-off: no window title and therefore no in-browser site detection.
 */
async function macFrontmostAppName(): Promise<string | null> {
    const asn = (await run("lsappinfo", ["front"])).trim()
    if (!asn) return null
    return parseLsAppName(await run("lsappinfo", ["info", "-only", "name", asn]))
}

/* ---------------- ENGINE ---------------- */

export async function getActiveWindow(): Promise<ActiveWindow | null> {
    try {
        const isIdle = powerMonitor.getSystemIdleTime() > IDLE_THRESHOLD_S

        // macOS: always use the permission-free app-name source (lsappinfo) and
        // never call active-win. active-win's native helper invokes Accessibility
        // APIs, which repeatedly surfaces the system permission prompt on unsigned
        // builds (the grant can't persist without Developer ID notarization). We
        // trade window titles / website detection for a prompt-free experience;
        // app-level screen time still records fully.
        if (process.platform === "darwin") {
            const appName = await macFrontmostAppName()
            if (!appName) return null
            if (isIdle) return idleWindow(appName)
            const { category } = categorize(appName)
            return {
                appName,
                title: "",
                rawApp: appName,
                isIdle: false,
                category,
            }
        }

        // Full path: active-win gives app name + window title (+ site detection).
        const win = await activeWin()
        if (!win) return null

        const rawApp = win.owner.name
        const rawPath = win.owner.path
        const title = win.title || ""

        if (isIdle) return idleWindow(rawApp, rawPath)

        const { category, domain } = categorize(rawApp, title)
        return {
            appName: rawApp.replace(".exe", ""),
            title,
            rawApp,
            rawPath,
            isIdle: false,
            category,
            domain,
        }
    } catch {
        // Native errors (e.g. from active-win) — treat as "no data this pulse".
        return null
    }
}
