import { getAuditLogs } from '../models/index.js';

export async function viewAuditLogs(req, res, next) {
  try {
    let logs = await getAuditLogs(200);

    // Apply filters
    const { search, action, user_name, date_from, date_to } = req.query;

    if (search) {
      const q = search.toLowerCase();
      logs = logs.filter(l =>
        (l.user_name && l.user_name.toLowerCase().includes(q)) ||
        (l.action && l.action.toLowerCase().includes(q)) ||
        (l.details && l.details.toLowerCase().includes(q)) ||
        (l.entity_type && l.entity_type.toLowerCase().includes(q))
      );
    }

    if (action) {
      logs = logs.filter(l => l.action === action);
    }

    if (user_name) {
      const un = user_name.toLowerCase();
      logs = logs.filter(l => l.user_name && l.user_name.toLowerCase().includes(un));
    }

    if (date_from) {
      const from = new Date(date_from);
      logs = logs.filter(l => new Date(l.created_at) >= from);
    }

    if (date_to) {
      const to = new Date(date_to);
      to.setHours(23, 59, 59, 999);
      logs = logs.filter(l => new Date(l.created_at) <= to);
    }

    // Get unique actions for filter dropdown
    const allLogs = await getAuditLogs(200);
    const uniqueActions = [...new Set(allLogs.map(l => l.action))].sort();
    const uniqueUsers = [...new Set(allLogs.map(l => l.user_name).filter(Boolean))].sort();

    res.render('admin/audit/index', {
      title: 'Audit Security Trail',
      logs,
      filters: { search, action, user_name, date_from, date_to },
      uniqueActions,
      uniqueUsers
    });
  } catch (error) {
    next(error);
  }
}
