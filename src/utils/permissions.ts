// Roles & subscription entitlements, read from the JWT.
//
// The Supabase custom_access_token_hook (supabase/auth_hook_roles.sql) stamps
// `roles` (string[]) and `tier` into user.app_metadata, so these checks need
// ZERO database round-trips — they read the already-decoded session.
//
// Roles and tier are two SEPARATE dimensions: a user can be an alpha_tester
// AND a lifetime subscriber at the same time.

import type { Session, User } from '@supabase/supabase-js'

export type AppRole =
    | 'admin'
    | 'alpha_tester'
    | 'beta_tester'
    | 'blog_publisher'
    | 'end_user'

export type SubscriptionTier = 'free' | 'monthly' | 'annual' | 'lifetime'

// The custom_access_token_hook injects `roles`/`tier` into the ACCESS TOKEN
// (JWT), NOT into session.user.app_metadata — Supabase never copies custom JWT
// claims onto the user object. So we decode the JWT payload directly.

interface JwtClaims {
    roles?: unknown
    tier?: unknown
    app_metadata?: { roles?: unknown; tier?: unknown }
}

function decodeJwt(token: string | null | undefined): JwtClaims | null {
    if (!token) return null
    try {
        const payload = token.split('.')[1]
        if (!payload) return null
        // base64url → base64, then decode.
        const b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
        return JSON.parse(atob(b64)) as JwtClaims
    } catch {
        return null
    }
}

// The hook writes claims under app_metadata; some setups put them top-level.
// Accept either shape.
function claimRoles(c: JwtClaims | null): unknown {
    return c?.app_metadata?.roles ?? c?.roles
}
function claimTier(c: JwtClaims | null): unknown {
    return c?.app_metadata?.tier ?? c?.tier
}

/**
 * Roles from the current session's access token. Accepts either a Session
 * (preferred — reads the JWT) or a bare User (falls back to app_metadata,
 * which is usually empty for hook-injected claims).
 */
export function rolesOf(source: Session | User | null | undefined): AppRole[] {
    let raw: unknown
    if (source && 'access_token' in source) {
        raw = claimRoles(decodeJwt(source.access_token))
    } else {
        raw = (source?.app_metadata as { roles?: unknown } | undefined)?.roles
    }
    return Array.isArray(raw) ? (raw.filter((r) => typeof r === 'string') as AppRole[]) : []
}

/** Effective subscription tier from the session's access token. */
export function tierOf(source: Session | User | null | undefined): SubscriptionTier {
    let t: unknown
    if (source && 'access_token' in source) {
        t = claimTier(decodeJwt(source.access_token))
    } else {
        t = (source?.app_metadata as { tier?: unknown } | undefined)?.tier
    }
    return t === 'monthly' || t === 'annual' || t === 'lifetime' ? t : 'free'
}

type Principal = Session | User | null | undefined

export function hasRole(source: Principal, role: AppRole): boolean {
    return rolesOf(source).includes(role)
}

export function hasAnyRole(source: Principal, ...roles: AppRole[]): boolean {
    const owned = rolesOf(source)
    return roles.some((r) => owned.includes(r))
}

export function isAdmin(source: Principal): boolean {
    return hasRole(source, 'admin')
}

/** Alpha OR beta tester — the audience for the in-app feedback widget. */
export function isTester(source: Principal): boolean {
    return hasAnyRole(source, 'alpha_tester', 'beta_tester')
}

export function canPublishBlog(source: Principal): boolean {
    return hasAnyRole(source, 'blog_publisher', 'admin')
}

/** Any non-free tier — testers count via the effective-tier hook. */
export function isPremium(source: Principal): boolean {
    return tierOf(source) !== 'free'
}
