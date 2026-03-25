require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('../models/User');
const Event    = require('../models/Event');
const Reminder = require('../models/Reminder');

const seedReminders = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for seeding...');

    await Reminder.deleteMany({});
    console.log('Cleared existing reminders');

    const users = await User.find({});
    if (users.length === 0) {
      console.log('No users found. Run seedUsers.js first.');
      mongoose.disconnect();
      return;
    }

    const reminders = [];

    // For each user, create reminders for their events
    for (const user of users) {
      const events = await Event.find({ userId: user._id });

      for (const event of events) {
        // Skip completed events
        if (event.isCompleted) continue;

        // Calculate trigger time
        const minutesBefore = 30;
        const nextTriggerAt = new Date(event.startTime);
        nextTriggerAt.setMinutes(nextTriggerAt.getMinutes() - minutesBefore);

        reminders.push({
          userId:        user._id,
          eventId:       event._id,
          minutesBefore,
          priority:      event.color === '#EF4444' ? 'high' : 'medium',
          repeatPattern: 'none',
          nextTriggerAt,
          isActive:      nextTriggerAt > new Date(), // only active if in future
        });
      }
    }

    // Add one repeating reminder for Bob's team meeting
    const bob        = users[1];
    const bobEvents  = await Event.find({ userId: bob._id });
    const teamMeeting = bobEvents.find((e) => e.title === 'Team Meeting');

    if (teamMeeting) {
      const nextTriggerAt = new Date(teamMeeting.startTime);
      nextTriggerAt.setMinutes(nextTriggerAt.getMinutes() - 60);

      reminders.push({
        userId:        bob._id,
        eventId:       teamMeeting._id,
        minutesBefore: 60,
        priority:      'high',
        repeatPattern: 'weekly',
        nextTriggerAt,
        isActive:      true,
      });
    }

    const inserted = await Reminder.insertMany(reminders);
    console.log(`Seeded ${inserted.length} reminders`);
    inserted.forEach((r) =>
      console.log(`  - ${r.priority} priority | triggers: ${r.nextTriggerAt}`)
    );

    mongoose.disconnect();
    console.log('Done. MongoDB disconnected.');

  } catch (error) {
    console.error('Seed error:', error.message);
    mongoose.disconnect();
    process.exit(1);
  }
};

seedReminders();