const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const Task = require('../models/tasks');
const Client = require('../models/clients');
const User = require('../models/users');
const ActivityLog = require('../models/activityLog');

// GET /tasks - List tasks (role-scoped, filterable)
router.get('/', requireAuth, async (req, res) => {
  const { client_id, assigned_to, status, priority } = req.query;
  const isAdmin = req.session.role === 'admin';
  
  // Enforce team_member constraint at DB level
  const queryAssignee = isAdmin ? (assigned_to || null) : req.session.userId;

  try {
    const tasks = await Task.getAll({
      client_id: client_id || null,
      assigned_to: queryAssignee,
      status: status || '',
      priority: priority || ''
    });

    let clients = [];
    let teamMembers = [];
    if (isAdmin) {
      clients = await Client.getAll();
      teamMembers = await User.getAllTeamMembers();
    }

    res.render('tasks/list', {
      tasks,
      clients,
      teamMembers,
      filters: { 
        client_id: client_id || '', 
        assigned_to: assigned_to || '', 
        status: status || '', 
        priority: priority || '' 
      }
    });
  } catch (err) {
    console.error('Fetch Tasks Error:', err);
    req.flash('error', 'Failed to retrieve tasks.');
    res.redirect('/dashboard');
  }
});

// GET /tasks/new - Create task form (Admin only)
router.get('/new', requireAuth, requireAdmin, async (req, res) => {
  const preSelectedClient = req.query.client_id || '';
  const preSelectedAssignee = req.query.assigned_to || '';

  try {
    const clients = await Client.getAll();
    const teamMembers = await User.getAllTeamMembers();
    res.render('tasks/new', { 
      clients, 
      teamMembers, 
      preSelectedClient, 
      preSelectedAssignee 
    });
  } catch (err) {
    console.error('New Task Form Error:', err);
    req.flash('error', 'Failed to load page.');
    res.redirect('/tasks');
  }
});

// POST /tasks/new - Save new task (Admin only)
router.post('/new', requireAuth, requireAdmin, async (req, res) => {
  const { title, description, client_id, assigned_to, status, priority, due_date } = req.body;

  try {
    const taskId = await Task.create({
      title,
      description,
      client_id: parseInt(client_id),
      assigned_to: parseInt(assigned_to),
      status,
      priority,
      due_date: due_date || null,
      created_by: req.session.userId
    });

    await ActivityLog.log(req.session.userId, `Created task: ${title}`, 'task', taskId);
    req.flash('success', 'Task created and assigned successfully.');
    res.redirect(`/tasks/${taskId}`);
  } catch (err) {
    console.error('Create Task Error:', err);
    req.flash('error', 'Failed to create task.');
    res.redirect('/tasks/new');
  }
});

// GET /tasks/:id - View task details (role-scoped)
router.get('/:id', requireAuth, async (req, res) => {
  const taskId = parseInt(req.params.id);
  const isAdmin = req.session.role === 'admin';
  const userId = req.session.userId;

  try {
    const task = await Task.findById(taskId);
    if (!task) {
      req.flash('error', 'Task not found.');
      return res.redirect('/tasks');
    }

    // Role-based protection: team members can only view their own tasks
    if (!isAdmin && task.assigned_to !== userId) {
      req.flash('error', 'Access denied. You are not assigned to this task.');
      return res.redirect('/tasks');
    }

    res.render('tasks/detail', { task });
  } catch (err) {
    console.error('View Task Detail Error:', err);
    req.flash('error', 'Failed to retrieve task details.');
    res.redirect('/tasks');
  }
});

// GET /tasks/:id/edit - Edit task form (Admin only)
router.get('/:id/edit', requireAuth, requireAdmin, async (req, res) => {
  const taskId = parseInt(req.params.id);

  try {
    const task = await Task.findById(taskId);
    if (!task) {
      req.flash('error', 'Task not found.');
      return res.redirect('/tasks');
    }

    const clients = await Client.getAll();
    const teamMembers = await User.getAllTeamMembers();
    res.render('tasks/edit', { task, clients, teamMembers });
  } catch (err) {
    console.error('Edit Task Form Error:', err);
    req.flash('error', 'Failed to load page.');
    res.redirect('/tasks');
  }
});

// POST /tasks/:id/edit - Update task details (Admin only)
router.post('/:id/edit', requireAuth, requireAdmin, async (req, res) => {
  const taskId = parseInt(req.params.id);
  const { title, description, client_id, assigned_to, status, priority, due_date } = req.body;

  try {
    await Task.update(taskId, {
      title,
      description,
      client_id: parseInt(client_id),
      assigned_to: parseInt(assigned_to),
      status,
      priority,
      due_date: due_date || null
    });

    await ActivityLog.log(req.session.userId, `Updated task details: ${title}`, 'task', taskId);
    req.flash('success', 'Task details updated successfully.');
    res.redirect(`/tasks/${taskId}`);
  } catch (err) {
    console.error('Update Task Error:', err);
    req.flash('error', 'Failed to update task details.');
    res.redirect(`/tasks/${taskId}/edit`);
  }
});

// POST /tasks/:id/status - Update task status (role-scoped: Admin + Assigned user)
router.post('/:id/status', requireAuth, async (req, res) => {
  const taskId = parseInt(req.params.id);
  const { status } = req.body;
  const isAdmin = req.session.role === 'admin';
  const userId = req.session.userId;

  try {
    const task = await Task.findById(taskId);
    if (!task) {
      req.flash('error', 'Task not found.');
      return res.redirect('/tasks');
    }

    // Role-based protection: team members can only update their own tasks
    if (!isAdmin && task.assigned_to !== userId) {
      req.flash('error', 'Access denied. You cannot modify status for this task.');
      return res.redirect('/tasks');
    }

    await Task.updateStatus(taskId, status);
    await ActivityLog.log(req.session.userId, `Updated task #${taskId} status to: ${status}`, 'task', taskId);
    
    req.flash('success', 'Task status updated.');
    res.redirect(`/tasks/${taskId}`);
  } catch (err) {
    console.error('Update Task Status Error:', err);
    req.flash('error', 'Failed to update task status.');
    res.redirect(`/tasks/${taskId}`);
  }
});

module.exports = router;
