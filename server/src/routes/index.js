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
router.post("/bookings", bookingController.create);

// Admin marsruudid – kaitstud tokeniga
router.get("/admin/bookings", requireAdmin, bookingController.listByDate);
router.delete("/admin/bookings/:id", requireAdmin, bookingController.remove);

module.exports = router;
