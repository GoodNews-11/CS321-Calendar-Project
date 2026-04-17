const axios = require('axios');
const WeatherCache = require('../models/WeatherCache');
const { OPENWEATHER_API_KEY } = require('../config/env');

const CACHE_TTL_HOURS = 1;

const roundCoord = (val) => Math.round(val * 100) / 100;

// Fetch current weather from 2.5 free API
const getCurrentWeather = async (lat, lon) => {
  const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
    params: {
      lat: lat,
      lon: lon,
      appid: OPENWEATHER_API_KEY,
      units: 'metric',
    },
  });
  return response.data;
};

// Fetch 5-day / 3-hour forecast from 2.5 free API
const getForecastData = async (lat, lon) => {
  const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
    params: {
      lat: lat,
      lon: lon,
      appid: OPENWEATHER_API_KEY,
      units: 'metric',
    },
  });
  return response.data;
};

// Main function — checks cache first, then fetches both endpoints
const getWeatherData = async (lat, lon) => {
  const rLat = roundCoord(lat);
  const rLon = roundCoord(lon);

  // Check cache
  const cached = await WeatherCache.findOne({
    lat: rLat,
    lon: rLon,
    expiresAt: { $gt: new Date() },
  });

  if (cached) {
    console.log(`Weather cache hit for (${rLat}, ${rLon})`);
    return cached.data;
  }

  console.log(`Fetching fresh weather for (${rLat}, ${rLon})`);

  // Call both endpoints in parallel
  const [currentData, forecastData] = await Promise.all([
    getCurrentWeather(rLat, rLon),
    getForecastData(rLat, rLon),
  ]);

  // Combine into one object to store in cache
  const combined = { current: currentData, forecast: forecastData };

  // Save to cache
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);

  await WeatherCache.findOneAndUpdate(
    { lat: rLat, lon: rLon },
    {
      lat: rLat,
      lon: rLon,
      data: combined,
      fetchedAt: new Date(),
      expiresAt,
    },
    { upsert: true, new: true }
  );

  return combined;
};

// Parse combined response into clean format
const parseWeather = (data) => {
  const c = data.current;

  // ── Current weather ───────────────────────────────────────────
  const current = {
    temp: Math.round(c.main.temp),
    feelsLike: Math.round(c.main.feels_like),
    tempMin: Math.round(c.main.temp_min),
    tempMax: Math.round(c.main.temp_max),
    humidity: c.main.humidity,
    windSpeed: c.wind.speed,
    description: c.weather[0].description,
    icon: c.weather[0].icon,
    main: c.weather[0].main,   // Rain, Snow, Clear, Clouds etc.
    cityName: c.name,
    country: c.sys.country,
  };

  // ── Hourly — next 24 hours (8 entries × 3h = 24h) ────────────
  const hourly = data.forecast.list.slice(0, 8).map((entry) => ({
    time: entry.dt_txt,
    temp: Math.round(entry.main.temp),
    feelsLike: Math.round(entry.main.feels_like),
    humidity: entry.main.humidity,
    description: entry.weather[0].description,
    icon: entry.weather[0].icon,
    main: entry.weather[0].main,
    windSpeed: entry.wind.speed,
  }));

  // ── Daily — group 3-hour entries by date, pick midday entry ──
  const dailyMap = {};

  data.forecast.list.forEach((entry) => {
    const date = entry.dt_txt.split(' ')[0]; // "2025-06-15"
    const hour = parseInt(entry.dt_txt.split(' ')[1].split(':')[0]);

    // Prefer the 12:00 entry for each day as representative
    if (!dailyMap[date] || Math.abs(hour - 12) < Math.abs(dailyMap[date].hour - 12)) {
      dailyMap[date] = {
        hour,
        date,
        tempMin: Math.round(entry.main.temp_min),
        tempMax: Math.round(entry.main.temp_max),
        temp: Math.round(entry.main.temp),
        humidity: entry.main.humidity,
        description: entry.weather[0].description,
        icon: entry.weather[0].icon,
        main: entry.weather[0].main,
        windSpeed: entry.wind.speed,
      };
    }
  });

  const daily = Object.values(dailyMap).map(({ hour, ...rest }) => rest);

  return { current, hourly, daily };
};

module.exports = { getWeatherData, parseWeather };