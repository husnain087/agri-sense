import { ImageDropzone } from "../components/detect/ImageDropzone";
import { PredictionResult } from "../components/detect/PredictionResult";
import { usePrediction } from "../hooks/usePrediction";
import { API_BASE_URL } from "../lib/env";

export function DetectPage() {
  const {
    file,
    previewUrl,
    result,
    error,
    loading,
    selectFile,
    runPrediction,
    cancel,
    reset,
  } = usePrediction();

  return (
    <div className="container">
      <h1>Wheat disease detection</h1>
      <p>
        Images are processed locally by the EfficientNet-B0 model at{" "}
        <code>{API_BASE_URL}/predict</code>. The checkpoint stays on this computer.
      </p>

      {result ? (
        <PredictionResult
          result={result}
          previewUrl={previewUrl}
          file={file}
          onScanAnother={reset}
        />
      ) : (
        <div className="card">
          <ImageDropzone
            file={file}
            previewUrl={previewUrl}
            disabled={loading}
            onFile={selectFile}
          />
          {error ? <p className="alert" role="alert">{error}</p> : null}
          {loading ? (
            <p className="notice">Running local EfficientNet-B0 inference and Grad-CAM…</p>
          ) : null}
          <div className="hero-actions">
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => void runPrediction()}
              disabled={!file || loading}
            >
              {loading ? "Predicting…" : "Run prediction"}
            </button>
            {loading ? (
              <button className="btn btn-secondary" type="button" onClick={cancel}>
                Cancel
              </button>
            ) : (
              <button className="btn btn-ghost" type="button" onClick={reset}>
                Reset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
