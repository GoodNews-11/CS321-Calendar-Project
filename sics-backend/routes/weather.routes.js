const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const {
  getWeather,
  getForecast,
  saveLocation,
} = require('../controllers/weather.controller');
const protect = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

// All weather routes are protected
router.use(protect);

// GET /api/weather?lat=23.8&lon=90.4
router.get(
  '/',
  [
    query('lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    query('lon').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    query('city').optional().isString().withMessage('City must be a non-empty string'),
  ],
  validate,
  getWeather
);

// GET /api/weather/forecast?lat=23.8&lon=90.4
router.get(
  '/forecast',
  [
    query('lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    query('lon').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    query('city').optional().isString().withMessage('City must be a non-empty string'),
  ],
  validate,
  getForecast
);

// PUT /api/weather/location
router.put(
  '/location',
  [
    body('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
    body('lon').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
    body('city').optional().isString().withMessage('City must be a string'),
  ],
  validate,
  saveLocation
);

module.exports = router;