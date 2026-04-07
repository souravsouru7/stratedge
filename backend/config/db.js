const mongoose = require("mongoose");
const { appConfig, maskSecret } = require("./index");

const connectDB = async () => {
  try {
    console.log(`Connecting to MongoDB with URI: ${maskSecret(appConfig.mongoUri, 20, 8)}`);
    const conn = await mongoose.connect(appConfig.mongoUri, {
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
