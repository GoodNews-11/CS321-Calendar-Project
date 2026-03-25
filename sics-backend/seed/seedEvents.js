require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('../models/User');
const Event    = require('../models/Event');

const seedEvents = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for seeding...');

    // Clear existing events
    await Event.deleteMany({});
    console.log('Cleared existing events');

    // Get all users
    const users = await User.find({});
    if (users.length === 0) {
      console.log('No users found. Run seedUsers.js first.');
      mongoose.disconnect();
      return;
    }

    const alice = users[0]._id;
    const bob   = users[1]._id;
    const carol = users[2]._id;

    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    // Helper to build a date in current month
    const d = (day, hour = 9, min = 0) =>
      new Date(year, month, day, hour, min);

    const events = [

      // ── Alice's events ──────────────────────────────────────────
      {
        userId:      alice,
        title:       'Math Exam',
        description: 'Chapter 1 to 5 — bring calculator',
        startTime:   d(5, 9, 0),
        endTime:     d(5, 11, 0),
        color:       '#EF4444',
        isCompleted: false,
      },
      {
        userId:      alice,
        title:       'Physics Lab',
        description: 'Optics experiment',
        startTime:   d(8, 13, 0),
        endTime:     d(8, 15, 0),
        color:       '#3B82F6',
        isCompleted: false,
      },
      {
        userId:      alice,
        title:       'Group Study Session',
        description: 'Library Room 204',
        startTime:   d(12, 15, 0),
        endTime:     d(12, 18, 0),
        color:       '#8B5CF6',
        isCompleted: true,
      },
      {
        userId:      alice,
        title:       'Submit Assignment',
        description: 'Data structures assignment upload on portal',
        startTime:   d(15, 23, 59),
        endTime:     d(15, 23, 59),
        color:       '#F59E0B',
        isCompleted: false,
        isAllDay:    false,
      },
      {
        userId:      alice,
        title:       'Doctor Appointment',
        description: 'General checkup at Square Hospital',
        startTime:   d(18, 10, 30),
        endTime:     d(18, 11, 30),
        color:       '#10B981',
        isCompleted: false,
      },
      {
        userId:      alice,
        title:       'Final Project Presentation',
        description: 'Software Engineering final demo',
        startTime:   d(25, 10, 0),
        endTime:     d(25, 12, 0),
        color:       '#EF4444',
        isCompleted: false,
      },

      // ── Bob's events ─────────────────────────────────────────────
      {
        userId:      bob,
        title:       'Team Meeting',
        description: 'Weekly sprint planning',
        startTime:   d(3, 10, 0),
        endTime:     d(3, 11, 0),
        color:       '#3B82F6',
        isCompleted: true,
      },
      {
        userId:      bob,
        title:       'Client Call',
        description: 'Product demo for new client',
        startTime:   d(10, 14, 0),
        endTime:     d(10, 15, 0),
        color:       '#F59E0B',
        isCompleted: false,
      },
      {
        userId:      bob,
        title:       'Code Review',
        description: 'Review pull requests for auth module',
        startTime:   d(14, 11, 0),
        endTime:     d(14, 12, 0),
        color:       '#8B5CF6',
        isCompleted: false,
      },
      {
        userId:      bob,
        title:       'Deadline — API Integration',
        description: 'Complete weather API integration',
        startTime:   d(20, 23, 59),
        endTime:     d(20, 23, 59),
        color:       '#EF4444',
        isCompleted: false,
      },

      // ── Carol's events ───────────────────────────────────────────
      {
        userId:      carol,
        title:       'Yoga Class',
        description: 'Morning yoga at community center',
        startTime:   d(2, 7, 0),
        endTime:     d(2, 8, 0),
        color:       '#10B981',
        isCompleted: true,
      },
      {
        userId:      carol,
        title:       'Birthday Party',
        description: "Sara's birthday at Gulshan 2",
        startTime:   d(9, 18, 0),
        endTime:     d(9, 21, 0),
        color:       '#EC4899',
        isCompleted: false,
      },
      {
        userId:      carol,
        title:       'Grocery Shopping',
        description: 'Weekly groceries from Shwapno',
        startTime:   d(13, 11, 0),
        endTime:     d(13, 12, 0),
        color:       '#F59E0B',
        isCompleted: true,
      },
      {
        userId:      carol,
        title:       'Online Course — React',
        description: 'Udemy React complete course — Section 12',
        startTime:   d(22, 20, 0),
        endTime:     d(22, 22, 0),
        color:       '#3B82F6',
        isCompleted: false,
      },
    ];

    const inserted = await Event.insertMany(events);
    console.log(`Seeded ${inserted.length} events:`);
    inserted.forEach((e) => console.log(`  - ${e.title}`));

    mongoose.disconnect();
    console.log('Done. MongoDB disconnected.');

  } catch (error) {
    console.error('Seed error:', error.message);
    mongoose.disconnect();
    process.exit(1);
  }
};

seedEvents();