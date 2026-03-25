require('dotenv').config();
const mongoose = require('mongoose');
const Holiday  = require('../models/Holiday');

const now  = new Date();
const year = now.getFullYear();

const holidays = [

  // ── Global holidays ──────────────────────────────────────────
  {
    name:              'New Year\'s Day',
    date:              new Date(year, 0, 1),
    region:            'global',
    isRecurringYearly: true,
  },
  {
    name:              'International Workers Day',
    date:              new Date(year, 4, 1),
    region:            'global',
    isRecurringYearly: true,
  },
  {
    name:              'Christmas Day',
    date:              new Date(year, 11, 25),
    region:            'global',
    isRecurringYearly: true,
  },

  // ── Bangladesh national holidays ─────────────────────────────
  {
    name:              'International Mother Language Day',
    date:              new Date(year, 1, 21),
    region:            'BD',
    isRecurringYearly: true,
  },
  {
    name:              'Independence Day',
    date:              new Date(year, 2, 26),
    region:            'BD',
    isRecurringYearly: true,
  },
  {
    name:              'Bengali New Year (Pohela Boishakh)',
    date:              new Date(year, 3, 14),
    region:            'BD',
    isRecurringYearly: true,
  },
  {
    name:              'Victory Day',
    date:              new Date(year, 11, 16),
    region:            'BD',
    isRecurringYearly: true,
  },
  {
    name:              'Eid ul-Fitr',
    date:              new Date(year, 2, 31),
    region:            'BD',
    isRecurringYearly: false, // Islamic calendar shifts yearly
  },
  {
    name:              'Eid ul-Adha',
    date:              new Date(year, 5, 7),
    region:            'BD',
    isRecurringYearly: false,
  },

  // ── US holidays ───────────────────────────────────────────────
  {
    name:              'Independence Day',
    date:              new Date(year, 6, 4),
    region:            'US',
    isRecurringYearly: true,
  },
  {
    name:              'Thanksgiving Day',
    date:              new Date(year, 10, 27),
    region:            'US',
    isRecurringYearly: true,
  },
];

const seedHolidays = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for seeding...');

    await Holiday.deleteMany({});
    console.log('Cleared existing holidays');

    const inserted = await Holiday.insertMany(holidays);
    console.log(`Seeded ${inserted.length} holidays:`);
    inserted.forEach((h) =>
      console.log(`  - [${h.region}] ${h.name} — ${h.date.toDateString()}`)
    );

    mongoose.disconnect();
    console.log('Done. MongoDB disconnected.');

  } catch (error) {
    console.error('Seed error:', error.message);
    mongoose.disconnect();
    process.exit(1);
  }
};

seedHolidays();