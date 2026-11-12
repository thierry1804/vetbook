#!/usr/bin/env bash
# Stop : avant que Claude rende la main, lance `npm run test:fast` (lint + unitaires + typecheck admin)
# s'il y a des changements de code non vérifiés. Exit 2 = Claude doit corriger avant de s'arrêter.
set -u
input=$(cat)
# Déjà relancé par ce hook : ne pas boucler, Claude a eu sa chance de corriger.
grep -Eq '"stop_hook_active"[[:space:]]*:[[:space:]]*true' <<<"$input" && exit 0
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

# Empreinte des changements de code (suivis + non suivis) ; rien à faire si vide ou déjà vérifiée au vert.
code='\.(js|mjs|ts|tsx|json|sql)$'
fingerprint=$( { git diff HEAD --name-only; git ls-files --others --exclude-standard; } | grep -E "$code" | sort -u \
  | while read -r f; do [ -f "$f" ] && echo "$f $(git hash-object "$f")"; done | sha1sum | cut -d' ' -f1)
changed=$( { git diff HEAD --name-only; git ls-files --others --exclude-standard; } | grep -cE "$code")
[ "$changed" -eq 0 ] && exit 0
stamp="$(git rev-parse --git-dir)/claude-test-fast.ok"
[ -f "$stamp" ] && [ "$(cat "$stamp")" = "$fingerprint" ] && exit 0

if out=$(npm run --silent test:fast 2>&1); then
  echo "$fingerprint" > "$stamp"
  exit 0
fi
echo "npm run test:fast échoue sur les changements en cours — corrige avant de terminer :" >&2
echo "$out" | tail -40 >&2
exit 2
