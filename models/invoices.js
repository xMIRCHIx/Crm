const db = require('../config/db');

const Invoice = {
  async findById(id) {
    const rows = await db.query(
      `SELECT i.*, c.name as client_name, c.email as client_email, c.phone as client_phone, c.address as client_address 
       FROM invoices i 
       JOIN clients c ON i.client_id = c.id 
       WHERE i.id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async getAllByClientId(clientId) {
    return await db.query(
      'SELECT * FROM invoices WHERE client_id = ? ORDER BY created_at DESC',
      [clientId]
    );
  },

  async getAll() {
    return await db.query(
      `SELECT i.*, c.name as client_name 
       FROM invoices i 
       JOIN clients c ON i.client_id = c.id 
       ORDER BY i.created_at DESC`
    );
  },

  async create({ client_id, invoice_number, amount, due_date }) {
    const result = await db.query(
      'INSERT INTO invoices (client_id, invoice_number, amount, due_date, status) VALUES (?, ?, ?, ?, "unpaid")',
      [client_id, invoice_number, amount, due_date]
    );
    return result.insertId;
  },

  async updateStatus(id, status) {
    await db.query('UPDATE invoices SET status = ? WHERE id = ?', [status, id]);
  },

  async logReminderSent(id) {
    await db.query('UPDATE invoices SET reminder_sent_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  }
};

module.exports = Invoice;
