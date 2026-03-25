const Event = require('../models/Event');

// GET /api/events
const getEvents = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    let filter = { userId: req.userId };

    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end   = new Date(year, month, 1);
      filter.startTime = { $gte: start, $lt: end };
    }

    const events = await Event.find(filter).sort({ startTime: 1 });
    res.status(200).json({ events });

  } catch (error) {
    next(error);
  }
};

// GET /api/events/:id
const getEventById = async (req, res, next) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, userId: req.userId });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.status(200).json({ event });

  } catch (error) {
    next(error);
  }
};

// POST /api/events
const createEvent = async (req, res, next) => {
  try {
    const { title, description, startTime, endTime, isAllDay, color } = req.body;

    const event = await Event.create({
      userId: req.userId,
      title,
      description,
      startTime,
      endTime,
      isAllDay,
      color,
    });

    res.status(201).json({
      message: 'Event created successfully',
      event,
    });

  } catch (error) {
    next(error);
  }
};

// PUT /api/events/:id
const updateEvent = async (req, res, next) => {
  try {
    const { title, description, startTime, endTime, isAllDay, color } = req.body;

    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { title, description, startTime, endTime, isAllDay, color },
      { new: true, runValidators: true }
    );

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.status(200).json({
      message: 'Event updated successfully',
      event,
    });

  } catch (error) {
    next(error);
  }
};

// DELETE /api/events/:id
const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.status(200).json({ message: 'Event deleted successfully' });

  } catch (error) {
    next(error);
  }
};

// PATCH /api/events/:id/complete
const toggleComplete = async (req, res, next) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, userId: req.userId });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    event.isCompleted = !event.isCompleted;
    await event.save();

    res.status(200).json({
      message: `Event marked as ${event.isCompleted ? 'completed' : 'incomplete'}`,
      event,
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  toggleComplete,
};