import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { displayClassLabel } from "../data/diseaseInfo";
import { formatDateTime, formatPercent } from "../lib/format";
import { deletePrediction, listPredictions } from "../services/history";
import type { PredictionHistoryRow } from "../types/database";
import { KNOWN_CLASSES } from "../types/prediction";

export function HistoryPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PredictionHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [klass, setKlass] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      setRows(await listPredictions(user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (klass !== "all" && row.predicted_class !== klass) return false;
      const day = row.created_at.slice(0, 10);
      if (fromDate && day < fromDate) return false;
      if (toDate && day > toDate) return false;
      return true;
    });
  }, [rows, klass, fromDate, toDate]);

  const onDelete = async (row: PredictionHistoryRow) => {
    if (!user) return;
    if (!window.confirm("Delete this saved prediction?")) return;
    try {
      await deletePrediction(user.id, row);
      setRows((current) => current.filter((item) => item.id !== row.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the record.");
    }
  };

  return (
    <div className="container">
      <h1>Prediction history</h1>
      <div className="filters">
        <label>
          Class
          <select value={klass} onChange={(event) => setKlass(event.target.value)}>
            <option value="all">All classes</option>
            {KNOWN_CLASSES.map((item) => (
              <option key={item} value={item}>
                {displayClassLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label>
          From
          <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        </label>
      </div>
      {loading ? <p>Loading history…</p> : null}
      {error ? <p className="alert">{error}</p> : null}
      {!loading && filtered.length === 0 ? (
        <div className="card empty">
          <h2>No matching records</h2>
          <p>Save a live prediction, or adjust the class and date filters.</p>
          <Link className="btn btn-primary" to="/detect">
            Detect a new image
          </Link>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Class</th>
                <th>Confidence</th>
                <th>Image</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>{formatDateTime(row.created_at)}</td>
                  <td>{displayClassLabel(row.predicted_class)}</td>
                  <td>{formatPercent(row.confidence <= 1 ? row.confidence * 100 : row.confidence)}</td>
                  <td>{row.image_path ? "Private file stored" : "Metadata only"}</td>
                  <td>
                    <Link to={`/history/${row.id}`}>Details</Link>
                    {" · "}
                    <button className="linkish" type="button" onClick={() => void onDelete(row)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
