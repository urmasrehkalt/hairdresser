const db = require("../database");

function getAll() {
  return db.prepare("SELECT id, name FROM staff").all();
}

function getById(id) {
  return db.prepare("SELECT id, name FROM staff WHERE id = ?").get(id);
}

function create(name) {
  const result = db.prepare("INSERT INTO staff (name) VALUES (?)").run(name);
  const staffId = result.lastInsertRowid;
  // Lisa vaikimisi töögraafik (E–R 09:00–18:00)
  const insertSchedule = db.prepare(
    "INSERT INTO staff_schedule (staff_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)"
  );
  const seedSchedule = db.transaction(() => {
    for (let day = 1; day <= 5; day++) {
      insertSchedule.run(staffId, day, "09:00", "18:00");
    }
  });
  seedSchedule();
  return { id: staffId, name };
}

function deleteById(id) {
  const result = db.prepare("DELETE FROM staff WHERE id = ?").run(id);
  // staff_schedule kustutatakse CASCADE-ga
  return result.changes;
}

// ── Graafik ──

function getSchedule(staffId) {
  return db
    .prepare(
      "SELECT id, day_of_week, start_time, end_time FROM staff_schedule WHERE staff_id = ? ORDER BY day_of_week"
    )
    .all(staffId);
}

function getScheduleForDay(staffId, dayOfWeek) {
  return db
    .prepare(
      "SELECT start_time, end_time FROM staff_schedule WHERE staff_id = ? AND day_of_week = ?"
    )
    .get(staffId, dayOfWeek);
}

function setSchedule(staffId, days) {
  // days = [{ day_of_week, start_time, end_time }]  – ainult tööpäevad
  const del = db.prepare(
    "DELETE FROM staff_schedule WHERE staff_id = ?"
  );
  const ins = db.prepare(
    "INSERT INTO staff_schedule (staff_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)"
  );
  const tx = db.transaction(() => {
    del.run(staffId);
    for (const d of days) {
      ins.run(staffId, d.day_of_week, d.start_time, d.end_time);
    }
  });
  tx();
}

module.exports = {
  getAll,
  getById,
  create,
  deleteById,
  getSchedule,
  getScheduleForDay,
  setSchedule,
};
