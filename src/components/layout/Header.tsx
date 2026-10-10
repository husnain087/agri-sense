import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { BrandMark } from "../BrandMark";
import { BackendStatus } from "../status/BackendStatus";
import { useAuth } from "../../context/AuthContext";
import { useBackendStatus } from "../../hooks/useBackendStatus";

export function Header() {
  const { user, signOut, configured } = useAuth();
  const { health } = useBackendStatus();
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" to="/" onClick={() => setOpen(false)}>
          <BrandMark className="brand-mark" />
          AgriSense AI
        </Link>
        <nav className={`nav-links ${open ? "open" : ""}`} aria-label="Main">
          <NavLink to="/detect" onClick={() => setOpen(false)}>
            Detect
          </NavLink>
          <NavLink to="/maize-detect" onClick={() => setOpen(false)}>
            Maize detect
          </NavLink>
          <a href="/#features" onClick={() => setOpen(false)}>
            Features
          </a>
          {user ? (
            <>
              <NavLink to="/dashboard" onClick={() => setOpen(false)}>
                Dashboard
              </NavLink>
              <NavLink to="/history" onClick={() => setOpen(false)}>
                History
              </NavLink>
              <NavLink to="/profile" onClick={() => setOpen(false)}>
                Profile
              </NavLink>
              <button
                className="linkish"
                type="button"
                onClick={() => {
                  void signOut();
                  setOpen(false);
                }}
              >
                Sign out
              </button>
            </>
          ) : configured ? (
            <>
              <NavLink to="/login" onClick={() => setOpen(false)}>
                Sign in
              </NavLink>
              <NavLink to="/signup" onClick={() => setOpen(false)}>
                Create account
              </NavLink>
            </>
          ) : null}
        </nav>
        <div className="header-tools">
          <BackendStatus health={health} />
          <button
            className="menu-toggle"
            type="button"
            aria-expanded={open}
            aria-label="Open navigation"
            onClick={() => setOpen((value) => !value)}
          >
            Menu
          </button>
        </div>
      </div>
    </header>
  );
}
