const dayjs = require("dayjs");
const isSameOrAfter = require("dayjs/plugin/isSameOrAfter");
const isSameOrBefore = require("dayjs/plugin/isSameOrBefore");

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const BUFFER_MINUTES = 15;
const MIN_ADVANCE_HOURS = 2;

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

function isWithinWorkingHours(startTime, durationMinutes, scheduleForDay) {
  if (!scheduleForDay) {
    return false;
  }
  const start = dayjs(startTime);
  const date = start.format("YYYY-MM-DD");
  const workStart = toDateTime(date, scheduleForDay.start_time);
  const workEnd = toDateTime(date, scheduleForDay.end_time);
  const end = start.add(durationMinutes, "minute");
  return start.isSameOrAfter(workStart) && end.isSameOrBefore(workEnd);
}

/**
 * Kontrollib konflikti koos 15-minutilise puhvriga.
 * slotStart/slotEnd on tegelik teenuse aeg.
 * Reserveeritakse: slotStart - BUFFER ... slotEnd + BUFFER
 */
function hasConflict(slotStart, slotEnd, bookings) {
  const bufferedStart = slotStart.subtract(BUFFER_MINUTES, "minute");
  const bufferedEnd = slotEnd.add(BUFFER_MINUTES, "minute");
  return bookings.some((booking) => {
    const bookingStart = dayjs(booking.start_time);
    const bookingEnd = dayjs(booking.end_time);
    // Puhvri tsoon: iga bookingu ümber on samuti puhver
    const bStart = bookingStart.subtract(BUFFER_MINUTES, "minute");
    const bEnd = bookingEnd.add(BUFFER_MINUTES, "minute");
    return bufferedStart.isBefore(bEnd) && bufferedEnd.isAfter(bStart);
  });
}

/**
 * Ehita vabad slotid arvestades iga juuksuri personaalset graafikut.
 * staffSchedules = Map<staffId, { start_time, end_time } | null>
 */
function buildAvailableSlots(
  date,
  durationMinutes,
  staffList,
  bookings,
  staffSchedules,
) {
  const slots = [];
  const bookingsByStaff = new Map();

  for (const booking of bookings) {
    if (!bookingsByStaff.has(booking.staff_id)) {
      bookingsByStaff.set(booking.staff_id, []);
    }
    bookingsByStaff.get(booking.staff_id).push(booking);
  }

  for (const staff of staffList) {
    const schedule = staffSchedules
      ? staffSchedules.get(staff.id)
      : null;

    if (!schedule) {
      // Juuksuril pole sel päeval tööaega
      continue;
    }

    const workStart = toDateTime(date, schedule.start_time);
    const workEnd = toDateTime(date, schedule.end_time);
    const staffBookings = bookingsByStaff.get(staff.id) || [];
    let cursor = workStart;
    const latestStart = workEnd.subtract(durationMinutes, "minute");
    const earliest = dayjs().add(MIN_ADVANCE_HOURS, "hour");

    while (cursor.isSameOrBefore(latestStart)) {
      const slotStart = cursor;
      const slotEnd = cursor.add(durationMinutes, "minute");
      if (slotStart.isSameOrAfter(earliest) && !hasConflict(slotStart, slotEnd, staffBookings)) {
        slots.push({
          staffId: staff.id,
          staffName: staff.name,
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
        });
      }
      cursor = cursor.add(15, "minute");
    }
  }

  return slots;
}

module.exports = {
  BUFFER_MINUTES,
  isQuarterHour,
  isWithinWorkingHours,
  buildAvailableSlots,
  hasConflict,
};
