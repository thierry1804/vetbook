// Copie ce fichier en `config.js` (non versionné).
// Présence = sync API activée (data-layer.js). Derrière Nginx, apiBaseUrl reste ''.
window.__SUPABASE_CONFIG__ = {
  // Laisse vide ('') si l'API est sur le même domaine (cas Docker/Nginx).
  apiBaseUrl: '',
  vapidPublicKey: 'YOUR_VAPID_PUBLIC_KEY',
  // ID client OAuth Google (Application Web). Laisse vide pour masquer le bouton.
  googleClientId: '',
};
