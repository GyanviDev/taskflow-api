/**
 * In-Memory Database
 * Simulates PostgreSQL with the same schema design.
 * Replace with pg (node-postgres) + connection pool for production.
 *
 * PostgreSQL Schema (included in README):
 *   users(id, email, password_hash, role, created_at, updated_at)
 *   tasks(id, title, description, status, priority, user_id, created_at, updated_at)
 *   refresh_tokens(id, user_id, token_hash, expires_at)
 */

const { v4: uuidv4 } = require('uuid');

class Database {
  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.refreshTokens = new Map();
    this._seed();
  }

  _seed() {
    // Seed an admin user (password: Admin@123)
    const bcrypt = require('bcryptjs');
    const salt = bcrypt.genSaltSync(12);
    const adminId = 'admin-seed-001';
    this.users.set(adminId, {
      id: adminId,
      email: 'admin@taskflow.com',
      password_hash: bcrypt.hashSync('Admin@123', salt),
      role: 'admin',
      name: 'System Admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // USERS
  createUser(data) {
    const id = uuidv4();
    const user = {
      id,
      ...data,
      role: data.role || 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.users.set(id, user);
    return this._sanitizeUser(user);
  }

  findUserByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) return user;
    }
    return null;
  }

  findUserById(id) {
    const user = this.users.get(id);
    return user ? this._sanitizeUser(user) : null;
  }

  getAllUsers() {
    return Array.from(this.users.values()).map(this._sanitizeUser);
  }

  updateUser(id, data) {
    const user = this.users.get(id);
    if (!user) return null;
    const updated = { ...user, ...data, updated_at: new Date().toISOString() };
    this.users.set(id, updated);
    return this._sanitizeUser(updated);
  }

  deleteUser(id) {
    return this.users.delete(id);
  }

  _sanitizeUser(user) {
    const { password_hash, ...safe } = user;
    return safe;
  }

  // TASKS
  createTask(data) {
    const id = uuidv4();
    const task = {
      id,
      ...data,
      status: data.status || 'pending',
      priority: data.priority || 'medium',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.tasks.set(id, task);
    return task;
  }

  getTaskById(id) {
    return this.tasks.get(id) || null;
  }

  getTasksByUser(userId) {
    return Array.from(this.tasks.values()).filter(t => t.user_id === userId);
  }

  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  updateTask(id, data) {
    const task = this.tasks.get(id);
    if (!task) return null;
    const updated = { ...task, ...data, updated_at: new Date().toISOString() };
    this.tasks.set(id, updated);
    return updated;
  }

  deleteTask(id) {
    return this.tasks.delete(id);
  }

  // REFRESH TOKENS
  saveRefreshToken(userId, tokenHash, expiresAt) {
    const id = uuidv4();
    this.refreshTokens.set(id, { id, userId, tokenHash, expiresAt });
    return id;
  }

  findRefreshToken(tokenHash) {
    for (const rt of this.refreshTokens.values()) {
      if (rt.tokenHash === tokenHash) return rt;
    }
    return null;
  }

  deleteRefreshToken(tokenHash) {
    for (const [id, rt] of this.refreshTokens.entries()) {
      if (rt.tokenHash === tokenHash) {
        this.refreshTokens.delete(id);
        return true;
      }
    }
    return false;
  }
}

// Singleton
const db = new Database();
module.exports = db;
