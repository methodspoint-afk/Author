import { promises as fs } from "node:fs";
import path from "node:path";
import { readDeltaTables } from "../../../lib/deltas";

export const dynamic = "force-dynamic";

async function readIfExists(filePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}

async function readAudits(): Promise<Array<{ name: string; content: string }>> {
  const dir = path.join(process.cwd(), "learning", "audits");
  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }
  const audits = await Promise.all(
    files
      .filter((file) => file.endsWith(".md"))
      .sort()
      .reverse()
      .map(async (file) => ({
        name: file.replace(/\.md$/u, ""),
        content: await fs.readFile(path.join(dir, file), "utf8"),
      })),
  );
  return audits;
}

export default async function VoicePage() {
  const [voiceCore, deltas, audits] = await Promise.all([
    readIfExists(path.join(process.cwd(), "learning", "AUTHOR-VOICE-CORE.md")),
    readDeltaTables(),
    readAudits(),
  ]);

  return (
    <>
      <h1>Портрет голоса</h1>
      <p className="empty-note">
        Портрет — качественный, не численный: словами и примерами, не графиками. Данные живут в
        markdown-файлах (learning/), эта страница их только показывает.
      </p>

      <h2>Подтверждённые механики</h2>
      {voiceCore !== undefined ? (
        <details className="voice-core" open>
          <summary>AUTHOR-VOICE-CORE.md</summary>
          <pre>{voiceCore}</pre>
        </details>
      ) : (
        <p className="empty-note">
          Файл learning/AUTHOR-VOICE-CORE.md ещё не заведён — он появится с первым подтверждённым
          кандидатом аудита (правило 2–3 повторов).
        </p>
      )}

      <h2>Дельты компасов</h2>
      {deltas.length === 0 ? (
        <p className="empty-note">Ни в одном файле компаса пока нет дельта-таблицы.</p>
      ) : (
        deltas.map(({ compass, header, rows }) => (
          <details key={compass.id} className="delta-block" open={rows.some((row) => (row[1] ?? "") !== "")}>
            <summary>{compass.title}</summary>
            <div className="delta-table-wrap">
              <table className="delta-table">
                <thead>
                  <tr>
                    {header.map((cell, index) => (
                      <th key={index}>{cell}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ))
      )}

      <h2>Аудиты</h2>
      {audits.length === 0 ? (
        <p className="empty-note">Аудитов пока не было.</p>
      ) : (
        audits.map((audit) => (
          <details key={audit.name} className="voice-core">
            <summary>{audit.name}</summary>
            <pre>{audit.content}</pre>
          </details>
        ))
      )}
    </>
  );
}
