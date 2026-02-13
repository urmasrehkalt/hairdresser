const db = require("../database");
const dayjs = require("dayjs");
const { hasConflict } = require("../services/scheduling");

function getForDate(date) {
  const start = `${date}T00:00:00`;
  const end = `${date}T23:59:59`;
  return db
    .prepare(
      `SELECT id, service_id, staff_id, customer_name, customer_phone,
        start_time, end_time
      FROM bookings
      WHERE start_time >= ? AND start_time <= ?`
    )
    .all(start, end);
}

function getForDateDetailed(date) {
  const start = `${date}T00:00:00`;
  const end = `${date}T23:59:59`;
  return db
    .prepare(
      `SELECT b.id, b.service_id, s.name AS service_name,
        b.staff_id, st.name AS staff_name,
        b.customer_name, b.customer_phone,
        b.start_time, b.end_time
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      JOIN staff st ON b.staff_id = st.id
      WHERE b.start_time >= ? AND b.start_time <= ?
      ORDER BY b.start_time`
    )
    .all(start, end);
}

/**
 * Loob broneeringu transaktsioonina, et vältida samaaegseid topeltbroneeringuid.
 * Kontrollib konflikti uuesti transaktsioonisiseselt.
 */
const createBookingSafe = db.transaction(
  ({ serviceId, staffId, customerName, customerPhone, startTime, endTime }) => {
    const date = dayjs(startTime).format("YYYY-MM-DD");
    const dateStart = `${date}T00:00:00`;
    const dateEnd = `${date}T23:59:59`;

    const existing = db
      .prepare(
        `SELECT id, start_time, end_time FROM bookings
        WHERE staff_id = ? AND start_time >= ? AND start_time <= ?`
      )
      .all(staffId, dateStart, dateEnd);

    const slotStart = dayjs(startTime);
    const slotEnd = dayjs(endTime);

    if (hasConflict(slotStart, slotEnd, existing)) {
      return { conflict: true };
    }

    const result = db
      .prepare(
        `INSERT INTO bookings
          (service_id, staff_id, customer_name, customer_phone,
           start_time, end_time, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        serviceId,
        staffId,
        customerName,
        customerPhone,
        startTime,
        endTime,
        new Date().toISOString()
      );

    return { conflict: false, id: result.lastInsertRowid };
  }
);

function deleteById(id) {
  const result = db.prepare("DELETE FROM bookings WHERE id = ?").run(id);
  return result.changes;
}

module.exports = { getForDate, getForDateDetailed, createBookingSafe, deleteById };
