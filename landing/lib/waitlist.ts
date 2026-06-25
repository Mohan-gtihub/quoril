import { promises as fs } from "fs";
import path from "path";

/**
 * Waitlist persistence.
 *
 * For now this writes to a local JSON file so the form is fully functional
 * with zero external setup. When the marketing site is wired into the Quoril
 * app, swap the body of `addSignup` / `countSignups` for a Supabase insert
 * (the desktop app already uses `@supabase/supabase-js`) — the route handler
 * and the client component never need to change.
 */

export interface Signup {
  email: string;
  role?: string;
  platform?: string;
  createdAt: string;
  referrer?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "waitlist.json");

// Seed count so the social-proof number never looks empty in early days.
const SEED_COUNT = 1284;

async function readAll(): Promise<Signup[]> {
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    return JSON.parse(raw) as Signup[];
  } catch {
    return [];
  }
}

async function writeAll(rows: Signup[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(rows, null, 2), "utf-8");
}

export const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function countSignups(): Promise<number> {
  const rows = await readAll();
  return SEED_COUNT + rows.length;
}

export interface AddResult {
  ok: boolean;
  duplicate?: boolean;
  count: number;
}

export async function addSignup(input: Signup): Promise<AddResult> {
  const rows = await readAll();
  const email = input.email.trim().toLowerCase();

  if (rows.some((r) => r.email === email)) {
    return { ok: true, duplicate: true, count: SEED_COUNT + rows.length };
  }

  rows.push({ ...input, email });
  await writeAll(rows);
  return { ok: true, count: SEED_COUNT + rows.length };
}
