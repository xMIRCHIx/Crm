const db = require('../config/db');

const Milestone = {
  async getAllByClientId(clientId) {
    return await db.query(
      'SELECT * FROM project_milestones WHERE client_id = ? ORDER BY due_date ASC, id ASC',
      [clientId]
    );
  },

  async create({ client_id, title, description, due_date }) {
    const result = await db.query(
      'INSERT INTO project_milestones (client_id, title, description, due_date, status) VALUES (?, ?, ?, ?, "pending")',
      [client_id, title, description || null, due_date || null]
    );
    return result.insertId;
  },

  async updateStatus(id, status) {
    await db.query(
      'UPDATE project_milestones SET status = ? WHERE id = ?',
      [status, id]
    );
  },

  async delete(id) {
    await db.query('DELETE FROM project_milestones WHERE id = ?', [id]);
  },

  async getProgress(clientId) {
    const rows = await db.query(
      'SELECT COUNT(*) as total, COUNT(CASE WHEN status = "completed" THEN 1 END) as completed FROM project_milestones WHERE client_id = ?',
      [clientId]
    );
    const { total, completed } = rows[0] || { total: 0, completed: 0 };
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }
};

module.exports = Milestone;
