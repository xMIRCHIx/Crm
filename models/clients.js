const db = require('../config/db');

const Client = {
  async findById(id) {
    const sql = `
      SELECT c.*, 
             COALESCE(p.paid_sum, 0) AS paid_amount, 
             (c.total_value - COALESCE(p.paid_sum, 0)) AS pending_amount,
             u.name AS creator_name
      FROM clients c
      LEFT JOIN (
        SELECT client_id, SUM(amount) AS paid_sum 
        FROM payments 
        GROUP BY client_id
      ) p ON c.id = p.client_id
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = ?
      LIMIT 1
    `;
    const rows = await db.query(sql, [id]);
    return rows[0] || null;
  },

  async create({ name, phone, email, address, service_type, status, total_value, notes, created_by }) {
    const result = await db.query(
      `INSERT INTO clients (name, phone, email, address, service_type, status, total_value, notes, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, phone || null, email || null, address || null, service_type, status || 'lead', total_value || 0, notes || null, created_by]
    );
    return result.insertId;
  },

  async update(id, { name, phone, email, address, service_type, status, total_value, notes }) {
    await db.query(
      `UPDATE clients 
       SET name = ?, phone = ?, email = ?, address = ?, service_type = ?, status = ?, total_value = ?, notes = ?
       WHERE id = ?`,
      [name, phone || null, email || null, address || null, service_type, status, total_value || 0, notes || null, id]
    );
  },

  async getAll({ search = '', status = '', service_type = '', teamMemberId = null } = {}) {
    let sql = `
      SELECT c.*, 
             COALESCE(p.paid_sum, 0) AS paid_amount, 
             (c.total_value - COALESCE(p.paid_sum, 0)) AS pending_amount
      FROM clients c
      LEFT JOIN (
        SELECT client_id, SUM(amount) AS paid_sum 
        FROM payments 
        GROUP BY client_id
      ) p ON c.id = p.client_id
    `;
    const params = [];
    const conditions = [];

    if (teamMemberId) {
      conditions.push(`c.id IN (SELECT DISTINCT client_id FROM tasks WHERE assigned_to = ?)`);
      params.push(teamMemberId);
    }

    if (search) {
      conditions.push(`(c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)`);
      const searchWild = `%${search}%`;
      params.push(searchWild, searchWild, searchWild);
    }

    if (status) {
      conditions.push(`c.status = ?`);
      params.push(status);
    }

    if (service_type) {
      conditions.push(`c.service_type = ?`);
      params.push(service_type);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY c.created_at DESC';

    return await db.query(sql, params);
  },

  async getRecentClientsForTeam(teamMemberId) {
    const sql = `
      SELECT DISTINCT c.id, c.name, c.service_type, c.status
      FROM clients c
      INNER JOIN tasks t ON c.id = t.client_id
      WHERE t.assigned_to = ?
      ORDER BY c.created_at DESC
      LIMIT 10
    `;
    return await db.query(sql, [teamMemberId]);
  },

  async getAdminStats() {
    const sql = `
      SELECT 
        COUNT(*) AS total_clients,
        COUNT(CASE WHEN status = 'lead' THEN 1 END) AS lead_count,
        COUNT(CASE WHEN status = 'ongoing' THEN 1 END) AS ongoing_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_count,
        COUNT(CASE WHEN status = 'on_hold' THEN 1 END) AS on_hold_count
      FROM clients
    `;
    const rows = await db.query(sql);
    return rows[0] || { total_clients: 0, lead_count: 0, ongoing_count: 0, completed_count: 0, on_hold_count: 0 };
  }
};

module.exports = Client;
