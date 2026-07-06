"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { readCollection, writeCollection } from "../../lib/storage";
import type { FragmentVersion, Notebook } from "../../lib/types";

/**
 * Фиксация новой версии фрагмента — развязка итерации (ТЗ §5.2, шаг 5).
 * Новая версия появляется только если текст реально изменился.
 */
export async function commitVersion(formData: FormData): Promise<void> {
  const notebookId = String(formData.get("notebookId") ?? "");
  const text = String(formData.get("text") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (notebookId === "" || text.trim() === "") return;

  const notebooks = await readCollection<Notebook>("notebooks.json");
  const notebook = notebooks.find((entry) => entry.id === notebookId);
  if (notebook === undefined) return;

  const versions = await readCollection<FragmentVersion>("fragment-versions.json");
  const lastVersionId = notebook.versionIds[notebook.versionIds.length - 1];
  const lastVersion = versions.find((version) => version.id === lastVersionId);
  if (lastVersion !== undefined && lastVersion.text === text) return; // текст не изменился

  const now = new Date().toISOString();
  const version: FragmentVersion = {
    id: randomUUID(),
    notebookId,
    text,
    createdAt: now,
    ...(note !== "" && { note }),
  };

  versions.push(version);
  notebook.versionIds.push(version.id);
  notebook.updatedAt = now;

  await writeCollection("fragment-versions.json", versions);
  await writeCollection("notebooks.json", notebooks);

  revalidatePath("/desk");
  revalidatePath(`/desk/${notebookId}`);
}
