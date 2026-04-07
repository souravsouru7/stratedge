require("dotenv").config({ path: "../.env" }); // Assuming path could be relative if run from scripts, but dotenv defaults to PWD. Better use path.join
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/Users");

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/trading_db");
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
