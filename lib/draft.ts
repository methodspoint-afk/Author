// Автосейв черновика окна текста (ТЗ §5.1: окно — святое, правка не должна
// гибнуть от F5 или случайного ухода со страницы). Черновик живёт в
// localStorage браузера и стирается при фиксации версии.

export function draftKey(notebookId: string): string {
  return `irinaos:draft:${notebookId}`;
}

/** Восстанавливать ли сохранённый черновик поверх последней версии. */
export function shouldRestoreDraft(
  stored: string | null,
  latestText: string | undefined,
): stored is string {
  return stored !== null && stored.trim() !== "" && stored !== (latestText ?? "");
}
