const User = require('../models/User');
const { getWeatherData, parseWeather } = require('../services/weather.service');
const axios = require('axios');
const { OPENWEATHER_API_KEY } = require('../config/env');

// Convert a city name to lat/lon using OpenWeather's geocoding API
const geocodeCity = async (city) => {
  const response = await axios.get('https://api.openweathermap.org/geo/1.0/direct', {
    params: {
      q: city,
      limit: 1,
      appid: OPENWEATHER_API_KEY,
    },
  });

  if (!response.data || response.data.length === 0) {
    const err = new Error(`City not found: ${city}`);
    err.status = 404;
    throw err;
  }

  const place = response.data[0];
  return {
    lat: place.lat,
    lon: place.lon,
    city: place.name,
    country: place.country,
  };
};
//Shared helper: resolve location from query params or user profile
// Priority: city name → explicit lat/lon → user's saved location
const resolveLocation = async (req) => {
  let { lat, lon, city } = req.query;
  let resolvedCity = null;

  if (city) {
    const geo = await geocodeCity(city);
    lat = geo.lat;
    lon = geo.lon;
    resolvedCity = `${geo.city}, ${geo.country}`;
  }

  if (!lat || !lon) {
    const user = await User.findById(req.userId);
    if (!user.location || !user.location.lat) {
      const err = new Error('No location provided. Pass ?city=, ?lat=&lon=, or save your location in your profile.');
      err.status = 400;
      throw err;
    }
    lat = user.location.lat;
    lon = user.location.lon;
    if (user.location.city) {
      resolvedCity = user.location.city;
    }
  }

  return {
    lat: parseFloat(lat),
    lon: parseFloat(lon),
    city: resolvedCity,
  };
};
// GET /api/weather?city=Fairfax  or  ?lat=23.8&lon=90.4
// If no query params, uses the user's saved location
const getWeather = async (req, res, next) => {
  try {
    const location = await resolveLocation(req);

    const rawData = await getWeatherData(location.lat, location.lon);
    const weatherData = parseWeather(rawData);

    res.status(200).json({
      location,
      weather: weatherData,
    });

  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    if (error.response) {
      return res.status(error.response.status).json({
        message: error.response.data.message || 'Weather API error',
      });
    }
    next(error);
  }
};

// GET /api/weather/forecast?lat=23.8&lon=90.4
// Returns 7-day daily forecast only
const getForecast = async (req, res, next) => {
  try {
    const location = await resolveLocation(req);

    const rawData = await getWeatherData(location.lat, location.lon);
    const weatherData = parseWeather(rawData);

    res.status(200).json({
      location,
      forecast: weatherData.daily,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    if (error.response) {
      return res.status(error.response.status).json({
        message: error.response.data.message || 'Weather API error',
      });
    }
    next(error);
  }
};

// PUT /api/weather/location
// Save user's location for automatic weather lookup
const saveLocation = async (req, res, next) => {
  try {
    const { lat, lon, city } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        location: {
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          city: city || null,
        },
      },
      { new: true }
    ).select('-password');

    res.status(200).json({
      message: 'Location saved successfully',
      location: user.location,
    });

  } catch (error) {
    next(error);
  }
};

module.exports = { getWeather, getForecast, saveLocation };