import { Link } from "react-router-dom";
import { DISEASE_INFO } from "../data/diseaseInfo";
import { API_BASE_URL } from "../lib/env";

export function HomePage() {
  return (
    <div className="container">
      <section className="hero">
        <div>
          <span className="kicker">Wheat leaf intelligence</span>
          <h1>AI-powered detection for three wheat-leaf classes.</h1>
          <p>
            AgriSense AI sends a leaf photo to the local FastAPI service running
            your EfficientNet-B0 checkpoint. The model distinguishes Healthy,
            Septoria, and stripe rust — not every crop or every plant disease.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/detect">
              Detect disease
            </Link>
            <Link className="btn btn-secondary" to="/maize-detect">
              Maize module
            </Link>
          </div>
        </div>
        <div className="hero-panel">
          <div className="leaf-art" aria-hidden="true">
            <svg width="220" height="220" viewBox="0 0 220 220">
              <ellipse cx="110" cy="118" rx="70" ry="88" fill="#f7f5ef" opacity="0.15" />
              <path
                d="M110 30c46 28 62 78 0 160C48 108 64 58 110 30Z"
                fill="#eaf6ee"
              />
              <path d="M110 42v132" stroke="#c9a227" strokeWidth="4" />
            </svg>
          </div>
          <p className="muted">
            Local model API: <code>{API_BASE_URL}</code>
          </p>
        </div>
      </section>

      <section className="section" id="classes">
        <h2>Supported classes</h2>
        <p>The trained classifier currently outputs exactly these three labels.</p>
        <div className="grid-3">
          {Object.values(DISEASE_INFO).map((item) => (
            <article className="card" key={item.id}>
              <h3>{item.label}</h3>
              <p>{item.shortSummary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="how">
        <h2>How detection works</h2>
        <div className="grid-3">
          <article className="card">
            <h3>1. Upload a leaf photo</h3>
            <p>Use a clear JPEG, PNG, or WEBP image focused on a wheat leaf.</p>
          </article>
          <article className="card">
            <h3>2. The model scores the image</h3>
            <p>
              FastAPI runs EfficientNet-B0 and returns a class, confidence, and
              class probabilities.
            </p>
          </article>
          <article className="card">
            <h3>3. Review advisory context</h3>
            <p>
              Results include general crop information. Confirm uncertain cases
              with a local expert.
            </p>
          </article>
        </div>
      </section>

      <section className="section" id="features">
        <h2>Platform features</h2>
        <div className="grid-2">
          <article className="card">
            <h3>Local model inference</h3>
            <p>Predictions come from your local PyTorch checkpoint, not from mock data.</p>
          </article>
          <article className="card">
            <h3>Probability visualization</h3>
            <p>See the model’s scores for Healthy, Septoria, and stripe rust together.</p>
          </article>
          <article className="card">
            <h3>Signed-in history</h3>
            <p>When Supabase is configured, save scans to a private, RLS-protected table.</p>
          </article>
          <article className="card">
            <h3>Maize detection module</h3>
            <p>
              The maize interface connects to the local FastAPI service and shows a
              clear status when the project checkpoint does not yet match a valid maize model.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <article className="card limitations">
          <h2>Capabilities and limits</h2>
          <p>
            The current model is a wheat-leaf classifier trained to separate
            Healthy, Septoria, and stripe rust. It does not support other crops,
            other wheat diseases, canopy-level mapping, infected-area percentages,
            or automatic pesticide prescriptions. Confidence is a model score, not
            a guarantee.
          </p>
        </article>
      </section>

      <section className="section">
        <article className="card">
          <h2>Inspect a wheat leaf next</h2>
          <p>Upload an image and request a prediction from your local model backend.</p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/detect">
              Start detection
            </Link>
            <Link className="btn btn-secondary" to="/maize-detect">
              Open maize detector
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
