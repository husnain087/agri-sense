export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function formatConfidenceScore(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(4);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDateInput(iso: string): string {
  return iso.slice(0, 10);
}
