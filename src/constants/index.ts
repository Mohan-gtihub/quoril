// App metadata
export const APP_NAME = 'Quoril'
export const APP_VERSION = '1.0.0'
export const APP_DESCRIPTION = 'Desktop Productivity & Focus Tracking Application'

// API & Storage
export const STORAGE_KEYS = {
    THEME: 'quoril_theme',
    SIDEBAR_COLLAPSED: 'quoril_sidebar_collapsed',
    LAST_SYNC: 'quoril_last_sync',
} as const

// Task statuses
export const TASK_STATUSES = {
    TODO: 'todo',
    PLANNED: 'planned',
    ACTIVE: 'active',
    PAUSED: 'paused',
    DONE: 'done',
} as const

// Task priorities
export const TASK_PRIORITIES = {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
} as const

// Priority colors
export const PRIORITY_COLORS = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#3b82f6',
    low: '#6b7280',
} as const

// Session types
export const SESSION_TYPES = {
    DEEP_WORK: 'deep_work',
    REGULAR: 'regular',
    QUICK_SPRINT: 'quick_sprint',
    POMODORO: 'pomodoro',
} as const

// Default durations (in minutes)
export const DEFAULT_DURATIONS = {
    DEEP_WORK: 90,
    REGULAR: 25,
    QUICK_SPRINT: 15,
    POMODORO: 25,
} as const

// Break durations (in minutes)
export const BREAK_DURATIONS = {
    SHORT: 5,
    MEDIUM: 10,
    LONG: 15,
} as const

// System list IDs
export const SYSTEM_LISTS = {
    MY_DAY: 'my_day',
    THIS_WEEK: 'this_week',
    UPCOMING: 'upcoming',
    BACKLOG: 'backlog',
    COMPLETED: 'completed',
} as const

// Date formats
export const DATE_FORMATS = {
    DISPLAY: 'MMM d, yyyy',
    DISPLAY_WITH_TIME: 'MMM d, yyyy h:mm a',
    ISO: "yyyy-MM-dd'T'HH:mm:ss",
    TIME_ONLY: 'h:mm a',
} as const

// Query keys for React Query
export const QUERY_KEYS = {
    TASKS: 'tasks',
    LISTS: 'lists',
    TAGS: 'tags',
    FOCUS_SESSIONS: 'focus_sessions',
    PROFILE: 'profile',
    PREFERENCES: 'preferences',
} as const

// Routes
export const ROUTES = {
    HOME: '/',
    DASHBOARD: '/dashboard',
    PLANNER: '/planner',
    FOCUS: '/focus',
    REPORTS: '/reports',
    SETTINGS: '/settings',
    LOGIN: '/login',
    SIGNUP: '/signup',
    RESET_PASSWORD: '/reset-password',
} as const

// Keyboard shortcuts
export const SHORTCUTS = {
    NEW_TASK: 'mod+n',
    SEARCH: 'mod+k',
    START_FOCUS: 'mod+shift+f',
    SETTINGS: 'mod+,',
    TOGGLE_SIDEBAR: 'mod+b',
} as const

// Validation rules
export const VALIDATION = {
    MIN_PASSWORD_LENGTH: 8,
    MAX_TASK_TITLE_LENGTH: 200,
    MAX_TASK_DESCRIPTION_LENGTH: 5000,
    MAX_TAG_NAME_LENGTH: 50,
    MAX_LIST_NAME_LENGTH: 100,
} as const

// Pagination
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 100,
} as const

// Timeouts (in milliseconds)
export const TIMEOUTS = {
    DEBOUNCE_SEARCH: 300,
    DEBOUNCE_SAVE: 500,
    TOAST_DURATION: 3000,
    SESSION_CHECK: 60000, // 1 minute
} as const
