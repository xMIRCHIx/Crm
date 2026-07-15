const db = require('../config/db');

const ActivityLog = {
  async log(userId, action, entityType = null, entityId = null) {
    try {
      await db.query(
        'INSERT INTO activity_log (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)',
        [userId, action, entityType, entityId]
      );
    } catch (err) {
      // Fail silently to prevent logging issues from blocking main business actions
      console.error('ActivityLog Write Error:', err.message);
    }
  },

  async getRecent(limit = 10) {
    const sql = `
      SELECT a.*, u.name AS user_name
      FROM activity_log a
      INNER JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT ?
    `;
    return await db.query(sql, [limit]);
  }
};

module.exports = ActivityLog;
