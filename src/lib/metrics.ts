import { KNOWN_CLASSES } from "../types/prediction";
import type { PredictionHistoryRow } from "../types/database";

export function summarizeHistory(rows: PredictionHistoryRow[]) {
  const counts: Record<string, number> = {
    Healthy: 0,
    septoria: 0,
    stripe_rust: 0,
  };
  const byDay: Record<string, number> = {};

  for (const row of rows) {
    counts[row.predicted_class] = (counts[row.predicted_class] ?? 0) + 1;
    const day = row.created_at.slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + 1;
  }

  const timeline = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14);

  return {
    total: rows.length,
    counts,
    knownTotal: KNOWN_CLASSES.reduce((sum, key) => sum + (counts[key] ?? 0), 0),
    timeline,
  };
}
