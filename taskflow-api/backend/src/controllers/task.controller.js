const db = require('../models/database');

/**
 * GET /api/v1/tasks
 * User: own tasks | Admin: all tasks
 */
const getTasks = (req, res) => {
  const { status, priority, page = 1, limit = 10 } = req.query;

  let tasks = req.user.role === 'admin'
    ? db.getAllTasks()
    : db.getTasksByUser(req.user.id);

  // Filter
  if (status) tasks = tasks.filter(t => t.status === status);
  if (priority) tasks = tasks.filter(t => t.priority === priority);

  // Sort by created_at desc
  tasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Paginate
  const total = tasks.length;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;
  const paginated = tasks.slice(offset, offset + limitNum);

  res.json({
    success: true,
    data: {
      tasks: paginated,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
};

/**
 * GET /api/v1/tasks/:id
 */
const getTask = (req, res) => {
  const task = db.getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }
  // Users can only view own tasks
  if (req.user.role !== 'admin' && task.user_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Access forbidden' });
  }
  res.json({ success: true, data: { task } });
};

/**
 * POST /api/v1/tasks
 */
const createTask = (req, res) => {
  const { title, description, status, priority, due_date } = req.body;
  const task = db.createTask({
    title,
    description: description || '',
    status,
    priority,
    due_date: due_date || null,
    user_id: req.user.id,
  });
  res.status(201).json({ success: true, message: 'Task created', data: { task } });
};

/**
 * PUT /api/v1/tasks/:id
 */
const updateTask = (req, res) => {
  const task = db.getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }
  if (req.user.role !== 'admin' && task.user_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Access forbidden' });
  }

  const { title, description, status, priority, due_date } = req.body;
  const updated = db.updateTask(req.params.id, {
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(status !== undefined && { status }),
    ...(priority !== undefined && { priority }),
    ...(due_date !== undefined && { due_date }),
  });

  res.json({ success: true, message: 'Task updated', data: { task: updated } });
};

/**
 * DELETE /api/v1/tasks/:id
 */
const deleteTask = (req, res) => {
  const task = db.getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }
  if (req.user.role !== 'admin' && task.user_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Access forbidden' });
  }
  db.deleteTask(req.params.id);
  res.json({ success: true, message: 'Task deleted' });
};

/**
 * PATCH /api/v1/tasks/:id/status  — quick status update
 */
const updateTaskStatus = (req, res) => {
  const task = db.getTaskById(req.params.id);
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
  if (req.user.role !== 'admin' && task.user_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Access forbidden' });
  }
  const { status } = req.body;
  const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(422).json({ success: false, error: 'Invalid status' });
  }
  const updated = db.updateTask(req.params.id, { status });
  res.json({ success: true, data: { task: updated } });
};

module.exports = { getTasks, getTask, createTask, updateTask, deleteTask, updateTaskStatus };
