const mongoose = require('mongoose');
const Message = require('./models/Message');
require('dotenv').config();

const deleteAllMessages = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Delete all messages
    const result = await Message.deleteMany({});
    console.log(`Successfully deleted ${result.deletedCount} messages`);

    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

deleteAllMessages(); 