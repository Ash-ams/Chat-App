const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const deleteAllUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Delete all users
    const result = await User.deleteMany({});
    console.log(`Successfully deleted ${result.deletedCount} users`);

    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

deleteAllUsers(); 