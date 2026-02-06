const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

// Get all users except current user
router.get('/', auth, async (req, res) => {
  try {
    console.log('GET /api/users - Current user id:', req.user.id);
    
    if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
      console.error('Invalid user ID format:', req.user.id);
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const currentUserId = new mongoose.Types.ObjectId(req.user.id);
    console.log('Fetching users excluding:', currentUserId);

    // Update current user's status to online
    await User.findByIdAndUpdate(currentUserId, {
      status: 'online',
      lastSeen: new Date()
    });

    const users = await User.find({ _id: { $ne: currentUserId } })
      .select('-password')
      .sort({ name: 1 });

    console.log(`Found ${users.length} users`);
    res.json(users);
  } catch (error) {
    console.error('Error in GET /api/users:', error);
    res.status(500).json({ message: 'Error fetching users: ' + error.message });
  }
});

// Update user status
router.patch('/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['online', 'offline'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 
        status,
        lastSeen: new Date()
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ message: 'Error updating status' });
  }
});

module.exports = router; 