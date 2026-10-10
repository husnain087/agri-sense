import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AdvisoryPanel } from "../components/detect/AdvisoryPanel";
import { ProbabilityChart } from "../components/detect/ProbabilityChart";
import { useAuth } from "../context/AuthContext";
import { displayClassLabel } from "../data/diseaseInfo";
import { formatDateTime, formatPercent } from "../lib/format";
import {
  createSignedImageUrl,
  deletePrediction,
  getPrediction,
} from "../services/history";
import type { PredictionHistoryRow } from "../types/database";

export function HistoryDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [row, setRow] = useState<PredictionHistoryRow | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    getPrediction(user.id, id)
      .then(async (data) => {
        if (!active) return;
        if (!data) {
          setError("This record was not found, or it does not belong to your account.");
          return;
        }
        setRow(data);
        setImageUrl(await createSignedImageUrl(data.image_path));
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Could not load details.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, id]);

  const onDelete = async () => {
    if (!user || !row) return;
    if (!window.confirm("Delete this saved prediction?")) return;
    await deletePrediction(user.id, row);
    navigate("/history");
  };

  return (
    <div className="container">
      <p>
        <Link to="/history">Back to history</Link>
      </p>
      {loading ? <p>Loading record…</p> : null}
      {error ? <p className="alert">{error}</p> : null}
      {row ? (
        <div className="grid-2">
          <section className="card">
            <h1>{displayClassLabel(row.predicted_class)}</h1>
            <p>{formatDateTime(row.created_at)}</p>
            {imageUrl ? (
              <div className="preview-frame">
                <img src={imageUrl} alt="Saved wheat-leaf scan" />
              </div>
            ) : (
              <p className="muted">
                {row.image_path
                  ? "A private image exists, but a signed URL could not be created."
                  : "This record was saved without an image file."}
              </p>
            )}
            <p>
              Confidence:{" "}
              <strong>
                {formatPercent(row.confidence <= 1 ? row.confidence * 100 : row.confidence)}
              </strong>
            </p>
            <ProbabilityChart
              probabilities={row.probabilities ?? {}}
              predictedClass={row.predicted_class}
            />
            <button className="btn btn-danger" type="button" onClick={() => void onDelete()}>
              Delete record
            </button>
          </section>
          <AdvisoryPanel predictedClass={row.predicted_class} />
        </div>
      ) : null}
    </div>
  );
}
