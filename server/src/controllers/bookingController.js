const dayjs = require("dayjs");
const serviceModel = require("../models/serviceModel");
const staffModel = require("../models/staffModel");
const bookingModel = require("../models/bookingModel");
const {
  buildAvailableSlots,
  isQuarterHour,
  isWithinWorkingHours,
} = require("../services/scheduling");

function availability(req, res) {
  const { date, serviceId } = req.query;
  if (!date || !serviceId) {
    return res.status(400).json({ error: "Puuduvad parameetrid." });
  }

  const service = serviceModel.getById(Number(serviceId));
  if (!service) {
    return res.status(404).json({ error: "Teenus puudub." });
  }

  const bookings = bookingModel.getForDate(date);
  const staffList = staffModel.getAll();
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
    slots,
  });
}

function listByDate(req, res) {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: "Kuupäev on kohustuslik." });
  }
  res.json(bookingModel.getForDateDetailed(date));
}

function create(req, res) {
  const { serviceId, staffId, start, customerName, customerPhone } = req.body;

  if (!serviceId || !staffId || !start || !customerName || !customerPhone) {
    return res
      .status(400)
      .json({ error: "Puuduvad kohustuslikud väljad (teenus, juuksur, aeg, nimi, telefon)." });
  }

  const safeName = String(customerName).trim().slice(0, 100);
  const safePhone = String(customerPhone).trim().slice(0, 30);

  if (safeName.length < 2) {
    return res.status(400).json({ error: "Nimi peab olema vähemalt 2 tähemärki." });
  }

  if (!/^[+\d\s()-]{5,}$/.test(safePhone)) {
    return res.status(400).json({ error: "Telefoninumber on vigane." });
  }

  const service = serviceModel.getById(Number(serviceId));
  const staff = staffModel.getById(Number(staffId));
  if (!service || !staff) {
    return res.status(404).json({ error: "Teenus või juuksur puudub." });
  }

  if (!isQuarterHour(start)) {
    return res
      .status(400)
      .json({ error: "Aeg peab olema 15 minuti täpsusega." });
  }

  if (!isWithinWorkingHours(start, service.duration_minutes)) {
    return res.status(400).json({ error: "Aeg on töötunnist väljas." });
  }

  const slotStart = dayjs(start);
  const slotEnd = slotStart.add(service.duration_minutes, "minute");

  const result = bookingModel.createBookingSafe({
    serviceId: service.id,
    staffId: staff.id,
    customerName: safeName,
    customerPhone: safePhone,
    startTime: slotStart.toISOString(),
    endTime: slotEnd.toISOString(),
  });

  if (result.conflict) {
    return res.status(409).json({ error: "Aeg on juba broneeritud." });
  }

  res.status(201).json({
    id: result.id,
    serviceId: service.id,
    staffId: staff.id,
    start: slotStart.toISOString(),
    end: slotEnd.toISOString(),
  });
}

function remove(req, res) {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Vale id." });
  }
  const changes = bookingModel.deleteById(id);
  if (changes === 0) {
    return res.status(404).json({ error: "Broneeringut ei leitud." });
  }
  res.status(204).end();
}

module.exports = { availability, listByDate, create, remove };
