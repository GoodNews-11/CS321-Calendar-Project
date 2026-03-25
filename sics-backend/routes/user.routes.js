const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { getProfile, updateProfile, changePassword } = require('../controllers/user.controller');
const protect = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

// All user routes are protected
router.use(protect);

// GET /api/users/profile
router.get('/profile', getProfile);

// PUT /api/users/profile
router.put(
  '/profile',
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('theme').optional().isIn(['light', 'dark']).withMessage('Theme must be light or dark'),
  ],
  validate,
  updateProfile
);

// PUT /api/users/change-password
router.put(
  '/change-password',
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  validate,
  changePassword
);

module.exports = router;