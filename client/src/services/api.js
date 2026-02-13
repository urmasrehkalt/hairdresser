const API_BASE = "/api";

function getAdminToken() {
  return localStorage.getItem("adminToken") || "";
}

function adminHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getAdminToken()}`,
  };
}

function handleAuth(res) {
  if (res.status === 401 || res.status === 403) {
    throw new Error("AUTH");
  }
}

const api = {
  services: () => fetch(`${API_BASE}/services`).then((r) => r.json()),

  staff: () => fetch(`${API_BASE}/staff`).then((r) => r.json()),

  availability: (date, serviceId) =>
    fetch(`${API_BASE}/availability?date=${date}&serviceId=${serviceId}`).then(
      (r) => r.json(),
    ),

  weeklyAvailability: (serviceId, offset = 0) =>
    fetch(`${API_BASE}/availability/week?serviceId=${serviceId}&days=8&offset=${offset}`).then((r) =>
      r.json(),
    ),

  createBooking: (payload) =>
    fetch(`${API_BASE}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Broneerimine ebaõnnestus.");
      return data;
    }),

  // Admin – sisselogimine
  login: (password) =>
    fetch(`${API_BASE}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Sisselogimine ebaõnnestus.");
      localStorage.setItem("adminToken", data.token);
      return data;
    }),

  logout: () => localStorage.removeItem("adminToken"),
  isLoggedIn: () => Boolean(localStorage.getItem("adminToken")),

  // Admin broneeringud
  adminBookings: (date) =>
    fetch(`${API_BASE}/admin/bookings?date=${date}`, {
      headers: adminHeaders(),
    }).then((res) => {
      handleAuth(res);
      return res.json();
    }),

  adminUpcomingBookings: () =>
    fetch(`${API_BASE}/admin/bookings/upcoming`, {
      headers: adminHeaders(),
    }).then((res) => {
      handleAuth(res);
      return res.json();
    }),

  adminDeleteBooking: (id) =>
    fetch(`${API_BASE}/admin/bookings/${id}`, {
      method: "DELETE",
      headers: adminHeaders(),
    }).then((res) => {
      handleAuth(res);
      if (!res.ok && res.status !== 204)
        throw new Error("Tühistamine ebaõnnestus.");
    }),

  // Admin juuksurid
  adminCreateStaff: (name) =>
    fetch(`${API_BASE}/admin/staff`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ name }),
    }).then(async (res) => {
      handleAuth(res);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Lisamine ebaõnnestus.");
      return data;
    }),

  adminDeleteStaff: (id) =>
    fetch(`${API_BASE}/admin/staff/${id}`, {
      method: "DELETE",
      headers: adminHeaders(),
    }).then((res) => {
      handleAuth(res);
      if (!res.ok && res.status !== 204)
        throw new Error("Kustutamine ebaõnnestus.");
    }),

  // Admin graafik
  adminGetSchedule: (staffId) =>
    fetch(`${API_BASE}/admin/staff/${staffId}/schedule`, {
      headers: adminHeaders(),
    }).then((res) => {
      handleAuth(res);
      return res.json();
    }),

  adminUpdateSchedule: (staffId, days) =>
    fetch(`${API_BASE}/admin/staff/${staffId}/schedule`, {
      method: "PUT",
      headers: adminHeaders(),
      body: JSON.stringify({ days }),
    }).then(async (res) => {
      handleAuth(res);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Salvestamine ebaõnnestus.");
      return data;
    }),
};

export default api;
