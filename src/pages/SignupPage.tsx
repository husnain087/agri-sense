import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function SignupPage() {
  const { configured, user, signUp } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!configured) {
    return (
      <div className="container">
        <div className="card auth-card">
          <h1>Accounts are not configured</h1>
          <p>Detection still works against the live FastAPI model.</p>
        </div>
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const message = await signUp(email.trim(), password, fullName.trim());
      if (message) {
        setInfo(message);
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <form className="card auth-card form" onSubmit={(event) => void onSubmit(event)}>
        <h1>Create an account</h1>
        <label>
          Full name
          <input
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        </label>
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
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <p className="alert">{error}</p> : null}
        {info ? <p className="success">{info}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Creating account…" : "Sign up"}
        </button>
        <p>
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
