const db = require('../config/db');

const User = {
  async findByEmail(email) {
    const rows = await db.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const rows = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  async create({ name, email, passwordHash, role, department, phone }) {
    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, department, phone, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [name, email, passwordHash, role || 'team_member', department || null, phone || null]
    );
    return result.insertId;
  },

  async getAllWithTaskCount() {
    // Admin only wants to see users and their active task counts
    const sql = `
      SELECT u.id, u.name, u.email, u.role, u.department, u.phone, u.status, u.created_at,
             COUNT(CASE WHEN t.status != 'completed' THEN 1 END) AS active_tasks_count
      FROM users u
      LEFT JOIN tasks t ON u.id = t.assigned_to
      GROUP BY u.id
      ORDER BY u.role ASC, u.name ASC
    `;
    return await db.query(sql);
  },

  async getAllTeamMembers() {
    return await db.query("SELECT id, name, email, department FROM users WHERE role = 'team_member' AND status = 'active' ORDER BY name ASC");
  },

  async updatePassword(id, passwordHash) {
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
  }
};

module.exports = User;
