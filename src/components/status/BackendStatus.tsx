import type { HealthInfo } from "../../types/prediction";

export function BackendStatus({ health }: { health: HealthInfo }) {
  const label =
    health.status === "online"
      ? "Backend online"
      : health.status === "offline"
        ? "Backend unavailable"
        : "Checking backend";

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
