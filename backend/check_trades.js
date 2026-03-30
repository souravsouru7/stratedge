const mongoose = require("mongoose");
const Trade = require("./models/Trade");
require('dotenv').config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const trades = await Trade.find({});
  console.log("Total trades in DB:", trades.length);
  trades.forEach(t => {
    console.log(`Trade: ${t.pair} | Type: ${t.type} | Profit: ${t.profit} | CreatedAt: ${t.createdAt}`);
  });
  
  // Aggregate by day to see what backend does
  const byDay = {
    Sunday: { total: 0 }, Monday: { total: 0 }, Tuesday: { total: 0 },
    Wednesday: { total: 0 }, Thursday: { total: 0 }, Friday: { total: 0 }, Saturday: { total: 0 }
  };
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  const getAnalyticsLocalDate = (dateLike) => {
    const base = new Date(dateLike);
    const offsetHours = parseFloat(process.env.TIMEZONE_OFFSET_HOURS || "0");
    if (!offsetHours || Number.isNaN(offsetHours)) return base;
    const shiftedMs = base.getTime() + offsetHours * 60 * 60 * 1000;
    return new Date(shiftedMs);
  };
  
  trades.forEach(t => {
    const day = dayNames[getAnalyticsLocalDate(t.createdAt).getDay()];
    byDay[day].total++;
    byDay[day].profit = (byDay[day].profit || 0) + (t.profit || 0);
  });
  console.log("byDay:", byDay);
  
  process.exit(0);
}
run();
