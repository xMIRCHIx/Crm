const express = require('express');
const router = express.Router();
const { requireAuth, requireClient } = require('../middleware/auth');
const Client = require('../models/clients');
const Milestone = require('../models/milestones');
const Invoice = require('../models/invoices');
const Ticket = require('../models/tickets');
const ActivityLog = require('../models/activityLog');

// Apply guards globally to all portal routes
router.use(requireAuth, requireClient);

// GET /portal - Client portal dashboard
router.get('/', async (req, res) => {
  const clientId = req.session.clientId;

  try {
    const client = await Client.findById(clientId);
    if (!client) {
      req.flash('error', 'Client profile not found.');
      return res.redirect('/login');
    }

    const milestones = await Milestone.getAllByClientId(clientId);
    const progress = await Milestone.getProgress(clientId);
    const invoices = await Invoice.getAllByClientId(clientId);
    const tickets = await Ticket.getAllByClientId(clientId);

    res.render('portal/dashboard', {
      client,
      milestones,
      progress,
      invoices,
      tickets
    });
  } catch (err) {
    console.error('Client Portal Dashboard Error:', err);
    res.status(500).send('Internal Server Error');
  }
});

// GET /portal/invoices - Client invoices list
router.get('/invoices', async (req, res) => {
  const clientId = req.session.clientId;

  try {
    const invoices = await Invoice.getAllByClientId(clientId);
    const client = await Client.findById(clientId);
    res.render('portal/invoices', { invoices, client });
  } catch (err) {
    console.error('Client Portal Invoices Error:', err);
    res.redirect('/portal');
  }
});

// GET /portal/tickets - Client tickets list
router.get('/tickets', async (req, res) => {
  const clientId = req.session.clientId;

  try {
    const tickets = await Ticket.getAllByClientId(clientId);
    const client = await Client.findById(clientId);
    res.render('portal/tickets', { tickets, client });
  } catch (err) {
    console.error('Client Portal Tickets Error:', err);
    res.redirect('/portal');
  }
});

// GET /portal/tickets/new - Open new ticket form
router.get('/tickets/new', async (req, res) => {
  res.render('portal/ticket-new');
});

// POST /portal/tickets/new - Submit new ticket
router.post('/tickets/new', async (req, res) => {
  const clientId = req.session.clientId;
  const { title, description, category, priority } = req.body;

  if (!title || !description || !category) {
    req.flash('error', 'Please fill in all required fields.');
    return res.redirect('/portal/tickets/new');
  }

  try {
    await Ticket.create({
      client_id: clientId,
      title,
      description,
      category,
      priority: priority || 'medium'
    });

    await ActivityLog.log(req.session.userId, `Submitted support ticket: ${title}`, 'client', clientId);
    req.flash('success', 'Support ticket submitted successfully.');
    res.redirect('/portal/tickets');
  } catch (err) {
    console.error('Create Ticket Error:', err);
    req.flash('error', 'Failed to submit support ticket.');
    res.redirect('/portal/tickets/new');
  }
});

// GET /portal/tickets/:id - View support ticket and replies
router.get('/tickets/:id', async (req, res) => {
  const clientId = req.session.clientId;
  const ticketId = parseInt(req.params.id);

  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket || ticket.client_id !== clientId) {
      req.flash('error', 'Support ticket not found.');
      return res.redirect('/portal/tickets');
    }

    const replies = await Ticket.getReplies(ticketId);
    res.render('portal/ticket-detail', { ticket, replies });
  } catch (err) {
    console.error('View Ticket Details Error:', err);
    res.redirect('/portal/tickets');
  }
});

// POST /portal/tickets/:id/reply - Reply to support ticket
router.post('/tickets/:id/reply', async (req, res) => {
  const clientId = req.session.clientId;
  const ticketId = parseInt(req.params.id);
  const { message } = req.body;

  if (!message || !message.trim()) {
    req.flash('error', 'Reply message cannot be empty.');
    return res.redirect(`/portal/tickets/${ticketId}`);
  }

  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket || ticket.client_id !== clientId) {
      req.flash('error', 'Ticket not found.');
      return res.redirect('/portal/tickets');
    }

    // Add reply
    await Ticket.addReply(ticketId, req.session.userId, message.trim());
    
    // Auto re-open ticket if it was resolved
    if (ticket.status === 'resolved') {
      await Ticket.updateStatus(ticketId, 'open');
    }

    await ActivityLog.log(req.session.userId, 'Replied to support ticket', 'client', clientId);
    req.flash('success', 'Reply posted successfully.');
    res.redirect(`/portal/tickets/${ticketId}`);
  } catch (err) {
    console.error('Reply Ticket Error:', err);
    req.flash('error', 'Failed to post reply.');
    res.redirect(`/portal/tickets/${ticketId}`);
  }
});

module.exports = router;
