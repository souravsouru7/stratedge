const dns = require("dns");
const mongoose = require("mongoose");
const { appConfig, maskSecret } = require("./index");

const connectDB = async () => {
  try {
    if (appConfig.mongoDnsServers.length > 0) {
      dns.setServers(appConfig.mongoDnsServers);
      console.log(`Using custom MongoDB DNS servers: ${appConfig.mongoDnsServers.join(", ")}`);
    }

    console.log(`Connecting to MongoDB with URI: ${maskSecret(appConfig.mongoUri, 20, 8)}`);
    const conn = await mongoose.connect(appConfig.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      family: 4,
      maxPoolSize: 50,       // one connection available per concurrent user
      minPoolSize: 5,        // keep 5 warm connections ready at all times
      socketTimeoutMS: 30000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`);

    if (error.message.includes("querySrv")) {
      console.error(
        [
          "MongoDB SRV lookup failed before authentication.",
          "If you are using MongoDB Atlas, either:",
          '1. Set MONGO_DNS_SERVERS=8.8.8.8,1.1.1.1 in backend/.env and retry, or',
          "2. Replace the mongodb+srv:// URI with the standard mongodb:// host list from Atlas.",
        ].join(" ")
      );
    }

    process.exit(1);
  }
};

module.exports = connectDB;
