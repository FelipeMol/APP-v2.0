#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# branch-manager.sh — Gerenciador de frentes de trabalho (git worktree)
#
# Cada frente vira uma PASTA IRMÃ ao repo principal, que você abre numa
# janela separada do VS Code. Várias frentes rodam em PARALELO.
#
# Uso:
#   ./scripts/branch-manager.sh new <nome>       Cria frente + pasta + abre VS Code
#   ./scripts/branch-manager.sh status           Lista frentes ativas e arquivos
#   ./scripts/branch-manager.sh conflicts        Mostra conflitos entre frentes
#   ./scripts/branch-manager.sh merge-all [msg]  CEO: confere, merge, commit
#   ./scripts/branch-manager.sh close <nome>     Remove frente após merge
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PARENT_DIR="$(dirname "$REPO_DIR")"
REPO_NAME="$(basename "$REPO_DIR")"
BASE_BRANCH="main"

RED='\033[0;31m'; GRN='\033[0;32m'; YLW='\033[0;33m'; BLU='\033[0;34m'
BOLD='\033[1m'; RST='\033[0m'

info()  { echo -e "${BLU}i${RST}  $*"; }
ok()    { echo -e "${GRN}OK${RST} $*"; }
warn()  { echo -e "${YLW}AV${RST} $*"; }
err()   { echo -e "${RED}ER${RST} $*" >&2; }
die()   { err "$*"; exit 1; }

# Retorna branches frente/*
list_frentes() {
  git -C "$REPO_DIR" branch --list 'frente/*' | sed 's/^[* ]*//' || true
}

# Caminho da worktree irma
worktree_path() {
  echo "${PARENT_DIR}/${REPO_NAME}-${1}"
}

# Arquivos modificados em relacao ao base
changed_files() {
  git -C "$REPO_DIR" diff --name-only "${BASE_BRANCH}...${1}" 2>/dev/null || true
}

# ── new ───────────────────────────────────────────────────────────────────────
cmd_new() {
  local name="${1:-}"
  [[ -z "$name" ]] && die "Uso: ./scripts/branch-manager.sh new <nome>"
  local branch="frente/${name}"
  local wt_path
  wt_path=$(worktree_path "$name")

  git -C "$REPO_DIR" branch --list "$branch" | grep -q . && die "Frente '${branch}' ja existe."
  [[ -d "$wt_path" ]] && die "Pasta '${wt_path}' ja existe."

  git -C "$REPO_DIR" fetch --quiet origin "$BASE_BRANCH" 2>/dev/null || true
  git -C "$REPO_DIR" worktree add "$wt_path" -b "$branch" "$BASE_BRANCH"

  echo ""
  ok "Frente criada!"
  echo "  Branch:  ${branch}"
  echo "  Pasta:   ${wt_path}"
  echo ""

  if command -v code &>/dev/null; then
    code "$wt_path"
    ok "Abrindo nova janela do VS Code..."
  else
    info "Abra no VS Code: code \"${wt_path}\""
  fi

  echo ""
  echo "  Fluxo:"
  echo "  1. Edite e faca commits normalmente nessa pasta"
  echo "  2. Quando pronto, no repo principal rode:"
  echo "     ./scripts/branch-manager.sh merge-all"
}

# ── status ────────────────────────────────────────────────────────────────────
cmd_status() {
  local frentes
  frentes=$(list_frentes)

  if [[ -z "$frentes" ]]; then
    info "Nenhuma frente ativa. Use 'new <nome>' para criar."
    return
  fi

  echo ""
  echo "  Frentes de trabalho ativas (base: ${BASE_BRANCH})"
  echo "  -------------------------------------------------"

  while IFS= read -r branch; do
    [[ -z "$branch" ]] && continue
    local short="${branch#frente/}"
    local wt_path
    wt_path=$(worktree_path "$short")
    local files
    files=$(changed_files "$branch")
    local count=0
    [[ -n "$files" ]] && count=$(echo "$files" | grep -c '' || true)
    local ahead
    ahead=$(git -C "$REPO_DIR" rev-list --count "${BASE_BRANCH}..${branch}" 2>/dev/null || echo 0)

    echo ""
    echo "  FRENTE: ${branch}"
    echo "  Pasta:  ${wt_path}"
    echo "  Status: ${ahead} commit(s) a frente  |  ${count} arquivo(s) modificado(s)"
    if [[ -n "$files" ]]; then
      while IFS= read -r f; do
        [[ -z "$f" ]] && continue
        echo "    + $f"
      done <<< "$files"
    fi
  done <<< "$frentes"
  echo ""

  _show_conflicts
}

# ── conflicts ─────────────────────────────────────────────────────────────────
cmd_conflicts() {
  _show_conflicts verbose
}

_show_conflicts() {
  local verbose="${1:-}"
  local frentes
  frentes=$(list_frentes)
  [[ -z "$frentes" ]] && return

  local all=""
  while IFS= read -r branch; do
    [[ -z "$branch" ]] && continue
    local files
    files=$(changed_files "$branch")
    while IFS= read -r f; do
      [[ -z "$f" ]] && continue
      all="${all}${f}	${branch}\n"
    done <<< "$files"
  done <<< "$frentes"

  [[ -z "$all" ]] && { [[ -n "$verbose" ]] && ok "Sem conflitos."; return; }

  local dups
  dups=$(printf "%b" "$all" | awk -F'\t' '{print $1}' | sort | uniq -d)

  if [[ -z "$dups" ]]; then
    [[ -n "$verbose" ]] && ok "Nenhum conflito de arquivos entre frentes ativas."
    return
  fi

  echo ""
  echo "  CONFLITOS -- mesmo arquivo em multiplas frentes:"
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    local bs
    bs=$(printf "%b" "$all" | awk -F'\t' -v file="$f" '$1==file{printf "%s ",$2}')
    echo "  CONFLITO: ${f}"
    echo "    frentes: ${bs}"
  done <<< "$dups"
}

# ── merge-all (CEO) ───────────────────────────────────────────────────────────
cmd_merge_all() {
  local commit_msg="${1:-}"
  local frentes
  frentes=$(list_frentes)

  if [[ -z "$frentes" ]]; then
    info "Nenhuma frente ativa para unir."
    return
  fi

  echo ""
  echo "  ============================================"
  echo "   CEO Agent -- Conferencia de Frentes"
  echo "  ============================================"
  echo ""

  # Resumo de cada frente
  while IFS= read -r branch; do
    [[ -z "$branch" ]] && continue
    local ahead count files
    ahead=$(git -C "$REPO_DIR" rev-list --count "${BASE_BRANCH}..${branch}" 2>/dev/null || echo 0)
    files=$(changed_files "$branch")
    count=0; [[ -n "$files" ]] && count=$(echo "$files" | grep -c '' || true)
    echo "  FRENTE: ${branch}  (${ahead} commits, ${count} arquivo(s))"
    if [[ -n "$files" ]]; then
      while IFS= read -r f; do
        [[ -z "$f" ]] && continue
        echo "    + $f"
      done <<< "$files"
    fi
    echo ""
  done <<< "$frentes"

  # Checa conflitos de arquivo
  local all=""
  while IFS= read -r branch; do
    [[ -z "$branch" ]] && continue
    local files
    files=$(changed_files "$branch")
    while IFS= read -r f; do
      [[ -z "$f" ]] && continue
      all="${all}${f}	${branch}\n"
    done <<< "$files"
  done <<< "$frentes"

  local dups=""
  [[ -n "$all" ]] && dups=$(printf "%b" "$all" | awk -F'\t' '{print $1}' | sort | uniq -d)

  if [[ -n "$dups" ]]; then
    echo "  BLOQUEADO -- conflitos de arquivos:"
    while IFS= read -r f; do
      [[ -z "$f" ]] && continue
      local bs
      bs=$(printf "%b" "$all" | awk -F'\t' -v file="$f" '$1==file{printf "%s ",$2}')
      echo "  CONFLITO: ${f} -- frentes: ${bs}"
    done <<< "$dups"
    echo ""
    die "Resolva os conflitos antes de prosseguir."
  fi

  ok "Sem conflitos de arquivos entre as frentes."
  echo ""

  # Mensagem de commit automatica
  if [[ -z "$commit_msg" ]]; then
    local branch_list
    branch_list=$(list_frentes | sed 's/frente\///' | tr '\n' ', ' | sed 's/, $//')
    commit_msg="release: merge das frentes ${branch_list}"
  fi
  echo "  Commit: ${commit_msg}"
  echo ""

  read -r -p "  Confirmar merge de todas as frentes em '${BASE_BRANCH}'? [s/N] " resp
  [[ "${resp,,}" != "s" ]] && { info "Cancelado."; exit 0; }

  cd "$REPO_DIR"
  git checkout "$BASE_BRANCH"
  git pull --ff-only origin "$BASE_BRANCH" 2>/dev/null || true

  local branch
  while IFS= read -r branch; do
    [[ -z "$branch" ]] && continue
    info "Mergeando ${branch}..."
    if git -C "$REPO_DIR" merge --no-ff "$branch" -m "merge(${branch#frente/}): une frente em main"; then
      ok "Merge de '${branch}' concluido."
    else
      err "Falha no merge de '${branch}'. Resolva os conflitos e rode 'git merge --continue'."
      exit 1
    fi
  done <<< "$frentes"

  echo ""
  ok "Todas as frentes unidas em '${BASE_BRANCH}'!"
  echo ""

  read -r -p "  Remover worktrees e branches merged? [s/N] " resp2
  if [[ "${resp2,,}" == "s" ]]; then
    local b
    while IFS= read -r b; do
      [[ -z "$b" ]] && continue
      cmd_close "${b#frente/}" silent
    done <<< "$frentes"
    ok "Worktrees removidas."
  fi

  echo ""
  echo "  Log recente:"
  git -C "$REPO_DIR" log --oneline -8
}

# ── close ─────────────────────────────────────────────────────────────────────
cmd_close() {
  local name="${1:-}"
  local silent="${2:-}"
  [[ -z "$name" ]] && die "Uso: ./scripts/branch-manager.sh close <nome>"
  name="${name#frente/}"

  local branch="frente/${name}"
  local wt_path
  wt_path=$(worktree_path "$name")

  if git -C "$REPO_DIR" worktree list | grep -qF "$wt_path"; then
    git -C "$REPO_DIR" worktree remove "$wt_path" --force 2>/dev/null || true
  fi
  [[ -d "$wt_path" ]] && rm -rf "$wt_path"

  if git -C "$REPO_DIR" branch --list "$branch" | grep -q .; then
    git -C "$REPO_DIR" branch -D "$branch" 2>/dev/null || true
  fi

  [[ -z "$silent" ]] && ok "Frente '${branch}' removida (worktree + branch)."
}

# ── help ──────────────────────────────────────────────────────────────────────
cmd_help() {
  echo ""
  echo "  branch-manager.sh -- Frentes de trabalho paralelas (git worktree)"
  echo ""
  echo "  Cada frente eh uma PASTA SEPARADA. Abra cada pasta numa janela do VS Code"
  echo "  e trabalhe em PARALELO. O CEO (merge-all) confere e une tudo no final."
  echo ""
  echo "  COMANDOS"
  echo "    new <nome>          Cria frente, pasta irma e abre no VS Code"
  echo "    status              Lista frentes, commits e arquivos por frente"
  echo "    conflicts           Exibe conflitos de arquivo entre frentes"
  echo "    merge-all [msg]     CEO: confere + merge de todas as frentes em ${BASE_BRANCH}"
  echo "    close <nome>        Remove worktree + branch apos merge"
  echo ""
  echo "  ESTRUTURA DE PASTAS"
  echo "    ${REPO_NAME}/                <- repo principal (main)  <- janela 1"
  echo "    ${REPO_NAME}-rh-atestados/   <- frente/rh-atestados    <- janela 2"
  echo "    ${REPO_NAME}-financeiro/     <- frente/financeiro       <- janela 3"
  echo ""
  echo "  EXEMPLOS"
  echo "    ./scripts/branch-manager.sh new rh-atestados"
  echo "    ./scripts/branch-manager.sh new financeiro-relatorios"
  echo "    ./scripts/branch-manager.sh status"
  echo "    ./scripts/branch-manager.sh merge-all \"v2.5: RH + Financeiro\""
  echo "    ./scripts/branch-manager.sh close rh-atestados"
  echo ""
}

# ── dispatch ──────────────────────────────────────────────────────────────────
CMD="${1:-help}"
shift || true

case "$CMD" in
  new)          cmd_new "$@" ;;
  status)       cmd_status ;;
  conflicts)    cmd_conflicts ;;
  merge-all)    cmd_merge_all "$@" ;;
  close)        cmd_close "$@" ;;
  help|--help)  cmd_help ;;
  *)            die "Comando desconhecido: '$CMD'. Use 'help'." ;;
esac
