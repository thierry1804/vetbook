#!/usr/bin/env bash
# PostToolUse (Edit|Write) : lint du fichier JS modifié. Exit 2 = erreurs renvoyées à Claude pour correction.
set -u
file=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')
case "$file" in *.js|*.mjs) ;; *) exit 0 ;; esac
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0
[ -f "$file" ] || exit 0
# --no-warn-ignored : les fichiers hors eslint.config.js (admin/ en TS, tests…) passent sans bruit.
if ! out=$(npx --no-install eslint --no-warn-ignored "$file" 2>&1); then
  echo "ESLint signale des erreurs dans $file :" >&2
  echo "$out" >&2
  exit 2
fi
exit 0
