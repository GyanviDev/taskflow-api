const { body, param, query } = require('express-validator');

const createTaskValidator = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 100 }).withMessage('Title must be 3–100 characters')
    .escape(),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description max 500 characters')
    .escape(),

  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed', 'cancelled'])
    .withMessage('Status must be: pending, in_progress, completed, cancelled'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be: low, medium, high'),

  body('due_date')
    .optional()
    .isISO8601().withMessage('due_date must be a valid ISO 8601 date'),
];

const updateTaskValidator = [
  param('id').isUUID().withMessage('Task ID must be a valid UUID'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Title must be 3–100 characters')
    .escape(),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description max 500 characters')
    .escape(),

  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed', 'cancelled'])
    .withMessage('Invalid status'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid priority'),
];

const taskIdValidator = [
  param('id').isUUID().withMessage('Task ID must be a valid UUID'),
];

module.exports = { createTaskValidator, updateTaskValidator, taskIdValidator };
