const express = require("express");
const router = express.Router();
const {
  getEvents,
  createEvent,
  updateEvent,
  toggleEvent,
  deleteEvent,
} = require("../controllers/eventController");

router.get("/", getEvents);
router.post("/", createEvent);
router.put("/:id", updateEvent);
router.patch("/:id/toggle", toggleEvent);
router.delete("/:id", deleteEvent);

module.exports = router;