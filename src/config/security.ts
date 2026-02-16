/**
 * Security Configuration
 * Centralized security settings and constants
 */

export const SECURITY_CONFIG = {
    // Password Requirements
    PASSWORD: {
        MIN_LENGTH: 12,
        REQUIRE_UPPERCASE: true,
        REQUIRE_LOWERCASE: true,
        REQUIRE_NUMBERS: true,
        REQUIRE_SPECIAL_CHARS: true,
        MAX_LENGTH: 128,
        COMMON_PASSWORDS_CHECK: true,
    },

    // Rate Limiting
    RATE_LIMIT: {
        MAX_LOGIN_ATTEMPTS: 5,
        LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
        WINDOW_MS: 60 * 1000, // 1 minute
        MAX_SIGNUP_ATTEMPTS: 3,
        SIGNUP_WINDOW_MS: 60 * 60 * 1000, // 1 hour
    },

    // Session Management
    SESSION: {
        TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes of inactivity
        MAX_DURATION_MS: 12 * 60 * 60 * 1000, // 12 hours max session
        REFRESH_THRESHOLD_MS: 5 * 60 * 1000, // Refresh 5 min before expiry
        REQUIRE_REAUTH_FOR_SENSITIVE: true,
    },

    // Security Headers
    HEADERS: {
        CONTENT_SECURITY_POLICY: true,
        X_FRAME_OPTIONS: 'DENY',
        X_CONTENT_TYPE_OPTIONS: 'nosniff',
        STRICT_TRANSPORT_SECURITY: 'max-age=31536000; includeSubDomains',
    },

    // Input Validation
    INPUT: {
        MAX_EMAIL_LENGTH: 254,
        SANITIZE_HTML: true,
        PREVENT_XSS: true,
    },

    // Encryption
    ENCRYPTION: {
        ALGORITHM: 'AES-GCM',
        KEY_SIZE: 256,
    },
} as const

// Common weak passwords to reject
export const COMMON_PASSWORDS = [
    'password',
    'password123',
    '12345678',
    'qwerty123',
    'admin123',
    'letmein',
    'welcome123',
    'monkey123',
    '1234567890',
    'password1',
]

// Regex patterns for validation
export const VALIDATION_PATTERNS = {
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    UPPERCASE: /[A-Z]/,
    LOWERCASE: /[a-z]/,
    NUMBER: /[0-9]/,
    SPECIAL_CHAR: /[\!@#\$%\^&\*\(\)_\+\-=\[\]\{\};':"\\|,.<>\/\?]/,
    SQL_INJECTION: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)|(-{2})|(\*\/)|(\bOR\b.*=.*)/i,
    XSS: /<script|javascript:|onerror=|onload=/i,
} as const
