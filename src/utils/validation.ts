import { formatDuration, calculatePercentage } from './helpers'

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

/**
 * Check password strength
 * Returns: { valid: boolean, message: string, strength: 'weak' | 'medium' | 'strong' }
 */
export function checkPasswordStrength(password: string): {
    valid: boolean
    message: string
    strength: 'weak' | 'medium' | 'strong'
} {
    if (password.length < 8) {
        return {
            valid: false,
            message: 'Password must be at least 8 characters',
            strength: 'weak',
        }
    }

    let strength: 'weak' | 'medium' | 'strong' = 'weak'
    let score = 0

    // Check for different character types
    if (/[a-z]/.test(password)) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^a-zA-Z0-9]/.test(password)) score++

    if (score >= 4 && password.length >= 12) {
        strength = 'strong'
    } else if (score >= 3 || password.length >= 10) {
        strength = 'medium'
    }

    return {
        valid: true,
        message: `Password strength: ${strength}`,
        strength,
    }
}

/**
 * Format error message for user display
 */
export function formatErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        // Handle common Supabase errors
        if (error.message.includes('Invalid login credentials')) {
            return 'Invalid email or password'
        }
        if (error.message.includes('Email not confirmed')) {
            return 'Please verify your email address'
        }
        if (error.message.includes('User already registered')) {
            return 'An account with this email already exists'
        }
        return error.message
    }
    return 'An unexpected error occurred'
}

/**
 * Format time remaining for focus session
 */
export function formatTimeRemaining(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Calculate focus score based on session data
 */
export function calculateFocusScore(
    plannedMinutes: number,
    actualMinutes: number,
    interruptions: number
): number {
    // Base score from completion percentage
    const completionScore = Math.min(100, (actualMinutes / plannedMinutes) * 100)

    // Penalty for interruptions (max 30 points)
    const interruptionPenalty = Math.min(30, interruptions * 10)

    // Final score (0-100)
    return Math.max(0, Math.round(completionScore - interruptionPenalty))
}

// Re-export common helpers
export { formatDuration, calculatePercentage }
