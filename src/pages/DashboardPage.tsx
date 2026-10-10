import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { displayClassLabel } from "../data/diseaseInfo";
import { formatDateTime, formatPercent } from "../lib/format";
import { summarizeHistory } from "../lib/metrics";
import { listPredictions } from "../services/history";
import type { PredictionHistoryRow } from "../types/database";

export function DashboardPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PredictionHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    listPredictions(user.id)
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Could not load dashboard data.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const summary = summarizeHistory(rows);
  const maxCount = Math.max(1, ...Object.values(summary.counts));
  const maxDay = Math.max(1, ...summary.timeline.map(([, count]) => count));

  return (
    <div className="container">
      <h1>Your dashboard</h1>
      <p>
        Counts reflect saved scans for your account only. They are not confirmed
        disease prevalence across a field or farm.
      </p>
      {loading ? <p>Loading saved predictions…</p> : null}
      {error ? <p className="alert">{error}</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <div className="card empty">
          <h2>No saved scans yet</h2>
          <p>Run a live prediction and choose Save to history.</p>
          <Link className="btn btn-primary" to="/detect">
            Detect a new image
          </Link>
        </div>
      ) : null}
      {!loading && rows.length > 0 ? (
        <>
          <div className="metrics">
            <article className="card">
              <h3>Total saved</h3>
              <p style={{ fontSize: "2rem", margin: 0, color: "var(--forest)" }}>{summary.total}</p>
            </article>
            <article className="card">
              <h3>Healthy</h3>
              <p style={{ fontSize: "2rem", margin: 0, color: "var(--forest)" }}>{summary.counts.Healthy}</p>
            </article>
            <article className="card">
              <h3>Septoria</h3>
              <p style={{ fontSize: "2rem", margin: 0, color: "var(--forest)" }}>{summary.counts.septoria}</p>
            </article>
            <article className="card">
              <h3>Stripe rust</h3>
              <p style={{ fontSize: "2rem", margin: 0, color: "var(--forest)" }}>{summary.counts.stripe_rust}</p>
            </article>
          </div>
          <div className="grid-2" style={{ marginTop: 16 }}>
            <article className="card">
              <h3>Class distribution</h3>
              <div className="bars">
                {Object.entries(summary.counts).map(([key, count]) => (
                  <div className="bar-row" key={key}>
                    <span>{displayClassLabel(key)}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${(count / maxCount) * 100}%` }} />
                    </div>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>
            </article>
            <article className="card">
              <h3>Recent activity</h3>
              {summary.timeline.length === 0 ? (
                <p className="muted">Not enough dated records for a timeline.</p>
              ) : (
                <div className="timeline">
                  {summary.timeline.map(([day, count]) => (
                    <div className="timeline-row" key={day}>
                      <span>{day.slice(5)}</span>
                      <div
                        className="timeline-bar"
                        style={{ width: `${Math.max(8, (count / maxDay) * 100)}%` }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>
          <section className="card" style={{ marginTop: 16 }}>
            <h3>Latest saved predictions</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Class</th>
                    <th>Confidence</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 8).map((row) => (
                    <tr key={row.id}>
                      <td>{formatDateTime(row.created_at)}</td>
                      <td>{displayClassLabel(row.predicted_class)}</td>
                      <td>{formatPercent(row.confidence <= 1 ? row.confidence * 100 : row.confidence)}</td>
                      <td>
                        <Link to={`/history/${row.id}`}>View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="hero-actions">
              <Link className="btn btn-primary" to="/detect">
                Detect a new image
              </Link>
              <Link className="btn btn-secondary" to="/history">
                Open full history
              </Link>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
