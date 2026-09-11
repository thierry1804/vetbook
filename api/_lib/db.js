// Client Neon partagé par les fonctions API (runtime Node de Vercel).
// Pool (WebSocket) plutôt que le driver HTTP `neon()` : on a besoin de
// vraies transactions BEGIN/COMMIT pour les upserts multi-tables de
// /api/sync/push.
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Certains VPS/conteneurs annoncent une adresse IPv6 sans route sortante
// réelle : le double-stack par défaut tente IPv6, échoue en timeout, puis
// bascule en IPv4 — assez lent pour ressembler à une panne réseau totale.
// DB_FORCE_IPV4=true force IPv4 directement pour la connexion WebSocket
// Postgres si ce symptôme apparaît en prod (laisser désactivé sinon).
if (process.env.DB_FORCE_IPV4 === 'true') {
  class WebSocketIPv4 extends ws {
    constructor(address, protocols, options) {
      super(address, protocols, Object.assign({}, options, { family: 4 }));
    }
  }
  neonConfig.webSocketConstructor = WebSocketIPv4;
} else {
  neonConfig.webSocketConstructor = ws;
}

let pool;
function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL manquant.');
    pool = new Pool({ connectionString });
  }
  return pool;
}

export async function withClient(fn) {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function withTransaction(fn) {
  return withClient(async (client) => {
    await client.query('BEGIN');
    try {
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  });
}
