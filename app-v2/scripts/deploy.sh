#!/usr/bin/env bash
set -euo pipefail

# Deploy script - tries rsync over SSH first, falls back to FTPS (lftp) when SSH/shell not available.
# Edit the variables below before use.

# Local build folder (relative to workspace)
LOCAL_DIST="./dist/"

# --- SSH/RSYNC settings (preferred when shell/SFTP is allowed) ---
REMOTE_USER="hg253b74"
REMOTE_HOST="sh00086.hostgator.com.br"
REMOTE_PORT=22
REMOTE_PATH="/home2/hg253b74/public_html/"
SSH_KEY="$HOME/.ssh/id_ed25519"

# --- FTP/FTPS settings (fallback) ---
# Create an FTP account in cPanel or use your FTP credentials.
FTP_USER="Felipe@construtorarr.online"    # predefinido a partir do cPanel (ajuste se necessário)
FTP_PASS=""    # keep this out of source control; best practice: export FTP_PASS in env before running
FTP_HOST="$REMOTE_HOST"
FTP_PATH="/public_html/"   # path relative to FTP account root, adjust if needed

# Build (run from app-v2 root)
echo "=== Building app (vite) ==="
npm run build --prefix "$(dirname "$0")/.."

# Copy .htaccess into dist if present in app-v2
HTACCESS_SOURCE="$(dirname "$0")/../.htaccess"
if [ -f "$HTACCESS_SOURCE" ]; then
  echo "Copying .htaccess into dist/"
  cp "$HTACCESS_SOURCE" "$LOCAL_DIST/.htaccess"
fi

# Ensure local dist exists
if [ ! -d "$LOCAL_DIST" ]; then
  echo "ERROR: build output not found at $LOCAL_DIST"
  exit 1
fi

# Try SSH key-based connection first (non-interactive)
echo "=== Testing SSH connection to $REMOTE_USER@$REMOTE_HOST (port $REMOTE_PORT) ==="
SSH_CMD=(ssh -i "$SSH_KEY" -p "$REMOTE_PORT" -o BatchMode=yes -o ConnectTimeout=10)
if "${SSH_CMD[@]}" "$REMOTE_USER@$REMOTE_HOST" "echo connected" &>/dev/null; then
  echo "SSH key auth ok — using rsync upload"

  RSYNC_OPTS=( -avz --delete --compress-level=9 --partial --progress \
    --chmod=Du=rwx,Dg=rx,Do=rx,Fu=rw,Fg=r,Fo=r )
  SSH_RSYNC_OPTS=( -e "ssh -i $SSH_KEY -p $REMOTE_PORT -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no" )

  echo "=== Deploying via rsync to $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH ==="
  rsync "${RSYNC_OPTS[@]}" "${SSH_RSYNC_OPTS[@]}" "$LOCAL_DIST" "${REMOTE_USER}@${REMOTE_HOST}:$REMOTE_PATH"
  echo "=== Deploy completed (rsync) ==="
  exit 0
else
  echo "SSH key auth failed or shell access disabled on server. Will attempt FTPS fallback."
fi

# If we reach here, try FTPS using lftp (mirror)
if command -v lftp >/dev/null 2>&1; then
  if [ -z "$FTP_USER" ] || [ -z "$FTP_PASS" ]; then
    echo "FTP credentials not set. You can export FTP_USER and FTP_PASS as environment variables before running."
    echo "Example: export FTP_USER=Felipe@construtorarr.online; export FTP_PASS=senha; ./deploy.sh"
    exit 1
  fi

  echo "lftp found — using FTPS mirror to $FTP_HOST:$FTP_PATH"
  # Note: --parallel speeds upload but may be rate-limited by hoster
  lftp -u "$FTP_USER","$FTP_PASS" -p "$REMOTE_PORT" "$FTP_HOST" <<EOF
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ssl:verify-certificate no
mirror -R --delete --parallel=4 --verbose "$LOCAL_DIST" "$FTP_PATH"
quit
EOF
  echo "=== Deploy completed (lftp) ==="
  exit 0
else
  echo "lftp not installed. Unable to perform FTPS fallback."
  echo "Options:"
  echo "  - Install lftp (brew install lftp) and set FTP_USER/FTP_PASS in environment, or" 
  echo "  - Use VS Code SFTP extension with your FTP account, or" 
  echo "  - Enable SSH shell access with HostGator support (if your plan allows)."
  exit 1
fi
