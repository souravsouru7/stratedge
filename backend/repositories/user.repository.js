const User = require("../models/Users");

async function markFreeUploadUsed(userId) {
  return User.findByIdAndUpdate(userId, { freeUploadUsed: true });
}

async function findUsersForWeeklyReports() {
  return User.find({}, { _id: 1 }).lean();
}

module.exports = {
  findUsersForWeeklyReports,
  markFreeUploadUsed,
};
