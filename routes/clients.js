const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const Client = require('../models/clients');
const User = require('../models/users');
const Task = require('../models/tasks');
const Payment = require('../models/payments');
const ActivityLog = require('../models/activityLog');
const Milestone = require('../models/milestones');
const Invoice = require('../models/invoices');
const bcrypt = require('bcryptjs');

// GET /clients - List clients (role-scoped)
router.get('/', requireAuth, async (req, res) => {
  const { search, status, service_type } = req.query;
  const isTeamMember = req.session.role === 'team_member';
  const teamMemberId = isTeamMember ? req.session.userId : null;

  try {
    const clients = await Client.getAll({
      search,
      status,
      service_type,
      teamMemberId
    });

    res.render('clients/list', {
      clients,
      filters: { search: search || '', status: status || '', service_type: service_type || '' }
    });
  } catch (err) {
    console.error('Fetch Clients Error:', err);
    req.flash('error', 'Failed to retrieve clients list.');
    res.redirect('/dashboard');
  }
});

// GET /clients/new - Show new client form (Admin only)
router.get('/new', requireAuth, requireAdmin, async (req, res) => {
  try {
    const teamMembers = await User.getAllTeamMembers();
    res.render('clients/new', { teamMembers });
  } catch (err) {
    console.error('New Client Page Error:', err);
    req.flash('error', 'Failed to load page.');
    res.redirect('/clients');
  }
});

// POST /clients/new - Create new client (Admin only)
router.post('/new', requireAuth, requireAdmin, async (req, res) => {
  const { name, phone, email, address, service_type, status, total_value, notes } = req.body;

  try {
    const clientId = await Client.create({
      name,
      phone,
      email,
      address,
      service_type,
      status,
      total_value: parseFloat(total_value || 0),
      notes,
      created_by: req.session.userId
    });

    await ActivityLog.log(req.session.userId, `Created client: ${name}`, 'client', clientId);
    req.flash('success', 'Client created successfully.');
    res.redirect(`/clients/${clientId}`);
  } catch (err) {
    console.error('Create Client Error:', err);
    req.flash('error', 'Failed to create client.');
    res.redirect('/clients/new');
  }
});

// GET /clients/:id - Client detail view (role-scoped)
router.get('/:id', requireAuth, async (req, res) => {
  const clientId = parseInt(req.params.id);
  const isTeamMember = req.session.role === 'team_member';
  const userId = req.session.userId;

  try {
    // 1. Verify access if team member (sees only if they have an assigned task for this client)
    if (isTeamMember) {
      const linkedTasks = await Task.getAll({ client_id: clientId, assigned_to: userId });
      if (linkedTasks.length === 0) {
        req.flash('error', 'Access denied. You are not assigned to any tasks for this client.');
        return res.redirect('/dashboard');
      }
    }

    // 2. Fetch Client Details
    const client = await Client.findById(clientId);
    if (!client) {
      req.flash('error', 'Client not found.');
      return res.redirect('/clients');
    }

    // 3. Fetch related Payments
    const payments = await Payment.findByClientId(clientId);

    // 4. Fetch related Tasks (if team member, filter by their tasks)
    const tasks = await Task.getAll({
      client_id: clientId,
      assigned_to: isTeamMember ? userId : null
    });

    // 5. Fetch Milestones and Progress
    const milestones = await Milestone.getAllByClientId(clientId);
    const milestoneProgress = await Milestone.getProgress(clientId);

    // 6. Fetch Invoices
    const invoices = await Invoice.getAllByClientId(clientId);

    // 7. Check if client user portal account exists
    const portalUser = await User.findByClientId(clientId);

    res.render('clients/detail', { 
      client, 
      payments, 
      tasks, 
      milestones, 
      milestoneProgress, 
      invoices, 
      portalUser 
    });
  } catch (err) {
    console.error('View Client Detail Error:', err);
    req.flash('error', 'Failed to retrieve client details.');
    res.redirect('/clients');
  }
});

// GET /clients/:id/edit - Edit form (Admin only)
router.get('/:id/edit', requireAuth, requireAdmin, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      req.flash('error', 'Client not found.');
      return res.redirect('/clients');
    }
    res.render('clients/edit', { client });
  } catch (err) {
    console.error('Edit Client Page Error:', err);
    req.flash('error', 'Failed to load page.');
    res.redirect('/clients');
  }
});

// POST /clients/:id/edit - Update client (Admin only)
router.post('/:id/edit', requireAuth, requireAdmin, async (req, res) => {
  const clientId = parseInt(req.params.id);
  const { name, phone, email, address, service_type, status, total_value, notes } = req.body;

  try {
    await Client.update(clientId, {
      name,
      phone,
      email,
      address,
      service_type,
      status,
      total_value: parseFloat(total_value || 0),
      notes
    });

    await ActivityLog.log(req.session.userId, `Updated client details: ${name}`, 'client', clientId);
    req.flash('success', 'Client details updated.');
    res.redirect(`/clients/${clientId}`);
  } catch (err) {
    console.error('Update Client Error:', err);
    req.flash('error', 'Failed to update client.');
    res.redirect(`/clients/${clientId}/edit`);
  }
});

// POST /clients/:id/delete - Delete client (Admin only)
router.post('/:id/delete', requireAuth, requireAdmin, async (req, res) => {
  const clientId = parseInt(req.params.id);

  try {
    const client = await Client.findById(clientId);
    if (!client) {
      req.flash('error', 'Client not found.');
      return res.redirect('/clients');
    }

    await Client.delete(clientId);
    await ActivityLog.log(req.session.userId, `Deleted client: ${client.name}`, 'client', clientId);

    req.flash('success', 'Client deleted successfully.');
    res.redirect('/clients');
  } catch (err) {
    console.error('Delete Client Error:', err);
    req.flash('error', 'Failed to delete client.');
    res.redirect('/clients');
  }
});

// POST /clients/:id/milestones - Add milestone (Admin only)
router.post('/:id/milestones', requireAuth, requireAdmin, async (req, res) => {
  const clientId = parseInt(req.params.id);
  const { title, description, due_date } = req.body;

  if (!title) {
    req.flash('error', 'Milestone title is required.');
    return res.redirect(`/clients/${clientId}`);
  }

  try {
    await Milestone.create({
      client_id: clientId,
      title,
      description,
      due_date: due_date || null
    });

    await ActivityLog.log(req.session.userId, `Created project milestone: ${title}`, 'client', clientId);
    req.flash('success', 'Milestone added successfully.');
    res.redirect(`/clients/${clientId}`);
  } catch (err) {
    console.error('Create Milestone Error:', err);
    req.flash('error', 'Failed to add milestone.');
    res.redirect(`/clients/${clientId}`);
  }
});

// POST /clients/:id/milestones/:mid/status - Update milestone status (Admin + Team Member)
router.post('/:id/milestones/:mid/status', requireAuth, async (req, res) => {
  const clientId = parseInt(req.params.id);
  const milestoneId = parseInt(req.params.mid);
  const { status } = req.body;

  try {
    await Milestone.updateStatus(milestoneId, status);
    await ActivityLog.log(req.session.userId, `Updated milestone status to: ${status}`, 'client', clientId);
    
    req.flash('success', 'Milestone status updated.');
    res.redirect(`/clients/${clientId}`);
  } catch (err) {
    console.error('Update Milestone Status Error:', err);
    req.flash('error', 'Failed to update milestone status.');
    res.redirect(`/clients/${clientId}`);
  }
});

// POST /clients/:id/milestones/:mid/delete - Delete milestone (Admin only)
router.post('/:id/milestones/:mid/delete', requireAuth, requireAdmin, async (req, res) => {
  const clientId = parseInt(req.params.id);
  const milestoneId = parseInt(req.params.mid);

  try {
    await Milestone.delete(milestoneId);
    await ActivityLog.log(req.session.userId, `Deleted project milestone`, 'client', clientId);

    req.flash('success', 'Milestone deleted successfully.');
    res.redirect(`/clients/${clientId}`);
  } catch (err) {
    console.error('Delete Milestone Error:', err);
    req.flash('error', 'Failed to delete milestone.');
    res.redirect(`/clients/${clientId}`);
  }
});

// POST /clients/:id/invoices - Create Invoice (Admin only)
router.post('/:id/invoices', requireAuth, requireAdmin, async (req, res) => {
  const clientId = parseInt(req.params.id);
  const { amount, due_date, invoice_number } = req.body;

  if (!amount || !due_date || !invoice_number) {
    req.flash('error', 'Invoice number, amount, and due date are required.');
    return res.redirect(`/clients/${clientId}`);
  }

  try {
    await Invoice.create({
      client_id: clientId,
      invoice_number: invoice_number.trim(),
      amount: parseFloat(amount),
      due_date
    });

    await ActivityLog.log(req.session.userId, `Created invoice: ${invoice_number}`, 'client', clientId);
    req.flash('success', 'Invoice generated successfully.');
    res.redirect(`/clients/${clientId}`);
  } catch (err) {
    console.error('Create Invoice Error:', err);
    req.flash('error', err.code === 'ER_DUP_ENTRY' ? 'Invoice number already exists.' : 'Failed to generate invoice.');
    res.redirect(`/clients/${clientId}`);
  }
});

// POST /clients/:id/invoices/:invId/status - Update Invoice Status (Admin only)
router.post('/:id/invoices/:invId/status', requireAuth, requireAdmin, async (req, res) => {
  const clientId = parseInt(req.params.id);
  const invoiceId = parseInt(req.params.invId);
  const { status } = req.body;

  try {
    await Invoice.updateStatus(invoiceId, status);
    await ActivityLog.log(req.session.userId, `Updated invoice #${invoiceId} status to ${status}`, 'client', clientId);

    req.flash('success', 'Invoice status updated.');
    res.redirect(`/clients/${clientId}`);
  } catch (err) {
    console.error('Update Invoice Status Error:', err);
    req.flash('error', 'Failed to update invoice status.');
    res.redirect(`/clients/${clientId}`);
  }
});

// POST /clients/:id/invoices/:invId/reminder - Send Reminder (Admin only)
router.post('/:id/invoices/:invId/reminder', requireAuth, requireAdmin, async (req, res) => {
  const clientId = parseInt(req.params.id);
  const invoiceId = parseInt(req.params.invId);

  try {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      req.flash('error', 'Invoice not found.');
      return res.redirect(`/clients/${clientId}`);
    }

    await Invoice.logReminderSent(invoiceId);
    
    // Log reminder activity
    await ActivityLog.log(req.session.userId, `Dispatched automated payment reminder to client for invoice ${invoice.invoice_number}`, 'client', clientId);

    req.flash('success', `Reminder logged successfully. Reminder email simulated for invoice ${invoice.invoice_number}!`);
    res.redirect(`/clients/${clientId}`);
  } catch (err) {
    console.error('Send Reminder Error:', err);
    req.flash('error', 'Failed to log reminder.');
    res.redirect(`/clients/${clientId}`);
  }
});

// GET /clients/:id/invoices/:invId/print - Print-ready Invoice view
router.get('/:id/invoices/:invId/print', requireAuth, async (req, res) => {
  const clientId = parseInt(req.params.id);
  const invoiceId = parseInt(req.params.invId);

  try {
    // Access control: admins see all, clients see their own, team members see if linked
    if (req.session.role === 'client' && req.session.clientId !== clientId) {
      req.flash('error', 'Access denied.');
      return res.redirect('/portal');
    }

    if (req.session.role === 'team_member') {
      const linkedTasks = await Task.getAll({ client_id: clientId, assigned_to: req.session.userId });
      if (linkedTasks.length === 0) {
        req.flash('error', 'Access denied.');
        return res.redirect('/dashboard');
      }
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice || invoice.client_id !== clientId) {
      req.flash('error', 'Invoice not found.');
      return res.redirect(req.session.role === 'client' ? '/portal' : `/clients/${clientId}`);
    }

    res.render('invoices/print', { invoice, layout: false });
  } catch (err) {
    console.error('Print Invoice Page Error:', err);
    req.flash('error', 'Failed to load invoice print page.');
    res.redirect(req.session.role === 'client' ? '/portal' : `/clients/${clientId}`);
  }
});

// POST /clients/:id/portal-login - Create portal login credentials for client (Admin only)
router.post('/:id/portal-login', requireAuth, requireAdmin, async (req, res) => {
  const clientId = parseInt(req.params.id);

  try {
    const client = await Client.findById(clientId);
    if (!client) {
      req.flash('error', 'Client not found.');
      return res.redirect('/clients');
    }

    if (!client.email) {
      req.flash('error', 'Client email is required to create a portal login.');
      return res.redirect(`/clients/${clientId}`);
    }

    const existingUser = await User.findByEmail(client.email.trim().toLowerCase());
    if (existingUser) {
      req.flash('error', 'A user account with this email already exists.');
      return res.redirect(`/clients/${clientId}`);
    }

    // Generate random 10-character password
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
    let tempPassword = '';
    for (let i = 0; i < 10; i++) {
      tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Create the client user record
    await User.create({
      name: client.name,
      email: client.email.trim().toLowerCase(),
      passwordHash,
      role: 'client',
      department: 'Client Portal',
      phone: client.phone || null,
      client_id: clientId
    });

    await ActivityLog.log(req.session.userId, `Created portal login for client: ${client.name}`, 'client', clientId);

    res.render('team/new-success', {
      name: client.name,
      email: client.email,
      tempPassword
    });
  } catch (err) {
    console.error('Create Client Portal Login Error:', err);
    req.flash('error', 'Failed to create client portal login.');
    res.redirect(`/clients/${clientId}`);
  }
});

module.exports = router;
