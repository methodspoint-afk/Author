import { readCollection } from "./storage";
import type { FragmentVersion, Notebook, Pass } from "./types";

// Чтение данных для страниц Стола. Порядок версий и проходов внутри
// тетради задаётся списками notebook.versionIds / notebook.passIds.

export async function getNotebooks(): Promise<Notebook[]> {
  return readCollection<Notebook>("notebooks.json");
}

export async function getNotebook(id: string): Promise<Notebook | undefined> {
  const notebooks = await getNotebooks();
  return notebooks.find((notebook) => notebook.id === id);
}

export async function getNotebookVersions(notebook: Notebook): Promise<FragmentVersion[]> {
  const all = await readCollection<FragmentVersion>("fragment-versions.json");
  const byId = new Map(all.map((version) => [version.id, version]));
  return notebook.versionIds
    .map((id) => byId.get(id))
    .filter((version): version is FragmentVersion => version !== undefined);
}

export async function getNotebookPasses(notebook: Notebook): Promise<Pass[]> {
  const all = await readCollection<Pass>("passes.json");
  const byId = new Map(all.map((pass) => [pass.id, pass]));
  return notebook.passIds
    .map((id) => byId.get(id))
    .filter((pass): pass is Pass => pass !== undefined);
}

export async function getAllPasses(): Promise<Pass[]> {
  return readCollection<Pass>("passes.json");
}
