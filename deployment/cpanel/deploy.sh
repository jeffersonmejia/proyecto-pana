#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WEB_ROOT="${DEPLOY_WEB_ROOT:-$HOME/public_html}"
API_ROOT="${DEPLOY_API_ROOT:-$HOME/pana-api}"
DIST_ROOT="$REPO_ROOT/web/dist/pana-web"

command -v npm >/dev/null || { echo 'No se encontró npm en cPanel.' >&2; exit 1; }
command -v composer >/dev/null || { echo 'No se encontró Composer en cPanel.' >&2; exit 1; }
[ -f "$API_ROOT/.env" ] || { echo "Falta $API_ROOT/.env; créalo antes del primer despliegue." >&2; exit 1; }

cd "$REPO_ROOT/web"
npm ci --no-audit --no-fund
npm run build -- --configuration production
[ -d "$DIST_ROOT" ] || { echo 'No se generó el build de Angular.' >&2; exit 1; }

mkdir -p "$API_ROOT"
cp -R "$REPO_ROOT/src" "$API_ROOT/"
cp -R "$REPO_ROOT/public" "$API_ROOT/"
cp "$REPO_ROOT/composer.json" "$REPO_ROOT/composer.lock" "$API_ROOT/"
composer install --no-dev --optimize-autoloader --working-dir="$API_ROOT"

mkdir -p "$WEB_ROOT" "$WEB_ROOT/api"
if command -v rsync >/dev/null; then
  rsync -a --exclude api/ "$DIST_ROOT/" "$WEB_ROOT/"
else
  cp -R "$DIST_ROOT/." "$WEB_ROOT/"
fi
cp "$REPO_ROOT/deployment/cpanel/frontend.htaccess" "$WEB_ROOT/.htaccess"
cp "$REPO_ROOT/deployment/cpanel/api-index.php" "$WEB_ROOT/api/index.php"
cp "$REPO_ROOT/deployment/cpanel/api.htaccess" "$WEB_ROOT/api/.htaccess"

echo "PANA publicado en $WEB_ROOT; API privado en $API_ROOT."
