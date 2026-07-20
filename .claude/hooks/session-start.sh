#!/bin/bash
# SessionStart hook проекта Author.
#
# Делает Слой 3 (промпт восстановления из CLAUDE.md) автоматическим: при старте
# КАЖДОЙ сессии читает раздел «В РАБОТЕ» из handoff.md и git-состояние, после
# чего вкладывает это в контекст сессии. Если есть незавершённая работа —
# просит меня показать отчёт «что сделано / что потеряно / план», НЕ трогая main.
#
# Хук ничего не пишет в репозиторий и не принимает решений — только читает
# и сообщает. Работает и в вебе, и на десктопе.

set -uo pipefail

ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$ROOT" 2>/dev/null || exit 0

HANDOFF="$ROOT/handoff.md"

# --- Раздел «В РАБОТЕ» из handoff.md (между «## В РАБОТЕ» и следующим «## »).
# Пропускаем HTML-комментарии (<!-- … -->), пустые строки и заглушку «*(…)*».
work_in_progress=""
if [ -f "$HANDOFF" ]; then
  work_in_progress="$(awk '
    /^## В РАБОТЕ[[:space:]]*$/ { grab=1; next }
    /^## / { grab=0 }
    !grab { next }
    /<!--/ { incomment=1 }
    incomment { if (/-->/) incomment=0; next }
    { print }
  ' "$HANDOFF" | sed -e '/^[[:space:]]*$/d' -e '/^\*(/d')"
fi

# Всё, что осталось после фильтра, — признак активной задачи.
has_active_task="no"
[ -n "$work_in_progress" ] && has_active_task="yes"

# --- Git-состояние: незакоммиченное здесь и опережающая WIP-ветка.
dirty="$(git status --porcelain 2>/dev/null)"
current_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"

wip_ahead=""
if git show-ref --verify --quiet refs/remotes/origin/claude/author-wip 2>/dev/null; then
  wip_ahead="$(git rev-list --count origin/main..origin/claude/author-wip 2>/dev/null || echo 0)"
elif git show-ref --verify --quiet refs/heads/claude/author-wip 2>/dev/null; then
  wip_ahead="$(git rev-list --count main..claude/author-wip 2>/dev/null || echo 0)"
fi

# --- Есть ли вообще повод для отчёта восстановления?
needs_report="no"
[ "$has_active_task" = "yes" ] && needs_report="yes"
[ -n "$dirty" ] && needs_report="yes"
[ -n "$wip_ahead" ] && [ "$wip_ahead" != "0" ] && needs_report="yes"

# --- Собираем текст контекста.
ctx="Автозагрузка памяти проекта Author (SessionStart hook)."
ctx="$ctx"$'\n'"Текущая ветка: $current_branch."

if [ "$needs_report" = "yes" ]; then
  ctx="$ctx"$'\n\n'"⚠️ Обнаружена незавершённая работа. Прежде чем что-либо делать, покажи пользователю отчёт «что сделано / что потеряно / план дальнейших действий», как требует Слой 3 в CLAUDE.md. НЕ трогай ветку main и НЕ принимай решений без явного «ок» пользователя."
  if [ "$has_active_task" = "yes" ]; then
    ctx="$ctx"$'\n\n'"Раздел «В РАБОТЕ» из handoff.md:"$'\n'"$work_in_progress"
  fi
  if [ -n "$dirty" ]; then
    ctx="$ctx"$'\n\n'"Незакоммиченные изменения в рабочем дереве:"$'\n'"$dirty"
  fi
  if [ -n "$wip_ahead" ] && [ "$wip_ahead" != "0" ]; then
    ctx="$ctx"$'\n\n'"Ветка claude/author-wip опережает main на $wip_ahead коммит(ов) — там может лежать недовлитая работа."
  fi
else
  ctx="$ctx"$'\n'"Незавершённой работы нет: раздел «В РАБОТЕ» пуст, рабочее дерево чистое, WIP-ветка не опережает main. Веди себя как обычно."
fi

# --- Отдаём контекст через hookSpecificOutput.additionalContext (JSON).
python3 - "$ctx" <<'PY' 2>/dev/null || printf '%s\n' "$ctx"
import json, sys
print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": sys.argv[1],
    }
}))
PY
