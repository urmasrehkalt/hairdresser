import { useEffect, useMemo, useState } from "react";
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

export default function BookingPage() {
  const [services, setServices] = useState([]);
  const [date, setDate] = useState(getTodayLocal());
  const [serviceId, setServiceId] = useState("");
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    api.services().then(setServices);
  }, []);

  useEffect(() => {
    if (!serviceId) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    api
      .availability(date, serviceId)
      .then((data) => setSlots(data.slots || []))
      .finally(() => setLoadingSlots(false));
  }, [date, serviceId]);

  const selectedService = useMemo(
    () => services.find((s) => String(s.id) === String(serviceId)),
    [services, serviceId]
  );

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
      setSelectedSlot(null);
      setName("");
      setPhone("");
      // Uuenda vabu aegu
      api
        .availability(date, serviceId)
        .then((data) => setSlots(data.slots || []));
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
    }
  };

  return (
    <section className="panel">
      <h2>Broneeri aeg</h2>
      <div className="form-grid">
        <label>
          Teenus
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            <option value="">Vali teenus</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.duration_minutes} min)
              </option>
            ))}
          </select>
        </label>
        <label>
          Kuupäev
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
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

      <div className="slots">
        <div className="slots-header">
          <h3>Vabad ajad</h3>
          {selectedService ? (
            <span>
              Teenus kestab {selectedService.duration_minutes} minutit
            </span>
          ) : (
            <span>Vali teenus, et näha aegu.</span>
          )}
        </div>
        {loadingSlots ? (
          <p>Laen vabu aegu...</p>
        ) : slots.length === 0 ? (
          <p>Valitud kuupäevaks vabu aegu ei ole.</p>
        ) : (
          <div className="slot-grid">
            {slots.map((slot) => {
              const active =
                selectedSlot &&
                selectedSlot.start === slot.start &&
                selectedSlot.staffId === slot.staffId;
              return (
                <button
                  key={`${slot.staffId}-${slot.start}`}
                  type="button"
                  className={active ? "slot active" : "slot"}
                  onClick={() => setSelectedSlot(slot)}
                >
                  <span>{formatTime(slot.start)}</span>
                  <small>{slot.staffName}</small>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="actions">
        <button type="button" className="primary" onClick={handleBooking}>
          Broneeri valitud aeg
        </button>
        {message && (
          <p className={`message ${messageType}`}>{message}</p>
        )}
      </div>
    </section>
  );
}
