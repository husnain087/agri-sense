import type { HealthInfo } from "../../types/prediction";

export function BackendStatus({ health }: { health: HealthInfo }) {
  const label =
    health.status === "online"
      ? "API online"
      : health.status === "degraded"
        ? "Some APIs unavailable"
        : health.status === "offline"
            ? "API unavailable"
            : health.status === "not-configured"
              ? "API not configured"
              : "Checking API";

  return (
    <span
      className={`status-chip ${health.status}`}
      title={health.message}
      role="status"
    >
      <span className="status-dot" />
      <span className="label">{label}</span>
    </span>
  );
}
