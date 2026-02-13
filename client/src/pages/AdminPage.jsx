import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const DAY_NAMES = ["Pühapäev", "Esmaspäev", "Teisipäev", "Kolmapäev", "Neljapäev", "Reede", "Laupäev"];
const DAY_SHORT = ["P", "E", "T", "K", "N", "R", "L"];

function getTodayLocal() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString("et-EE", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("et-EE", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("bookings");
  const [bookingsMode, setBookingsMode] = useState("upcoming"); // "upcoming" | "date"
  const [date, setDate] = useState(getTodayLocal());
  const [bookings, setBookings] = useState([]);
  const [staff, setStaff] = useState([]);
  const [newStaffName, setNewStaffName] = useState("");
  const [message, setMessage] = useState("");
  const [staffMessage, setStaffMessage] = useState("");

  // Graafiku redigeerimise olek
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [scheduleData, setScheduleData] = useState({}); // { [day_of_week]: { enabled, start_time, end_time } }
  const [scheduleMessage, setScheduleMessage] = useState("");

  useEffect(() => {
    if (!api.isLoggedIn()) { navigate("/"); return; }
    loadBookings();
    loadStaff();
  }, [navigate]);

  useEffect(() => {
    if (api.isLoggedIn()) loadBookings();
  }, [date, bookingsMode]);

  const loadBookings = () => {
    const fetcher = bookingsMode === "upcoming"
      ? api.adminUpcomingBookings()
      : api.adminBookings(date);
    fetcher
      .then(setBookings)
      .catch((err) => {
        if (err.message === "AUTH") { api.logout(); navigate("/"); }
      });
  };

  const loadStaff = () => api.staff().then(setStaff);

  const handleCancelBooking = async (id) => {
    try {
      await api.adminDeleteBooking(id);
      setMessage("Broneering tühistatud.");
      loadBookings();
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      if (error.message === "AUTH") { api.logout(); navigate("/"); return; }
      setMessage(error.message);
    }
  };

  const handleAddStaff = async () => {
    if (!newStaffName.trim() || newStaffName.trim().length < 2) {
      setStaffMessage("Nimi peab olema vähemalt 2 tähemärki.");
      return;
    }
    try {
      await api.adminCreateStaff(newStaffName.trim());
      setNewStaffName("");
      setStaffMessage("Juuksur lisatud!");
      loadStaff();
      setTimeout(() => setStaffMessage(""), 3000);
    } catch (error) {
      if (error.message === "AUTH") { api.logout(); navigate("/"); return; }
      setStaffMessage(error.message);
    }
  };

  const handleDeleteStaff = async (id, name) => {
    if (!confirm(`Kas oled kindel, et soovid kustutada juuksuri "${name}"?`)) return;
    try {
      await api.adminDeleteStaff(id);
      setStaffMessage("Juuksur kustutatud.");
      loadStaff();
      if (editingStaffId === id) setEditingStaffId(null);
      setTimeout(() => setStaffMessage(""), 3000);
    } catch (error) {
      if (error.message === "AUTH") { api.logout(); navigate("/"); return; }
      setStaffMessage(error.message);
    }
  };

  // ── Graafik ──

  const openScheduleEditor = async (staffId) => {
    if (editingStaffId === staffId) { setEditingStaffId(null); return; }
    try {
      const data = await api.adminGetSchedule(staffId);
      const map = {};
      for (let d = 0; d <= 6; d++) {
        const entry = data.schedule.find((s) => s.day_of_week === d);
        map[d] = entry
          ? { enabled: true, start_time: entry.start_time, end_time: entry.end_time }
          : { enabled: false, start_time: "09:00", end_time: "18:00" };
      }
      setScheduleData(map);
      setEditingStaffId(staffId);
      setScheduleMessage("");
    } catch (error) {
      if (error.message === "AUTH") { api.logout(); navigate("/"); }
    }
  };

  const toggleDay = (day) => {
    setScheduleData((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }));
  };

  const updateScheduleTime = (day, field, value) => {
    setScheduleData((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const saveSchedule = async () => {
    const days = [];
    for (let d = 0; d <= 6; d++) {
      if (scheduleData[d]?.enabled) {
        days.push({
          day_of_week: d,
          start_time: scheduleData[d].start_time,
          end_time: scheduleData[d].end_time,
        });
      }
    }
    try {
      await api.adminUpdateSchedule(editingStaffId, days);
      setScheduleMessage("Graafik salvestatud!");
      setTimeout(() => setScheduleMessage(""), 3000);
    } catch (error) {
      if (error.message === "AUTH") { api.logout(); navigate("/"); return; }
      setScheduleMessage(error.message);
    }
  };

  // Grupeeri broneeringud kuupäeva järgi (upcoming režiimis)
  const groupedBookings = (() => {
    if (bookingsMode !== "upcoming") return null;
    const groups = new Map();
    for (const b of bookings) {
      const d = b.start_time.slice(0, 10);
      if (!groups.has(d)) groups.set(d, []);
      groups.get(d).push(b);
    }
    return Array.from(groups.entries());
  })();

  if (!api.isLoggedIn()) return null;

  return (
    <section className="wizard-panel admin-panel">
      {/* Tab navigatsioon */}
      <div className="admin-tabs">
        <button type="button" className={`admin-tab ${tab === "bookings" ? "active" : ""}`} onClick={() => setTab("bookings")}>
          📋 Broneeringud
        </button>
        <button type="button" className={`admin-tab ${tab === "staff" ? "active" : ""}`} onClick={() => setTab("staff")}>
          ✂️ Juuksurid
        </button>
      </div>

      {/* Broneeringute tab */}
      {tab === "bookings" && (
        <div className="fade-in">
          <div className="admin-header">
            <h2>Broneeringud</h2>
            <div className="admin-controls">
              <div className="toggle-group">
                <button
                  type="button"
                  className={`toggle-btn ${bookingsMode === "upcoming" ? "active" : ""}`}
                  onClick={() => setBookingsMode("upcoming")}
                >
                  Tulevased
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${bookingsMode === "date" ? "active" : ""}`}
                  onClick={() => setBookingsMode("date")}
                >
                  Kuupäev
                </button>
              </div>
              {bookingsMode === "date" && (
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="date-input"
                />
              )}
            </div>
          </div>

          <div className="admin-list">
            {bookings.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📋</span>
                <p>{bookingsMode === "upcoming" ? "Tulevasi broneeringuid ei ole." : "Valitud kuupäeval broneeringuid ei ole."}</p>
              </div>
            ) : bookingsMode === "upcoming" && groupedBookings ? (
              groupedBookings.map(([dateKey, dayBookings]) => (
                <div key={dateKey} className="bookings-day-group">
                  <h3 className="day-group-title">{formatDate(dateKey + "T12:00:00")}</h3>
                  {dayBookings.map((b) => (
                    <div key={b.id} className="booking-row">
                      <div className="booking-info">
                        <strong className="booking-time">
                          {formatTime(b.start_time)} – {formatTime(b.end_time)}
                        </strong>
                        <span className="booking-detail">{b.service_name} · {b.staff_name}</span>
                        <span className="booking-customer">{b.customer_name} · {b.customer_phone}</span>
                      </div>
                      <button type="button" className="ghost danger" onClick={() => handleCancelBooking(b.id)}>Tühista</button>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              bookings.map((b) => (
                <div key={b.id} className="booking-row">
                  <div className="booking-info">
                    <strong className="booking-time">{formatTime(b.start_time)} – {formatTime(b.end_time)}</strong>
                    <span className="booking-detail">{b.service_name} · {b.staff_name}</span>
                    <span className="booking-customer">{b.customer_name} · {b.customer_phone}</span>
                  </div>
                  <button type="button" className="ghost danger" onClick={() => handleCancelBooking(b.id)}>Tühista</button>
                </div>
              ))
            )}
          </div>
          {message && <p className="message">{message}</p>}
        </div>
      )}

      {/* Juuksurite tab */}
      {tab === "staff" && (
        <div className="fade-in">
          <h2>Juuksurite haldus</h2>
          <div className="staff-add-form">
            <input
              type="text"
              value={newStaffName}
              placeholder="Uue juuksuri nimi"
              onChange={(e) => setNewStaffName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddStaff()}
            />
            <button type="button" className="primary" onClick={handleAddStaff}>Lisa juuksur</button>
          </div>
          {staffMessage && (
            <p className={`message ${staffMessage.includes("kustutatud") || staffMessage.includes("lisatud") ? "success" : "error"}`}>
              {staffMessage}
            </p>
          )}
          <div className="admin-list">
            {staff.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">✂️</span>
                <p>Juuksureid pole lisatud.</p>
              </div>
            ) : (
              staff.map((s) => (
                <div key={s.id} className="staff-item">
                  <div className="booking-row">
                    <div className="booking-info">
                      <strong className="booking-time">
                        <span className="staff-avatar small">{s.name.charAt(0)}</span>
                        {s.name}
                      </strong>
                    </div>
                    <div className="staff-actions">
                      <button type="button" className="ghost" onClick={() => openScheduleEditor(s.id)}>
                        {editingStaffId === s.id ? "Sulge" : "🕐 Graafik"}
                      </button>
                      <button type="button" className="ghost danger" onClick={() => handleDeleteStaff(s.id, s.name)}>Kustuta</button>
                    </div>
                  </div>

                  {/* Graafiku redaktor */}
                  {editingStaffId === s.id && (
                    <div className="schedule-editor fade-in">
                      <h4>Töögraafik – {s.name}</h4>
                      <div className="schedule-grid">
                        {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                          <div key={day} className={`schedule-row ${scheduleData[day]?.enabled ? "" : "disabled"}`}>
                            <label className="schedule-day-toggle">
                              <input
                                type="checkbox"
                                checked={scheduleData[day]?.enabled || false}
                                onChange={() => toggleDay(day)}
                              />
                              <span className="schedule-day-name">{DAY_NAMES[day]}</span>
                            </label>
                            {scheduleData[day]?.enabled && (
                              <div className="schedule-times">
                                <input
                                  type="time"
                                  value={scheduleData[day]?.start_time || "09:00"}
                                  onChange={(e) => updateScheduleTime(day, "start_time", e.target.value)}
                                />
                                <span className="schedule-sep">–</span>
                                <input
                                  type="time"
                                  value={scheduleData[day]?.end_time || "18:00"}
                                  onChange={(e) => updateScheduleTime(day, "end_time", e.target.value)}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {scheduleMessage && (
                        <p className={`message ${scheduleMessage.includes("salvestatud") ? "success" : "error"}`}>
                          {scheduleMessage}
                        </p>
                      )}
                      <button type="button" className="primary" onClick={saveSchedule}>Salvesta graafik</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}
