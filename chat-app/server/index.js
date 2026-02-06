const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const http = require("http");
const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Message = require("./models/Message");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const userRoutes = require("./routes/users");

// Create Express app
const app = express();
const server = http.createServer(app);

// Basic error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};

// Socket.io configuration
const io = socketIo(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Make io accessible to routes
app.set('io', io);

// Online users tracking
const onlineUsers = new Map();

// Function to broadcast user status to all clients
const broadcastUserStatus = async (userId, status) => {
  try {
    // Update user status in database
    await User.findByIdAndUpdate(userId, {
      status,
      lastSeen: new Date()
    });

    // Broadcast to all clients
    io.emit("userStatus", {
      userId,
      status
    });

    console.log(`Broadcasted status update: User ${userId} is now ${status}`);
  } catch (error) {
    console.error("Error broadcasting user status:", error);
  }
};

// Socket.io middleware for authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  console.log('Socket auth token:', token); // Log the token received from client
  if (!token) {
    console.log('No token provided');
    return next(new Error("Authentication error"));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    console.log('Socket authenticated for userId:', socket.userId);
    next();
  } catch (err) {
    console.error("Socket authentication error:", err);
    next(new Error("Authentication error"));
  }
});

io.on("connection", async (socket) => {
  try {
    console.log("User connected:", socket.userId);
    
    // Add user to online users map
    onlineUsers.set(socket.userId, socket.id);
    
    // Update and broadcast user's online status
    await broadcastUserStatus(socket.userId, "online");

    // Send current online users to the newly connected user
    const onlineUserIds = Array.from(onlineUsers.keys());
    socket.emit("onlineUsers", onlineUserIds);

    // Handle private messages
    socket.on("privateMessage", async (data) => {
      const { receiverId, content, type = 'text', metadata = {} } = data;
      const receiverSocketId = onlineUsers.get(receiverId);

      try {
        const message = new Message({
          chatId: [socket.userId, receiverId].sort().join('_'),
          senderId: socket.userId,
          receiverId,
          content,
          type,
          metadata
        });

        await message.save();
        await message.populate('senderId', 'name avatar');
        await message.populate('receiverId', 'name avatar');

        // Ensure clientId is included in the emitted message
        const messageObj = message.toObject ? message.toObject() : message;
        console.log('Emitting privateMessage:', messageObj);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("privateMessage", messageObj);
        }
        // Also emit to the sender so they see their own message instantly
        const senderSocketId = onlineUsers.get(socket.userId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("privateMessage", messageObj);
        }

        socket.emit("messageSent", message);
      } catch (error) {
        console.error("Error handling private message:", error);
        socket.emit("messageError", { error: "Failed to send message" });
      }
    });

    // Handle message read status
    socket.on("messageRead", async ({ messageId }) => {
      try {
        const message = await Message.findById(messageId);
        if (message && message.receiverId.toString() === socket.userId) {
          message.isRead = true;
          message.readAt = new Date();
          await message.save();

          // Notify sender that message was read
          const senderSocketId = onlineUsers.get(message.senderId.toString());
          if (senderSocketId) {
            io.to(senderSocketId).emit("messageRead", {
              messageId: message._id,
              readAt: message.readAt
            });
          }
        }
      } catch (error) {
        console.error("Error handling message read status:", error);
      }
    });

    // Handle disconnection
    socket.on("disconnect", async () => {
      console.log("User disconnected:", socket.userId);
      onlineUsers.delete(socket.userId);
      await broadcastUserStatus(socket.userId, "offline");
    });

  } catch (error) {
    console.error("Error in socket connection:", error);
    socket.disconnect();
  }
});

// Middleware
app.use(cors(corsOptions));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json());

// Basic route for testing
app.get("/", (req, res) => {
  res.json({ message: "Chat server is running" });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ 
    error: "Internal Server Error",
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MongoDB URI is not defined in environment variables");
    }
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("MongoDB Connected Successfully");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  try {
    await connectDB();
    
    const PORT = process.env.PORT || 5001;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
