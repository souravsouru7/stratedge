const User = require("../../models/Users");
const Trade = require("../../models/Trade");
const IndianTrade = require("../../models/IndianTrade");

/**
 * @desc    Get key metrics for admin dashboard
 * @route   GET /api/admin/analytics/stats
 * @access  Private/Admin
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // 1. User Stats
    const totalUsers = await User.countDocuments({ role: { $ne: "admin" } });
    const activePaidUsers = await User.countDocuments({ 
      role: { $ne: "admin" }, 
      subscriptionStatus: "active" 
    });
    const expiredUsers = await User.countDocuments({ 
      role: { $ne: "admin" }, 
      subscriptionStatus: "expired" 
    });

    // 2. Trade Stats
    const forexTradesCount = await Trade.countDocuments();
    const indianTradesCount = await IndianTrade.countDocuments();
    const totalTrades = forexTradesCount + indianTradesCount;

    // 3. Revenue Stats
    const revenueData = await User.aggregate([
      { $match: { role: { $ne: "admin" } } },
      { $group: { _id: null, totalRevenue: { $sum: "$totalPaid" } } }
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    res.json({
      totalUsers,
      activePaidUsers,
      expiredUsers,
      totalTrades,
      totalRevenue: totalRevenue.toFixed(2),
      forexTradesCount,
      indianTradesCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get growth stats (users and trades) for charts
 * @route   GET /api/admin/analytics/growth
 * @access  Private/Admin
 */
exports.getGrowthStats = async (req, res) => {
  try {
    // 1. User Growth (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const userGrowth = await User.aggregate([
      { $match: { role: { $ne: "admin" }, createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // 2. Daily Trades (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const forexDaily = await Trade.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      }
    ]);

    const indianDaily = await IndianTrade.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      }
    ]);

    // Merge daily trades
    const dailyTradesMap = {};
    forexDaily.forEach(item => { dailyTradesMap[item._id] = (dailyTradesMap[item._id] || 0) + item.count; });
    indianDaily.forEach(item => { dailyTradesMap[item._id] = (dailyTradesMap[item._id] || 0) + item.count; });

    const dailyTrades = Object.entries(dailyTradesMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      userGrowth: userGrowth.map(item => ({
        month: `${item._id.month}/${item._id.year}`,
        users: item.count
      })),
      dailyTrades
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
