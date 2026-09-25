// Runtime API — schéma appliqué au démarrage, pas de fichiers statiques.
import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { ensureSchema } from './api/_lib/schema.js';
import { ensureBucket } from './api/_lib/minio.js';

import register from './api/auth/register.js';
import login from './api/auth/login.js';
import logout from './api/auth/logout.js';
import me from './api/auth/me.js';
import googleAuth from './api/auth/google.js';
import syncPush from './api/sync/push.js';
import syncPull from './api/sync/pull.js';
import pushSubscription from './api/push/subscription.js';
import dogEventsReminder from './api/user/dog-events-reminder.js';
import filesUpload from './api/files/upload.js';
import filesGet from './api/files/get.js';
import filesDelete from './api/files/delete.js';

const PORT = process.env.PORT || 3000;
const app = express();

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'same-site' } }));
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessaie plus tard.' },
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.all('/api/auth/register', authLimiter, register);
app.all('/api/auth/login', authLimiter, login);
app.all('/api/auth/logout', logout);
app.all('/api/auth/me', me);
app.all('/api/auth/google', authLimiter, googleAuth);
app.all('/api/sync/push', syncPush);
app.all('/api/sync/pull', syncPull);
app.all('/api/push/subscription', pushSubscription);
app.all('/api/user/dog-events-reminder', dogEventsReminder);
app.post('/api/files', filesUpload);
app.get('/api/files/:id', filesGet);
app.delete('/api/files/:id', filesDelete);

async function boot() {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET manquant.');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL manquant.');
    process.exit(1);
  }

  console.log('Application du schéma Postgres...');
  await ensureSchema();
  console.log('Vérification du bucket MinIO...');
  await ensureBucket();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`API App'lika sur http://0.0.0.0:${PORT}`);
  });
}

boot().catch((err) => {
  console.error('Démarrage impossible:', err);
  process.exit(1);
});
