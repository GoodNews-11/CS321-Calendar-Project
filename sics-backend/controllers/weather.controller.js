const User = require('../models/User');
const { getWeatherData, parseWeather } = require('../services/weather.service');

// GET /api/weather?lat=23.8&lon=90.4
// If no query params, uses the user's saved location
const getWeather = async (req, res, next) => {
  try {
    let { lat, lon } = req.query;

    // If no coords in query, fall back to user's saved location
    if (!lat || !lon) {
      const user = await User.findById(req.userId);

      if (!user.location || !user.location.lat) {
        return res.status(400).json({
          message: 'No location provided. Pass ?lat=&lon= or save your location in your profile.',
        });
      }

      lat = user.location.lat;
      lon = user.location.lon;
    }

    const rawData     = await getWeatherData(parseFloat(lat), parseFloat(lon));
    const weatherData = parseWeather(rawData);

    res.status(200).json({
      location: { lat: parseFloat(lat), lon: parseFloat(lon) },
      weather: weatherData,
    });

  } catch (error) {
    // Handle OpenWeather API specific errors
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
    let { lat, lon } = req.query;

    if (!lat || !lon) {
      const user = await User.findById(req.userId);

      if (!user.location || !user.location.lat) {
        return res.status(400).json({
          message: 'No location provided. Pass ?lat=&lon= or save your location in your profile.',
        });
      }

      lat = user.location.lat;
      lon = user.location.lon;
    }

    const rawData     = await getWeatherData(parseFloat(lat), parseFloat(lon));
    const weatherData = parseWeather(rawData);

    res.status(200).json({
      location: { lat: parseFloat(lat), lon: parseFloat(lon) },
      forecast: weatherData.daily,
    });

  } catch (error) {
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
          lat:  parseFloat(lat),
          lon:  parseFloat(lon),
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