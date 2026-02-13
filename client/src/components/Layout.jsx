import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggedIn, setLoggedIn] = useState(api.isLoggedIn());

  const handleLogin = async () => {
    setLoginError("");
    try {
      await api.login(password.trim());
      setLoggedIn(true);
      setShowLogin(false);
      setPassword("");
      navigate("/admin");
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const handleLogout = () => {
    api.logout();
    setLoggedIn(false);
    navigate("/");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className="page">
      <header className="site-header">
        <div className="site-header-inner">
          <Link to="/" className="site-logo">Salon 15</Link>
          <nav className="site-nav">
            <Link
              to="/"
              className={`nav-link ${location.pathname === "/" ? "nav-active" : ""}`}
            >
              Broneeri aeg
            </Link>
            {loggedIn ? (
              <>
                <Link
                  to="/admin"
                  className={`nav-link ${location.pathname === "/admin" ? "nav-active" : ""}`}
                >
                  Admin
                </Link>
                <button
                  type="button"
                  className="nav-btn logout"
                  onClick={handleLogout}
                >
                  Logi välja
                </button>
              </>
            ) : (
              <button
                type="button"
                className="nav-btn login"
                onClick={() => setShowLogin(true)}
              >
                Admin
              </button>
            )}
          </nav>
        </div>
      </header>

      {showLogin && (
        <div className="modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Admin sisselogimine</h3>
            <input
              type="password"
              value={password}
              placeholder="Sisesta parool"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            {loginError && <p className="message error">{loginError}</p>}
            <div className="modal-actions">
              <button type="button" className="primary" onClick={handleLogin}>
                Logi sisse
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => setShowLogin(false)}
              >
                Tühista
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="content">{children}</main>
      <footer className="site-footer">
        <p>&copy; 2026 Salon 15 &middot; Tööaeg E–R 09:00–18:00</p>
      </footer>
    </div>
  );
}
