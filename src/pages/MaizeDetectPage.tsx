import { useCallback, useState } from "react";
import { ProbabilityChart } from "../components/detect/ProbabilityChart";
import { formatConfidenceScore, formatPercent } from "../lib/format";
import { predictLeafImage, validateImageFile } from "../services/api";
import type { PredictionResult } from "../types/prediction";

export function MaizeDetectPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
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
      const invalid = validateImageFile(next);
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

    const outcome = await predictLeafImage(file, "maize");
    setLoading(false);

    if (!outcome.ok) {
      setError(outcome.message);
      return;
    }

    setResult(outcome.result);
  }, [file]);

  const heatmapDataUrl = result?.heatmap ??
    (result?.heatmapBase64 && result.heatmapFormat
      ? `data:${result.heatmapFormat};base64,${result.heatmapBase64}`
      : null);
  const overlayDataUrl = result?.overlay ??
    (result?.overlayBase64 && result.heatmapFormat
      ? `data:${result.heatmapFormat};base64,${result.overlayBase64}`
      : null);

  return (
    <div className="container">
      <h1>Automatic disease detection</h1>
      <p>
        Upload a leaf image to identify its crop and automatically use the matching disease API.
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
              Any heatmap returned by the {result.crop} API is a visual explanation, not proof
              of disease presence across the whole field.
            </p>

            {heatmapDataUrl ? (
              <div style={{ marginTop: 16 }}>
                <h4>Grad-CAM heatmap</h4>
                <div className="preview-frame">
                  <img src={heatmapDataUrl} alt={`Grad-CAM map for ${result.crop} prediction`} />
                </div>
              </div>
            ) : null}

            {overlayDataUrl ? (
              <div style={{ marginTop: 16 }}>
                <h4>Overlay</h4>
                <div className="preview-frame">
                  <img src={overlayDataUrl} alt={`Heatmap overlay on original ${result.crop} image`} />
                </div>
              </div>
            ) : null}

            {result.timestamp ? (
              <p className="muted">Prediction timestamp: {result.timestamp}</p>
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
            <strong>Drop a leaf image here</strong>
            <p>or choose a JPG, JPEG, PNG, or WEBP file for automatic crop and disease detection.</p>
            <input
              id="maize-image-upload"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
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
          {loading ? <p className="notice">Identifying the crop and routing to its disease API…</p> : null}

          <div className="hero-actions">
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => { void runPrediction(); }}
              disabled={!file || loading}
            >
              {loading ? "Analyzing…" : error ? "Retry detection" : "Start detection"}
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
