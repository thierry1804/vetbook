// Sérialisation du profil utilisateur (jamais de hash de mot de passe ni de jetons dans les réponses).
export const TERMS_VERSION = '2026-09';

export const USER_COLUMNS = `id, email, name, first_name, last_name, phone, locale, picture_url, avatar_key, avatar_updated_at,
  email_verified_at, pending_email, terms_accepted_at, terms_version, preferences, emergency_contact,
  (password_hash is not null) as has_password, (google_sub is not null) as has_google, created_at`;

export function avatarUrl(row) {
  if (row.avatar_key) return `/api/user/avatar?v=${new Date(row.avatar_updated_at || Date.now()).getTime()}`;
  return row.picture_url || null;
}

export function displayName(first, last, fallback) {
  const n = [first, last].filter(Boolean).join(' ').trim();
  return n || fallback || null;
}

// Réponse commune de register / login / google / me.
export function publicUser(row) {
  return {
    userId: row.id,
    email: row.email,
    emailVerified: !!row.email_verified_at,
    name: row.name || displayName(row.first_name, row.last_name, null),
    firstName: row.first_name || null,
    lastName: row.last_name || null,
    picture: avatarUrl(row),
  };
}

export function fullProfile(row) {
  return {
    ...publicUser(row),
    phone: row.phone || '',
    locale: row.locale || 'fr',
    pendingEmail: row.pending_email || null,
    hasPassword: !!row.has_password,
    googleLinked: !!row.has_google,
    hasCustomAvatar: !!row.avatar_key,
    preferences: row.preferences || {},
    emergencyContact: row.emergency_contact || {},
    consent: { acceptedAt: row.terms_accepted_at || null, version: row.terms_version || null, currentVersion: TERMS_VERSION },
    createdAt: row.created_at,
  };
}
