const db = require('../config/db');

const Payment = {
  async create({ client_id, amount, payment_type, payment_mode, payment_date, recorded_by, notes }) {
    const result = await db.query(
      `INSERT INTO payments (client_id, amount, payment_type, payment_mode, payment_date, recorded_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [client_id, amount, payment_type, payment_mode, payment_date, recorded_by, notes || null]
    );
    return result.insertId;
  },

  async getAll() {
    const sql = `
      SELECT p.*, 
             c.name AS client_name,
             u.name AS recorder_name
      FROM payments p
      INNER JOIN clients c ON p.client_id = c.id
      INNER JOIN users u ON p.recorded_by = u.id
      ORDER BY p.payment_date DESC, p.created_at DESC
    `;
    return await db.query(sql);
  },

  async findByClientId(clientId) {
    const sql = `
      SELECT p.*, u.name AS recorder_name
      FROM payments p
      INNER JOIN users u ON p.recorded_by = u.id
      WHERE p.client_id = ?
      ORDER BY p.payment_date DESC
    `;
    return await db.query(sql, [clientId]);
  },

  async getRevenueForMonth(year, month) {
    const sql = `
      SELECT SUM(amount) AS monthly_revenue
      FROM payments
      WHERE YEAR(payment_date) = ? AND MONTH(payment_date) = ?
    `;
    const rows = await db.query(sql, [year, month]);
    return parseFloat(rows[0].monthly_revenue || 0);
  },

  async getPendingPaymentsSummary() {
    // Total pending payments = Sum(c.total_value) - Sum(p.amount)
    // and count of clients with pending dues > 0
    const sql = `
      SELECT 
        SUM(pending_amount) AS total_pending,
        COUNT(CASE WHEN pending_amount > 0 THEN 1 END) AS pending_clients_count
      FROM (
        SELECT c.total_value - COALESCE(SUM(p.amount), 0) AS pending_amount
        FROM clients c
        LEFT JOIN payments p ON c.id = p.client_id
        GROUP BY c.id
      ) AS client_balances
    `;
    const rows = await db.query(sql);
    return {
      amount: parseFloat(rows[0].total_pending || 0),
      count: parseInt(rows[0].pending_clients_count || 0)
    };
  },

  async getUpcomingPaymentsList() {
    // PRD: upcoming payments = clients with on_hold or ongoing status where pending > 0, 
    // sorted by last payment date (proxy for follow-up priority)
    const sql = `
      SELECT c.id, c.name, c.status, c.service_type, c.total_value,
             COALESCE(p.paid_sum, 0) AS paid_amount,
             (c.total_value - COALESCE(p.paid_sum, 0)) AS pending_amount,
             p.last_payment_date
      FROM clients c
      LEFT JOIN (
        SELECT client_id, SUM(amount) AS paid_sum, MAX(payment_date) AS last_payment_date
        FROM payments 
        GROUP BY client_id
      ) p ON c.id = p.client_id
      WHERE c.status IN ('ongoing', 'on_hold') 
        AND (c.total_value - COALESCE(p.paid_sum, 0)) > 0
      ORDER BY p.last_payment_date ASC, c.created_at ASC
    `;
    return await db.query(sql);
  },

  async getSixMonthRevenueTrend() {
    // Get last 6 months' payments to aggregate in JS
    const sql = `
      SELECT amount, payment_date
      FROM payments
      WHERE payment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      ORDER BY payment_date ASC
    `;
    return await db.query(sql);
  }
};

module.exports = Payment;
