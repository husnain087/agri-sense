import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { configured, user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!configured) {
    return (
      <div className="container">
        <div className="card auth-card">
          <h1>Sign in is not available yet</h1>
          <p>
            Configure Supabase environment variables to enable accounts. You can
            still run live disease detection without signing in.
          </p>
          <Link className="btn btn-primary" to="/detect">
            Go to detection
          </Link>
        </div>
      </div>
    );
  }

  if (user) return <Navigate to={from} replace />;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <form className="card auth-card form" onSubmit={(event) => void onSubmit(event)}>
        <h1>Sign in</h1>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <p className="alert">{error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <p>
          Need an account? <Link to="/signup">Create one</Link>
        </p>
      </form>
    </div>
  );
}
