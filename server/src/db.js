const path = require("path");
const Database = require("better-sqlite3");

const dbFile = path.join(__dirname, "..", "data.db");
const db = new Database(dbFile);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL,
    staff_id INTEGER NOT NULL,
    customer_name TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (staff_id) REFERENCES staff(id)
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_staff_time
    ON bookings (staff_id, start_time);
`);

function seedIfEmpty() {
  const serviceCount = db.prepare("SELECT COUNT(*) as count FROM services").get();
  if (serviceCount.count === 0) {
    const insertService = db.prepare(
      "INSERT INTO services (name, duration_minutes) VALUES (?, ?)"
    );
    const services = [
      ["Meeste juukselõikus", 30],
      ["Naiste juukselõikus", 60],
      ["Laste juukselõikus", 30],
      ["Habeme piiramine", 15]
    ];
    const insertMany = db.transaction(() => {
      for (const service of services) {
        insertService.run(service[0], service[1]);
      }
    });
    insertMany();
  }

  const staffCount = db.prepare("SELECT COUNT(*) as count FROM staff").get();
  if (staffCount.count === 0) {
    const insertStaff = db.prepare("INSERT INTO staff (name) VALUES (?)");
    const staffMembers = ["Anu", "Mari"];
    const insertMany = db.transaction(() => {
      for (const name of staffMembers) {
        insertStaff.run(name);
      }
    });
    insertMany();
  }
}

seedIfEmpty();

function getServices() {
  return db.prepare("SELECT id, name, duration_minutes FROM services").all();
}

function getServiceById(id) {
  return db
    .prepare("SELECT id, name, duration_minutes FROM services WHERE id = ?")
    .get(id);
}

function getStaff() {
  return db.prepare("SELECT id, name FROM staff").all();
}

function getStaffById(id) {
  return db.prepare("SELECT id, name FROM staff WHERE id = ?").get(id);
}

function getBookingsForDate(date) {
  const start = `${date}T00:00:00`;
  const end = `${date}T23:59:59`;
  return db
    .prepare(
      "SELECT id, service_id, staff_id, customer_name, start_time, end_time FROM bookings WHERE start_time >= ? AND start_time <= ?"
    )
    .all(start, end);
}

function getBookingsForDateDetailed(date) {
  const start = `${date}T00:00:00`;
  const end = `${date}T23:59:59`;
  return db
    .prepare(
      `SELECT b.id, b.service_id, s.name as service_name, b.staff_id, st.name as staff_name,
        b.customer_name, b.start_time, b.end_time
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      JOIN staff st ON b.staff_id = st.id
      WHERE b.start_time >= ? AND b.start_time <= ?
      ORDER BY b.start_time`
    )
    .all(start, end);
}

function createBooking({ serviceId, staffId, customerName, startTime, endTime }) {
  const statement = db.prepare(
    "INSERT INTO bookings (service_id, staff_id, customer_name, start_time, end_time, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const result = statement.run(
    serviceId,
    staffId,
    customerName || null,
    startTime,
    endTime,
    new Date().toISOString()
  );
  return result.lastInsertRowid;
}

function deleteBooking(id) {
  const result = db.prepare("DELETE FROM bookings WHERE id = ?").run(id);
  return result.changes;
}

module.exports = {
  db,
  getServices,
  getServiceById,
  getStaff,
  getStaffById,
  getBookingsForDate,
  getBookingsForDateDetailed,
  createBooking,
  deleteBooking
};
