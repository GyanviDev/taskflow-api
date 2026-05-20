const db = require('../models/database');

/**
 * GET /api/v1/users  — Admin only
 */
const getAllUsers = (req, res) => {
  const users = db.getAllUsers();
  res.json({ success: true, data: { users, total: users.length } });
};

/**
 * GET /api/v1/users/:id  — Admin or own profile
 */
const getUser = (req, res) => {
  const { id } = req.params;
  if (req.user.role !== 'admin' && req.user.id !== id) {
    return res.status(403).json({ success: false, error: 'Access forbidden' });
  }
  const user = db.findUserById(id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  res.json({ success: true, data: { user } });
};

/**
 * PUT /api/v1/users/:id/role  — Admin only
 */
const updateUserRole = (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) {
    return res.status(422).json({ success: false, error: 'Role must be: user or admin' });
  }
  const user = db.findUserById(id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  const updated = db.updateUser(id, { role });
  res.json({ success: true, message: 'Role updated', data: { user: updated } });
};

/**
 * DELETE /api/v1/users/:id  — Admin only
 */
const deleteUser = (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
  }
  const user = db.findUserById(req.params.id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  db.deleteUser(req.params.id);
  res.json({ success: true, message: 'User deleted' });
};

module.exports = { getAllUsers, getUser, updateUserRole, deleteUser };
