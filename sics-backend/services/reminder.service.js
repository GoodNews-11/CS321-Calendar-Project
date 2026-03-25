const cron = require('node-cron');
const Reminder = require('../models/Reminder');
const Event    = require('../models/Event');

const scheduledJobs = {};  // Store active cron jobs in memory

// Schedule a single reminder job
const scheduleReminderJob = (reminder) => {
  const reminderId = reminder._id.toString();

  // Cancel existing job if already scheduled
  if (scheduledJobs[reminderId]) {
    scheduledJobs[reminderId].stop();
    delete scheduledJobs[reminderId];
  }

  if (!reminder.nextTriggerAt || !reminder.isActive) return;

  const triggerTime = new Date(reminder.nextTriggerAt);
  const now = new Date();

  if (triggerTime <= now) return; // Already passed

  // Calculate delay in ms
  const delay = triggerTime - now;

  const timeout = setTimeout(async () => {
    console.log(`Reminder triggered: ${reminderId}`);

    // If repeating, calculate next trigger
    if (reminder.repeatPattern !== 'none') {
      let nextTime = new Date(reminder.nextTriggerAt);

      if (reminder.repeatPattern === 'daily')  nextTime.setDate(nextTime.getDate() + 1);
      if (reminder.repeatPattern === 'weekly') nextTime.setDate(nextTime.getDate() + 7);

      await Reminder.findByIdAndUpdate(reminderId, { nextTriggerAt: nextTime });
    } else {
      await Reminder.findByIdAndUpdate(reminderId, { isActive: false });
    }

    delete scheduledJobs[reminderId];

  }, delay);

  scheduledJobs[reminderId] = { stop: () => clearTimeout(timeout) };
};

// Load all active reminders from DB and schedule them
const loadAndScheduleAll = async () => {
  try {
    const reminders = await Reminder.find({
      isActive: true,
      nextTriggerAt: { $gte: new Date() },
    });

    reminders.forEach(scheduleReminderJob);
    console.log(`Scheduled ${reminders.length} reminders`);

  } catch (error) {
    console.error('Failed to load reminders:', error.message);
  }
};

// Cancel a specific reminder job
const cancelReminderJob = (reminderId) => {
  const id = reminderId.toString();
  if (scheduledJobs[id]) {
    scheduledJobs[id].stop();
    delete scheduledJobs[id];
  }
};

module.exports = {
  scheduleReminderJob,
  loadAndScheduleAll,
  cancelReminderJob,
};