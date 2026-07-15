const db = require('../config/db');

const Task = {
  async findById(id) {
    const sql = `
      SELECT t.*, 
             c.name AS client_name, c.email AS client_email,
             u_assignee.name AS assignee_name, u_assignee.email AS assignee_email, u_assignee.department AS assignee_department,
             u_creator.name AS creator_name
      FROM tasks t
      INNER JOIN clients c ON t.client_id = c.id
      INNER JOIN users u_assignee ON t.assigned_to = u_assignee.id
      INNER JOIN users u_creator ON t.created_by = u_creator.id
      WHERE t.id = ?
      LIMIT 1
    `;
    const rows = await db.query(sql, [id]);
    return rows[0] || null;
  },

  async create({ title, description, client_id, assigned_to, status, priority, due_date, created_by }) {
    const result = await db.query(
      `INSERT INTO tasks (title, description, client_id, assigned_to, status, priority, due_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description || null, client_id, assigned_to, status || 'not_started', priority || 'medium', due_date || null, created_by]
    );
    return result.insertId;
  },

  async update(id, { title, description, client_id, assigned_to, status, priority, due_date }) {
    await db.query(
      `UPDATE tasks
       SET title = ?, description = ?, client_id = ?, assigned_to = ?, status = ?, priority = ?, due_date = ?
       WHERE id = ?`,
      [title, description || null, client_id, assigned_to, status, priority, due_date || null, id]
    );
  },

  async updateStatus(id, status) {
    await db.query('UPDATE tasks SET status = ? WHERE id = ?', [status, id]);
  },

  async getAll({ client_id = null, assigned_to = null, status = '', priority = '' } = {}) {
    let sql = `
      SELECT t.*, 
             c.name AS client_name,
             u.name AS assignee_name
      FROM tasks t
      INNER JOIN clients c ON t.client_id = c.id
      INNER JOIN users u ON t.assigned_to = u.id
    `;
    const params = [];
    const conditions = [];

    if (client_id) {
      conditions.push('t.client_id = ?');
      params.push(client_id);
    }

    if (assigned_to) {
      conditions.push('t.assigned_to = ?');
      params.push(assigned_to);
    }

    if (status) {
      conditions.push('t.status = ?');
      params.push(status);
    }

    if (priority) {
      conditions.push('t.priority = ?');
      params.push(priority);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY t.due_date ASC, t.created_at DESC';

    return await db.query(sql, params);
  },

  async getCountsByStatus(assigned_to = null) {
    let sql = `
      SELECT 
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 'not_started' THEN 1 END) AS not_started,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) AS in_progress,
        COUNT(CASE WHEN status = 'under_review' THEN 1 END) AS under_review,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed
      FROM tasks
    `;
    const params = [];
    if (assigned_to) {
      sql += ' WHERE assigned_to = ?';
      params.push(assigned_to);
    }
    const rows = await db.query(sql, params);
    return rows[0] || { total: 0, not_started: 0, in_progress: 0, under_review: 0, completed: 0 };
  }
};

module.exports = Task;
