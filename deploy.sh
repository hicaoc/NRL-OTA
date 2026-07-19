#!/usr/bin/env bash
# One-shot production deploy for NRL OTA: cross-compile the Go API, build the
# Vue frontend, upload both to the server, and restart the backend service.
#
#   ./deploy.sh                  backend + frontend (default)
#   ./deploy.sh --backend-only   API binary only
#   ./deploy.sh --frontend-only  static files only
#
# Environment overrides:
#   OTA_DEPLOY_USER     SSH account        (default: root)
#   OTA_DEPLOY_HOST     server             (default: ota.nrlptt.com)
#   OTA_SSH_KEY         SSH identity file  (default: ~/.ssh/id_dsa when present —
#                       this server's account still trusts a legacy DSA key that
#                       modern OpenSSH clients skip unless named explicitly)
#   OTA_BACKEND_BINARY  remote binary path (default: /nrlota/nrlota)
#   OTA_BACKEND_SERVICE systemd unit       (default: nrlota.service)
#   OTA_DEPLOY_DIR      remote web root    (default: /nrlota/www)
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
user="${OTA_DEPLOY_USER:-root}"
host="${OTA_DEPLOY_HOST:-ota.nrlptt.com}"
remote_binary="${OTA_BACKEND_BINARY:-/nrlota/nrlota}"
service="${OTA_BACKEND_SERVICE:-nrlota.service}"
remote_www="${OTA_DEPLOY_DIR:-/nrlota/www}"
remote="${user}@${host}"

ssh_key="${OTA_SSH_KEY:-}"
if [[ -z "$ssh_key" && -f "$HOME/.ssh/id_dsa" ]]; then
  ssh_key="$HOME/.ssh/id_dsa"
fi
ssh_opts=(-o BatchMode=yes -o ConnectTimeout=15)
if [[ -n "$ssh_key" ]]; then
  ssh_opts+=(-o IdentitiesOnly=yes -i "$ssh_key")
fi

do_backend=1
do_frontend=1
case "${1:-}" in
  --backend-only) do_frontend=0 ;;
  --frontend-only) do_backend=0 ;;
  "") ;;
  *) echo "usage: $0 [--backend-only|--frontend-only]" >&2; exit 2 ;;
esac

if (( do_backend )); then
  command -v go >/dev/null || { echo "go was not found in PATH" >&2; exit 1; }
fi
if (( do_frontend )); then
  command -v vp >/dev/null || { echo "vp (vite-plus) was not found in PATH" >&2; exit 1; }
fi
for command in ssh scp tar; do
  command -v "$command" >/dev/null || { echo "$command was not found in PATH" >&2; exit 1; }
done

stage="/tmp/nrl-ota-deploy-$(date +%s)-$$"

if (( do_backend )); then
  echo "==> Building backend (linux/amd64)"
  mkdir -p "$script_dir/dist"
  (cd "$script_dir" && GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags='-s -w' -o dist/nrl-ota-linux-amd64 .)

  echo "==> Uploading backend to $remote:$remote_binary"
  scp "${ssh_opts[@]}" "$script_dir/dist/nrl-ota-linux-amd64" "$remote:$stage.new"
  # Keep the previous binary for rollback; only restart once, and roll back if
  # the new binary fails to stay up.
  ssh "${ssh_opts[@]}" "$remote" "set -e
    cp -p '$remote_binary' '$remote_binary.previous' 2>/dev/null || true
    install -m 0755 '$stage.new' '$remote_binary'
    rm -f '$stage.new'
    if ! systemctl restart '$service'; then
      test -f '$remote_binary.previous' && mv '$remote_binary.previous' '$remote_binary'
      systemctl restart '$service' || true
      echo 'restart failed; rolled back to the previous binary' >&2
      exit 1
    fi
    systemctl is-active --quiet '$service'"
  echo "==> Backend deployed; $service restarted and active"
fi

if (( do_frontend )); then
  # Template-binding audit: the runtime-compiled inline template fails at
  # render time (blank page) when a binding is missing from setup()'s return,
  # and neither vp build nor a syntax check catches that.
  if command -v node >/dev/null; then
    echo "==> Checking frontend template bindings"
    (cd "$script_dir/frontend" && node scripts/check-template.mjs)
  else
    echo "==> node not found; skipping frontend/scripts/check-template.mjs" >&2
  fi

  echo "==> Building frontend"
  (cd "$script_dir/frontend" && vp install --frozen-lockfile && vp build)

  echo "==> Uploading frontend to $remote:$remote_www/"
  mkdir -p "$script_dir/dist"
  (cd "$script_dir/frontend" && tar czf "$script_dir/dist/nrl-ota-www.tgz" -C dist .)
  scp "${ssh_opts[@]}" "$script_dir/dist/nrl-ota-www.tgz" "$remote:$stage.tgz"
  # Overlay the web root instead of rsync --delete: the server also keeps files
  # that are not part of the frontend bundle (e.g. staged flasher manifests).
  ssh "${ssh_opts[@]}" "$remote" "set -e
    cd '$remote_www'
    tar xzf '$stage.tgz'
    rm -f '$stage.tgz'"
  rm -f "$script_dir/dist/nrl-ota-www.tgz"
  echo "==> Frontend deployed to $remote_www/"
fi

echo "Deploy finished: $remote (backend=$do_backend frontend=$do_frontend)"
