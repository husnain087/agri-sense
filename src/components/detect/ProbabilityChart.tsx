import { KNOWN_CLASSES } from "../../types/prediction";
import { displayClassLabel } from "../../data/diseaseInfo";
import { formatPercent } from "../../lib/format";

interface Props {
  probabilities: Record<string, number>;
  predictedClass: string;
}

function toDisplayPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value <= 1 ? value * 100 : value;
}

export function ProbabilityChart({ probabilities, predictedClass }: Props) {
  const keys = Array.from(
    new Set([...KNOWN_CLASSES, ...Object.keys(probabilities), predictedClass]),
  ).filter(Boolean);

  const values = keys.map((key) => toDisplayPercent(probabilities[key] ?? 0));
  const sum = values.reduce((acc, value) => acc + value, 0);
  const needsNote = sum > 0 && Math.abs(sum - 100) > 1.5;

  return (
    <div>
      <div className="bars" role="img" aria-label="Class probabilities">
        {keys.map((key) => {
          const pct = toDisplayPercent(probabilities[key] ?? 0);
          const tone =
            key === "stripe_rust" ? "alert" : key === "septoria" ? "warn" : "";
          return (
            <div className="bar-row" key={key}>
              <span>{displayClassLabel(key)}</span>
              <div className="bar-track">
                <div
                  className={`bar-fill ${tone}`}
                  style={{ width: `${Math.max(0, Math.min(pct, 100))}%` }}
                />
              </div>
              <strong>{formatPercent(pct)}</strong>
            </div>
          );
        })}
      </div>
      {keys.some((key) => probabilities[key] === undefined) ? (
        <p className="muted">
          Some class probabilities were missing from the backend response. Bars
          show only the values that were returned.
        </p>
      ) : null}
      {needsNote ? (
        <p className="muted">
          Raw backend probabilities are shown without rescaling. They currently
          sum to {formatPercent(sum)}.
        </p>
      ) : null}
    </div>
  );
}
