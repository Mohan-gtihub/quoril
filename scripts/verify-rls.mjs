import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

const required = [
    'RLS_TEST_SUPABASE_URL',
    'RLS_TEST_SUPABASE_ANON_KEY',
    'RLS_TEST_SUPABASE_SERVICE_ROLE_KEY',
]

const missing = required.filter((key) => !process.env[key])
if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`)
    process.exitCode = 1
} else if (process.env.RLS_TEST_ALLOW_LIVE !== 'true') {
    console.error('Refusing to run against Supabase without RLS_TEST_ALLOW_LIVE=true.')
    process.exitCode = 1
} else {
    await run()
}

async function run() {
    const url = process.env.RLS_TEST_SUPABASE_URL
    const anonKey = process.env.RLS_TEST_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.RLS_TEST_SUPABASE_SERVICE_ROLE_KEY
    const admin = createClient(url, serviceRoleKey, clientOptions())
    const anonymous = createClient(url, anonKey, clientOptions())
    const runId = `rls-${Date.now()}-${randomUUID().slice(0, 8)}`
    const password = `Rls!${randomUUID()}Aa1`
    const users = []
    const results = []

    try {
        const owner = await createTestUser(admin, runId, 'owner', password)
        users.push(owner)
        const collaborator = await createTestUser(admin, runId, 'collaborator', password)
        users.push(collaborator)
        const outsider = await createTestUser(admin, runId, 'outsider', password)
        users.push(outsider)

        const ownerClient = await signIn(url, anonKey, owner.email, password)
        const collaboratorClient = await signIn(url, anonKey, collaborator.email, password)
        const outsiderClient = await signIn(url, anonKey, outsider.email, password)

        const workspaceId = randomUUID()
        const listId = randomUUID()
        const taskId = randomUUID()
        const canvasId = randomUUID()
        const blockId = randomUUID()
        const sessionId = randomUUID()

        const workspace = await requireRow(
            'owner creates workspace',
            ownerClient.from('workspaces').insert({
                id: workspaceId,
                user_id: owner.id,
                name: `${runId} workspace`,
            }).select('id').single(),
        )
        pass(results, 'owner creates workspace')

        await requireRow(
            'owner creates workspace list',
            ownerClient.from('lists').insert({
                id: listId,
                user_id: owner.id,
                workspace_id: workspace.id,
                name: `${runId} list`,
            }).select('id').single(),
        )
        pass(results, 'owner creates workspace list')

        await requireRow(
            'owner creates workspace task',
            ownerClient.from('tasks').insert({
                id: taskId,
                user_id: owner.id,
                list_id: listId,
                title: `${runId} task`,
            }).select('id').single(),
        )
        pass(results, 'owner creates workspace task')

        await requireRow(
            'owner creates focus session',
            ownerClient.from('focus_sessions').insert({
                id: sessionId,
                user_id: owner.id,
                type: 'focus',
                seconds: 60,
                start_time: new Date().toISOString(),
            }).select('id').single(),
        )
        pass(results, 'owner creates focus session')

        await requireRow(
            'owner creates canvas',
            ownerClient.from('canvases').insert({
                id: canvasId,
                user_id: owner.id,
                title: `${runId} canvas`,
            }).select('id').single(),
        )
        pass(results, 'owner creates canvas')

        await requireRow(
            'owner creates canvas block',
            ownerClient.from('blocks').insert({
                id: blockId,
                canvas_id: canvasId,
                user_id: owner.id,
                kind: 'text',
                x: 0,
                y: 0,
                w: 320,
                h: 180,
                content_json: { doc: { type: 'doc', content: [] } },
            }).select('id').single(),
        )
        pass(results, 'owner creates canvas block')

        await requireRow(
            'owner adds workspace collaborator',
            ownerClient.from('workspace_members').insert({
                workspace_id: workspace.id,
                email: collaborator.email,
                role: 'editor',
                invited_by: owner.id,
            }).select('id').single(),
        )
        pass(results, 'owner adds workspace collaborator')

        await requireRow(
            'owner adds canvas collaborator',
            ownerClient.from('canvas_members').insert({
                canvas_id: canvasId,
                email: collaborator.email,
                role: 'editor',
                invited_by: owner.id,
            }).select('id').single(),
        )
        pass(results, 'owner adds canvas collaborator')

        await assertVisible('collaborator reads shared workspace', collaboratorClient.from('workspaces').select('id').eq('id', workspace.id).maybeSingle())
        pass(results, 'collaborator reads shared workspace')
        await assertVisible('collaborator reads shared task', collaboratorClient.from('tasks').select('id').eq('id', taskId).maybeSingle())
        pass(results, 'collaborator reads shared task')
        await assertVisible('collaborator reads shared canvas', collaboratorClient.from('canvases').select('id').eq('id', canvasId).maybeSingle())
        pass(results, 'collaborator reads shared canvas')
        await assertVisible('collaborator reads shared block', collaboratorClient.from('blocks').select('id').eq('id', blockId).maybeSingle())
        pass(results, 'collaborator reads shared block')

        await assertWriteAllowed(
            'collaborator edits shared task',
            collaboratorClient.from('tasks').update({ title: `${runId} edited` }).eq('id', taskId).select('id'),
        )
        pass(results, 'collaborator edits shared task')
        await assertWriteAllowed(
            'collaborator edits shared canvas block',
            collaboratorClient.from('blocks').update({ content_json: { doc: { type: 'doc', content: [{ type: 'paragraph' }] } } }).eq('id', blockId).select('id'),
        )
        pass(results, 'collaborator edits shared canvas block')

        for (const [actor, client] of [['outsider', outsiderClient], ['anonymous', anonymous]]) {
            await assertHidden(`${actor} cannot read shared workspace`, client.from('workspaces').select('id').eq('id', workspace.id).maybeSingle())
            pass(results, `${actor} cannot read shared workspace`)
            await assertHidden(`${actor} cannot read shared task`, client.from('tasks').select('id').eq('id', taskId).maybeSingle())
            pass(results, `${actor} cannot read shared task`)
            await assertHidden(`${actor} cannot read focus session`, client.from('focus_sessions').select('id').eq('id', sessionId).maybeSingle())
            pass(results, `${actor} cannot read focus session`)
            await assertHidden(`${actor} cannot read shared canvas`, client.from('canvases').select('id').eq('id', canvasId).maybeSingle())
            pass(results, `${actor} cannot read shared canvas`)
            await assertHidden(`${actor} cannot read shared block`, client.from('blocks').select('id').eq('id', blockId).maybeSingle())
            pass(results, `${actor} cannot read shared block`)
            await assertWriteDenied(
                `${actor} cannot edit shared task`,
                client.from('tasks').update({ title: `${runId} forbidden` }).eq('id', taskId).select('id'),
            )
            pass(results, `${actor} cannot edit shared task`)
        }

        console.log(`RLS verification passed (${results.length} checks, ${runId}).`)
    } catch (error) {
        console.error(`RLS verification failed: ${describeError(error)}`)
        process.exitCode = 1
    } finally {
        const cleanup = await Promise.allSettled(users.map((user) => admin.auth.admin.deleteUser(user.id)))
        const failedCleanup = cleanup.filter((result) => result.status === 'rejected' || result.value.error)
        if (failedCleanup.length > 0) {
            console.error(`RLS verification cleanup failed for ${failedCleanup.length} test user(s). Remove users beginning with ${runId} manually.`)
            process.exitCode = 1
        }
    }
}

function clientOptions() {
    return { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }
}

async function createTestUser(admin, runId, role, password) {
    const email = `${runId}-${role}@example.invalid`
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error || !data.user) throw new Error(`could not create ${role} test user: ${error?.message ?? 'missing user'}`)
    return { id: data.user.id, email }
}

async function signIn(url, anonKey, email, password) {
    const client = createClient(url, anonKey, clientOptions())
    const { error } = await client.auth.signInWithPassword({ email, password })
    if (error) throw new Error(`could not authenticate test user: ${error.message}`)
    return client
}

async function requireRow(label, request) {
    const { data, error } = await request
    if (error || !data) throw new Error(`${label}: ${error?.message ?? 'no row returned'}`)
    return data
}

async function assertVisible(label, request) {
    const { data, error } = await request
    if (error || !data) throw new Error(`${label}: expected visible row, got ${error?.message ?? 'no row'}`)
}

async function assertHidden(label, request) {
    const { data, error } = await request
    if (error) return
    if (data) throw new Error(`${label}: row was visible`)
}

async function assertWriteAllowed(label, request) {
    const { data, error } = await request
    if (error || !Array.isArray(data) || data.length !== 1) {
        throw new Error(`${label}: expected one updated row, got ${error?.message ?? 'no updated row'}`)
    }
}

async function assertWriteDenied(label, request) {
    const { data, error } = await request
    if (error) return
    if (!Array.isArray(data) || data.length === 0) return
    throw new Error(`${label}: write unexpectedly succeeded`)
}

function pass(results, label) {
    results.push(label)
    console.log(`PASS ${label}`)
}

function describeError(error) {
    return error instanceof Error ? error.message : String(error)
}
