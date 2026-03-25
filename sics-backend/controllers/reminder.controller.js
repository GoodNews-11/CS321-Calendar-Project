const Reminder = require('../models/Reminder');
const Event    = require('../models/Event');
const {
  scheduleReminderJob,
  cancelReminderJob,
} = require('../services/reminder.service');

// Helper: calculate first trigger time
const calcNextTrigger = (eventStartTime, minutesBefore) => {
  const trigger = new Date(eventStartTime);
  trigger.setMinutes(trigger.getMinutes() - minutesBefore);
  return trigger;
};

// GET /api/reminders
const getReminders = async (req, res, next) => {
  try {
    const reminders = await Reminder.find({ userId: req.userId })
      .populate('eventId', 'title startTime')
      .sort({ nextTriggerAt: 1 });

    res.status(200).json({ reminders });

  } catch (error) {
    next(error);
  }
};

// GET /api/reminders/:id
const getReminderById = async (req, res, next) => {
  try {
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      userId: req.userId,
    }).populate('eventId', 'title startTime');

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    res.status(200).json({ reminder });

  } catch (error) {
    next(error);
  }
};

// POST /api/reminders
const createReminder = async (req, res, next) => {
  try {
    const { eventId, minutesBefore, priority, repeatPattern, customCron } = req.body;

    // Verify event belongs to user
    const event = await Event.findOne({ _id: eventId, userId: req.userId });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const nextTriggerAt = calcNextTrigger(event.startTime, minutesBefore || 15);

    const reminder = await Reminder.create({
      userId: req.userId,
      eventId,
      minutesBefore: minutesBefore || 15,
      priority:      priority      || 'medium',
      repeatPattern: repeatPattern || 'none',
      customCron:    customCron    || null,
      nextTriggerAt,
    });

    // Schedule the job immediately
    scheduleReminderJob(reminder);

    res.status(201).json({
      message: 'Reminder created successfully',
      reminder,
    });

  } catch (error) {
    next(error);
  }
};

// PUT /api/reminders/:id
const updateReminder = async (req, res, next) => {
  try {
    const { minutesBefore, priority, repeatPattern, customCron, isActive } = req.body;

    const reminder = await Reminder.findOne({
      _id: req.params.id,
      userId: req.userId,
    }).populate('eventId');

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    // Recalculate trigger if minutesBefore changed
    if (minutesBefore !== undefined) {
      reminder.nextTriggerAt = calcNextTrigger(
        reminder.eventId.startTime,
        minutesBefore
      );
      reminder.minutesBefore = minutesBefore;
    }

    if (priority      !== undefined) reminder.priority      = priority;
    if (repeatPattern !== undefined) reminder.repeatPattern = repeatPattern;
    if (customCron    !== undefined) reminder.customCron    = customCron;
    if (isActive      !== undefined) reminder.isActive      = isActive;

    await reminder.save();

    // Re-schedule with updated values
    scheduleReminderJob(reminder);

    res.status(200).json({
      message: 'Reminder updated successfully',
      reminder,
    });

  } catch (error) {
    next(error);
  }
};

// DELETE /api/reminders/:id
const deleteReminder = async (req, res, next) => {
  try {
    const reminder = await Reminder.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    // Cancel scheduled job
    cancelReminderJob(reminder._id);

    res.status(200).json({ message: 'Reminder deleted successfully' });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReminders,
  getReminderById,
  createReminder,
  updateReminder,
  deleteReminder,
};