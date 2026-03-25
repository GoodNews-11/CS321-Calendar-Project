const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const {
  getReminders,
  getReminderById,
  createReminder,
  updateReminder,
  deleteReminder,
} = require('../controllers/reminder.controller');
const protect  = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

// All reminder routes are protected
router.use(protect);

// GET /api/reminders
router.get('/', getReminders);

// GET /api/reminders/:id
router.get('/:id', getReminderById);

// POST /api/reminders
router.post(
  '/',
  [
    body('eventId').notEmpty().withMessage('Event ID is required'),
    body('minutesBefore').optional().isInt({ min: 1 }).withMessage('Must be a positive number'),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
    body('repeatPattern').optional().isIn(['none', 'daily', 'weekly', 'custom']).withMessage('Invalid repeat pattern'),
  ],
  validate,
  createReminder
);

// PUT /api/reminders/:id
router.put(
  '/:id',
  [
    body('minutesBefore').optional().isInt({ min: 1 }).withMessage('Must be a positive number'),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
    body('repeatPattern').optional().isIn(['none', 'daily', 'weekly', 'custom']).withMessage('Invalid repeat pattern'),
    body('isActive').optional().isBoolean().withMessage('isActive must be true or false'),
  ],
  validate,
  updateReminder
);

// DELETE /api/reminders/:id
router.delete('/:id', deleteReminder);

module.exports = router;