const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Ticket = require('../models/tickets');
const ActivityLog = require('../models/activityLog');

// Apply auth guard globally to all admin ticket routes
router.use(requireAuth);

// GET /tickets - List all tickets (Admin & Team Members)
router.get('/', async (req, res) => {
  try {
    const tickets = await Ticket.getAll();
    res.render('tickets/admin-list', { tickets });
  } catch (err) {
    console.error('List Tickets Error:', err);
    req.flash('error', 'Failed to retrieve support tickets.');
    res.redirect('/dashboard');
  }
});

// GET /tickets/:id - View ticket details and replies (Admin & Team Members)
router.get('/:id', async (req, res) => {
  const ticketId = parseInt(req.params.id);

  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      req.flash('error', 'Ticket not found.');
      return res.redirect('/tickets');
    }

    const replies = await Ticket.getReplies(ticketId);
    res.render('tickets/admin-detail', { ticket, replies });
  } catch (err) {
    console.error('View Ticket Details Error:', err);
    req.flash('error', 'Failed to retrieve ticket details.');
    res.redirect('/tickets');
  }
});

// POST /tickets/:id/reply - Post reply to ticket (Admin & Team Members)
router.post('/:id/reply', async (req, res) => {
  const ticketId = parseInt(req.params.id);
  const { message } = req.body;

  if (!message || !message.trim()) {
    req.flash('error', 'Reply message cannot be empty.');
    return res.redirect(`/tickets/${ticketId}`);
  }

  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      req.flash('error', 'Ticket not found.');
      return res.redirect('/tickets');
    }

    // Add reply
    await Ticket.addReply(ticketId, req.session.userId, message.trim());
    
    // Automatically set status to in_progress if open
    if (ticket.status === 'open') {
      await Ticket.updateStatus(ticketId, 'in_progress');
    }

    await ActivityLog.log(req.session.userId, `Replied to support ticket: ${ticket.title}`, 'user', req.session.userId);
    req.flash('success', 'Reply posted successfully.');
    res.redirect(`/tickets/${ticketId}`);
  } catch (err) {
    console.error('Post Ticket Reply Error:', err);
    req.flash('error', 'Failed to post reply.');
    res.redirect(`/tickets/${ticketId}`);
  }
});

// POST /tickets/:id/status - Update ticket status (Admin only)
router.post('/:id/status', async (req, res) => {
  const ticketId = parseInt(req.params.id);
  const { status } = req.body;

  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      req.flash('error', 'Ticket not found.');
      return res.redirect('/tickets');
    }

    await Ticket.updateStatus(ticketId, status);
    await ActivityLog.log(req.session.userId, `Updated support ticket status to ${status}`, 'user', req.session.userId);

    req.flash('success', `Ticket status updated to ${status}.`);
    res.redirect(`/tickets/${ticketId}`);
  } catch (err) {
    console.error('Update Ticket Status Error:', err);
    req.flash('error', 'Failed to update status.');
    res.redirect(`/tickets/${ticketId}`);
  }
});

// POST /tickets/:id/priority - Update ticket priority (Admin only)
router.post('/:id/priority', async (req, res) => {
  const ticketId = parseInt(req.params.id);
  const { priority } = req.body;

  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      req.flash('error', 'Ticket not found.');
      return res.redirect('/tickets');
    }

    await Ticket.updatePriority(ticketId, priority);
    await ActivityLog.log(req.session.userId, `Updated support ticket priority to ${priority}`, 'user', req.session.userId);

    req.flash('success', `Ticket priority updated to ${priority}.`);
    res.redirect(`/tickets/${ticketId}`);
  } catch (err) {
    console.error('Update Ticket Priority Error:', err);
    req.flash('error', 'Failed to update priority.');
    res.redirect(`/tickets/${ticketId}`);
  }
});

module.exports = router;
