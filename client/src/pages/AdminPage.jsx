import { useEffect, useState } from "react";
import api from "../services/api";

function getTodayLocal() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString("et-EE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(
    Boolean(localStorage.getItem("adminToken"))
  );
  const [token, setToken] = useState("");
  const [date, setDate] = useState(getTodayLocal());
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState("");
  const [loginError, setLoginError] = useState("");

  function handleLogin() {
    localStorage.setItem("adminToken", token.trim());
    setLoggedIn(true);
    setLoginError("");
  }

  function handleLogout() {
    localStorage.removeItem("adminToken");
    setLoggedIn(false);
    setBookings([]);
    setToken("");
  }

  useEffect(() => {
    if (!loggedIn) return;
    api
      .adminBookings(date)
      .then(setBookings)
      .catch((err) => {
        if (err.message === "AUTH") {
          setLoginError("Vale token. Palun logi uuesti sisse.");
          handleLogout();
        }
      });
  }, [date, loggedIn, message]);

  const handleCancel = async (id) => {
    try {
      await api.adminDeleteBooking(id);
      setMessage("Broneering tühistatud.");
    } catch (error) {
      if (error.message === "AUTH") {
        setLoginError("Sessioon aegunud. Logi uuesti sisse.");
        handleLogout();
        return;
      }
      setMessage(error.message);
    }
  };

  if (!loggedIn) {
    return (
      <section className="panel admin">
        <h2>Admin sisselogimine</h2>
        <div className="form-grid">
          <label>
            Admin token
            <input
              type="password"
              value={token}
              placeholder="Sisesta admin token"
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </label>
        </div>
        <div className="actions">
          <button type="button" className="primary" onClick={handleLogin}>
            Logi sisse
          </button>
          {loginError && <p className="message error">{loginError}</p>}
        </div>
      </section>
    );
  }

  return (
    <section className="panel admin">
      <div className="admin-header">
        <h2>Admin: broneeringud</h2>
        <div className="admin-controls">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button type="button" className="ghost" onClick={handleLogout}>
            Logi välja
          </button>
        </div>
      </div>
      <div className="admin-list">
        {bookings.length === 0 ? (
          <p>Broneeringuid ei ole.</p>
        ) : (
          bookings.map((b) => (
            <div key={b.id} className="booking-row">
              <div>
                <strong>{formatTime(b.start_time)}</strong>
                <span>
                  {b.service_name} &middot; {b.staff_name}
                </span>
                <span>
                  {b.customer_name} &middot; {b.customer_phone}
                </span>
              </div>
              <button
                type="button"
                className="ghost"
                onClick={() => handleCancel(b.id)}
              >
                Tühista
              </button>
            </div>
          ))
        )}
      </div>
      {message && <p className="message">{message}</p>}
    </section>
  );
}
