#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Deploy Studio 33 — subpath /financeiro/
#
# O site institucional do Studio 33 fica em studio33arquitetura.com/
# (fora do nosso controle). O app financeiro/gestao fica em:
#   studio33arquitetura.com/financeiro/
#
# Por isso este deploy:
#   1) builda com --base=/financeiro/ (assets ficam /financeiro/assets/...)
#   2) envia para a subpasta public_html/financeiro/ do cPanel
# ============================================================

# Pasta local de saida (relativa ao app-v2)
LOCAL_DIST="./dist/"

# --- SSH/RSYNC settings (mesmo cPanel dos outros tenants) ---
REMOTE_USER="hg253b74"
REMOTE_HOST="sh00086.hostgator.com.br"
REMOTE_PORT=22
REMOTE_PATH="/home2/hg253b74/public_html/financeiro/"
SSH_KEY="$HOME/.ssh/id_ed25519"

APP_V2_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# ------------------------------------------------------------
# Build com base /financeiro/
# ------------------------------------------------------------
echo "=== Building app (vite) com base=/financeiro/ ==="
( cd "$APP_V2_DIR" && npx vite build --base=/financeiro/ )

# Gerar .htaccess minimo para SPA com HashRouter dentro de /financeiro/
# (HashRouter nao precisa de rewrite, mas mantemos DirectoryIndex e
# protecoes basicas.)
cat > "$APP_V2_DIR/$LOCAL_DIST/.htaccess" <<'HTACCESS'
DirectoryIndex index.html

<IfModule mod_headers.c>
  Header set X-XSS-Protection "1; mode=block"
  Header always append X-Frame-Options SAMEORIGIN
  Header set X-Content-Type-Options nosniff
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
HTACCESS

# Sanity check
if [ ! -d "$APP_V2_DIR/$LOCAL_DIST" ]; then
  echo "ERROR: build output not found at $APP_V2_DIR/$LOCAL_DIST"
  exit 1
fi

# ------------------------------------------------------------
# Testa SSH e faz rsync
# ------------------------------------------------------------
echo "=== Testando SSH para $REMOTE_USER@$REMOTE_HOST (porta $REMOTE_PORT) ==="
SSH_CMD=(ssh -i "$SSH_KEY" -p "$REMOTE_PORT" -o BatchMode=yes -o ConnectTimeout=10)
if ! "${SSH_CMD[@]}" "$REMOTE_USER@$REMOTE_HOST" "echo connected" &>/dev/null; then
  echo "ERRO: SSH key auth falhou. Verifique a chave $SSH_KEY ou peca shell access no cPanel."
  exit 1
fi

echo "SSH ok. Garantindo que $REMOTE_PATH existe..."
"${SSH_CMD[@]}" "$REMOTE_USER@$REMOTE_HOST" "mkdir -p '$REMOTE_PATH'"

RSYNC_OPTS=( -avz --delete --compress-level=9 --partial --progress \
  --chmod=Du=rwx,Dg=rx,Do=rx,Fu=rw,Fg=r,Fo=r )
SSH_RSYNC_OPTS=( -e "ssh -i $SSH_KEY -p $REMOTE_PORT -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no" )

echo "=== Deploy via rsync -> $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH ==="
cd "$APP_V2_DIR"
rsync "${RSYNC_OPTS[@]}" "${SSH_RSYNC_OPTS[@]}" "$LOCAL_DIST" "${REMOTE_USER}@${REMOTE_HOST}:$REMOTE_PATH"
echo "=== Deploy Studio 33 concluido ==="
echo "URL: https://studio33arquitetura.com/financeiro/"
