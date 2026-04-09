const dns = require("dns");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/Users");
const { appConfig } = require("../config");

async function seedAdmin() {
  try {
    if (appConfig.mongoDnsServers.length > 0) {
      dns.setServers(appConfig.mongoDnsServers);
      console.log(`Using custom MongoDB DNS servers: ${appConfig.mongoDnsServers.join(", ")}`);
    }

    await mongoose.connect(appConfig.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      family: 4,
    });
    console.log("Connected to MongoDB.");

    const adminEmail = "admin@stratedge.com";
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log("Admin user already exists. Email: " + adminEmail);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash("Admin@123", 10);
    
    const adminUser = new User({
      name: "Super Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      authProvider: "local",
      subscriptionStatus: "active",
      subscriptionPlan: "yearly"
    });

    await adminUser.save();
    console.log("Admin user created successfully!");
    console.log("Email:", adminEmail);
    console.log("Password: Admin@123");
    
    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
}

seedAdmin();
