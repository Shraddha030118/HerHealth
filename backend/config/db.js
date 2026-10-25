const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/herhealth_db';
  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error(`[Database Error] Failed to connect to MongoDB at ${uri}: ${err.message}`);
    console.error('Make sure MongoDB server is running locally or provide a valid MONGODB_URI in your .env');
    // If not in test environment, we rethrow so server setup can handle it gracefully
    throw err;
  }
};

module.exports = connectDB;
