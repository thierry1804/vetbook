// Serveur VPS — remplace le déploiement Vercel (plus de fonctions
// serverless individuelles ni de vercel.json). Sert les fichiers statiques
// (dist/ en prod, racine du projet en dev) et monte les mêmes handlers
// api/*.js que sur Vercel : leur signature (req, res) est déjà compatible
// Express, aucun changement nécessaire à leur contenu.
//
// Rappels quotidiens : plus de cron HTTP ici, voir scripts/send-reminders.mjs
// à lancer depuis la crontab système du VPS (README.md).
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

import requestLink from './api/auth/request-link.js';
import verify from './api/auth/verify.js';
import googleAuth from './api/auth/google.js';
import syncPush from './api/sync/push.js';
import syncPull from './api/sync/pull.js';
import pushSubscription from './api/push/subscription.js';
import dogEventsReminder from './api/user/dog-events-reminder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// dist/ si l'app a été buildée (npm run build), sinon la racine du projet
// (utile pour tester l'API en local sans rebuild à chaque changement front).
const staticDir = existsSync(path.join(__dirname, 'dist'))
  ? path.join(__dirname, 'dist')
  : __dirname;

const app = express();
app.use(express.json());

app.all('/api/auth/request-link', requestLink);
app.all('/api/auth/verify', verify);
app.all('/api/auth/google', googleAuth);
app.all('/api/sync/push', syncPush);
app.all('/api/sync/pull', syncPull);
app.all('/api/push/subscription', pushSubscription);
app.all('/api/user/dog-events-reminder', dogEventsReminder);

app.use(express.static(staticDir, {
  setHeaders(res, filePath) {
    // sw.js doit toujours être revalidé : sans ça, Cloudflare (et le cache
    // HTTP du navigateur) lui appliquent une TTL par défaut (4h côté
    // Cloudflare en l'absence de directive forte) qui retarde d'autant la
    // détection d'une nouvelle version par les appareils déjà installés.
    if (filePath.endsWith('sw.js')) {
      res.setHeader('Cache-Control', 'no-cache');
      return;
    }
    // app.<hash>.js / styles.<hash>.css / data-layer.<hash>.js (voir
    // scripts/build.mjs) : le nom change à chaque contenu différent, donc
    // aucune revalidation n'est jamais nécessaire — cache long + immutable.
    if (/\.[0-9a-f]{8}\.(js|css)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

app.listen(PORT, () => {
  console.log(`App'lika écoute sur http://localhost:${PORT} (statique : ${staticDir})`);
});
