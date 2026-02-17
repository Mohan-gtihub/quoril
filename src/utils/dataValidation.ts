/**
 * Data validation utilities to prevent corrupted time tracking data
 */

export interface ValidationResult {
    isValid: boolean
    error?: string
    correctedValue?: any
}

/**
 * Validates time values to prevent corruption
 */
export function validateTimeValue(seconds: number, fieldName: string): ValidationResult {
    // Check for NaN
    if (isNaN(seconds)) {
        return {
            isValid: false,
            error: `${fieldName} cannot be NaN`,
            correctedValue: 0
        }
    }

    // Check for negative values
    if (seconds < 0) {
        return {
            isValid: false,
            error: `${fieldName} cannot be negative`,
            correctedValue: 0
        }
    }

    // Check for unreasonably large values (> 24 hours for single session)
    const MAX_REASONABLE_SECONDS = 24 * 60 * 60 // 24 hours
    if (seconds > MAX_REASONABLE_SECONDS) {
        return {
            isValid: false,
            error: `${fieldName} exceeds maximum reasonable value (${Math.round(MAX_REASONABLE_SECONDS / 3600)}h)`,
            correctedValue: MAX_REASONABLE_SECONDS
        }
    }

    return { isValid: true }
}

/**
 * Validates task actual_seconds field
 */
export function validateTaskActualSeconds(actualSeconds: number | undefined | null): ValidationResult {
    if (actualSeconds === undefined || actualSeconds === null) {
        return {
            isValid: true,
            correctedValue: 0
        }
    }

    return validateTimeValue(actualSeconds, 'actual_seconds')
}

/**
 * Validates session seconds field
 */
export function validateSessionSeconds(sessionSeconds: number | undefined | null): ValidationResult {
    if (sessionSeconds === undefined || sessionSeconds === null) {
        return {
            isValid: true,
            correctedValue: 0
        }
    }

    return validateTimeValue(sessionSeconds, 'session seconds')
}

/**
 * Validates date strings
 */
export function validateDateString(dateString: string | null | undefined, fieldName: string): ValidationResult {
    if (!dateString) {
        return { isValid: true }
    }

    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
        return {
            isValid: false,
            error: `${fieldName} is not a valid date`,
            correctedValue: new Date().toISOString()
        }
    }

    // Check for dates too far in the future or past
    const now = new Date()
    const oneYearAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000))
    const oneYearFromNow = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000))

    if (date < oneYearAgo || date > oneYearFromNow) {
        return {
            isValid: false,
            error: `${fieldName} is outside reasonable date range`,
            correctedValue: now.toISOString()
        }
    }

    return { isValid: true }
}

/**
 * Sanitizes and validates task data before saving
 */
export function sanitizeTaskData(task: any): any {
    const sanitized = { ...task }

    // Validate actual_seconds
    const actualSecondsValidation = validateTaskActualSeconds(task.actual_seconds)
    if (!actualSecondsValidation.isValid && actualSecondsValidation.correctedValue !== undefined) {
        console.warn(`[DataValidation] ${actualSecondsValidation.error}, correcting from ${task.actual_seconds} to ${actualSecondsValidation.correctedValue}`)
        sanitized.actual_seconds = actualSecondsValidation.correctedValue
    }

    // Validate dates
    const dateFields = ['created_at', 'updated_at', 'completed_at', 'started_at', 'due_at']
    dateFields.forEach(field => {
        const dateValidation = validateDateString(task[field], field)
        if (!dateValidation.isValid && dateValidation.correctedValue !== undefined) {
            console.warn(`[DataValidation] ${dateValidation.error}, correcting ${field}`)
            sanitized[field] = dateValidation.correctedValue
        }
    })

    return sanitized
}

/**
 * Sanitizes and validates session data before saving
 */
export function sanitizeSessionData(session: any): any {
    const sanitized = { ...session }

    // Validate seconds
    const secondsValidation = validateSessionSeconds(session.seconds)
    if (!secondsValidation.isValid && secondsValidation.correctedValue !== undefined) {
        console.warn(`[DataValidation] ${secondsValidation.error}, correcting from ${session.seconds} to ${secondsValidation.correctedValue}`)
        sanitized.seconds = secondsValidation.correctedValue
    }

    // Validate dates
    const dateFields = ['start_time', 'end_time', 'created_at']
    dateFields.forEach(field => {
        const dateValidation = validateDateString(session[field], field)
        if (!dateValidation.isValid && dateValidation.correctedValue !== undefined) {
            console.warn(`[DataValidation] ${dateValidation.error}, correcting ${field}`)
            sanitized[field] = dateValidation.correctedValue
        }
    })

    // Ensure end_time is after start_time
    if (sanitized.start_time && sanitized.end_time) {
        const start = new Date(sanitized.start_time)
        const end = new Date(sanitized.end_time)
        if (end <= start) {
            console.warn(`[DataValidation] end_time must be after start_time, correcting`)
            sanitized.end_time = new Date(start.getTime() + 60000).toISOString() // Add 1 minute
        }
    }

    return sanitized
}

/**
 * Maps internal session types to database types
 */
export function mapSessionTypeToDB(type: string): 'focus' | 'break' | 'long_break' {
    if (type === 'break') return 'break'
    if (type === 'long_break') return 'long_break'
    return 'focus' // Default everything else (regular, deep_work, pomodoro, quick_sprint) to 'focus'
}
