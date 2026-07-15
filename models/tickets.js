const db = require('../config/db');

const Ticket = {
  async findById(id) {
    const rows = await db.query(
      `SELECT t.*, c.name as client_name 
       FROM tickets t 
       JOIN clients c ON t.client_id = c.id 
       WHERE t.id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async getAllByClientId(clientId) {
    return await db.query(
      'SELECT * FROM tickets WHERE client_id = ? ORDER BY created_at DESC',
      [clientId]
    );
  },

  async getAll() {
    return await db.query(
      `SELECT t.*, c.name as client_name 
       FROM tickets t 
       JOIN clients c ON t.client_id = c.id 
       ORDER BY t.status ASC, t.created_at DESC`
    );
  },

  async create({ client_id, title, description, category, priority }) {
    const result = await db.query(
      `INSERT INTO tickets (client_id, title, description, category, priority, status) 
       VALUES (?, ?, ?, ?, ?, 'open')`,
      [client_id, title, description, category, priority || 'medium']
    );
    return result.insertId;
  },

  async updateStatus(id, status) {
    await db.query('UPDATE tickets SET status = ? WHERE id = ?', [status, id]);
  },

  async addReply(ticketId, userId, message) {
    await db.query(
      'INSERT INTO ticket_replies (ticket_id, user_id, message) VALUES (?, ?, ?)',
      [ticketId, userId, message]
    );
  },

  async getReplies(ticketId) {
    return await db.query(
      `SELECT tr.*, u.name as user_name, u.role as user_role 
       FROM ticket_replies tr 
       JOIN users u ON tr.user_id = u.id 
       WHERE tr.ticket_id = ? 
       ORDER BY tr.created_at ASC`,
      [ticketId]
    );
  }
};

module.exports = Ticket;
