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

const api = {
  services: () => fetch(`${API_BASE}/services`).then((res) => res.json()),

  staff: () => fetch(`${API_BASE}/staff`).then((res) => res.json()),

  availability: (date, serviceId) =>
    fetch(
      `${API_BASE}/availability?date=${date}&serviceId=${serviceId}`
    ).then((res) => res.json()),

  createBooking: (payload) =>
    fetch(`${API_BASE}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Broneerimine ebaõnnestus.");
      }
      return data;
    }),

  // Admin – kaitstud päringud
  adminBookings: (date) =>
    fetch(`${API_BASE}/admin/bookings?date=${date}`, {
      headers: adminHeaders(),
    }).then(async (res) => {
      if (res.status === 401 || res.status === 403) {
        throw new Error("AUTH");
      }
      return res.json();
    }),

  adminDeleteBooking: (id) =>
    fetch(`${API_BASE}/admin/bookings/${id}`, {
      method: "DELETE",
      headers: adminHeaders(),
    }).then((res) => {
      if (res.status === 401 || res.status === 403) {
        throw new Error("AUTH");
      }
      if (!res.ok && res.status !== 204) {
        throw new Error("Tühistamine ebaõnnestus.");
      }
    }),
};

export default api;
