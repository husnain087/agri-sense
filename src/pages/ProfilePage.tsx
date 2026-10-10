import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getProfile, upsertProfile } from "../services/history";

export function ProfilePage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getProfile(user.id)
      .then((profile) => {
        const metaName =
          typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : "";
        setFullName(profile?.full_name || metaName);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load profile.");
      })
      .finally(() => setLoading(false));
  }, [user]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await upsertProfile(user.id, fullName.trim());
      setMessage("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container">
      <form className="card auth-card form" onSubmit={(event) => void onSubmit(event)}>
        <h1>Profile</h1>
        <p className="muted">{user?.email}</p>
        {loading ? <p>Loading profile…</p> : null}
        <label>
          Full name
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        </label>
        {message ? <p className="success">{message}</p> : null}
        {error ? <p className="alert">{error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={saving || loading}>
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
