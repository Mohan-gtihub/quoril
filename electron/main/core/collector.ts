import activeWin from 'active-win'
import { powerMonitor } from 'electron'

export interface ActiveWindow {
    appName: string
    title: string
    rawApp: string
    rawPath?: string
    isIdle: boolean
    category: string
}

const BROWSERS = [
    'chrome', 'msedge', 'firefox', 'brave', 'opera', 'safari', 'vivaldi', 'google chrome'
]

const SITE_PATTERNS = [
    { name: 'YouTube', match: /youtube/i },
    { name: 'ChatGPT', match: /chatgpt|openai/i },
    { name: 'Claude', match: /claude|anthropic/i },
    { name: 'GitHub', match: /github/i },
    { name: 'WhatsApp Web', match: /whatsapp/i },
    { name: 'Notion', match: /notion/i },
    { name: 'Gmail', match: /gmail/i },
    { name: 'LinkedIn', match: /linkedin/i },
    { name: 'Twitter/X', match: /twitter|x\.com/i },
    { name: 'Figma', match: /figma/i },
    { name: 'Antigravity', match: /antigravity|quoril/i }
]

const DEV_KEYWORDS = [
    'code', 'cursor', 'windsurf', 'idea', 'pycharm',
    'webstorm', 'studio', 'atom', 'sublime'
]

function normalize(name: string) {
    return name
        .replace('.exe', '')
        .replace('.app', '')
        .toLowerCase()
        .trim()
}

function isBrowser(app: string) {
    return BROWSERS.includes(app.toLowerCase())
}

function detectSite(title: string) {
    for (const s of SITE_PATTERNS) {
        if (s.match.test(title)) return s.name
    }
    return null
}

function detectIDE(app: string, path?: string) {
    const s = `${app} ${path || ''}`.toLowerCase()
    return DEV_KEYWORDS.some(k => s.includes(k))
}

export async function getActiveWindow(): Promise<ActiveWindow | null> {
    try {
        const win = await activeWin()
        if (!win) return null

        const idleTime = powerMonitor.getSystemIdleTime()
        const isIdle = idleTime > 60 // 1 minute threshold

        const rawApp = win.owner.name
        const rawPath = win.owner.path
        const title = win.title || ''

        const normalizedApp = normalize(rawApp)
        let category = 'Other'

        // Idle check
        if (isIdle) {
            return {
                appName: 'Idle',
                title: 'AFK',
                rawApp,
                rawPath,
                isIdle: true,
                category: 'Idle'
            }
        }

        // 1. Browser sites
        if (isBrowser(normalizedApp)) {
            const site = detectSite(title)
            if (site) {
                return {
                    appName: site,
                    title,
                    rawApp,
                    rawPath,
                    isIdle: false,
                    category: 'Web'
                }
            }
        }

        // 2. IDE / Dev tools
        if (detectIDE(normalizedApp, rawPath)) {
            return {
                appName: 'IDE',
                title,
                rawApp,
                rawPath,
                isIdle: false,
                category: 'Development'
            }
        }

        // 3. Messengers
        if (/whatsapp|telegram|discord/i.test(normalizedApp + title)) {
            return {
                appName: 'Messenger',
                title,
                rawApp,
                rawPath,
                isIdle: false,
                category: 'Communication'
            }
        }

        // Default: Pure app name
        return {
            appName: rawApp.replace('.exe', ''),
            title,
            rawApp,
            rawPath,
            isIdle: false,
            category
        }

    } catch (e) {
        // console.error('[Collector] Window tracking failed:', e)
        return null
    }
}
