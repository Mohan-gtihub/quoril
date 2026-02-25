
import Database from 'better-sqlite3';
import path from 'path';

// Path to DB
const dbPath = 'C:\\Users\\Asus\\AppData\\Roaming\\Quoril\\quoril_v2.sqlite';
const db = new Database(dbPath, { readonly: true });

console.log('--- USERS ---');
const users = db.prepare('SELECT DISTINCT user_id FROM lists UNION SELECT DISTINCT user_id FROM tasks UNION SELECT DISTINCT user_id FROM workspaces').all();
console.log(users);

console.log('\n--- WORKSPACES ---');
const workspaces = db.prepare('SELECT id, user_id, name, is_deleted FROM workspaces').all();
console.table(workspaces);

console.log('\n--- ORPHAN LISTS ---');
const orphans = db.prepare('SELECT id, user_id, workspace_id, name FROM lists WHERE workspace_id NOT IN (SELECT id FROM workspaces)').all();
console.table(orphans);
