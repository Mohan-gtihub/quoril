
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// HARDCODED PATH based on typical Electron setup
// C:\Users\Asus\AppData\Roaming\quoril\quoril_v2.sqlite

const userHome = process.env.USERPROFILE || 'C:\\Users\\Asus';
const possiblePaths = [
    path.join(userHome, 'AppData', 'Roaming', 'quoril', 'quoril_v2.sqlite'),
    path.join(userHome, 'AppData', 'Roaming', 'blitzit-clone', 'quoril_v2.sqlite'),
    path.join(userHome, '.config', 'quoril', 'quoril_v2.sqlite'),
    path.join(__dirname, 'quoril_v2.sqlite'),
    // Fallback to old name just in case
    path.join(userHome, 'AppData', 'Roaming', 'quoril', 'database.sqlite'),
];

let dbPath = null;
console.log('Searching for DB in:');
for (const p of possiblePaths) {
    console.log(' - ' + p);
    if (fs.existsSync(p)) {
        console.log('[SUCCESS] Found DB at:', p);
        dbPath = p;
        break;
    }
}

if (!dbPath) {
    console.error('[CRITICAL] Could not find database file.');
    process.exit(1);
}

runDebug(dbPath);

function runDebug(dbFile) {
    const db = new Database(dbFile);
    console.log('\n--- DIAGNOSTICS ---');

    // 1. Check Orphan Workspace
    const orphan = db.prepare("SELECT * FROM workspaces WHERE name = 'Orphan'").get();
    console.log('Orphan Workspace:', orphan || 'NOT FOUND');

    // 2. Count NULL workspace_id lists
    const nullLists = db.prepare("SELECT COUNT(*) as count FROM lists WHERE workspace_id IS NULL OR workspace_id = ''").get();
    console.log('Lists with NULL/Empty workspace_id (ALL):', nullLists.count);

    // 3. Inspect a few of them (regardless of deleted status)
    const samples = db.prepare("SELECT id, name, workspace_id, deleted_at, archived_at FROM lists WHERE workspace_id IS NULL OR workspace_id = '' LIMIT 10").all();
    console.log('\nSample NULL Workspace Lists:', samples);

    // 4. Check if any "active" ones exist (deleted_at IS NULL)
    const activeNulls = db.prepare("SELECT COUNT(*) as count FROM lists WHERE (workspace_id IS NULL OR workspace_id = '') AND deleted_at IS NULL").get();
    console.log('\nActive (not deleted) NULL lists:', activeNulls.count);

    // 5. Check if any "archived" ones exist
    const archivedNulls = db.prepare("SELECT COUNT(*) as count FROM lists WHERE (workspace_id IS NULL OR workspace_id = '') AND archived_at IS NOT NULL").get();
    console.log('Archived NULL lists:', archivedNulls.count);

    console.log('\n--- APPLYING FIX ---');
    if (activeNulls.count > 0 && orphan) {
        console.log(`Moving ${activeNulls.count} lists to Orphan workspace (${orphan.id})...`);
        const info = db.prepare("UPDATE lists SET workspace_id = ? WHERE (workspace_id IS NULL OR workspace_id = '') AND deleted_at IS NULL").run(orphan.id);
        console.log(`Updated ${info.changes} lists.`);

        console.log(`Moving tasks...`);
        const taskInfo = db.prepare("UPDATE tasks SET workspace_id = ? WHERE (workspace_id IS NULL OR workspace_id = '') AND deleted_at IS NULL").run(orphan.id);
        console.log(`Updated ${taskInfo.changes} tasks.`);
    } else {
        console.log('No active orphans to move or Orphan workspace missing.');
    }
}
