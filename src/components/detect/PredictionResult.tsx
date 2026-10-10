import { useState } from "react";
import { displayClassLabel, getDiseaseInfo } from "../../data/diseaseInfo";
import { formatConfidenceScore, formatPercent } from "../../lib/format";
import { savePrediction } from "../../services/history";
import { useAuth } from "../../context/AuthContext";
import type { PredictionResult as Result } from "../../types/prediction";
import { AdvisoryPanel } from "./AdvisoryPanel";
import { ProbabilityChart } from "./ProbabilityChart";

interface Props {
  result: Result;
  previewUrl: string | null;
  file: File | null;
  onScanAnother: () => void;
}

export function PredictionResult({ result, previewUrl, file, onScanAnother }: Props) {
  const { user, configured } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const info = getDiseaseInfo(result.predictedClass);
  const heatmapDataUrl =
    result.heatmapBase64 && result.heatmapFormat
      ? `data:${result.heatmapFormat};base64,${result.heatmapBase64}`
      : null;
  const overlayDataUrl =
    result.overlayBase64 && result.heatmapFormat
      ? `data:${result.heatmapFormat};base64,${result.overlayBase64}`
      : null;
  const predictionTimestamp = result.timestamp
    ? new Date(result.timestamp).toLocaleString()
    : null;

  const onSave = async () => {
    if (!user) {
      setSaveError("Sign in to save this result to your history.");
      return;
    }
    if (savedId) return;
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      const row = await savePrediction(user.id, {
        predictedClass: result.predictedClass,
        confidence: result.confidence,
        probabilities: result.probabilities,
        imageFile: file,
      });
      setSavedId(row.id);
      setSaveMessage("Saved to your prediction history.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save this result.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid-2">
      <section className="card">
        <h2>Prediction result</h2>
        {previewUrl ? (
          <div className="preview-frame">
            <img src={previewUrl} alt="Uploaded wheat leaf" />
          </div>
        ) : null}
        <p className="kicker">{info ? info.statusTone : "unknown class"}</p>
        <h3>{displayClassLabel(result.predictedClass)}</h3>
        <p>
          Model confidence: <strong>{formatPercent(result.confidencePercent)}</strong>
          {" "}({formatConfidenceScore(result.confidence)} raw score)
        </p>
        {info ? <p>{info.shortSummary}</p> : (
          <p>
            This label is not one of the three reviewed classes. The available
            backend values are shown, but class-specific advice is withheld.
          </p>
        )}
        {result.explanation ? <p className="muted">{result.explanation}</p> : null}
        {!result.explanation ? (
          <p className="muted">
            Grad-CAM highlights the image regions that most influenced the model’s
            decision. It is a visual explanation, not proof of disease presence or
            exact lesion location on the whole field.
          </p>
        ) : null}
        {heatmapDataUrl ? (
          <div style={{ marginTop: 16 }}>
            <h4>Grad-CAM heatmap</h4>
            <div className="preview-frame">
              <img
                src={heatmapDataUrl}
                alt="Grad-CAM heatmap returned by the wheat prediction backend"
              />
            </div>
          </div>
        ) : (
          <p className="notice">
            The backend did not return a Grad-CAM heatmap for this prediction.
          </p>
        )}
        {overlayDataUrl ? (
          <div style={{ marginTop: 16 }}>
            <h4>Grad-CAM overlay</h4>
            <div className="preview-frame">
              <img
                src={overlayDataUrl}
                alt="Grad-CAM heatmap overlaid on the uploaded wheat image"
              />
            </div>
          </div>
        ) : null}
        {predictionTimestamp ? (
          <p className="muted">Prediction timestamp: {predictionTimestamp}</p>
        ) : null}
        <ProbabilityChart
          probabilities={result.probabilities}
          predictedClass={result.predictedClass}
        />
        {result.model ? <p className="muted">Model reported: {result.model}</p> : null}
        <div className="hero-actions">
          <button className="btn btn-secondary" type="button" onClick={onScanAnother}>
            Scan another image
          </button>
          {configured ? (
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => void onSave()}
              disabled={saving || Boolean(savedId) || !user}
            >
              {savedId ? "Saved" : saving ? "Saving…" : "Save to history"}
            </button>
          ) : null}
        </div>
        {!configured ? (
          <p className="notice">
            History saving needs Supabase. Detection still used the live model.
          </p>
        ) : null}
        {configured && !user ? (
          <p className="notice">Sign in to save this prediction to your account.</p>
        ) : null}
        {saveMessage ? <p className="success">{saveMessage}</p> : null}
        {saveError ? <p className="alert">{saveError}</p> : null}
      </section>
      <AdvisoryPanel predictedClass={result.predictedClass} />
    </div>
  );
}
