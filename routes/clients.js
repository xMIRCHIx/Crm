const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const Client = require('../models/clients');
const User = require('../models/users');
const Task = require('../models/tasks');
const Payment = require('../models/payments');
const ActivityLog = require('../models/activityLog');

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

    res.render('clients/detail', { client, payments, tasks });
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

module.exports = router;
