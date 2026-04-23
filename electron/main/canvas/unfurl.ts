import { dbOps } from '../db'
import { net } from 'electron'

const TTL_MS = 24 * 60 * 60 * 1000

function getCached(url: string) {
    const rows = dbOps.exec('SELECT * FROM link_previews WHERE url=?', [url]) as any[]
    const row = rows && rows[0]
    if (!row) return null
    const fetchedAt = row.fetched_at ? new Date(row.fetched_at).getTime() : 0
    if (Date.now() - fetchedAt > TTL_MS) return null
    return {
        url,
        title: row.title ?? undefined,
        description: row.description ?? undefined,
        image: row.image ?? undefined,
        siteName: row.site_name ?? undefined,
        fetchedAt,
    }
}

function putCache(url: string, data: {
    title?: string; description?: string; image?: string; siteName?: string
}) {
    dbOps.exec(
        'INSERT OR REPLACE INTO link_previews (url,title,description,image,site_name,fetched_at) VALUES (?,?,?,?,?,?)',
        [url, data.title ?? null, data.description ?? null, data.image ?? null, data.siteName ?? null, new Date().toISOString()]
    )
}

function fetchHtml(url: string, timeoutMs = 5000): Promise<string> {
    return new Promise((resolve, reject) => {
        let done = false
        const req = net.request({ method: 'GET', url, redirect: 'follow' })
        req.setHeader('user-agent', 'Mozilla/5.0 (compatible; Quoril/1.0)')
        req.setHeader('accept', 'text/html,application/xhtml+xml')

        const to = setTimeout(() => {
            if (done) return
            done = true
            try { req.abort() } catch { /* ignore */ }
            reject(new Error('timeout'))
        }, timeoutMs)

        req.on('response', (res) => {
            let total = 0
            let buf = ''
            res.on('data', (chunk: Buffer) => {
                total += chunk.length
                // Only need the <head> — cap at 256kb
                if (total < 256 * 1024) buf += chunk.toString('utf8')
            })
            res.on('end', () => {
                if (done) return
                done = true
                clearTimeout(to)
                resolve(buf)
            })
            res.on('error', (e) => {
                if (done) return
                done = true
                clearTimeout(to)
                reject(e)
            })
        })
        req.on('error', (e) => {
            if (done) return
            done = true
            clearTimeout(to)
            reject(e)
        })
        req.end()
    })
}

function decodeEntities(s: string) {
    return s
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&nbsp;/g, ' ')
}

function metaTag(html: string, key: string, value: string) {
    // Matches <meta property="og:title" content="..."> in either attribute order
    const esc = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re1 = new RegExp(`<meta[^>]+${key}=["']${esc}["'][^>]+content=["']([^"']+)["']`, 'i')
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${key}=["']${esc}["']`, 'i')
    const m = html.match(re1) ?? html.match(re2)
    return m ? decodeEntities(m[1]) : undefined
}

function parseOg(html: string, baseUrl: string) {
    const title =
        metaTag(html, 'property', 'og:title') ??
        metaTag(html, 'name', 'twitter:title') ??
        (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ? decodeEntities(html.match(/<title[^>]*>([^<]+)<\/title>/i)![1].trim()) : undefined)
    const description =
        metaTag(html, 'property', 'og:description') ??
        metaTag(html, 'name', 'twitter:description') ??
        metaTag(html, 'name', 'description')
    let image =
        metaTag(html, 'property', 'og:image') ??
        metaTag(html, 'name', 'twitter:image') ??
        metaTag(html, 'property', 'og:image:url')
    const siteName = metaTag(html, 'property', 'og:site_name')

    if (image && !/^https?:\/\//i.test(image)) {
        try { image = new URL(image, baseUrl).href } catch { /* ignore */ }
    }

    return { title, description, image, siteName }
}

export async function unfurlLink(url: string) {
    try {
        const cached = getCached(url)
        if (cached) return cached
    } catch { /* ignore */ }

    try {
        const html = await fetchHtml(url)
        const parsed = parseOg(html, url)
        const data = { url, ...parsed, fetchedAt: Date.now() }
        try { putCache(url, parsed) } catch { /* ignore */ }
        return data
    } catch {
        return { url, fetchedAt: Date.now() }
    }
}
