const express = require('express');
const router = express.Router();
const {
  getTasks, getTask, createTask, updateTask, deleteTask, updateTaskStatus,
} = require('../controllers/task.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { createTaskValidator, updateTaskValidator, taskIdValidator } = require('../validators/task.validator');
const { validate } = require('../middleware/error.middleware');

// All task routes require authentication
router.use(authenticate);

router.get('/', getTasks);
router.post('/', createTaskValidator, validate, createTask);
router.get('/:id', taskIdValidator, validate, getTask);
router.put('/:id', updateTaskValidator, validate, updateTask);
router.delete('/:id', taskIdValidator, validate, deleteTask);
router.patch('/:id/status', taskIdValidator, validate, updateTaskStatus);

module.exports = router;
