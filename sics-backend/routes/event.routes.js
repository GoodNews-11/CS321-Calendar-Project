const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  toggleComplete,
} = require('../controllers/event.controller');
const protect  = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

// All event routes are protected
router.use(protect);

// GET /api/events?month=6&year=2025
router.get('/', getEvents);

// GET /api/events/:id
router.get('/:id', getEventById);

// POST /api/events
router.post(
  '/',
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('startTime').isISO8601().withMessage('Valid start time is required'),
    body('endTime').isISO8601().withMessage('Valid end time is required'),
    body('color').optional().isHexColor().withMessage('Color must be a valid hex code'),
  ],
  validate,
  createEvent
);

// PUT /api/events/:id
router.put(
  '/:id',
  [
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('startTime').optional().isISO8601().withMessage('Valid start time required'),
    body('endTime').optional().isISO8601().withMessage('Valid end time required'),
    body('color').optional().isHexColor().withMessage('Color must be a valid hex code'),
  ],
  validate,
  updateEvent
);

// DELETE /api/events/:id
router.delete('/:id', deleteEvent);

// PATCH /api/events/:id/complete
router.patch('/:id/complete', toggleComplete);

module.exports = router;