require('dotenv').config();
const mongoose     = require('mongoose');
const WeatherCache = require('../models/WeatherCache');
const axios        = require('axios');

const { OPENWEATHER_API_KEY } = process.env;

// Locations to pre-cache
const locations = [
  { lat: 23.81, lon: 90.41, label: 'Dhaka'      },
  { lat: 22.36, lon: 91.78, label: 'Chittagong' },
];

const fetchAndCache = async (lat, lon, label) => {
  console.log(`Fetching weather for ${label}...`);

  const [currentRes, forecastRes] = await Promise.all([
    axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: { lat, lon, appid: OPENWEATHER_API_KEY, units: 'metric' },
    }),
    axios.get('https://api.openweathermap.org/data/2.5/forecast', {
      params: { lat, lon, appid: OPENWEATHER_API_KEY, units: 'metric' },
    }),
  ]);

  const data = {
    current:  currentRes.data,
    forecast: forecastRes.data,
  };

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  await WeatherCache.findOneAndUpdate(
    { lat, lon },
    { lat, lon, data, fetchedAt: new Date(), expiresAt },
    { upsert: true, new: true }
  );

  console.log(`  Cached weather for ${label} until ${expiresAt.toLocaleTimeString()}`);
};

const seedWeather = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for seeding...');

    await WeatherCache.deleteMany({});
    console.log('Cleared existing weather cache');

    for (const loc of locations) {
      await fetchAndCache(loc.lat, loc.lon, loc.label);
    }

    mongoose.disconnect();
    console.log('Done. MongoDB disconnected.');

  } catch (error) {
    console.error('Seed error:', error.message);
    mongoose.disconnect();
    process.exit(1);
  }
};

seedWeather();