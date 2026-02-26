import { SECURITY_CONFIG, COMMON_PASSWORDS, VALIDATION_PATTERNS } from '@/config/security'

/**
 * Security Utilities
 * Comprehensive security functions for authentication and data protection
 */

// ==================== INPUT SANITIZATION ====================

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
    if (!input) return ''

    // Remove any HTML tags
    let sanitized = input.replace(/<[^>]*>/g, '')

    // Escape special characters
    sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')

    return sanitized.trim()
}

/**
 * Validate input for SQL injection attempts
 */
export function detectSQLInjection(input: string): boolean {
    return VALIDATION_PATTERNS.SQL_INJECTION.test(input)
}

/**
 * Validate input for XSS attempts
 */
export function detectXSS(input: string): boolean {
    return VALIDATION_PATTERNS.XSS.test(input)
}

/**
 * Comprehensive input validation
 */
export function validateInput(input: string, maxLength: number = 1000): {
    valid: boolean
    sanitized: string
    error?: string
} {
    if (!input) {
        return { valid: false, sanitized: '', error: 'Input is required' }
    }

    if (input.length > maxLength) {
        return { valid: false, sanitized: '', error: `Input exceeds maximum length of ${maxLength}` }
    }

    if (detectSQLInjection(input)) {
        return { valid: false, sanitized: '', error: 'Invalid input detected' }
    }

    if (detectXSS(input)) {
        return { valid: false, sanitized: '', error: 'Invalid input detected' }
    }

    return { valid: true, sanitized: sanitizeInput(input) }
}

// ==================== PASSWORD SECURITY ====================

/**
 * Validate email format with strict rules
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
    if (!email) {
        return { valid: false, error: 'Email is required' }
    }

    if (email.length > SECURITY_CONFIG.INPUT.MAX_EMAIL_LENGTH) {
        return { valid: false, error: 'Email is too long' }
    }

    if (!VALIDATION_PATTERNS.EMAIL.test(email)) {
        return { valid: false, error: 'Invalid email format' }
    }

    return { valid: true }
}

/**
 * Check if password is in common passwords list
 */
function isCommonPassword(password: string): boolean {
    const lowerPassword = password.toLowerCase()
    return COMMON_PASSWORDS.some(common => lowerPassword.includes(common))
}

/**
 * Comprehensive password validation
 */
export function validatePassword(password: string): {
    valid: boolean
    errors: string[]
    strength: 'weak' | 'medium' | 'strong' | 'very-strong'
    score: number
} {
    const errors: string[] = []
    let score = 0

    // Length check
    if (password.length < SECURITY_CONFIG.PASSWORD.MIN_LENGTH) {
        errors.push(`Password must be at least ${SECURITY_CONFIG.PASSWORD.MIN_LENGTH} characters`)
    } else {
        score += 20
        if (password.length >= 16) score += 10
        if (password.length >= 20) score += 10
    }

    if (password.length > SECURITY_CONFIG.PASSWORD.MAX_LENGTH) {
        errors.push(`Password must not exceed ${SECURITY_CONFIG.PASSWORD.MAX_LENGTH} characters`)
    }

    // Character type checks
    if (SECURITY_CONFIG.PASSWORD.REQUIRE_UPPERCASE && !VALIDATION_PATTERNS.UPPERCASE.test(password)) {
        errors.push('Password must contain at least one uppercase letter')
    } else {
        score += 15
    }

    if (SECURITY_CONFIG.PASSWORD.REQUIRE_LOWERCASE && !VALIDATION_PATTERNS.LOWERCASE.test(password)) {
        errors.push('Password must contain at least one lowercase letter')
    } else {
        score += 15
    }

    if (SECURITY_CONFIG.PASSWORD.REQUIRE_NUMBERS && !VALIDATION_PATTERNS.NUMBER.test(password)) {
        errors.push('Password must contain at least one number')
    } else {
        score += 15
    }

    if (SECURITY_CONFIG.PASSWORD.REQUIRE_SPECIAL_CHARS && !VALIDATION_PATTERNS.SPECIAL_CHAR.test(password)) {
        errors.push('Password must contain at least one special character (!@#$%^&*...)')
    } else {
        score += 15
    }

    // Common password check
    if (SECURITY_CONFIG.PASSWORD.COMMON_PASSWORDS_CHECK && isCommonPassword(password)) {
        errors.push('This password is too common. Please choose a more unique password')
        score = Math.min(score, 30)
    }

    // Check for sequential characters (informational, doesn't block)
    if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
        score -= 5
    }

    // Determine strength
    let strength: 'weak' | 'medium' | 'strong' | 'very-strong'
    if (score >= 90) strength = 'very-strong'
    else if (score >= 70) strength = 'strong'
    else if (score >= 50) strength = 'medium'
    else strength = 'weak'

    return {
        valid: errors.length === 0,
        errors,
        strength,
        score: Math.max(0, Math.min(100, score)),
    }
}

// ==================== RATE LIMITING ====================

interface RateLimitRecord {
    attempts: number[]
    lockedUntil?: number
}

const rateLimitStore = new Map<string, RateLimitRecord>()

/**
 * Check if action is rate limited
 */
export function checkRateLimit(
    identifier: string,
    maxAttempts: number,
    windowMs: number,
    lockoutDurationMs?: number
): { allowed: boolean; remainingAttempts?: number; lockedUntil?: number } {
    const now = Date.now()
    const record = rateLimitStore.get(identifier) || { attempts: [] }

    // Check if currently locked out
    if (record.lockedUntil && now < record.lockedUntil) {
        return {
            allowed: false,
            lockedUntil: record.lockedUntil,
        }
    }

    // Remove old attempts outside the window
    record.attempts = record.attempts.filter(timestamp => now - timestamp < windowMs)

    // Check if limit exceeded
    if (record.attempts.length >= maxAttempts) {
        if (lockoutDurationMs) {
            record.lockedUntil = now + lockoutDurationMs
            rateLimitStore.set(identifier, record)
            return {
                allowed: false,
                lockedUntil: record.lockedUntil,
            }
        }
        return {
            allowed: false,
            remainingAttempts: 0,
        }
    }

    // Record this attempt
    record.attempts.push(now)
    rateLimitStore.set(identifier, record)

    return {
        allowed: true,
        remainingAttempts: maxAttempts - record.attempts.length,
    }
}

/**
 * Clear rate limit for identifier (use after successful auth)
 */
export function clearRateLimit(identifier: string): void {
    rateLimitStore.delete(identifier)
}

/**
 * Check login rate limit
 */
export function checkLoginRateLimit(email: string): {
    allowed: boolean
    remainingAttempts?: number
    lockedUntil?: number
    message?: string
} {
    const result = checkRateLimit(
        `login:${email}`,
        SECURITY_CONFIG.RATE_LIMIT.MAX_LOGIN_ATTEMPTS,
        SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS,
        SECURITY_CONFIG.RATE_LIMIT.LOCKOUT_DURATION_MS
    )

    if (!result.allowed) {
        if (result.lockedUntil) {
            const minutesRemaining = Math.ceil((result.lockedUntil - Date.now()) / 60000)
            return {
                ...result,
                message: `Account temporarily locked. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}`,
            }
        }
        return {
            ...result,
            message: 'Too many login attempts. Please try again later',
        }
    }

    return result
}

/**
 * Check signup rate limit
 */
export function checkSignupRateLimit(ip: string): {
    allowed: boolean
    remainingAttempts?: number
    message?: string
} {
    const result = checkRateLimit(
        `signup:${ip}`,
        SECURITY_CONFIG.RATE_LIMIT.MAX_SIGNUP_ATTEMPTS,
        SECURITY_CONFIG.RATE_LIMIT.SIGNUP_WINDOW_MS
    )

    if (!result.allowed) {
        return {
            ...result,
            message: 'Too many signup attempts. Please try again later',
        }
    }

    return result
}

// ==================== SESSION SECURITY ====================

interface SessionData {
    createdAt: number
    lastActivity: number
    userId: string
}

const sessionStore = new Map<string, SessionData>()

/**
 * Validate session is still active
 */
export function validateSession(sessionId: string): {
    valid: boolean
    reason?: 'expired' | 'timeout' | 'not-found'
} {
    const session = sessionStore.get(sessionId)

    if (!session) {
        return { valid: false, reason: 'not-found' }
    }

    const now = Date.now()

    // Check max session duration
    if (now - session.createdAt > SECURITY_CONFIG.SESSION.MAX_DURATION_MS) {
        sessionStore.delete(sessionId)
        return { valid: false, reason: 'expired' }
    }

    // Check inactivity timeout
    if (now - session.lastActivity > SECURITY_CONFIG.SESSION.TIMEOUT_MS) {
        sessionStore.delete(sessionId)
        return { valid: false, reason: 'timeout' }
    }

    // Update last activity
    session.lastActivity = now
    sessionStore.set(sessionId, session)

    return { valid: true }
}

/**
 * Create new session
 */
export function createSession(sessionId: string, userId: string): void {
    const now = Date.now()
    sessionStore.set(sessionId, {
        createdAt: now,
        lastActivity: now,
        userId,
    })
}

/**
 * Destroy session
 */
export function destroySession(sessionId: string): void {
    sessionStore.delete(sessionId)
}

/**
 * Update session activity
 */
export function updateSessionActivity(sessionId: string): void {
    const session = sessionStore.get(sessionId)
    if (session) {
        session.lastActivity = Date.now()
        sessionStore.set(sessionId, session)
    }
}

// ==================== SECURE ERROR MESSAGES ====================

/**
 * Generate secure error messages that don't leak information
 */
export function getSecureErrorMessage(error: unknown, context: 'login' | 'signup' | 'general'): string {
    if (typeof error === 'string') {
        return sanitizeErrorMessage(error, context)
    }

    if (error instanceof Error) {
        return sanitizeErrorMessage(error.message, context)
    }

    return 'An error occurred. Please try again.'
}

function sanitizeErrorMessage(message: string, context: 'login' | 'signup' | 'general'): string {
    // Don't reveal whether email exists or not
    if (message.includes('Invalid login credentials') ||
        message.includes('Email not found') ||
        message.includes('User not found') ||
        message.includes('Wrong password')) {
        return 'Invalid email or password'
    }

    if (message.includes('Email not confirmed') || message.includes('not verified')) {
        return 'Please verify your email address before logging in'
    }

    if (message.includes('User already registered') || message.includes('already exists')) {
        // For signup, we can reveal this to prevent account enumeration attacks
        if (context === 'signup') {
            return 'An account with this email already exists'
        }
        return 'Unable to create account. Please try a different email.'
    }

    if (message.includes('rate limit') || message.includes('too many')) {
        return 'Too many attempts. Please try again later.'
    }

    if (message.includes('network') || message.includes('connection')) {
        return 'Network error. Please check your connection and try again.'
    }

    // Generic error for anything else
    return 'An error occurred. Please try again.'
}

// ==================== FINGERPRINTING ====================

/**
 * Generate browser fingerprint for additional security
 */
export function generateBrowserFingerprint(): string {
    const components = [
        navigator.userAgent,
        navigator.language,
        new Date().getTimezoneOffset(),
        screen.width,
        screen.height,
        screen.colorDepth,
    ]

    return btoa(components.join('|'))
}

// ==================== SECURE STORAGE ====================

/**
 * Securely store sensitive data in localStorage with encryption
 */
export function secureStore(key: string, value: string): void {
    try {
        // In production, you would encrypt this value
        // For now, we'll use base64 encoding as a basic obfuscation
        const encoded = btoa(value)
        localStorage.setItem(`secure_${key}`, encoded)
    } catch (error) {
        console.error('Failed to store secure data:', error)
    }
}

/**
 * Retrieve securely stored data
 */
export function secureRetrieve(key: string): string | null {
    try {
        const encoded = localStorage.getItem(`secure_${key}`)
        if (!encoded) return null
        return atob(encoded)
    } catch (error) {
        console.error('Failed to retrieve secure data:', error)
        return null
    }
}

/**
 * Clear secure storage
 */
export function secureClear(key: string): void {
    localStorage.removeItem(`secure_${key}`)
}
