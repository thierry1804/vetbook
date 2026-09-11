// Copie ce fichier en `config.js` (non versionné).
// Présence de ce fichier = synchronisation cloud activée (voir
// data-layer.js: isConfigured()). Absent, l'app reste 100% locale.
window.__SUPABASE_CONFIG__ = {
  // Laisse vide ('') si l'API (dossier api/) est déployée sur le même
  // domaine que le site (cas normal sur Vercel). Ne renseigner que si
  // l'API tourne sur un autre domaine.
  apiBaseUrl: '',
  // Clé publique VAPID (notifications push) — génère une paire avec
  // `npx web-push generate-vapid-keys`. La clé publique est sûre à exposer
  // ici ; la clé privée va en variable d'environnement Vercel
  // (VAPID_PRIVATE_KEY), jamais ici.
  vapidPublicKey: 'YOUR_VAPID_PUBLIC_KEY',
  // Connexion avec Google (Google Identity Services) : ID client OAuth
  // "Application Web" créé dans Google Cloud Console → API et services →
  // Identifiants. Ajoute le(s) domaine(s) de l'app (ex. https://app.exemple.com,
  // http://localhost:3000 en dev) dans "Origines JavaScript autorisées" —
  // pas besoin d'URI de redirection, Google Identity Services utilise
  // postMessage. Laisse vide ('') pour masquer le bouton "Se connecter avec
  // Google" (seul le lien magique par email reste alors disponible). Cet ID
  // est public par nature (visible dans le JS servi au navigateur) ; il doit
  // aussi être renseigné côté serveur dans la variable d'environnement
  // GOOGLE_CLIENT_ID (même valeur), utilisée pour vérifier l'audience du
  // jeton dans api/auth/google.js — sans secret à manipuler.
  googleClientId: '',
};
