const staffModel = require("../models/staffModel");

function list(req, res) {
  res.json(staffModel.getAll());
}

function create(req, res) {
  const { name } = req.body;
  if (!name || String(name).trim().length < 2) {
    return res
      .status(400)
      .json({ error: "Nimi peab olema vähemalt 2 tähemärki." });
  }
  const safeName = String(name).trim().slice(0, 100);
  const staff = staffModel.create(safeName);
  res.status(201).json(staff);
}

function remove(req, res) {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Vale id." });
  }
  const changes = staffModel.deleteById(id);
  if (changes === 0) {
    return res.status(404).json({ error: "Juuksurit ei leitud." });
  }
  res.status(204).end();
}

function getSchedule(req, res) {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Vale id." });
  }
  const staff = staffModel.getById(id);
  if (!staff) {
    return res.status(404).json({ error: "Juuksurit ei leitud." });
  }
  const schedule = staffModel.getSchedule(id);
  res.json({
    staffId: staff.id,
    staffName: staff.name,
    schedule,
  });
}

function updateSchedule(req, res) {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Vale id." });
  }
  const staff = staffModel.getById(id);
  if (!staff) {
    return res.status(404).json({ error: "Juuksurit ei leitud." });
  }
  const { days } = req.body;
  if (!Array.isArray(days)) {
    return res.status(400).json({ error: "days peab olema massiiv." });
  }

  // Valideeri iga päev
  const validDays = [];
  for (const d of days) {
    const dow = Number(d.day_of_week);
    if (dow < 0 || dow > 6) continue;
    const startTime = String(d.start_time || "").trim();
    const endTime = String(d.end_time || "").trim();
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      continue;
    }
    if (startTime >= endTime) continue;
    validDays.push({ day_of_week: dow, start_time: startTime, end_time: endTime });
  }

  staffModel.setSchedule(id, validDays);
  const updated = staffModel.getSchedule(id);
  res.json({ staffId: id, schedule: updated });
}

module.exports = { list, create, remove, getSchedule, updateSchedule };
