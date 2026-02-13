const dayjs = require("dayjs");
const bookingModel = require("../models/bookingModel");
const serviceModel = require("../models/serviceModel");
const staffModel = require("../models/staffModel");
const { buildAvailableSlots, isQuarterHour } = require("../services/scheduling");
const { ADMIN_TOKEN } = require("../middleware/auth");

/**
 * Ehita staffSchedules Map konkreetse kuupäeva jaoks
 */
function getStaffSchedulesForDate(staffList, dateStr) {
  const d = dayjs(dateStr);
  const dayOfWeek = d.day(); // 0=Sun, 1=Mon, ...
  const schedules = new Map();
  for (const staff of staffList) {
    const schedule = staffModel.getScheduleForDay(staff.id, dayOfWeek);
    if (schedule) {
      schedules.set(staff.id, schedule);
    }
  }
  return schedules;
}

function availability(req, res) {
  const { date, serviceId } = req.query;
  if (!date || !serviceId) {
    return res
      .status(400)
      .json({ error: "Kuupäev ja teenuse id on kohustuslikud." });
  }

  const service = serviceModel.getById(Number(serviceId));
  if (!service) {
    return res.status(404).json({ error: "Teenus puudub." });
  }

  const staffList = staffModel.getAll();
  const bookings = bookingModel.getForDate(date);
  const staffSchedules = getStaffSchedulesForDate(staffList, date);

  const slots = buildAvailableSlots(
    date,
    service.duration_minutes,
    staffList,
    bookings,
    staffSchedules,
  );

  res.json({ date, serviceId: service.id, slots });
}

function weeklyAvailability(req, res) {
  const { serviceId } = req.query;
  const numDays = Math.min(Number(req.query.days) || 8, 30);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  if (!serviceId) {
    return res.status(400).json({ error: "Teenuse id on kohustuslik." });
  }

  const service = serviceModel.getById(Number(serviceId));
  if (!service) {
    return res.status(404).json({ error: "Teenus puudub." });
  }

  const staffList = staffModel.getAll();
  const days = [];

  for (let i = offset; i < offset + numDays; i++) {
    const d = dayjs().add(i, "day");
    const dateStr = d.format("YYYY-MM-DD");

    const staffSchedules = getStaffSchedulesForDate(staffList, dateStr);

    // Kui ühelgi juuksuril pole sel päeval tööaega
    if (staffSchedules.size === 0) {
      days.push({
        date: dateStr,
        dayLabel: d.format("dd"),
        totalSlots: 0,
        staffSlots: [],
      });
      continue;
    }

    const bookings = bookingModel.getForDate(dateStr);
    const slots = buildAvailableSlots(
      dateStr,
      service.duration_minutes,
      staffList,
      bookings,
      staffSchedules,
    );

    const staffMap = new Map();
    for (const slot of slots) {
      if (!staffMap.has(slot.staffId)) {
        staffMap.set(slot.staffId, {
          staffId: slot.staffId,
          staffName: slot.staffName,
          count: 0,
        });
      }
      staffMap.get(slot.staffId).count++;
    }

    days.push({
      date: dateStr,
      dayLabel: d.format("dd"),
      totalSlots: slots.length,
      staffSlots: Array.from(staffMap.values()),
    });
  }

  res.json({
    serviceId: service.id,
    durationMinutes: service.duration_minutes,
    days,
  });
}

function listByDate(req, res) {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: "Kuupäev on kohustuslik." });
  }
  res.json(bookingModel.getForDateDetailed(date));
}

function listUpcoming(req, res) {
  res.json(bookingModel.getUpcoming());
}

function create(req, res) {
  const { serviceId, staffId, start, customerName, customerPhone } = req.body;

  if (!serviceId || !staffId || !start || !customerName || !customerPhone) {
    return res.status(400).json({ error: "Kõik väljad on kohustuslikud." });
  }

  if (!isQuarterHour(start)) {
    return res
      .status(400)
      .json({ error: "Algusaeg peab olema veerandtunni peal." });
  }

  const service = serviceModel.getById(Number(serviceId));
  if (!service) {
    return res.status(404).json({ error: "Teenus puudub." });
  }

  const staff = staffModel.getById(Number(staffId));
  if (!staff) {
    return res.status(404).json({ error: "Juuksur puudub." });
  }

  const safeName = String(customerName).trim().slice(0, 200);
  const safePhone = String(customerPhone).trim().slice(0, 30);

  if (safeName.length < 2) {
    return res
      .status(400)
      .json({ error: "Nimi peab olema vähemalt 2 tähemärki." });
  }

  const startTime = dayjs(start);
  const endTime = startTime.add(service.duration_minutes, "minute");

  const result = bookingModel.createBookingSafe({
    serviceId: service.id,
    staffId: staff.id,
    customerName: safeName,
    customerPhone: safePhone,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
  });

  if (result.conflict) {
    return res.status(409).json({ error: "Aeg on juba broneeritud." });
  }

  res.status(201).json({
    id: result.id,
    serviceId: service.id,
    staffId: staff.id,
    start: startTime.toISOString(),
    end: endTime.toISOString(),
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

function login(req, res) {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: "Parool on kohustuslik." });
  }
  if (String(password).trim() !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "Vale parool." });
  }
  res.json({ token: ADMIN_TOKEN });
}

module.exports = {
  availability,
  weeklyAvailability,
  listByDate,
  listUpcoming,
  create,
  remove,
  login,
};
