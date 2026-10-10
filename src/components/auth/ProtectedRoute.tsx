import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { configured, loading, user } = useAuth();
  const location = useLocation();

  if (!configured) {
    return (
      <div className="container">
        <div className="card">
          <h1>Authentication is not configured</h1>
          <p>
            Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>{" "}
            to a local <code>.env</code> file, apply the SQL migration, and reload.
            Disease detection still works without an account.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container">
        <p>Loading your session…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
