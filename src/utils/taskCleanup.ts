/**
 * Utility to identify and help clean up corrupted tasks with unreasonable actual_seconds
 */

import type { Task } from '@/types/database'

export interface CorruptedTask {
    id: string
    title: string
    actual_seconds: number
    created_at: string
    issue: string
}

/**
 * Identifies tasks with corrupted or unreasonable time data
 */
export function identifyCorruptedTasks(tasks: Task[]): CorruptedTask[] {
    const MAX_REASONABLE_SECONDS = 4 * 60 * 60 // 4 hours
    const SUSPICIOUS_PATTERNS = [
        'test',
        'asdf',
        'qwer',
        'xyz',
        'demo',
        'sample',
        'example',
        'testiargjlai',
        'new test',
        'g',
        'edit images'
    ]

    return tasks
        .filter(t => {
            if (!t.actual_seconds) return false

            const issues: string[] = []

            // Check for unreasonably high values
            if (t.actual_seconds > MAX_REASONABLE_SECONDS) {
                issues.push(`Unreasonable time: ${Math.round(t.actual_seconds / 3600)}h`)
            }

            // Check for suspicious task titles
            const title = t.title.toLowerCase()
            if (SUSPICIOUS_PATTERNS.some(pattern => title.includes(pattern))) {
                issues.push('Suspicious task title')
            }

            // Check for very recent creation with high time (likely corrupted)
            const createdAt = new Date(t.created_at)
            const now = new Date()
            const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

            if (t.actual_seconds > 3600 && hoursSinceCreation < 1) {
                issues.push('High time for very recent task')
            }

            // Check for tasks with random characters in title
            if (/[^a-zA-Z0-9\s\-()[].]/.test(t.title)) {
                issues.push('Contains special characters')
            }

            return issues.length > 0
        })
        .map(t => {
            const taskIssues: string[] = []

            // Check for unreasonably high values
            if ((t.actual_seconds || 0) > MAX_REASONABLE_SECONDS) {
                taskIssues.push(`Unreasonable time: ${Math.round((t.actual_seconds || 0) / 3600)}h`)
            }

            // Check for suspicious task titles
            const title = t.title.toLowerCase()
            if (SUSPICIOUS_PATTERNS.some(pattern => title.includes(pattern))) {
                taskIssues.push('Suspicious task title')
            }

            // Check for very recent creation with high time (likely corrupted)
            const createdAt = new Date(t.created_at)
            const now = new Date()
            const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

            if ((t.actual_seconds || 0) > 3600 && hoursSinceCreation < 1) {
                taskIssues.push('High time for very recent task')
            }

            // Check for tasks with random characters in title
            if (/[^a-zA-Z0-9\s\-()[].]/.test(t.title)) {
                taskIssues.push('Contains special characters')
            }

            return {
                id: t.id,
                title: t.title,
                actual_seconds: t.actual_seconds || 0,
                created_at: t.created_at,
                issue: taskIssues.length > 0 ? taskIssues[0] : 'Unknown'
            }
        })
}

/**
 * Generates SQL statements to clean up corrupted tasks
 */
export function generateCleanupSQL(corruptedTasks: CorruptedTask[]): string[] {
    return corruptedTasks.map(task =>
        `-- Task: "${task.title}" (${task.issue})\n` +
        `DELETE FROM tasks WHERE id = '${task.id}';\n`
    )
}

/**
 * Logs corrupted tasks for debugging
 */
export function logCorruptedTasks(corruptedTasks: CorruptedTask[]): void {
    console.group('🚨 Corrupted Tasks Found:')
    corruptedTasks.forEach(task => {
        console.warn(`Task ID: ${task.id}`)
        console.warn(`Title: "${task.title}"`)
        console.warn(`Actual Seconds: ${task.actual_seconds} (${Math.round(task.actual_seconds / 3600)}h)`)
        console.warn(`Created: ${task.created_at}`)
        console.warn(`Issue: ${task.issue}`)
        console.warn('---')
    })
    console.groupEnd()

    console.log(`\n📋 Summary: Found ${corruptedTasks.length} corrupted tasks`)
    console.log(`💡 To clean up, run these SQL commands in your database:`)
    console.log(`\n` + generateCleanupSQL(corruptedTasks).join('\n'))
}
