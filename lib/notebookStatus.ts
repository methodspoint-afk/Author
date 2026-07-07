import type { Notebook, Pass } from "./types";

// Статус тетради (ТЗ «Тетрадь» v1 §4) — проекция текущих данных на пять
// закреплённых состояний. Полная машина статусов придёт с маршрутом Прописей;
// пока честно выводим статус из проходов и полки.

export interface NotebookStatus {
  st: "draft" | "mentor" | "edit" | "audit" | "done";
  label: string;
  stamp: string;
}

export function notebookStatus(notebook: Notebook, passes: Pass[]): NotebookStatus {
  if (notebook.shelvedAt !== undefined) {
    return { st: "done", label: "завершено", stamp: "ЗАВЕРШЕНО" };
  }
  const own = passes.filter((pass) => pass.notebookId === notebook.id);
  if (own.some((pass) => pass.status === "dispatched")) {
    return { st: "mentor", label: "у наставника", stamp: "У НАСТАВНИКА" };
  }
  if (own.some((pass) => pass.status === "completed")) {
    return { st: "edit", label: "правка", stamp: "ПРАВКА" };
  }
  return { st: "draft", label: "черновик", stamp: "ЧЕРНОВИК" };
}
