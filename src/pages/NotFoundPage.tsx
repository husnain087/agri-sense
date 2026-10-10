import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="container">
      <div className="card empty">
        <h1>Page not found</h1>
        <p>That route is not part of AgriSense AI.</p>
        <Link className="btn btn-primary" to="/">
          Return home
        </Link>
      </div>
    </div>
  );
}
