#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# branch-manager.sh — Gerenciador de frentes de trabalho (Git branches)
#
# Uso:
#   ./scripts/branch-manager.sh new <nome>          Cria nova frente de trabalho
#   ./scripts/branch-manager.sh status              Lista frentes ativas e arquivos
#   ./scripts/branch-manager.sh check <nome>        Verifica conflitos antes de criar
#   ./scripts/branch-manager.sh conflicts           Mostra conflitos entre TODAS as frentes
#   ./scripts/branch-manager.sh merge-all [msg]     Confere, faz merge e commit de todas
#   ./scripts/branch-manager.sh close <nome>        Remove frente após merge
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

BASE_BRANCH="main"
RED='\033[0;31m'; GRN='\033[0;32m'; YLW='\033[0;33m'; BLU='\033[0;34m'; BOLD='\033[1m'; RST='\033[0m'

# ── Helpers ──────────────────────────────────────────────────────────────────

info()  { echo -e "${BLU}ℹ${RST}  $*"; }
ok()    { echo -e "${GRN}✔${RST}  $*"; }
warn()  { echo -e "${YLW}⚠${RST}  $*"; }
err()   { echo -e "${RED}✖${RST}  $*" >&2; }
die()   { err "$*"; exit 1; }

require_clean_base() {
  git fetch --quiet origin "$BASE_BRANCH" 2>/dev/null || true
  local diff
  diff=$(git diff --name-only "$BASE_BRANCH" -- 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$diff" -gt 0 && "$(git branch --show-current)" == "$BASE_BRANCH" ]]; then
    warn "Há alterações não commitadas em $BASE_BRANCH. Faça commit antes de criar uma frente."
  fi
}

# Retorna apenas frentes de trabalho (branches frente/*)
list_frentes() {
  git branch --list 'frente/*' | sed 's/^[* ]*//' || true
}

# Arquivos modificados numa frente em relação ao base
changed_files() {
  local branch="$1"
  git diff --name-only "$BASE_BRANCH"..."$branch" 2>/dev/null || true
}

# ── Comando: new ─────────────────────────────────────────────────────────────
cmd_new() {
  local name="${1:-}"
  [[ -z "$name" ]] && die "Informe o nome da frente: ./scripts/branch-manager.sh new <nome>"
  name="frente/${name}"

  # Garante que não existe
  if git branch --list "$name" | grep -q .; then
    die "Frente '$name' já existe. Use 'status' para ver o estado atual."
  fi

  # Verifica conflitos com frentes existentes
  cmd_check "$name" silent

  # Cria a branch a partir do base atualizado
  git fetch --quiet origin "$BASE_BRANCH" 2>/dev/null || true
  git checkout -b "$name" "origin/$BASE_BRANCH" 2>/dev/null || git checkout -b "$name" "$BASE_BRANCH"

  ok "Frente '${BOLD}$name${RST}${GRN}' criada a partir de $BASE_BRANCH."
  echo ""
  echo -e "  ${BOLD}Próximos passos:${RST}"
  echo -e "  1. Faça suas edições nos arquivos desta frente"
  echo -e "  2. git add + git commit normalmente"
  echo -e "  3. Quando pronto: ${BOLD}git checkout $BASE_BRANCH${RST}"
  echo -e "  4. Para unir tudo: ${BOLD}./scripts/branch-manager.sh merge-all${RST}"
}

# ── Comando: status ───────────────────────────────────────────────────────────
cmd_status() {
  local frentes
  frentes=$(list_frentes)

  if [[ -z "$frentes" ]]; then
    info "Nenhuma frente de trabalho ativa. Use 'new <nome>' para criar."
    return
  fi

  echo ""
  echo -e "  ${BOLD}Frentes de trabalho ativas${RST} (base: $BASE_BRANCH)"
  echo -e "  ────────────────────────────────────────────────────"

  local current
  current=$(git branch --show-current)

  while IFS= read -r branch; do
    [[ -z "$branch" ]] && continue
    local files
    files=$(changed_files "$branch")
    local count=0
    [[ -n "$files" ]] && count=$(echo "$files" | grep -c '' || true)
    local marker=""
    [[ "$branch" == "$current" ]] && marker=" ${YLW}← atual${RST}"
    echo ""
    echo -e "  ${BOLD}${BLU}${branch}${RST}${marker}  (${count} arquivo(s) modificado(s))"
    if [[ -n "$files" ]]; then
      while IFS= read -r f; do
        [[ -z "$f" ]] && continue
        echo -e "    ${GRN}+${RST} $f"
      done <<< "$files"
    else
      echo -e "    ${YLW}(sem modificações em relação a $BASE_BRANCH)${RST}"
    fi
  done <<< "$frentes"
  echo ""

  # Aviso de conflitos
  _detect_conflicts_summary
}

# ── Comando: check ────────────────────────────────────────────────────────────
# Verifica se uma branch (existente ou nome futuro) conflitaria com as demais
cmd_check() {
  local target="${1:-}"
  local silent="${2:-}"
  [[ -z "$target" ]] && die "Informe o nome a verificar: ./scripts/branch-manager.sh check <nome>"

  # Normaliza prefixo
  [[ "$target" != frente/* ]] && target_display="frente/$target" || target_display="$target"

  local other_frentes
  other_frentes=$(list_frentes | grep -v "^${target_display}$" || true)

  if [[ -z "$other_frentes" ]]; then
    [[ -z "$silent" ]] && ok "Nenhuma outra frente ativa — sem conflitos possíveis."
    return 0
  fi

  # Coleta arquivos da frente alvo (se já existir)
  local target_files=""
  if git branch --list "$target_display" | grep -q .; then
    target_files=$(changed_files "$target_display")
  fi

  local has_conflict=0
  while IFS= read -r branch; do
    [[ -z "$branch" ]] && continue
    local other_files
    other_files=$(changed_files "$branch")
    [[ -z "$other_files" || -z "$target_files" ]] && continue

    while IFS= read -r tf; do
      [[ -z "$tf" ]] && continue
      if echo "$other_files" | grep -qxF "$tf"; then
        if [[ -z "$silent" ]]; then
          warn "Conflito! Arquivo '${BOLD}${tf}${RST}${YLW}' já está sendo editado pela frente '${BOLD}${branch}${RST}${YLW}'"
        fi
        has_conflict=1
      fi
    done <<< "$target_files"
  done <<< "$other_frentes"

  if [[ $has_conflict -eq 0 ]]; then
    [[ -z "$silent" ]] && ok "Sem conflitos de arquivos com outras frentes ativas."
    return 0
  else
    [[ -z "$silent" ]] && err "Resolva os conflitos antes de criar/juntar esta frente."
    return 1
  fi
}

# ── Comando: conflicts ────────────────────────────────────────────────────────
cmd_conflicts() {
  _detect_conflicts_summary verbose
}

_detect_conflicts_summary() {
  local verbose="${1:-}"
  local frentes
  frentes=$(list_frentes)
  [[ -z "$frentes" ]] && return

  # Gera lista: "arquivo<TAB>branch" para todas as frentes
  local all_entries=""
  while IFS= read -r branch; do
    [[ -z "$branch" ]] && continue
    local files
    files=$(changed_files "$branch")
    while IFS= read -r f; do
      [[ -z "$f" ]] && continue
      all_entries="${all_entries}${f}	${branch}\n"
    done <<< "$files"
  done <<< "$frentes"

  if [[ -z "$all_entries" ]]; then
    [[ -n "$verbose" ]] && ok "Nenhum conflito de arquivos entre frentes ativas."
    return
  fi

  # Arquivos que aparecem em mais de uma frente
  local dup_files
  dup_files=$(printf "%b" "$all_entries" | awk -F'\t' '{print $1}' | sort | uniq -d)

  if [[ -z "$dup_files" ]]; then
    [[ -n "$verbose" ]] && ok "Nenhum conflito de arquivos entre frentes ativas."
    return
  fi

  echo ""
  echo -e "  ${RED}${BOLD}⚠ Conflitos detectados — mesmo arquivo em múltiplas frentes:${RST}"
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    local branches_with_file
    branches_with_file=$(printf "%b" "$all_entries" | awk -F'\t' -v file="$f" '$1==file{printf "%s, ",$2}' | sed 's/, $//')
    echo -e "  ${RED}✖${RST} ${BOLD}${f}${RST}"
    echo -e "     → frentes: ${branches_with_file}"
  done <<< "$dup_files"
}

# ── Comando: merge-all ────────────────────────────────────────────────────────
cmd_merge_all() {
  local commit_msg="${1:-}"

  local frentes
  frentes=$(list_frentes)

  if [[ -z "$frentes" ]]; then
    info "Nenhuma frente de trabalho ativa para unir."
    return
  fi

  echo ""
  echo -e "  ${BOLD}Iniciando conferência de frentes de trabalho...${RST}"
  echo ""

  # 1. Checar conflitos de arquivos via sort/uniq
  local all_entries=""
  while IFS= read -r branch; do
    [[ -z "$branch" ]] && continue
    local files
    files=$(changed_files "$branch")
    while IFS= read -r f; do
      [[ -z "$f" ]] && continue
      all_entries="${all_entries}${f}	${branch}\n"
    done <<< "$files"
  done <<< "$frentes"

  local dup_files=""
  [[ -n "$all_entries" ]] && dup_files=$(printf "%b" "$all_entries" | awk -F'\t' '{print $1}' | sort | uniq -d)

  local conflict=0
  if [[ -n "$dup_files" ]]; then
    while IFS= read -r f; do
      [[ -z "$f" ]] && continue
      local bs
      bs=$(printf "%b" "$all_entries" | awk -F'\t' -v file="$f" '$1==file{printf "%s ",$2}')
      err "CONFLITO: '${f}' modificado por múltiplas frentes: ${bs}"
      conflict=1
    done <<< "$dup_files"
  fi

  if [[ $conflict -eq 1 ]]; then
    echo ""
    die "Merge interrompido. Resolva os conflitos de arquivos listados acima antes de prosseguir."
  fi

  ok "Nenhum conflito de arquivos entre as frentes."
  echo ""

  # 2. Confirmar merge
  echo -e "  ${BOLD}Frentes que serão unidas em '${BASE_BRANCH}':${RST}"
  while IFS= read -r branch; do
    [[ -z "$branch" ]] && continue
    local count
    count=$(changed_files "$branch" | grep -c . || echo 0)
    echo -e "  ${BLU}→${RST} ${branch} (${count} arquivo(s))"
  done <<< "$frentes"
  echo ""

  read -r -p "  Confirmar merge de todas as frentes em '${BASE_BRANCH}'? [s/N] " resp
  [[ "${resp,,}" != "s" ]] && { info "Merge cancelado."; exit 0; }

  # 3. Ir para o base
  git checkout "$BASE_BRANCH"
  git pull --ff-only origin "$BASE_BRANCH" 2>/dev/null || true

  # 4. Merge de cada frente
  local merged_branches=""
  while IFS= read -r branch; do
    [[ -z "$branch" ]] && continue
    info "Mergeando frente: ${branch}…"
    if git merge --no-ff --no-edit "$branch"; then
      ok "Merge de '${branch}' concluído."
      merged_branches="${merged_branches}${branch} "
    else
      err "Falha no merge de '${branch}'. Resolva os conflitos manualmente e rode 'git merge --continue'."
      exit 1
    fi
  done <<< "$frentes"

  # 5. Commit unificador (se não foi tudo fast-forward)
  if [[ -n "$commit_msg" ]]; then
    git commit --allow-empty -m "$commit_msg" 2>/dev/null || true
  fi

  echo ""
  ok "Todas as frentes foram unidas em '${BASE_BRANCH}'!"
  echo ""
  echo -e "  ${BOLD}Próximos passos:${RST}"
  echo -e "  • Faça o build/deploy normalmente"
  echo -e "  • Para remover frentes já merged: ${BOLD}./scripts/branch-manager.sh close <nome>${RST}"
}

# ── Comando: close ────────────────────────────────────────────────────────────
cmd_close() {
  local name="${1:-}"
  [[ -z "$name" ]] && die "Informe o nome da frente: ./scripts/branch-manager.sh close <nome>"
  [[ "$name" != frente/* ]] && name="frente/$name"

  if ! git branch --list "$name" | grep -q .; then
    die "Frente '$name' não encontrada."
  fi

  # Garante que já foi merged
  local not_merged
  not_merged=$(git branch --no-merged "$BASE_BRANCH" | sed 's/^[* ]*//' | grep "^${name}$" || true)
  if [[ -n "$not_merged" ]]; then
    warn "A frente '${name}' ainda não foi merged em '${BASE_BRANCH}'."
    read -r -p "  Deletar mesmo assim? [s/N] " resp
    [[ "${resp,,}" != "s" ]] && { info "Cancelado."; exit 0; }
  fi

  git branch -d "$name" 2>/dev/null || git branch -D "$name"
  ok "Frente '${name}' removida."
}

# ── Ajuda ──────────────────────────────────────────────────────────────────────
cmd_help() {
  cat << EOF

  ${BOLD}branch-manager.sh${RST} — Gerenciador de frentes de trabalho

  ${BOLD}COMANDOS${RST}
    new <nome>          Cria frente 'frente/<nome>' a partir de $BASE_BRANCH
    status              Lista frentes ativas, arquivos modificados e conflitos
    check <nome>        Verifica conflitos de uma frente com as demais
    conflicts           Exibe todos os conflitos entre frentes ativas
    merge-all [msg]     Confere, faz merge de todas as frentes em $BASE_BRANCH
    close <nome>        Remove frente após merge

  ${BOLD}EXEMPLOS${RST}
    ./scripts/branch-manager.sh new rh-atestados
    ./scripts/branch-manager.sh new financeiro-relatorios
    ./scripts/branch-manager.sh status
    ./scripts/branch-manager.sh merge-all "release: une RH e Financeiro"
    ./scripts/branch-manager.sh close rh-atestados

EOF
}

# ── Dispatch ───────────────────────────────────────────────────────────────────
CMD="${1:-help}"
shift || true

case "$CMD" in
  new)          cmd_new "$@" ;;
  status)       cmd_status ;;
  check)        cmd_check "$@" ;;
  conflicts)    cmd_conflicts ;;
  merge-all)    cmd_merge_all "$@" ;;
  close)        cmd_close "$@" ;;
  help|--help)  cmd_help ;;
  *)            die "Comando desconhecido: '$CMD'. Use 'help' para ver os comandos." ;;
esac
