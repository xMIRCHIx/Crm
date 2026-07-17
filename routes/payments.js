const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin, requireAdminOrManager } = require('../middleware/auth');
const Payment = require('../models/payments');
const Client = require('../models/clients');
const ActivityLog = require('../models/activityLog');

// Apply Admin/Manager restriction to all payments routes
router.use(requireAuth, requireAdminOrManager);

// GET /payments - List all payments recorded
router.get('/', async (req, res) => {
  try {
    const payments = await Payment.getAll();
    res.render('payments/list', { payments });
  } catch (err) {
    console.error('Fetch Payments Error:', err);
    req.flash('error', 'Failed to retrieve payments ledger.');
    res.redirect('/dashboard');
  }
});

// GET /payments/new - Record payment form
router.get('/new', async (req, res) => {
  const preSelectedClient = req.query.client_id || '';

  try {
    const clients = await Client.getAll();
    res.render('payments/new', { clients, preSelectedClient });
  } catch (err) {
    console.error('New Payment Form Error:', err);
    req.flash('error', 'Failed to load page.');
    res.redirect('/payments');
  }
});

// POST /payments/new - Save payment transaction
router.post('/new', async (req, res) => {
  const { client_id, amount, payment_type, payment_mode, payment_date, notes } = req.body;

  try {
    const clientIdNum = parseInt(client_id);
    const client = await Client.findById(clientIdNum);
    
    if (!client) {
      req.flash('error', 'Selected client does not exist.');
      return res.redirect('/payments/new');
    }

    const paymentId = await Payment.create({
      client_id: clientIdNum,
      amount: parseFloat(amount),
      payment_type,
      payment_mode,
      payment_date,
      recorded_by: req.session.userId,
      notes
    });

    // Record activity log
    await ActivityLog.log(
      req.session.userId, 
      `Recorded ₹${parseFloat(amount).toLocaleString('en-IN')} payment (${payment_type}) for client: ${client.name}`, 
      'payment', 
      paymentId
    );

    req.flash('success', `Payment of ₹${parseFloat(amount).toLocaleString('en-IN')} recorded successfully.`);
    res.redirect(`/clients/${clientIdNum}`);
  } catch (err) {
    console.error('Create Payment Error:', err);
    req.flash('error', 'Failed to record payment.');
    res.redirect('/payments/new');
  }
});

module.exports = router;
