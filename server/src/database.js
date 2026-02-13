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
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
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
  const serviceCount = db
    .prepare("SELECT COUNT(*) as count FROM services")
    .get();
  if (serviceCount.count === 0) {
    const insertService = db.prepare(
      "INSERT INTO services (name, duration_minutes) VALUES (?, ?)"
    );
    const services = [
      ["Meeste juukselõikus", 30],
      ["Naiste juukselõikus", 60],
      ["Laste juukselõikus", 30],
      ["Habeme piiramine", 15],
    ];
    const insertMany = db.transaction(() => {
      for (const service of services) {
        insertService.run(service[0], service[1]);
      }
    });
    insertMany();
  }

  const staffCount = db
    .prepare("SELECT COUNT(*) as count FROM staff")
    .get();
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

module.exports = db;
