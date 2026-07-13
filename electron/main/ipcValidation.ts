type Row = Record<string, unknown>

export const SYNC_TABLES = new Set([
    'workspaces',
    'lists',
    'tasks',
    'subtasks',
    'focus_sessions',
    'canvases',
    'blocks',
])

const LOCALLY_DELETED_TABLES = new Set(['tasks', 'lists', 'subtasks'])

const TASK_COLUMNS = new Set([
    'id',
    'user_id',
    'list_id',
    'title',
    'description',
    'status',
    'priority',
    'estimate_m',
    'spent_s',
    'started_at',
    'due_at',
    'completed_at',
    'parent_id',
    'sort_order',
    'created_at',
    'updated_at',
    'deleted_at',
    'synced',
    'is_recurring',
    'last_reset_date',
    'assigned_to',
])

const LIST_COLUMNS = new Set([
    'id',
    'user_id',
    'workspace_id',
    'name',
    'color',
    'icon',
    'sort_order',
    'is_system',
    'created_at',
    'updated_at',
    'archived_at',
    'deleted_at',
    'synced',
])

const SUBTASK_COLUMNS = new Set([
    'id',
    'task_id',
    'user_id',
    'title',
    'done',
    'completed',
    'sort_order',
    'created_at',
    'updated_at',
    'deleted_at',
    'synced',
])

const WORKSPACE_COLUMNS = new Set([
    'id',
    'user_id',
    'name',
    'color',
    'icon',
    'sort_order',
    'created_at',
    'updated_at',
    'deleted_at',
    'synced',
])

const FOCUS_SESSION_COLUMNS = new Set([
    'id',
    'user_id',
    'task_id',
    'type',
    'seconds',
    'start_time',
    'end_time',
    'metadata',
    'created_at',
    'updated_at',
    'deleted_at',
    'synced',
])

const TASK_UPDATE_COLUMNS = new Set([
    'title',
    'description',
    'status',
    'priority',
    'estimate_m',
    'spent_s',
    'started_at',
    'due_at',
    'completed_at',
    'parent_id',
    'sort_order',
    'updated_at',
    'deleted_at',
    'synced',
    'is_recurring',
    'last_reset_date',
    'list_id',
    'assigned_to',
])

const LIST_UPDATE_COLUMNS = new Set([
    'name',
    'color',
    'icon',
    'sort_order',
    'is_system',
    'updated_at',
    'archived_at',
    'deleted_at',
    'synced',
    'workspace_id',
])

const SUBTASK_UPDATE_COLUMNS = new Set([
    'title',
    'done',
    'completed',
    'sort_order',
    'updated_at',
    'deleted_at',
    'synced',
])

const FOCUS_SESSION_UPDATE_COLUMNS = new Set([
    'type',
    'seconds',
    'start_time',
    'end_time',
    'metadata',
    'synced',
])

const CANVAS_PATCH_KEYS = new Set([
    'workspaceId',
    'title',
    'icon',
    'color',
    'viewport',
    'homeViewport',
    'settings',
    'schemaVersion',
    'updatedAt',
    'deletedAt',
])

const BLOCK_KINDS = new Set(['text', 'image', 'video', 'link', 'checklist', 'idea', 'task_ref', 'excalidraw'])
const CONNECTION_KINDS = new Set(['reference', 'flow', 'dependency'])
const ANCHORS = new Set(['auto', 'n', 's', 'e', 'w'])
const ZONE_PATTERNS = new Set(['none', 'dots', 'grid', 'noise'])

function fail(message: string): never {
    throw new TypeError(`Invalid IPC payload: ${message}`)
}

export function isPlainObject(value: unknown): value is Row {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false
    const proto = Object.getPrototypeOf(value)
    return proto === Object.prototype || proto === null
}

export function assertPlainObject(value: unknown, label: string): Row {
    if (!isPlainObject(value)) fail(`${label} must be a plain object`)
    return value
}

export function assertString(value: unknown, label: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        fail(`${label} must be a non-empty string`)
    }
    return value
}

export function assertOptionalString(value: unknown, label: string): string | null | undefined {
    if (value === undefined || value === null) return value
    return assertString(value, label)
}

export function assertBoolean(value: unknown, label: string): boolean {
    if (typeof value !== 'boolean') fail(`${label} must be a boolean`)
    return value
}

export function assertFiniteNumber(value: unknown, label: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        fail(`${label} must be a finite number`)
    }
    return value
}

export function assertNonNegativeInteger(value: unknown, label: string): number {
    const n = assertFiniteNumber(value, label)
    if (!Number.isInteger(n) || n < 0) fail(`${label} must be a non-negative integer`)
    return n
}

function assertKeySubset(row: Row, allowed: Set<string>, label: string) {
    for (const key of Object.keys(row)) {
        if (!allowed.has(key)) fail(`${label} contains unsupported key "${key}"`)
    }
}

function assertRequiredString(row: Row, key: string, label: string) {
    assertString(row[key], `${label}.${key}`)
}

function assertOptionalFinite(row: Row, key: string, label: string) {
    if (row[key] !== undefined && row[key] !== null) assertFiniteNumber(row[key], `${label}.${key}`)
}

function assertOptionalBooleanish(row: Row, key: string, label: string) {
    const value = row[key]
    if (value === undefined || value === null) return
    if (typeof value === 'boolean') return
    if (value === 0 || value === 1) return
    fail(`${label}.${key} must be boolean-like`)
}

function assertRow(value: unknown, label: string, columns: Set<string>, required: string[]): Row {
    const row = assertPlainObject(value, label)
    assertKeySubset(row, columns, label)
    for (const key of required) assertRequiredString(row, key, label)
    return row
}

function assertUpdate(value: unknown, label: string, columns: Set<string>): Row {
    const row = assertPlainObject(value, label)
    assertKeySubset(row, columns, label)
    if (Object.keys(row).length === 0) fail(`${label} cannot be empty`)
    return row
}

export function validateId(value: unknown, label = 'id'): string {
    return assertString(value, label)
}

export function validateNullableId(value: unknown, label: string): string | null {
    if (value === null) return null
    return assertString(value, label)
}

export function validateWindowBounds(value: unknown) {
    const bounds = assertPlainObject(value, 'window bounds')
    const width = assertFiniteNumber(bounds.width, 'window bounds.width')
    const height = assertFiniteNumber(bounds.height, 'window bounds.height')
    if (width <= 0 || height <= 0) fail('window bounds width/height must be positive')
    if (bounds.x !== undefined) assertFiniteNumber(bounds.x, 'window bounds.x')
    if (bounds.y !== undefined) assertFiniteNumber(bounds.y, 'window bounds.y')
    return bounds as { width: number; height: number; x?: number; y?: number }
}

export function validateNotification(value: unknown) {
    const payload = assertPlainObject(value, 'notification')
    assertString(payload.title, 'notification.title')
    assertString(payload.body, 'notification.body')
    return payload as { title: string; body: string }
}

export function validateStoreKey(value: unknown): string {
    const key = assertString(value, 'store key')
    if (key.length > 200) fail('store key is too long')
    return key
}

export function validateTaskRow(value: unknown) {
    const row = assertRow(value, 'task', TASK_COLUMNS, ['id', 'user_id', 'title'])
    assertOptionalFinite(row, 'estimate_m', 'task')
    assertOptionalFinite(row, 'spent_s', 'task')
    assertOptionalFinite(row, 'sort_order', 'task')
    assertOptionalBooleanish(row, 'synced', 'task')
    assertOptionalBooleanish(row, 'is_recurring', 'task')
    return row
}

export function validateListRow(value: unknown) {
    const row = assertRow(value, 'list', LIST_COLUMNS, ['id', 'user_id', 'name'])
    assertOptionalFinite(row, 'sort_order', 'list')
    assertOptionalBooleanish(row, 'is_system', 'list')
    assertOptionalBooleanish(row, 'synced', 'list')
    return row
}

export function validateSubtaskRow(value: unknown) {
    const row = assertRow(value, 'subtask', SUBTASK_COLUMNS, ['id', 'task_id', 'user_id', 'title'])
    assertOptionalFinite(row, 'sort_order', 'subtask')
    assertOptionalBooleanish(row, 'done', 'subtask')
    assertOptionalBooleanish(row, 'completed', 'subtask')
    assertOptionalBooleanish(row, 'synced', 'subtask')
    return row
}

export function validateWorkspaceRow(value: unknown) {
    const row = assertRow(value, 'workspace', WORKSPACE_COLUMNS, ['id', 'user_id', 'name'])
    assertOptionalFinite(row, 'sort_order', 'workspace')
    assertOptionalBooleanish(row, 'synced', 'workspace')
    return row
}

export function validateFocusSessionRow(value: unknown) {
    const row = assertRow(value, 'focus session', FOCUS_SESSION_COLUMNS, ['id', 'user_id', 'type', 'start_time'])
    assertOptionalFinite(row, 'seconds', 'focus session')
    assertOptionalBooleanish(row, 'synced', 'focus session')
    return row
}

export function validateTaskUpdate(value: unknown) {
    const row = assertUpdate(value, 'task updates', TASK_UPDATE_COLUMNS)
    assertOptionalFinite(row, 'estimate_m', 'task updates')
    assertOptionalFinite(row, 'spent_s', 'task updates')
    assertOptionalFinite(row, 'sort_order', 'task updates')
    assertOptionalBooleanish(row, 'synced', 'task updates')
    assertOptionalBooleanish(row, 'is_recurring', 'task updates')
    return row
}

export function validateListUpdate(value: unknown) {
    const row = assertUpdate(value, 'list updates', LIST_UPDATE_COLUMNS)
    assertOptionalFinite(row, 'sort_order', 'list updates')
    assertOptionalBooleanish(row, 'is_system', 'list updates')
    assertOptionalBooleanish(row, 'synced', 'list updates')
    return row
}

export function validateSubtaskUpdate(value: unknown) {
    const row = assertUpdate(value, 'subtask updates', SUBTASK_UPDATE_COLUMNS)
    assertOptionalFinite(row, 'sort_order', 'subtask updates')
    assertOptionalBooleanish(row, 'done', 'subtask updates')
    assertOptionalBooleanish(row, 'completed', 'subtask updates')
    assertOptionalBooleanish(row, 'synced', 'subtask updates')
    return row
}

export function validateFocusSessionUpdate(value: unknown) {
    const row = assertUpdate(value, 'focus session updates', FOCUS_SESSION_UPDATE_COLUMNS)
    assertOptionalFinite(row, 'seconds', 'focus session updates')
    assertOptionalBooleanish(row, 'synced', 'focus session updates')
    return row
}

export function validateSyncTable(value: unknown): string {
    const table = assertString(value, 'sync table')
    if (!SYNC_TABLES.has(table)) fail(`unsupported sync table "${table}"`)
    return table
}

export function validateLocallyDeletedTable(value: unknown): string {
    const table = assertString(value, 'local tombstone table')
    if (!LOCALLY_DELETED_TABLES.has(table)) fail(`unsupported local tombstone table "${table}"`)
    return table
}

export function validateSyncLimit(value: unknown): number | undefined {
    if (value === undefined || value === null) return undefined
    const limit = assertNonNegativeInteger(value, 'sync limit')
    if (limit > 1000) fail('sync limit cannot exceed 1000')
    return limit
}

export function validateCloudRows(value: unknown): Row[] {
    if (!Array.isArray(value)) fail('cloud rows must be an array')
    if (value.length > 1000) fail('cloud rows batch cannot exceed 1000 rows')
    for (const [index, row] of value.entries()) {
        const obj = assertPlainObject(row, `cloud rows[${index}]`)
        assertRequiredString(obj, 'id', `cloud rows[${index}]`)
    }
    return value as Row[]
}

export function validateExternalUrl(value: unknown): string {
    const raw = assertString(value, 'external URL')
    let url: URL
    try {
        url = new URL(raw)
    } catch {
        fail('external URL must be absolute')
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        fail('external URL must use http or https')
    }
    return raw
}

export function validateReportsRange(value: unknown) {
    const args = assertPlainObject(value, 'reports range')
    assertString(args.userId, 'reports range.userId')
    assertString(args.startDate, 'reports range.startDate')
    assertString(args.endDate, 'reports range.endDate')
    return args as { userId: string; startDate: string; endDate: string }
}

export function validateSessionDistractionRange(value: unknown) {
    const args = assertPlainObject(value, 'session distraction range')
    assertString(args.startISO, 'session distraction range.startISO')
    assertString(args.endISO, 'session distraction range.endISO')
    return args as { startISO: string; endISO: string }
}

export function validateScreenTimeArgs(value: unknown) {
    const args = assertPlainObject(value, 'screen time args')
    assertString(args.date, 'screen time args.date')
    return args as { date: string }
}

export function validateCanvas(value: unknown) {
    const canvas = assertPlainObject(value, 'canvas')
    assertString(canvas.id, 'canvas.id')
    assertString(canvas.userId, 'canvas.userId')
    assertOptionalString(canvas.workspaceId, 'canvas.workspaceId')
    assertOptionalString(canvas.title, 'canvas.title')
    return canvas
}

export function validateCanvasPatch(value: unknown) {
    const patch = assertUpdate(value, 'canvas patch', CANVAS_PATCH_KEYS)
    if (patch.schemaVersion !== undefined) assertNonNegativeInteger(patch.schemaVersion, 'canvas patch.schemaVersion')
    return patch
}

export function validateBlock(value: unknown) {
    const block = assertPlainObject(value, 'block')
    assertString(block.id, 'block.id')
    assertString(block.canvasId, 'block.canvasId')
    assertString(block.userId, 'block.userId')
    const kind = assertString(block.kind, 'block.kind')
    if (!BLOCK_KINDS.has(kind)) fail(`unsupported block.kind "${kind}"`)
    for (const key of ['x', 'y', 'w', 'h']) assertFiniteNumber(block[key], `block.${key}`)
    if (block.z !== undefined) assertFiniteNumber(block.z, 'block.z')
    if (block.rotation !== undefined) assertFiniteNumber(block.rotation, 'block.rotation')
    if (block.content !== undefined) assertPlainObject(block.content, 'block.content')
    return block
}

export function validateBlockBatch(value: unknown) {
    if (!Array.isArray(value)) fail('blocks batch must be an array')
    if (value.length > 500) fail('blocks batch cannot exceed 500 rows')
    return value.map(validateBlock)
}

export function validateIdBatch(value: unknown, label = 'ids') {
    if (!Array.isArray(value)) fail(`${label} must be an array`)
    if (value.length > 1000) fail(`${label} cannot exceed 1000 entries`)
    return value.map((id, index) => assertString(id, `${label}[${index}]`))
}

export function validateConnection(value: unknown) {
    const connection = assertPlainObject(value, 'connection')
    assertString(connection.id, 'connection.id')
    assertString(connection.canvasId, 'connection.canvasId')
    assertString(connection.userId, 'connection.userId')
    assertString(connection.fromBlockId, 'connection.fromBlockId')
    assertString(connection.toBlockId, 'connection.toBlockId')
    if (connection.kind !== undefined) {
        const kind = assertString(connection.kind, 'connection.kind')
        if (!CONNECTION_KINDS.has(kind)) fail(`unsupported connection.kind "${kind}"`)
    }
    for (const key of ['fromAnchor', 'toAnchor']) {
        if (connection[key] !== undefined) {
            const anchor = assertString(connection[key], `connection.${key}`)
            if (!ANCHORS.has(anchor)) fail(`unsupported connection.${key} "${anchor}"`)
        }
    }
    return connection
}

export function validateZone(value: unknown) {
    const zone = assertPlainObject(value, 'zone')
    assertString(zone.id, 'zone.id')
    assertString(zone.canvasId, 'zone.canvasId')
    assertString(zone.userId, 'zone.userId')
    if (zone.name !== undefined) assertString(zone.name, 'zone.name')
    if (zone.pattern !== undefined) {
        const pattern = assertString(zone.pattern, 'zone.pattern')
        if (!ZONE_PATTERNS.has(pattern)) fail(`unsupported zone.pattern "${pattern}"`)
    }
    if (zone.bounds !== undefined) {
        const bounds = assertPlainObject(zone.bounds, 'zone.bounds')
        for (const key of ['x', 'y', 'w', 'h']) assertFiniteNumber(bounds[key], `zone.bounds.${key}`)
    }
    return zone
}
