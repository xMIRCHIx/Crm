const db = require('../config/db');

const ProgressUpdate = {
  async create({ client_id, message }) {
    const result = await db.query(
      'INSERT INTO client_progress_updates (client_id, message) VALUES (?, ?)',
      [client_id, message]
    );
    return result.insertId;
  },

  async getAllByClientId(clientId) {
    return await db.query(
      'SELECT * FROM client_progress_updates WHERE client_id = ? ORDER BY created_at DESC',
      [clientId]
    );
  },

  async delete(id) {
    await db.query('DELETE FROM client_progress_updates WHERE id = ?', [id]);
  }
};

module.exports = ProgressUpdate;
