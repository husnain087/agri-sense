import { useCallback, useState } from "react";
import { ProbabilityChart } from "../components/detect/ProbabilityChart";
import { formatConfidenceScore, formatPercent } from "../lib/format";
import { MAIZE_API_BASE_URL } from "../lib/env";
import { predictMaizeImage, validateMaizeImageFile } from "../services/maizeApi";
import type { MaizePredictionResult } from "../services/maizeApi";

export function MaizeDetectPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<MaizePredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clearPreview = useCallback(() => {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, []);

  const reset = useCallback(() => {
    setFile(null);
    clearPreview();
    setResult(null);
    setError(null);
    setLoading(false);
  }, [clearPreview]);

  const selectFile = useCallback(
    (next: File | null) => {
      setResult(null);
      setError(null);
      if (!next) {
        setFile(null);
        clearPreview();
        return;
      }
      const invalid = validateMaizeImageFile(next);
      if (invalid) {
        setFile(null);
        clearPreview();
        setError(invalid);
        return;
      }
      setFile(next);
      clearPreview();
      setPreviewUrl(URL.createObjectURL(next));
    },
    [clearPreview],
  );

  const runPrediction = useCallback(async () => {
    if (!file) {
      setError("Choose a maize crop image before running detection.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const outcome = await predictMaizeImage(file);
    setLoading(false);

    if (!outcome.ok) {
      setError(outcome.message);
      return;
    }

    setResult(outcome.result);
  }, [file]);

  const heatmapDataUrl =
    result?.heatmapBase64 && result?.heatmapFormat
      ? `data:${result.heatmapFormat};base64,${result.heatmapBase64}`
      : null;
  const overlayDataUrl =
    result?.overlayBase64 && result?.heatmapFormat
      ? `data:${result.heatmapFormat};base64,${result.overlayBase64}`
      : null;

  return (
    <div className="container">
      <h1>Maize disease detection</h1>
      <p>
        This interface calls the local FastAPI backend at <code>{MAIZE_API_BASE_URL}</code>.
        It is intentionally strict: if the saved checkpoint is not a maize model, the app stops with
        a clear mismatch message instead of returning fake results.
      </p>

      {result ? (
        <div className="grid-2">
          <section className="card">
            <h2>Prediction result</h2>
            {previewUrl ? (
              <div className="preview-frame">
                <img src={previewUrl} alt="Uploaded maize leaf" />
              </div>
            ) : null}

            <h3>{result.predictedClass}</h3>
            <p>
              Model confidence: <strong>{formatPercent(result.confidencePercent)}</strong>
              {" "}({formatConfidenceScore(result.confidence)} raw score)
            </p>
            <p className="muted">
              Grad-CAM highlights the regions most associated with the model’s prediction. It is a visual
              explanation and not proof of disease presence across the whole field.
            </p>

            {heatmapDataUrl ? (
              <div style={{ marginTop: 16 }}>
                <h4>Grad-CAM heatmap</h4>
                <div className="preview-frame">
                  <img src={heatmapDataUrl} alt="Grad-CAM map for maize prediction" />
                </div>
              </div>
            ) : null}

            {overlayDataUrl ? (
              <div style={{ marginTop: 16 }}>
                <h4>Overlay</h4>
                <div className="preview-frame">
                  <img src={overlayDataUrl} alt="Heatmap overlay on original maize image" />
                </div>
              </div>
            ) : null}

            {result.predictionTimestamp ? (
              <p className="muted">Prediction timestamp: {result.predictionTimestamp}</p>
            ) : null}

            <ProbabilityChart
              probabilities={result.probabilities}
              predictedClass={result.predictedClass}
            />
            <div className="hero-actions">
              <button className="btn btn-secondary" type="button" onClick={reset}>
                Upload another image
              </button>
            </div>
          </section>
        </div>
      ) : (
        <div className="card">
          <label
            className="dropzone"
            htmlFor="maize-image-upload"
            style={{ display: "block", cursor: "pointer" }}
          >
            <strong>Drop a maize leaf image here</strong>
            <p>or choose a JPG, JPEG, or PNG file to test the local maize model.</p>
            <input
              id="maize-image-upload"
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              hidden
              onChange={(event) => {
                const next = event.target.files?.[0] ?? null;
                selectFile(next);
                event.target.value = "";
              }}
            />
          </label>

          {previewUrl ? (
            <div className="preview-frame" style={{ marginTop: 16 }}>
              <img src={previewUrl} alt="Selected maize image preview" />
            </div>
          ) : null}

          {file ? <p className="muted">{file.name}</p> : null}
          {error ? <p className="alert" role="alert">{error}</p> : null}
          {loading ? <p className="notice">Running the maize model and Grad-CAM on the local backend…</p> : null}

          <div className="hero-actions">
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                void runPrediction();
              }}
              disabled={!file || loading}
            >
              {loading ? "Predicting…" : "Predict maize disease"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={reset}>
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
