const express = require("express");
const serviceController = require("../controllers/serviceController");
const staffController = require("../controllers/staffController");
const bookingController = require("../controllers/bookingController");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Avalikud marsruudid
router.get("/services", serviceController.list);
router.get("/staff", staffController.list);
router.get("/availability", bookingController.availability);
router.get("/availability/week", bookingController.weeklyAvailability);
router.post("/bookings", bookingController.create);

// Admin sisselogimine
router.post("/admin/login", bookingController.login);

// Admin broneeringud
router.get("/admin/bookings", requireAdmin, bookingController.listByDate);
router.get("/admin/bookings/upcoming", requireAdmin, bookingController.listUpcoming);
router.delete("/admin/bookings/:id", requireAdmin, bookingController.remove);

// Admin juuksurite haldus
router.post("/admin/staff", requireAdmin, staffController.create);
router.delete("/admin/staff/:id", requireAdmin, staffController.remove);

// Admin graafiku haldus
router.get("/admin/staff/:id/schedule", requireAdmin, staffController.getSchedule);
router.put("/admin/staff/:id/schedule", requireAdmin, staffController.updateSchedule);

module.exports = router;
