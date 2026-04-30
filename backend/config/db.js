const dns = require("dns");
const mongoose = require("mongoose");
const { appConfig, maskSecret } = require("./index");

const connectDB = async () => {
  try {
    if (appConfig.mongoDnsServers.length > 0) {
      dns.setServers(appConfig.mongoDnsServers);
    }

    const conn = await mongoose.connect(appConfig.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      family: 4,
      maxPoolSize: 50,
      minPoolSize: 5,
      socketTimeoutMS: 30000,
    });
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
