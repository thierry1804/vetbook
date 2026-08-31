// Copie ce fichier en `config.js` (non versionné) et renseigne tes valeurs
// depuis Dashboard Supabase → Settings → API.
// La clé "anon/public" est faite pour être exposée côté client (protégée par
// les règles RLS côté base), contrairement à la "service_role" qui ne doit
// JAMAIS apparaître ici ni ailleurs côté client.
window.__SUPABASE_CONFIG__ = {
  url: 'https://YOUR_PROJECT.supabase.co',
  anonKey: 'YOUR_ANON_KEY',
};
