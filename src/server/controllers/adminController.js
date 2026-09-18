import { getDashboardStats, getGroupTourStats } from '../models/index.js';

export async function getDashboard(req, res, next) {
  try {
    const stats = await getDashboardStats();
    const groupStats = await getGroupTourStats();
    const flightPct = Math.round((stats.totalFlightRevenue / Math.max(stats.totalRevenue, 1)) * 100);
    const tourPct = 100 - flightPct;
    res.render('admin/dashboard', {
      title: 'Operations Overview',
      stats,
      groupStats,
      recentGroups: stats.recentGroups || [],
      flightPct,
      tourPct
    });
  } catch (error) {
    next(error);
  }
}
