const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// Get messages between two users
router.get('/:userId', auth, async (req, res) => {
  try {
    // Fetch messages
    let messages = await Message.find({
      $or: [
        { senderId: req.user.id, receiverId: req.params.userId },
        { senderId: req.params.userId, receiverId: req.user.id }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('senderId', 'name avatar')
    .populate('receiverId', 'name avatar');
    
    // Mark messages as read
    await Message.updateMany(
      {
        senderId: req.params.userId,
        receiverId: req.user.id,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    // Re-fetch messages so isRead is up-to-date
    messages = await Message.find({
      $or: [
        { senderId: req.user.id, receiverId: req.params.userId },
        { senderId: req.params.userId, receiverId: req.user.id }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('senderId', 'name avatar')
    .populate('receiverId', 'name avatar');

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

// Send a message
router.post('/', auth, async (req, res) => {
  try {
    const { receiverId, content, type = 'text', metadata = {}, clientId } = req.body;
    
    const message = new Message({
      chatId: [req.user.id, receiverId].sort().join('_'),
      senderId: req.user.id,
      receiverId,
      content,
      type,
      metadata,
      clientId: clientId || null
    });

    await message.save();
    
    // Populate sender and receiver details
    await message.populate('senderId', 'name avatar');
    await message.populate('receiverId', 'name avatar');

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
});

// Mark messages as read
router.patch('/read/:userId', auth, async (req, res) => {
  try {
    const result = await Message.updateMany(
      {
        senderId: req.params.userId,
        receiverId: req.user.id,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({ updated: result.nModified });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Error marking messages as read' });
  }
});

// Get unread message count
router.get('/unread/count', auth, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiverId: req.user.id,
      isRead: false
    });

    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ message: 'Error getting unread count' });
  }
});

// Mark a single message as read
router.patch('/read/:messageId', auth, async (req, res) => {
  try {
    const message = await Message.findOneAndUpdate(
      {
        _id: req.params.messageId,
        receiverId: req.user.id,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ message: 'Message not found or already read' });
    }

    // Emit socket event to notify sender that message was read
    req.app.get('io').to(message.senderId.toString()).emit('messageRead', {
      messageId: message._id,
      readAt: message.readAt
    });

    res.json(message);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ message: 'Error marking message as read' });
  }
});

module.exports = router; 