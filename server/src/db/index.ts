import type { DbAdapter } from './DbAdapter.js';
import { JsonFileAdapter } from './JsonFileAdapter.js';
import { PostgresAdapter } from './PostgresAdapter.js';

/**
 * Builds the configured `DbAdapter`.
 * With `DB_ADAPTER=postgres` it uses `PostgresAdapter` and requires `DB_CONNECTION` to be a connection string;
 * otherwise it falls back to `JsonFileAdapter` with `DB_CONNECTION` as the data directory.
 */
export function createDbAdapter(): DbAdapter {
  const adapter = process.env.DB_ADAPTER ?? 'json';
  const connection = process.env.DB_CONNECTION ?? './data';

  switch (adapter) {
    case 'postgres':
      if (!connection || connection === './data') {
        throw new Error('DB_CONNECTION must be a Postgres connection string when DB_ADAPTER=postgres');
      }
      return new PostgresAdapter(connection);
    case 'json':
    default:
      return new JsonFileAdapter(connection);
  }
}

export type { DbAdapter } from './DbAdapter.js';
