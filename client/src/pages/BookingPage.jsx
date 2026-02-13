import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
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

function formatDateShort(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("et-EE", { weekday: "short", day: "numeric", month: "short" });
}

const STEPS = [
  { label: "Teenus", icon: "✂️" },
  { label: "Kuupäev", icon: "📅" },
  { label: "Kellaaeg", icon: "🕐" },
  { label: "Kinnitus", icon: "✅" },
];

export default function BookingPage() {
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState(null);
  const [weekData, setWeekData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setStep(0);
    setServiceId(null);
    setWeekData(null);
    setSelectedDate(null);
    setSlots([]);
    setSelectedSlot(null);
    setName("");
    setPhone("");
    setMessage("");
  }, [location.key]);

  useEffect(() => {
    api.services().then(setServices);
  }, []);

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId),
    [services, serviceId],
  );

  // Lae nädala vabad ajad teenuse muutumisel
  useEffect(() => {
    if (!serviceId) {
      return;
    }
    setLoadingWeek(true);
    api
      .weeklyAvailability(serviceId, 0)
      .then(setWeekData)
      .finally(() => setLoadingWeek(false));
  }, [serviceId]);

  const loadMoreDays = () => {
    if (!serviceId || !weekData) return;
    const offset = weekData.days.length;
    setLoadingWeek(true);
    api
      .weeklyAvailability(serviceId, offset)
      .then((data) => {
        setWeekData((prev) => ({
          ...prev,
          days: [...prev.days, ...data.days],
        }));
      })
      .finally(() => setLoadingWeek(false));
  };

  // Lae valitud kuupäeva slotid
  useEffect(() => {
    if (!serviceId || !selectedDate) {
      return;
    }
    setLoadingSlots(true);
    setSelectedSlot(null);
    api
      .availability(selectedDate, serviceId)
      .then((data) => setSlots(data.slots || []))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, serviceId]);

  // Grupeeri slotid juuksurite kaupa
  const slotsByStaff = useMemo(() => {
    const map = new Map();
    for (const slot of slots) {
      if (!map.has(slot.staffId)) {
        map.set(slot.staffId, { name: slot.staffName, slots: [] });
      }
      map.get(slot.staffId).slots.push(slot);
    }
    return Array.from(map.values());
  }, [slots]);

  const handleServiceSelect = (id) => {
    setServiceId(id);
    setSelectedSlot(null);
    setSelectedDate(null);
    setStep(1);
  };

  const handleDateSelect = (dateStr, totalSlots) => {
    if (totalSlots === 0) return;
    setSelectedDate(dateStr);
    setStep(2);
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setStep(3);
  };

  const handleBack = () => {
    setMessage("");
    if (step === 3) {
      setSelectedSlot(null);
    }
    if (step === 2) {
      setSelectedDate(null);
    }
    setStep((prev) => Math.max(0, prev - 1));
  };

  const handleBooking = async () => {
    if (!selectedSlot || !selectedService) {
      setMessage("Vali teenus ja aeg.");
      setMessageType("error");
      return;
    }
    if (!name.trim() || name.trim().length < 2) {
      setMessage("Sisesta nimi (vähemalt 2 tähemärki).");
      setMessageType("error");
      return;
    }
    if (!/^[+\d\s()-]{5,}$/.test(phone.trim())) {
      setMessage("Sisesta korrektne telefoninumber.");
      setMessageType("error");
      return;
    }
    setSubmitting(true);
    try {
      await api.createBooking({
        serviceId: selectedService.id,
        staffId: selectedSlot.staffId,
        start: selectedSlot.start,
        customerName: name.trim(),
        customerPhone: phone.trim(),
      });
      setMessage("Broneering kinnitatud!");
      setMessageType("success");
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewBooking = () => {
    setStep(0);
    setServiceId(null);
    setSelectedSlot(null);
    setSelectedDate(null);
    setName("");
    setPhone("");
    setMessage("");
    setMessageType("");
    setWeekData(null);
  };

  // Edukas broneering – kuva kinnitus
  if (messageType === "success") {
    return (
      <section className="wizard-panel">
        <div className="success-view">
          <div className="success-icon">🎉</div>
          <h2>Broneering kinnitatud!</h2>
          <div className="summary-card">
            <div className="summary-row">
              <span className="summary-label">Teenus</span>
              <span>{selectedService?.name}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Juuksur</span>
              <span>{selectedSlot?.staffName}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Kuupäev</span>
              <span>{formatDateShort(selectedDate)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Kellaaeg</span>
              <span>
                {formatTime(selectedSlot?.start)} – {formatTime(selectedSlot?.end)}
              </span>
            </div>
          </div>
          <button type="button" className="primary" onClick={handleNewBooking}>
            Tee uus broneering
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="wizard-panel">
      {/* Sammude indikaator */}
      <div className="wizard-progress">
        {STEPS.map((s, i) => (
          <div
            key={s.label}
            className={`wizard-step ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
          >
            <div className="wizard-step-dot">
              {i < step ? "✓" : s.icon}
            </div>
            <span className="wizard-step-label">{s.label}</span>
          </div>
        ))}
        <div className="wizard-progress-line">
          <div
            className="wizard-progress-fill"
            style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Samm 0: Teenuse valik */}
      {step === 0 && (
        <div className="wizard-body fade-in">
          <h2>Vali teenus</h2>
          <div className="service-grid">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`service-card ${serviceId === s.id ? "active" : ""}`}
                onClick={() => handleServiceSelect(s.id)}
              >
                <span className="service-name">{s.name}</span>
                <span className="service-duration">{s.duration_minutes} min</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Samm 1: Kuupäeva valik – nädalavaade */}
      {step === 1 && (
        <div className="wizard-body fade-in">
          <h2>Vali kuupäev</h2>
          <p className="wizard-hint">
            Valitud teenus: <strong>{selectedService?.name}</strong> ({selectedService?.duration_minutes} min)
          </p>
          {loadingWeek ? (
            <div className="loading-spinner">
              <div className="spinner" />
              <p>Laen vabu aegu...</p>
            </div>
          ) : weekData ? (
            <div className="week-grid">
              {weekData.days.map((day) => (
                <button
                  key={day.date}
                  type="button"
                  className={`day-card ${day.totalSlots === 0 ? "disabled" : ""} ${selectedDate === day.date ? "active" : ""}`}
                  onClick={() => handleDateSelect(day.date, day.totalSlots)}
                  disabled={day.totalSlots === 0}
                >
                  <span className="day-label">{formatDateShort(day.date)}</span>
                  <span className={`day-slots ${day.totalSlots === 0 ? "none" : ""}`}>
                    {day.totalSlots === 0
                      ? "Pole vabu aegu"
                      : `${day.totalSlots} vaba aega`}
                  </span>
                  {day.staffSlots.length > 0 && (
                    <div className="day-staff-list">
                      {day.staffSlots.map((s) => (
                        <span key={s.staffId} className="day-staff-badge">
                          {s.staffName}: {s.count}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : null}
          <div className="wizard-actions">
            <button type="button" className="ghost" onClick={handleBack}>
              ← Tagasi
            </button>
            {weekData && !loadingWeek && (
              <button type="button" className="ghost accent" onClick={loadMoreDays}>
                Veel aegu →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Samm 2: Kellaaja ja juuksuri valik */}
      {step === 2 && (
        <div className="wizard-body fade-in">
          <h2>Vali juuksur ja kellaaeg</h2>
          <p className="wizard-hint">
            {selectedService?.name} · {formatDateShort(selectedDate)} · {selectedService?.duration_minutes} min
          </p>
          {loadingSlots ? (
            <div className="loading-spinner">
              <div className="spinner" />
              <p>Laen vabu aegu...</p>
            </div>
          ) : slotsByStaff.length === 0 ? (
            <p className="no-slots">Valitud kuupäeval vabu aegu ei ole.</p>
          ) : (
            <div className="staff-slots-wrap">
              {slotsByStaff.map((staffGroup) => (
                <div key={staffGroup.name} className="staff-group">
                  <h3 className="staff-name-label">
                    <span className="staff-avatar">
                      {staffGroup.name.charAt(0)}
                    </span>
                    {staffGroup.name}
                  </h3>
                  <div className="slot-grid">
                    {staffGroup.slots.map((slot) => {
                      const isActive =
                        selectedSlot &&
                        selectedSlot.start === slot.start &&
                        selectedSlot.staffId === slot.staffId;
                      return (
                        <button
                          key={`${slot.staffId}-${slot.start}`}
                          type="button"
                          className={`slot ${isActive ? "active" : ""}`}
                          onClick={() => handleSlotSelect(slot)}
                        >
                          {formatTime(slot.start)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="wizard-actions">
            <button type="button" className="ghost" onClick={handleBack}>
              ← Tagasi
            </button>
          </div>
        </div>
      )}

      {/* Samm 3: Kontaktandmed ja kinnitus */}
      {step === 3 && (
        <div className="wizard-body fade-in">
          <h2>Kontaktandmed</h2>
          <div className="summary-card">
            <div className="summary-row">
              <span className="summary-label">Teenus</span>
              <span>{selectedService?.name} ({selectedService?.duration_minutes} min)</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Juuksur</span>
              <span>{selectedSlot?.staffName}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Kuupäev</span>
              <span>{formatDateShort(selectedDate)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Kellaaeg</span>
              <span>
                {formatTime(selectedSlot?.start)} – {formatTime(selectedSlot?.end)}
              </span>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Nimi *
              <input
                type="text"
                value={name}
                placeholder="Sinu nimi"
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Telefon *
              <input
                type="tel"
                value={phone}
                placeholder="+372 5123 4567"
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
          </div>
          {message && <p className={`message ${messageType}`}>{message}</p>}
          <div className="wizard-actions">
            <button type="button" className="ghost" onClick={handleBack}>
              ← Tagasi
            </button>
            <button
              type="button"
              className="primary"
              onClick={handleBooking}
              disabled={submitting}
            >
              {submitting ? "Broneerin..." : "Kinnita broneering"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
