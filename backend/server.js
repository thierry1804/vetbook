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
import support, { mySupportRequests, replyToMySupportRequest } from './api/support.js';
import help from './api/help.js';

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
const aiChatLimiter = rateLimit({ windowMs: 60 * 1000, max: 8, standardHeaders: true, legacyHeaders: false, message: { error: 'Trop de messages. Réessaie dans une minute.' } });
app.post('/api/ai/chat', aiChatLimiter, trackAccess('ai.chat'), aiChat);

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
  await seedAdminDefaults();
  console.log('Vérification du bucket MinIO...');
  await ensureBucket();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`API App'lika sur http://0.0.0.0:${PORT}`);
    startRealtime();
    const inboxTimer=setInterval(()=>runInboxPush().catch(error=>console.error('inbox push',error.message)),5000);inboxTimer.unref();
    const subscriptionTimer=setInterval(()=>{ runSubscriptionNotifications().catch((error)=>console.error('subscription notifications',error.message)); },5000);
    subscriptionTimer.unref();
  });
}

boot().catch((err) => {
  console.error('Démarrage impossible:', err);
  process.exit(1);
});
