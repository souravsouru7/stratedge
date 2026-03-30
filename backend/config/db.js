const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    console.log(`Connecting to MongoDB with URI: ${process.env.MONGO_URI ? process.env.MONGO_URI.substring(0, 20) + '...' : 'undefined'}`);
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      family: 4,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;