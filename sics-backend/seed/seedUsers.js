require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User');

const users = [
  {
    name:     'Alice Rahman',
    email:    'alice@gmail.com',
    password: '123456',
    location: { lat: 23.8103, lon: 90.4125, city: 'Dhaka' },
    theme:    'light',
  },
  {
    name:     'Bob Hasan',
    email:    'bob@gmail.com',
    password: '123456',
    location: { lat: 23.7104, lon: 90.4074, city: 'Dhaka' },
    theme:    'dark',
  },
  {
    name:     'Carol Islam',
    email:    'carol@gmail.com',
    password: '123456',
    location: { lat: 22.3569, lon: 91.7832, city: 'Chittagong' },
    theme:    'light',
  },
];

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for seeding...');

    // Clear existing users
    await User.deleteMany({});
    console.log('Cleared existing users');

    // Hash passwords and insert
    const hashedUsers = await Promise.all(
      users.map(async (user) => {
        const salt     = await bcrypt.genSalt(10);
        const password = await bcrypt.hash(user.password, salt);
        return { ...user, password };
      })
    );

    const inserted = await User.insertMany(hashedUsers);
    console.log(`Seeded ${inserted.length} users:`);
    inserted.forEach((u) => console.log(`  - ${u.name} (${u.email})`));

    mongoose.disconnect();
    console.log('Done. MongoDB disconnected.');

  } catch (error) {
    console.error('Seed error:', error.message);
    mongoose.disconnect();
    process.exit(1);
  }
};

seedUsers();