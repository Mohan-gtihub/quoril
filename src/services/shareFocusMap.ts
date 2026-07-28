import supabase from './supabase'

/** Canonical landing-site origin where shared maps are rendered. */
const SHARE_BASE_URL = 'https://quoril.in'

export interface FocusMapShareStats {
    monthStr: string
    totalStr: string
    activeDays: number
    streak: number
    bestStr: string
}

export interface FocusMapSharePayload {
    /** Per-day focus minutes, keyed "YYYY-MM-DD". */
    activity: Record<string, number>
    stats: FocusMapShareStats
    generatedAt: string
}

/**
 * Uploads a focus-map snapshot to Supabase and returns a public link that
 * anyone can open in a browser. The link encodes only the snapshot id; the
 * row holds the (unlisted, UUID-gated) payload.
 */
export async function createFocusMapShareLink(payload: FocusMapSharePayload): Promise<string> {
    const { data: userData } = await supabase.auth.getUser()

    // Cast to `any` — the generated Database type doesn't include this table,
    // matching the existing pattern in dataSyncService.ts.
    const { data, error } = await (supabase.from('shared_focus_maps') as any)
        .insert({
            payload,
            owner_id: userData?.user?.id ?? null,
        })
        .select('id')
        .single()

    if (error || !data?.id) {
        throw new Error(error?.message || 'Failed to create share link')
    }

    return `${SHARE_BASE_URL}/share/${data.id}`
}
