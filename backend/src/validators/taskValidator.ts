import { body, param, query } from 'express-validator';
import { TaskStatus } from '../types';

export const createTaskValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Task title is required')
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('status')
    .optional()
    .isIn(Object.values(TaskStatus))
    .withMessage('Status must be one of: pending, in_progress, completed'),

  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID for assignment'),
];

export const updateTaskValidator = [
  param('id').isMongoId().withMessage('Invalid task ID'),

  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('status')
    .optional()
    .isIn(Object.values(TaskStatus))
    .withMessage('Status must be one of: pending, in_progress, completed'),
];

export const reassignTaskValidator = [
  param('id').isMongoId().withMessage('Invalid task ID'),

  body('assignedTo')
    .notEmpty()
    .withMessage('assignedTo is required')
    .isMongoId()
    .withMessage('Invalid user ID for reassignment'),
];

export const taskIdValidator = [
  param('id').isMongoId().withMessage('Invalid task ID'),
];

export const taskQueryValidator = [
  query('status')
    .optional()
    .isIn(Object.values(TaskStatus))
    .withMessage('Invalid status filter'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];
