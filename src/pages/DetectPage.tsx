import { useEffect, useState } from "react";
import { BrainNetwork } from "../components/detect/BrainNetwork";
import { ImageDropzone } from "../components/detect/ImageDropzone";
import { PredictionResult } from "../components/detect/PredictionResult";
import { usePrediction } from "../hooks/usePrediction";
import type { Crop } from "../types/prediction";

const MINIMUM_ANALYSIS_ANIMATION_MS = 7000;

type IdentificationState =
  | { status: "idle" | "identifying" }
  | { status: "identified"; crop: Crop; confidence: number }
  | { status: "error"; message: string };

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
  const [animationStartedAt, setAnimationStartedAt] = useState<number | null>(null);
  const [minimumAnimationElapsed, setMinimumAnimationElapsed] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<Crop | "auto">("auto");
  const [identification, setIdentification] = useState<IdentificationState>({
    status: "idle",
  });

  useEffect(() => {
    if (animationStartedAt === null) return;

    const remaining = Math.max(
      0,
      animationStartedAt + MINIMUM_ANALYSIS_ANIMATION_MS - Date.now(),
    );
    const timer = window.setTimeout(
      () => setMinimumAnimationElapsed(true),
      remaining,
    );
    return () => window.clearTimeout(timer);
  }, [animationStartedAt]);

  const startAnalysis = () => {
    setAnimationStartedAt(Date.now());
    setMinimumAnimationElapsed(false);
    setSelectedCrop("auto");
    setIdentification({ status: "identifying" });
    let cropIdentified = false;
    void runPrediction((crop, confidence) => {
      cropIdentified = true;
      setIdentification({ status: "identified", crop, confidence });
      setSelectedCrop(crop);
    }).then((outcome) => {
      if (outcome && !outcome.ok && !cropIdentified) {
        setIdentification({ status: "error", message: outcome.message });
      }
    });
  };

  const chooseFile = (nextFile: File | null) => {
    setAnimationStartedAt(null);
    setMinimumAnimationElapsed(false);
    setSelectedCrop("auto");
    setIdentification({ status: "idle" });
    selectFile(nextFile);
  };

  const startAnotherScan = () => {
    setAnimationStartedAt(null);
    setMinimumAnimationElapsed(false);
    setSelectedCrop("auto");
    setIdentification({ status: "idle" });
    reset();
  };

  const cancelAnalysis = () => {
    cancel();
    setIdentification((current) =>
      current.status === "identifying" ? { status: "idle" } : current,
    );
  };

  const showImmersiveStage = Boolean(file) && (
    !result || !minimumAnimationElapsed
  );
  const identifying = identification.status === "identifying";
  const modelIsReady = !identifying && !loading && !result;
  const visibleError =
    error ??
    (identification.status === "error" && selectedCrop === "auto"
      ? identification.message
      : null);

  return (
    <div className={`container analysis-page${showImmersiveStage ? " is-immersive" : ""}`}>
      <div className="analysis-page-heading">
        <span className="analysis-eyebrow">
          <span className="analysis-eyebrow-dot" />
          AGRISENSE / AUTOMATIC CROP DETECTION
        </span>
        <h1>Leaf analysis</h1>
        <p>
          Upload a leaf photo to identify its crop automatically, then request a prediction from the matching API.
        </p>
      </div>

      {showImmersiveStage ? (
        <section
          className="neural-lab neural-lab--immersive"
          aria-labelledby="neural-lab-title"
        >
          <div className="neural-lab-topline">
            <span className={`lab-live-indicator${result ? " lab-response-ready" : ""}`}>
              <span />
              {result
                ? "MODEL RESPONSE RECEIVED · FINALIZING VIEW"
                : identifying
                  ? "CROP IDENTIFICATION IN PROGRESS"
                  : loading
                    ? "SELECTED DISEASE API REQUEST IN PROGRESS"
                    : "IMAGE READY · SYSTEM ONLINE"}
            </span>
            <span className="lab-endpoint">EXTERNAL API INTEGRATION</span>
          </div>

          <div className="neural-lab-content">
            <div className="neural-artwork">
              <div className="neural-artwork-grid" />
              <div className="neural-orbit neural-orbit-one" />
              <div className="neural-orbit neural-orbit-two" />
              <BrainNetwork
                state={result ? "complete" : loading ? "processing" : "ready"}
                crop={result?.crop ?? null}
                selectedCrop={selectedCrop}
              />
            </div>

            <div className="neural-copy">
              <span className="analysis-eyebrow">
                {result
                  ? "ANALYSIS COMPLETE"
                  : identifying
                    ? "CROP IDENTIFICATION"
                    : loading
                      ? "DISEASE MODEL RUNNING"
                      : "READY TO ANALYZE"}
              </span>
              <h2 id="neural-lab-title">
                {result
                  ? "Your result is ready."
                  : identifying
                    ? "Identifying the crop."
                    : loading
                      ? "Analyzing the leaf."
                      : identification.status === "identified" && modelIsReady
                        ? "Crop identified."
                        : "Image received."}
              </h2>
              <p className="neural-description">
                {result
                  ? identification.status === "identified" &&
                    identification.crop === result.crop
                    ? `Crop identification selected the ${result.crop} disease model. Its real prediction and visual explanation are shown below.`
                    : `The ${result.crop} API returned this prediction and any available visual explanation.`
                  : identifying
                    ? "The crop identifier is checking your image so the matching disease model can be selected automatically."
                    : loading
                      ? `Crop identification selected the ${selectedCrop} disease API, which is now processing the same image.`
                      : identification.status === "identified"
                        ? `Identified as ${identification.crop} (${(identification.confidence * 100).toFixed(1)}% score). The matching disease API is ready; click Detect to analyze the leaf.`
                        : identification.status === "error"
                          ? "Automatic identification could not be completed. Retry detection or choose another image."
                          : "The uploaded image is ready for crop identification."}
              </p>

              {file ? (
                <div className="neural-file">
                  {previewUrl ? <img src={previewUrl} alt="Uploaded leaf preview" /> : null}
                  <span className="neural-file-copy">
                    <strong>{file.name}</strong>
                    <small>
                      {result
                        ? `${result.crop} disease model used`
                        : identifying
                          ? "Identifying crop…"
                          : selectedCrop === "auto"
                            ? "Ready for automatic crop identification"
                            : `${selectedCrop} disease API selected`}
                    </small>
                  </span>
                  <span
                    className={`neural-file-signal${loading ? " is-active" : ""}`}
                    aria-label={
                      identifying
                        ? "Crop identification in progress"
                        : loading
                          ? "Disease prediction in progress"
                          : "Image ready"
                    }
                  />
                </div>
              ) : null}

              <div className="neural-status-list" aria-label="Analysis status">
                <div className="neural-status-row is-complete">
                  <span className="neural-status-mark">✓</span>
                  <span>Image submitted</span>
                  <small>DONE</small>
                </div>
                <div
                  className={`neural-status-row${identification.status === "identified" ? " is-complete" : identifying ? " is-active" : ""}`}
                >
                  <span className="neural-status-mark">
                    {identification.status === "identified" ? "✓" : identifying ? <span /> : "02"}
                  </span>
                  <span>Crop identification</span>
                  <small>
                    {identification.status === "identified"
                      ? "DONE"
                      : identifying
                        ? "RUNNING"
                        : identification.status === "error"
                          ? "FAILED"
                          : "WAITING"}
                  </small>
                </div>
                <div className={`neural-status-row${result ? " is-complete" : loading && !identifying ? " is-active" : ""}`}>
                  <span className="neural-status-mark">
                    {result ? "✓" : loading && !identifying ? <span /> : "03"}
                  </span>
                  <span>Disease prediction</span>
                  <small>
                    {result ? "DONE" : loading && !identifying ? "RUNNING" : "WAITING"}
                  </small>
                </div>
              </div>

              {!result && visibleError ? (
                <div className="analysis-error" role="alert">
                  <span className="analysis-error-icon">!</span>
                  <div>
                    <strong>Analysis couldn’t be completed</strong>
                    <p>{visibleError}</p>
                  </div>
                </div>
              ) : null}

              <div className="neural-actions">
                {loading ? (
                  <button className="btn btn-lab-quiet" type="button" onClick={cancelAnalysis}>
                    Cancel analysis
                  </button>
                ) : result ? (
                  <span className="neural-complete-note">Preparing result…</span>
                ) : (
                  <button
                    className="btn btn-detect"
                    type="button"
                    onClick={startAnalysis}
                    disabled={!file}
                  >
                    {identifying
                      ? "Identifying crop…"
                      : error || identification.status === "error"
                        ? "Retry detection"
                        : "Start detection"}
                    <span aria-hidden="true">↗</span>
                  </button>
                )}
                {!loading ? (
                  <button
                    className="btn btn-lab-quiet"
                    type="button"
                    onClick={startAnotherScan}
                  >
                    Change image
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : result ? (
        <section className="analysis-results" aria-label={`${result.crop} analysis results`}>
          <div className="analysis-result-heading">
            <span className="analysis-eyebrow">
              <span className="result-check">✓</span>
              {result.crop.toUpperCase()} DISEASE MODEL · RESPONSE RECEIVED
            </span>
            <h2>Analysis complete.</h2>
            <p>
              {identification.status === "identified" &&
              identification.crop === result.crop
                ? `Crop identification selected the ${result.crop} disease model. Review its prediction and visual explanation below.`
                : `The ${result.crop} disease model produced this prediction and visual explanation.`}
            </p>
          </div>
          <div className="result-neural-summary">
            <BrainNetwork
              state="complete"
              crop={result.crop}
              selectedCrop={result.crop}
            />
          </div>
          <PredictionResult
            result={result}
            previewUrl={previewUrl}
            file={file}
            onScanAnother={startAnotherScan}
          />
        </section>
      ) : (
        <section className="analysis-upload">
          <div className="analysis-upload-intro">
            <span className="analysis-eyebrow">01&nbsp; / &nbsp;ADD AN IMAGE</span>
            <h2>Start with a clear leaf photo.</h2>
            <p>
              Upload a single wheat or maize leaf image. Crop identification automatically selects the matching disease API.
            </p>
          </div>

          <ImageDropzone
            file={file}
            previewUrl={previewUrl}
            onFile={chooseFile}
          />

          <div className="analysis-upload-footer">
            <div className="analysis-privacy">
              <span aria-hidden="true">⌁</span>
              <span>EXTERNAL API&nbsp; · &nbsp;IMAGE PROCESSING</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
