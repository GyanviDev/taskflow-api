const express = require('express');
const router = express.Router();
const { getAllUsers, getUser, updateUserRole, deleteUser } = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', authorize('admin'), getAllUsers);
router.get('/:id', getUser);
router.put('/:id/role', authorize('admin'), updateUserRole);
router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;
