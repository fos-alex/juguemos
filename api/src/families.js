/**
 * Families and the adults who belong to them. A family is created with its
 * first adult at sign-up; kids, the pet, and toys join with the data model.
 */
import { pool } from './db.js'

/** @typedef {{ id: string, name: string | null }} Family */

/** Runs at boot, after Better Auth has created `users`. */
export const familySchema = `
  create table if not exists families (
    id uuid primary key default gen_random_uuid(),
    name text,
    created_at timestamptz not null default now()
  );

  -- One family per adult for now; the second parent joins in 0.6.
  create table if not exists family_members (
    family_id uuid not null references families (id) on delete cascade,
    user_id text not null unique references users (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (family_id, user_id)
  );
`

/** @param {string} userId */
export async function createFamily(userId) {
  await pool.query(
    `with family as (insert into families default values returning id)
     insert into family_members (family_id, user_id) select id, $1 from family`,
    [userId],
  )
}

/** @param {string} userId @returns {Promise<Family | null>} */
export async function familyOf(userId) {
  const { rows } = await pool.query(
    `select f.id, f.name from families f
     join family_members m on m.family_id = f.id
     where m.user_id = $1`,
    [userId],
  )
  return rows[0] ?? null
}
