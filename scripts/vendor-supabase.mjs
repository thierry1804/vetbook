// Regénère vendor/supabase.js : un bundle navigateur autonome de
// @supabase/supabase-js (client uniquement, clé anon), pour rester cohérent
// avec le reste de l'app (pas de dépendance CDN externe -> fonctionne aussi
// hors-ligne via le service worker). À relancer après un `npm update` de
// @supabase/supabase-js.
import { build } from 'esbuild';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const entry = `export { createClient } from '@supabase/supabase-js';`;
await mkdir(path.join(root, '.tmp'), { recursive: true });
const entryFile = path.join(root, '.tmp', 'supabase-entry.js');
await writeFile(entryFile, entry);

await build({
  entryPoints: [entryFile],
  bundle: true,
  minify: true,
  format: 'iife',
  globalName: 'supabaseSdk',
  platform: 'browser',
  target: 'es2019',
  outfile: path.join(root, 'vendor', 'supabase.js'),
  banner: { js: '/* @supabase/supabase-js — bundle navigateur vendorisé localement, voir scripts/vendor-supabase.mjs */' },
});

console.log('vendor/supabase.js régénéré.');
