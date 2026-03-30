const express = require("express");
const router = express.Router();
const { 
  getAllUsers, 
  deleteUser, 
  toggleUserStatus, 
  extendUserPlan,
  getExpiredUsers,
  sendRenewalReminderAction
} = require("../controllers/adminUserController");
const { adminAuth } = require("../../middleware/adminAuth");

// All routes are protected by adminAuth
router.get("/", adminAuth, getAllUsers);
router.get("/expired", adminAuth, getExpiredUsers);
router.post("/:id/remind", adminAuth, sendRenewalReminderAction);
router.delete("/:id", adminAuth, deleteUser);
router.patch("/:id/status", adminAuth, toggleUserStatus);
router.patch("/:id/extend", adminAuth, extendUserPlan);

module.exports = router;
