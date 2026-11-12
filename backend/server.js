import { buildNotificationRouter, runInboxPush } from './api/_lib/notification-router.js';
import { realtimeHandler, startRealtime } from './api/_lib/realtime.js';
import { runSubscriptionNotifications } from './api/_lib/subscription-notifications.js';
import { buildMySubscriptionRouter } from './api/me/subscription.js';
// Runtime API — schéma appliqué au démarrage, pas de fichiers statiques.
import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { ensureSchema } from './api/_lib/schema.js';
import { ensureBucket } from './api/_lib/minio.js';

// Filet de sécurité : une erreur async non rattrapée dans une route (ex. un paramètre mal formé qui
// fait échouer une requête SQL) fait planter TOUT le process Node par défaut depuis Node 15 — coupant
// toutes les connexions en cours, pas seulement celle en cause. Un bug de route reste un bug de route
// à corriger, mais ceci évite qu'il devienne une coupure totale du service pour tout le monde.
process.on('unhandledRejection', (reason) => { console.error('unhandledRejection', reason); });

import register from './api/auth/register.js';
import login from './api/auth/login.js';
import logout from './api/auth/logout.js';
import me from './api/auth/me.js';
import googleAuth from './api/auth/google.js';
import forgotPassword from './api/auth/forgot-password.js';
import resetPassword from './api/auth/reset-password.js';
import verifyEmail from './api/auth/verify-email.js';
import resendVerification from './api/auth/resend-verification.js';
import userProfile from './api/user/profile.js';
import userAvatar from './api/user/avatar.js';
import userPassword from './api/user/password.js';
import userEmail from './api/user/email.js';
import userSessions from './api/user/sessions.js';
import userAccount from './api/user/account.js';
import userConsent from './api/user/consent.js';
import userStorage from './api/user/storage.js';
import { shareLinks, sharePublic, sharePublicPhoto } from './api/share/index.js';
import { identityMint, identityManage, identityPublic, identityPublicPhoto } from './api/identity.js';
import { petDiscoverable, petDeviceState, petPortrait, directoryPets, directoryPet, directoryPhoto } from './api/directory.js';
import { petThreadList, petThreadOpen, petThreadRead, petThreadMessage, petThreadPhoto, petThreadMessagePhoto, petThreadClose, petThreadBlock, petThreadReport } from './api/pet-messages.js';
import { household } from './api/household/index.js';
import syncPush from './api/sync/push.js';
import syncPull from './api/sync/pull.js';
import pushSubscription from './api/push/subscription.js';
import lookupAcym from './api/lookup/acym.js';
import refHandler from './api/ref/index.js';
import publicConfig from './api/public-config.js';
import meEntitlements from './api/me/entitlements.js';
import { buildAdminRouter } from './api/admin/router.js';
import { seedAdminDefaults } from './api/_lib/admin-seed.js';
import { trackAccess } from './api/_lib/access-log.js';
import track from './api/track.js';
import dogEventsReminder from './api/user/dog-events-reminder.js';
import filesUpload from './api/files/upload.js';
import filesGet from './api/files/get.js';
import filesDelete from './api/files/delete.js';
import aiChat from './api/ai/chat.js';
import aiBookletScan from './api/ai/booklet-scan.js';
import support, { mySupportRequests, replyToMySupportRequest } from './api/support.js';
import help from './api/help.js';
import { perUserLimiter } from './api/_lib/rate-limit.js';
import { withClient } from './api/_lib/db.js';
import { log, requestLogger, errorHandler, readyHandler } from './api/_lib/observability.js';
import { initErrorTracking, captureError, flushErrors } from './api/_lib/error-tracking.js';

const PORT = process.env.PORT || 3000;
const app = express();

app.set('trust proxy', 1);
app.use(requestLogger());
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

// Actions sensibles (mot de passe, e-mail, suppression) et lecture publique des liens de partage.
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
});
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes. Réessayez dans une minute.' },
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});
app.get('/api/ready', readyHandler({ check: () => withClient((c) => c.query('select 1')) }));
app.all('/api/support', rateLimit({ windowMs: 15 * 60 * 1000, max: 3, standardHeaders: true, legacyHeaders: false }), support);
app.get('/api/me/support-requests', mySupportRequests);
app.post('/api/me/support-requests/:id/replies', rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Trop de messages. Réessayez dans un moment.' } }), replyToMySupportRequest);
app.all('/api/help', publicLimiter, help);

app.all('/api/auth/register', authLimiter, trackAccess('auth.register'), register);
app.all('/api/auth/login', authLimiter, trackAccess('auth.login'), login);
app.all('/api/auth/logout', logout);
app.all('/api/auth/me', me);
app.all('/api/auth/google', authLimiter, trackAccess('auth.google'), googleAuth);
app.all('/api/auth/forgot-password', authLimiter, trackAccess('auth.forgot_password'), forgotPassword);
app.all('/api/auth/reset-password', authLimiter, trackAccess('auth.reset_password'), resetPassword);
app.all('/api/auth/verify-email', authLimiter, trackAccess('auth.verify_email'), verifyEmail);
app.all('/api/auth/resend-verification', sensitiveLimiter, resendVerification);
app.all('/api/user/profile', userProfile);
app.all('/api/user/avatar', userAvatar);
app.all('/api/user/change-password', sensitiveLimiter, userPassword);
app.all('/api/user/change-email', sensitiveLimiter, userEmail);
app.all('/api/user/sessions', userSessions);
app.all('/api/user/sessions/:id', userSessions);
app.all('/api/user/account', sensitiveLimiter, userAccount);
app.all('/api/user/consent', userConsent);
app.all('/api/user/storage', userStorage);
app.all('/api/share/links', shareLinks);
app.all('/api/share/links/:id', shareLinks);
app.all('/api/share/public/:token', publicLimiter, trackAccess('share.view'), sharePublic);
app.all('/api/share/public/:token/photo/:id', publicLimiter, sharePublicPhoto);
app.get('/api/me/pet-state', petDeviceState);
app.post('/api/me/pets/:localId/discoverable', petDiscoverable);
app.post('/api/me/pets/:localId/portrait', petPortrait);
app.get('/api/directory/pets', publicLimiter, directoryPets);
app.get('/api/directory/pets/:id/photo', publicLimiter, directoryPhoto);
app.get('/api/directory/pets/:id', publicLimiter, directoryPet);
app.get('/api/pet-threads', petThreadList);
app.post('/api/pet-threads', petThreadOpen);
app.get('/api/pet-threads/:id', petThreadRead);
app.post('/api/pet-threads/:id/messages', rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Trop de messages. Réessayez dans un moment.' } }), petThreadMessage);
app.post('/api/pet-threads/:id/photo', rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Trop d’envois. Réessayez dans un moment.' } }), petThreadPhoto);
app.get('/api/pet-threads/:id/messages/:mid/photo', petThreadMessagePhoto);
app.post('/api/pet-threads/:id/close', petThreadClose);
app.all('/api/pet-threads/:id/block', sensitiveLimiter, petThreadBlock);
app.post('/api/pet-threads/:id/report', sensitiveLimiter, petThreadReport);
app.all('/api/identity', identityMint);
app.all('/api/identity/manage', sensitiveLimiter, identityManage);
app.all('/api/identity/public/:token/photo', publicLimiter, identityPublicPhoto);
app.all('/api/identity/public/:token', publicLimiter, identityPublic);
const withSub = (sub) => (req, res) => { req.params.sub = sub; return household(req, res); };
app.all('/api/household', household);
app.all('/api/household/accept', withSub('accept'));
app.all('/api/household/invites', withSub('invites'));
app.all('/api/household/:sub(invites|members|memberships)/:id', household);
app.all('/api/household/:ownerId/pets', withSub('pets'));
app.all('/api/household/:ownerId/photo/:id', withSub('photo'));
// Recherche LOMAD (proxy vers l'annuaire public ACYM) : limitée, pour ne pas peser sur leur serveur.
const lookupLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Trop de recherches. Réessayez dans une minute.' } });
app.all('/api/lookup/acym', lookupLimiter, trackAccess('lookup.acym'), lookupAcym);
// Navigation front (connectée ou non) : un beacon léger par changement de vue, jamais bloquant.
const trackLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false, message: { error: 'Trop de requêtes.' } });
app.post('/api/track', trackLimiter, track);
// Backoffice (auth admin séparée, RBAC, audit) et endpoints consommés par le front propriétaire.
app.use('/api/admin', buildAdminRouter());
app.get('/api/ref', refHandler);
app.get('/api/public-config', publicConfig);
app.get('/api/me/entitlements', meEntitlements);
app.use('/api/me/notifications',buildNotificationRouter('user'));
app.get('/api/me/events',realtimeHandler('user'));
app.use('/api/me/subscription', buildMySubscriptionRouter());
app.all('/api/sync/push', syncPush);
app.all('/api/sync/pull', syncPull);
app.all('/api/push/subscription', pushSubscription);
app.all('/api/user/dog-events-reminder', dogEventsReminder);
app.post('/api/files', filesUpload);
app.get('/api/files/:id', filesGet);
app.delete('/api/files/:id', filesDelete);
// Assistant IA : limite applicative dédiée (en plus du débit global côté serveur OpenRouter, voir _lib/ai.js).
const aiChatLimiter = perUserLimiter({ windowMs: 60 * 1000, max: 8, message: 'Trop de messages. Réessaie dans une minute.' });
app.post('/api/ai/chat', aiChatLimiter, trackAccess('ai.chat'), aiChat);
// Lecture du carnet par photo : chaque analyse coûte un appel au modèle de vision.
const bookletLimiter = perUserLimiter({ windowMs: 60 * 60 * 1000, max: 20, message: 'Trop d’analyses. Réessaie dans une heure.' });
app.post('/api/ai/booklet-scan', bookletLimiter, trackAccess('ai.booklet'), aiBookletScan);

// Dernier recours des routes qui lèvent une exception synchrone (Express 4 n'attrape pas les rejets asynchrones :
// ceux-là sont journalisés par le garde de processus plus bas).
app.use(errorHandler({ onError: captureError }));

for (const [event, label] of [['uncaughtException', 'exception non attrapée'], ['unhandledRejection', 'promesse rejetée non gérée']]) {
  process.on(event, async (err) => {
    log.error(label, { err });
    captureError(err);
    await flushErrors();
    process.exit(1);
  });
}

async function boot() {
  await initErrorTracking();
  if (!process.env.JWT_SECRET) {
    log.error('JWT_SECRET manquant.');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    log.error('DATABASE_URL manquant.');
    process.exit(1);
  }

  log.info('Application du schéma Postgres');
  await ensureSchema();
  await seedAdminDefaults();
  log.info('Vérification du bucket MinIO');
  await ensureBucket();

  app.listen(PORT, '0.0.0.0', () => {
    log.info('API démarrée', { port: PORT });
    startRealtime();
    const inboxTimer=setInterval(()=>runInboxPush().catch(error=>console.error('inbox push',error.message)),5000);inboxTimer.unref();
    const subscriptionTimer=setInterval(()=>{ runSubscriptionNotifications().catch((error)=>console.error('subscription notifications',error.message)); },5000);
    subscriptionTimer.unref();
  });
}

boot().catch((err) => {
  log.error('Démarrage impossible', { err });
  process.exit(1);
});
