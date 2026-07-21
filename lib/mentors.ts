import type { Pass } from "./types";

// Карта наставников: вовлечённость по каждому компасу — сколько завершённых
// проходов и когда был последний. Считается из проходов; отдельного
// состояния в хранилище нет.

export interface MentorEngagement {
  count: number;
  lastAt?: string;
}

export function mentorEngagement(passes: Pass[]): Map<string, MentorEngagement> {
  const map = new Map<string, MentorEngagement>();
  for (const pass of passes) {
    if (pass.type !== "mentor-compass" || pass.status !== "completed") continue;
    if (pass.compassId === undefined) continue;
    const entry = map.get(pass.compassId) ?? { count: 0 };
    entry.count += 1;
    if (
      pass.completedAt !== undefined &&
      (entry.lastAt === undefined || pass.completedAt > entry.lastAt)
    ) {
      entry.lastAt = pass.completedAt;
    }
    map.set(pass.compassId, entry);
  }
  return map;
}
