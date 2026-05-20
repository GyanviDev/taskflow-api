const bcrypt = require('bcryptjs');
const db = require('../models/database');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  REFRESH_TOKEN_EXPIRY,
} = require('../config/jwt.config');

/**
 * POST /api/v1/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check duplicate
    const existing = db.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    const user = db.createUser({ name, email, password_hash });

    // Generate tokens
    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ id: user.id });

    // Store refresh token hash
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.saveRefreshToken(user.id, tokenHash, expiresAt);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        tokens: { accessToken, refreshToken, expiresIn: '15m' },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user (include password_hash for comparison)
    let user = db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Sanitize
    const { password_hash, ...safeUser } = user;

    const payload = { id: safeUser.id, email: safeUser.email, role: safeUser.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ id: safeUser.id });

    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.saveRefreshToken(safeUser.id, tokenHash, expiresAt);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: safeUser,
        tokens: { accessToken, refreshToken, expiresIn: '15m' },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/refresh
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'Refresh token required' });
    }

    const tokenHash = hashToken(refreshToken);
    const stored = db.findRefreshToken(tokenHash);
    if (!stored) {
      return res.status(401).json({ success: false, error: 'Invalid or revoked refresh token' });
    }

    // Verify
    const decoded = verifyRefreshToken(refreshToken);
    const user = db.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    // Rotate token
    db.deleteRefreshToken(tokenHash);
    const newAccessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const newRefreshToken = generateRefreshToken({ id: user.id });
    const newHash = hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.saveRefreshToken(user.id, newHash, expiresAt);

    res.json({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn: '15m' },
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Refresh token expired. Please login again.' });
    }
    next(err);
  }
};

/**
 * POST /api/v1/auth/logout
 */
const logout = (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    db.deleteRefreshToken(hashToken(refreshToken));
  }
  res.json({ success: true, message: 'Logged out successfully' });
};

/**
 * GET /api/v1/auth/me
 */
const me = (req, res) => {
  const user = db.findUserById(req.user.id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  res.json({ success: true, data: { user } });
};

module.exports = { register, login, refresh, logout, me };
