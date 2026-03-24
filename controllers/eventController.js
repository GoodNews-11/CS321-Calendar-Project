const Event = require("../models/Event");
 
// GET /api/events?date=2026-03-23   (optional filter by date)
const getEvents = async (req, res) => {
  try {
    const filter = {};
    if (req.query.date) filter.date = req.query.date;
 
    const events = await Event.find(filter).sort({ createdAt: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
 
// POST /api/events
const createEvent = async (req, res) => {
  try {
    const { date, text, color } = req.body;
 
    if (!date || !text) {
      return res.status(400).json({ error: "Date and text are required" });
    }
 
    const event = await Event.create({ date, text, color });
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
 
// PUT /api/events/:id
const updateEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // return the updated document
    });
 
    if (!event) return res.status(404).json({ error: "Event not found" });
 
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
 
// PATCH /api/events/:id/toggle   (toggle done status)
const toggleEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
 
    event.done = !event.done;
    await event.save();
 
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
 
// DELETE /api/events/:id
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
 
    res.json({ message: "Event deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
 
module.exports = { getEvents, createEvent, updateEvent, toggleEvent, deleteEvent };