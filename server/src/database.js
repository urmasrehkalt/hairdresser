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

  CREATE TABLE IF NOT EXISTS staff_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    UNIQUE(staff_id, day_of_week)
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

  // Seedi vaikimisi töögraafik (E–R 09:00–18:00) neile, kellel seda pole
  const staffWithoutSchedule = db
    .prepare(
      `SELECT s.id FROM staff s
       WHERE NOT EXISTS (SELECT 1 FROM staff_schedule ss WHERE ss.staff_id = s.id)`
    )
    .all();

  if (staffWithoutSchedule.length > 0) {
    const insertSchedule = db.prepare(
      "INSERT OR IGNORE INTO staff_schedule (staff_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)"
    );
    const seedSchedule = db.transaction(() => {
      for (const staff of staffWithoutSchedule) {
        // Päevad 1–5 (E–R)
        for (let day = 1; day <= 5; day++) {
          insertSchedule.run(staff.id, day, "09:00", "18:00");
        }
      }
    });
    seedSchedule();
  }

  // Demo broneeringud (ainult kui tabel on tühi)
  const bookingCount = db
    .prepare("SELECT COUNT(*) as count FROM bookings")
    .get();
  if (bookingCount.count === 0) {
    const names = [
      ["Kati Tamm", "+372 5551234"],
      ["Jaan Kask", "+372 5559876"],
      ["Liis Mets", "+372 5553456"],
      ["Peeter Puu", "+372 5557890"],
      ["Anna Lepp", "+372 5554321"],
      ["Mart Kuusk", "+372 5556789"],
      ["Kadri Saar", "+372 5552345"],
      ["Toomas Rebane", "+372 5558765"],
      ["Maria Põld", "+372 5551111"],
      ["Erik Valk", "+372 5552222"],
      ["Piret Nurm", "+372 5553333"],
      ["Rein Kosk", "+372 5554444"],
      ["Laura Järv", "+372 5555555"],
      ["Andres Rand", "+372 5556666"],
      ["Tiina Mägi", "+372 5557777"],
    ];
    const svcDurations = [30, 60, 30, 15]; // teenuste kestvused
    const times = [
      "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
      "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
      "15:00", "15:30", "16:00", "16:30", "17:00",
    ];

    const insertBooking = db.prepare(
      `INSERT INTO bookings (service_id, staff_id, customer_name, customer_phone, start_time, end_time, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    // Lihtne pseudo-random (deterministlik, et iga seed annaks sama tulemuse)
    let seed = 42;
    function rand(max) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % max;
    }

    const seedBookings = db.transaction(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let nameIdx = 0;

      for (let i = 1; i <= 14; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        const dow = d.getDay();
        if (dow === 0 || dow === 6) continue; // ainult tööpäevad

        const dateStr = d.toISOString().slice(0, 10);
        const numBookings = 2 + rand(3); // 2–4 broneeringut päevas
        const usedSlots = new Set();

        for (let j = 0; j < numBookings; j++) {
          let timeIdx;
          let attempts = 0;
          do {
            timeIdx = rand(times.length);
            attempts++;
          } while (usedSlots.has(timeIdx) && attempts < 20);
          if (usedSlots.has(timeIdx)) continue;
          usedSlots.add(timeIdx);

          const svcId = 1 + rand(4);
          const staffId = 1 + rand(2);
          const duration = svcDurations[svcId - 1];
          const [name, phone] = names[nameIdx % names.length];
          nameIdx++;

          const startISO = `${dateStr}T${times[timeIdx]}:00.000Z`;
          const endDate = new Date(startISO);
          endDate.setMinutes(endDate.getMinutes() + duration);
          const endISO = endDate.toISOString();

          insertBooking.run(
            svcId, staffId, name, phone,
            startISO, endISO, new Date().toISOString(),
          );
        }
      }
    });
    seedBookings();
  }
}

seedIfEmpty();

module.exports = db;
