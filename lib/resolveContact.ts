// Contact resolution for jobs created inside ProfitLevel (jobs migration, 2026-08-27).
//
// Rule 1 of the migration spec: every job belongs to a contact. The Quo webhook
// resolves one from the inbound phone; a job typed in here has no thread, so it
// resolves by an optional phone field, else by an exact client_name match, else
// it creates the contact. Identities in settings.own_phones or subs.phone are
// never customers and never become a contact.
import db from '@/lib/db';

/** Digits -> E.164 (US). Returns null for anything that isn't a 10/11-digit number. */
export function toE164(raw: string | null | undefined): string | null {
  const d = String(raw ?? '').replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith('1')) return `+${d}`;
  return null;
}

async function isNotACustomer(phone: string): Promise<boolean> {
  const [own, sub] = await Promise.all([
    db.execute({ sql: "SELECT value FROM settings WHERE key = 'own_phones'", args: [] }),
    db.execute({ sql: 'SELECT 1 FROM subs WHERE phone = ? LIMIT 1', args: [phone] }),
  ]);
  if (sub.rows.length) return true;
  try {
    const list = JSON.parse(String((own.rows[0] as { value?: string } | undefined)?.value ?? '[]'));
    return Array.isArray(list) && list.includes(phone);
  } catch {
    return false;
  }
}

/**
 * The contact this job belongs to. Order: known phone identity, then an exact
 * (case-insensitive) name match, then a new contact. Returns null only when
 * there is nothing to go on — no phone and no name.
 */
export async function resolveContactId(
  clientName: string | null | undefined,
  phoneRaw: string | null | undefined
): Promise<number | null> {
  const phone = toE164(phoneRaw);
  const name = String(clientName ?? '').trim();

  if (phone && !(await isNotACustomer(phone))) {
    const hit = await db.execute({
      sql: 'SELECT contact_id FROM contact_phones WHERE phone = ?',
      args: [phone],
    });
    if (hit.rows.length) return Number((hit.rows[0] as unknown as { contact_id: number }).contact_id);
  }

  if (name) {
    const byName = await db.execute({
      sql: 'SELECT id FROM contacts WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) ORDER BY id LIMIT 1',
      args: [name],
    });
    if (byName.rows.length) {
      const id = Number((byName.rows[0] as unknown as { id: number }).id);
      // A new phone for a contact we already know is a new identity, not a new person.
      if (phone && !(await isNotACustomer(phone))) {
        await db.execute({
          sql: 'INSERT OR IGNORE INTO contact_phones (phone, contact_id, label) VALUES (?, ?, ?)',
          args: [phone, id, 'mobile'],
        });
      }
      return id;
    }
  }

  if (!name && !phone) return null;

  const now = new Date().toISOString();
  const created = await db.execute({
    sql: 'INSERT INTO contacts (name, created_at, updated_at) VALUES (?, ?, ?)',
    args: [name || null, now, now],
  });
  const id = Number(created.lastInsertRowid);
  if (phone && !(await isNotACustomer(phone))) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO contact_phones (phone, contact_id, label) VALUES (?, ?, ?)',
      args: [phone, id, 'mobile'],
    });
  }
  return id;
}
