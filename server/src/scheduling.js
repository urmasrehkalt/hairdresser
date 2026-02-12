const dayjs = require("dayjs");
const isSameOrAfter = require("dayjs/plugin/isSameOrAfter");
const isSameOrBefore = require("dayjs/plugin/isSameOrBefore");

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const WORK_START = "09:00";
const WORK_END = "18:00";

function toDateTime(date, time) {
  return dayjs(`${date}T${time}`);
}

function isQuarterHour(iso) {
  const value = dayjs(iso);
  return (
    value.minute() % 15 === 0 &&
    value.second() === 0 &&
    value.millisecond() === 0
  );
}

function isWithinWorkingHours(startTime, durationMinutes) {
  const start = dayjs(startTime);
  const date = start.format("YYYY-MM-DD");
  const workStart = toDateTime(date, WORK_START);
  const workEnd = toDateTime(date, WORK_END);
  const end = start.add(durationMinutes, "minute");
  return start.isSameOrAfter(workStart) && end.isSameOrBefore(workEnd);
}

function hasConflict(slotStart, slotEnd, bookings) {
  return bookings.some((booking) => {
    const bookingStart = dayjs(booking.start_time);
    const bookingEnd = dayjs(booking.end_time);
    return slotStart.isBefore(bookingEnd) && slotEnd.isAfter(bookingStart);
  });
}

function buildAvailableSlots(date, durationMinutes, staffList, bookings) {
  const workStart = toDateTime(date, WORK_START);
  const workEnd = toDateTime(date, WORK_END);
  const slots = [];
  const bookingsByStaff = new Map();

  for (const booking of bookings) {
    if (!bookingsByStaff.has(booking.staff_id)) {
      bookingsByStaff.set(booking.staff_id, []);
    }
    bookingsByStaff.get(booking.staff_id).push(booking);
  }

  for (const staff of staffList) {
    const staffBookings = bookingsByStaff.get(staff.id) || [];
    let cursor = workStart;
    const latestStart = workEnd.subtract(durationMinutes, "minute");

    while (cursor.isSameOrBefore(latestStart)) {
      const slotStart = cursor;
      const slotEnd = cursor.add(durationMinutes, "minute");
      if (!hasConflict(slotStart, slotEnd, staffBookings)) {
        slots.push({
          staffId: staff.id,
          staffName: staff.name,
          start: slotStart.toISOString(),
          end: slotEnd.toISOString()
        });
      }
      cursor = cursor.add(15, "minute");
    }
  }

  return slots;
}

module.exports = {
  WORK_START,
  WORK_END,
  isQuarterHour,
  isWithinWorkingHours,
  buildAvailableSlots,
  hasConflict
};
