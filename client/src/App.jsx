import { useEffect, useMemo, useState } from "react";

const api = {
  services: () => fetch("/api/services").then((res) => res.json()),
  staff: () => fetch("/api/staff").then((res) => res.json()),
  availability: (date, serviceId) =>
    fetch(`/api/availability?date=${date}&serviceId=${serviceId}`).then((res) =>
      res.json()
    ),
  bookings: (date) =>
    fetch(`/api/bookings?date=${date}`).then((res) => res.json()),
  createBooking: (payload) =>
    fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = data.error || "Broneerimine ebaõnnestus.";
        throw new Error(message);
      }
      return data;
    }),
  deleteBooking: (id) =>
    fetch(`/api/bookings/${id}`, { method: "DELETE" }).then((res) => {
      if (!res.ok && res.status !== 204) {
        throw new Error("Tühistamine ebaõnnestus.");
      }
    })
};

function getTodayLocal() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString("et-EE", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function App() {
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [date, setDate] = useState(getTodayLocal());
  const [serviceId, setServiceId] = useState("");
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [bookings, setBookings] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    api.services().then(setServices);
    api.staff().then(setStaff);
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

  useEffect(() => {
    api.bookings(date).then(setBookings);
  }, [date, message]);

  const selectedService = useMemo(
    () => services.find((service) => String(service.id) === String(serviceId)),
    [services, serviceId]
  );

  const staffMap = useMemo(() => {
    const map = new Map();
    for (const member of staff) {
      map.set(member.id, member.name);
    }
    return map;
  }, [staff]);

  const handleBooking = async () => {
    if (!selectedSlot || !selectedService) {
      setMessage("Vali teenus ja aeg.");
      return;
    }
    try {
      await api.createBooking({
        serviceId: selectedService.id,
        staffId: selectedSlot.staffId,
        start: selectedSlot.start,
        customerName: name
      });
      setMessage("Broneering kinnitatud!");
      setSelectedSlot(null);
      setName("");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleCancel = async (id) => {
    try {
      await api.deleteBooking(id);
      setMessage("Broneering tühistatud.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Juuksurisalongi iseteenindus</p>
          <h1>Salon 15</h1>
          <p className="subtitle">
            Broneeri teenus 15-minutilise sammuga. Valime sinu ajale sobiva
            juuksuri automaatselt.
          </p>
        </div>
        <div className="hero-card">
          <h2>Kiirvaade</h2>
          <div className="hero-detail">
            <span>Teenuseid</span>
            <strong>{services.length}</strong>
          </div>
          <div className="hero-detail">
            <span>Juuksureid</span>
            <strong>{staff.length}</strong>
          </div>
          <div className="hero-detail">
            <span>Täna</span>
            <strong>{date}</strong>
          </div>
        </div>
      </header>

      <main className="content">
        <section className="panel">
          <h2>Broneeri aeg</h2>
          <div className="form-grid">
            <label>
              Teenus
              <select
                value={serviceId}
                onChange={(event) => setServiceId(event.target.value)}
              >
                <option value="">Vali teenus</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} ({service.duration_minutes} min)
                  </option>
                ))}
              </select>
            </label>
            <label>
              Kuupäev
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <label>
              Nimi (valikuline)
              <input
                type="text"
                value={name}
                placeholder="Sinu nimi"
                onChange={(event) => setName(event.target.value)}
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
            {message && <p className="message">{message}</p>}
          </div>
        </section>

        <section className="panel admin">
          <div className="admin-header">
            <h2>Admin: broneeringud</h2>
            <span>{date}</span>
          </div>
          <div className="admin-list">
            {bookings.length === 0 ? (
              <p>Broneeringuid ei ole.</p>
            ) : (
              bookings.map((booking) => (
                <div key={booking.id} className="booking-row">
                  <div>
                    <strong>{formatTime(booking.start_time)}</strong>
                    <span>
                      {booking.service_name} · {booking.staff_name}
                    </span>
                    {booking.customer_name && (
                      <span>Nimi: {booking.customer_name}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => handleCancel(booking.id)}
                  >
                    Tühista
                  </button>
                </div>
              ))
            )}
          </div>
          <p className="hint">
            Broneeringute nimekiri on lihtne admin-vaade. Autentimist ei ole.
          </p>
        </section>
      </main>
    </div>
  );
}
