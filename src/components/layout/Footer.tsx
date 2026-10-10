import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner footer-grid">
        <div>
          <h3>AgriSense AI</h3>
          <p>
            Wheat-leaf image classification for three classes: Healthy, Septoria,
            and stripe rust. Advisory text is general information, not a field
            diagnosis.
          </p>
        </div>
        <div>
          <h3>Navigate</h3>
          <p>
            <Link to="/detect">Detect disease</Link>
            <br />
            <Link to="/dashboard">Dashboard</Link>
            <br />
            <Link to="/login">Sign in</Link>
          </p>
        </div>
        <div>
          <h3>Contact</h3>
          <p>
            hello@agrisense.example
            <br />
            Agricultural research partnership placeholder
          </p>
        </div>
      </div>
      <div className="footer-inner">
        <p className="muted">
          Model scores are not calibrated real-world certainty. Confirm uncertain
          cases with a local agricultural expert. Do not use this app as the sole
          basis for pesticide application.
        </p>
      </div>
    </footer>
  );
}
