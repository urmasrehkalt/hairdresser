const express = require("express");
const cors = require("cors");
const dayjs = require("dayjs");
const {
  getServices,
  getServiceById,
  getStaff,
  getStaffById,
  getBookingsForDate,
  getBookingsForDateDetailed,
  createBooking,
  deleteBooking
} = require("./db");
const {
  buildAvailableSlots,
  hasConflict,
  isQuarterHour,
  isWithinWorkingHours
} = require("./scheduling");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/services", (req, res) => {
  res.json(getServices());
});

app.get("/api/staff", (req, res) => {
  res.json(getStaff());
});

app.get("/api/availability", (req, res) => {
  const { date, serviceId } = req.query;
  if (!date || !serviceId) {
    return res.status(400).json({ error: "Puuduvad parameetrid." });
  }
  const service = getServiceById(Number(serviceId));
  if (!service) {
    return res.status(404).json({ error: "Teenus puudub." });
  }

  const bookings = getBookingsForDate(date);
  const staffList = getStaff();
  const slots = buildAvailableSlots(
    date,
    service.duration_minutes,
    staffList,
    bookings
  );

  res.json({
    date,
    serviceId: service.id,
    durationMinutes: service.duration_minutes,
    slots
  });
});

app.get("/api/bookings", (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: "Kuupäev on kohustuslik." });
  }
  res.json(getBookingsForDateDetailed(date));
});

app.post("/api/bookings", (req, res) => {
  const { serviceId, staffId, start, customerName } = req.body;
  if (!serviceId || !staffId || !start) {
    return res.status(400).json({ error: "Puuduvad kohustuslikud väljad." });
  }

  const service = getServiceById(Number(serviceId));
  const staff = getStaffById(Number(staffId));
  if (!service || !staff) {
    return res.status(404).json({ error: "Teenus või juuksur puudub." });
  }

  if (!isQuarterHour(start)) {
    return res.status(400).json({ error: "Aeg peab olema 15 minuti täpsusega." });
  }

  if (!isWithinWorkingHours(start, service.duration_minutes)) {
    return res.status(400).json({ error: "Aeg on töötunnist väljas." });
  }

  const date = dayjs(start).format("YYYY-MM-DD");
  const bookings = getBookingsForDate(date).filter(
    (booking) => booking.staff_id === staff.id
  );
  const slotStart = dayjs(start);
  const slotEnd = slotStart.add(service.duration_minutes, "minute");

  if (hasConflict(slotStart, slotEnd, bookings)) {
    return res.status(409).json({ error: "Aeg on juba broneeritud." });
  }

  const bookingId = createBooking({
    serviceId: service.id,
    staffId: staff.id,
    customerName: customerName || null,
    startTime: slotStart.toISOString(),
    endTime: slotEnd.toISOString()
  });

  res.status(201).json({
    id: bookingId,
    serviceId: service.id,
    staffId: staff.id,
    start: slotStart.toISOString(),
    end: slotEnd.toISOString()
  });
});

app.delete("/api/bookings/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Vale id." });
  }
  const changes = deleteBooking(id);
  if (changes === 0) {
    return res.status(404).json({ error: "Broneeringut ei leitud." });
  }
  res.status(204).end();
});

app.listen(port, () => {
  console.log(`Server käivitus pordil ${port}`);
});
