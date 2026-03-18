import postgres from 'postgres';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://soterion:password@localhost:5435/soterion';

const sql = postgres(DATABASE_URL, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
  transform: {
    undefined: null,
  },
});

export default sql;

// ---------------------------------------------------------------------------
// Helper: execute a query and return the first row or null
// ---------------------------------------------------------------------------
export async function queryOne<T extends postgres.Row>(
  pending: postgres.PendingQuery<T[]>,
): Promise<T | null> {
  const rows = await pending;
  return rows.length > 0 ? rows[0] : null;
}

// ---------------------------------------------------------------------------
// Helper: run a callback inside a database transaction
// ---------------------------------------------------------------------------
export async function transaction<T>(
  fn: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return sql.begin(fn) as Promise<T>;
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
export async function healthCheck(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Disconnect (graceful shutdown)
// ---------------------------------------------------------------------------
export async function disconnect(): Promise<void> {
  await sql.end();
}

// ---------------------------------------------------------------------------
// Migration runner: reads .sql files from infra/db/migrations/ in order
// ---------------------------------------------------------------------------
export async function migrate(migrationsDir?: string): Promise<string[]> {
  const dir = migrationsDir
    ?? join(process.cwd(), '..', '..', 'infra', 'db', 'migrations');

  // Ensure migrations tracking table exists
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          SERIAL PRIMARY KEY,
      filename    TEXT UNIQUE NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Get already-applied migrations
  const applied = await sql<{ filename: string }[]>`
    SELECT filename FROM _migrations ORDER BY filename
  `;
  const appliedSet = new Set(applied.map((r: { filename: string }) => r.filename));

  // Read migration files sorted alphabetically (001_, 002_, ...)
  const files = readdirSync(dir)
    .filter((f: string) => f.endsWith('.sql'))
    .sort();

  const newlyApplied: string[] = [];

  for (const file of files) {
    if (appliedSet.has(file)) continue;

    const filePath = join(dir, file);
    const content = readFileSync(filePath, 'utf-8');

    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx.unsafe('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
    });

    newlyApplied.push(file);
  }

  return newlyApplied;
}
