import activeWin from 'active-win'
import { powerMonitor, systemPreferences } from 'electron'

export interface ActiveWindow {
    appName: string
    title: string
    rawApp: string
    rawPath?: string
    isIdle: boolean
    category: 'Work' | 'Web' | 'Development' | 'Communication' | 'Entertainment' | 'Other' | 'Idle'
    domain?: string
}

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
    'Twitter': 'Web',
    'X/Twitter': 'Web',
    'Reddit': 'Entertainment',
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

/* ---------------- ENGINE ---------------- */

export async function getActiveWindow(): Promise<ActiveWindow | null> {
    try {
        // macOS: Check for accessibility permission without requesting it (false)
        if (process.platform === 'darwin') {
            const hasAccess = systemPreferences.isTrustedAccessibilityClient(false)
            if (!hasAccess) {
                // If we don't have access, we can still detect idle time via powerMonitor
                // but we can't reliably get the active window title.
                // We return null to indicate tracking is disabled/restricted.
                return null
            }
        }

        const win = await activeWin()
        if (!win) return null

        const idleTime = powerMonitor.getSystemIdleTime()
        const isIdle = idleTime > 180 // 3 minutes for true idle

        const rawApp = win.owner.name
        const rawPath = win.owner.path
        const title = win.title || ''
        const normalizedApp = normalize(rawApp)

        if (isIdle) {
            return {
                appName: 'Idle',
                title: 'Away from Keyboard',
                rawApp,
                rawPath,
                isIdle: true,
                category: 'Idle'
            }
        }

        // 1. Determine base category from App Name
        let category: ActiveWindow['category'] = CATEGORY_MAP[normalizedApp] || 'Other'
        let domain: string | undefined

        // 2. Special handling for Browsers (Site Detection)
        if (category === 'Web' || normalizedApp.includes('browser') || normalizedApp.includes('chrome')) {
            const site = detectSite(title)
            if (site) {
                domain = site
                category = SITE_TO_CATEGORY[site] || 'Web'
            }
        }

        // 3. Title-based override (for apps with generic names)
        if (category === 'Other') {
            if (/visual studio|intellij|pycharm|webstorm|sublime|atom/i.test(title)) {
                category = 'Development'
            } else if (/word|excel|powerpoint|outlook|onenote|pdf/i.test(title)) {
                category = 'Work'
            }
        }

        return {
            appName: rawApp.replace('.exe', ''), // Keep original app name
            title,
            rawApp,
            rawPath,
            isIdle: false,
            category,
            domain
        }

    } catch (e: any) {
        // Catch any remaining errors (e.g. from active-win native code)
        return null
    }
}
