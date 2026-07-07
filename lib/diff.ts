// Пословный diff «было → стало» (ТЗ §5.2, шаг 5 ритуала).
// Простой LCS по словам; для очень больших текстов честно отступает.

export type DiffPart = { kind: "same" | "removed" | "added"; text: string };

const MAX_TOKENS = 3000;

function tokenize(text: string): string[] {
  return text.split(/(\s+)/u).filter((token) => token !== "");
}

export function diffWords(before: string, after: string): DiffPart[] | undefined {
  const a = tokenize(before);
  const b = tokenize(after);
  if (a.length > MAX_TOKENS || b.length > MAX_TOKENS) return undefined;

  // Классический LCS через таблицу длин.
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table = new Uint32Array(rows * cols);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i * cols + j] =
        a[i] === b[j]
          ? (table[(i + 1) * cols + j + 1] ?? 0) + 1
          : Math.max(table[(i + 1) * cols + j] ?? 0, table[i * cols + j + 1] ?? 0);
    }
  }

  const parts: DiffPart[] = [];
  const push = (kind: DiffPart["kind"], text: string) => {
    const last = parts[parts.length - 1];
    if (last !== undefined && last.kind === kind) last.text += text;
    else parts.push({ kind, text });
  };

  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push("same", a[i] ?? "");
      i++;
      j++;
    } else if ((table[(i + 1) * cols + j] ?? 0) >= (table[i * cols + j + 1] ?? 0)) {
      push("removed", a[i] ?? "");
      i++;
    } else {
      push("added", b[j] ?? "");
      j++;
    }
  }
  while (i < a.length) push("removed", a[i++] ?? "");
  while (j < b.length) push("added", b[j++] ?? "");

  return parts;
}
