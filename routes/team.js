const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const User = require('../models/users');
const Task = require('../models/tasks');
const ActivityLog = require('../models/activityLog');
const bcrypt = require('bcryptjs');

// Apply requireAdmin middleware to ALL team management routes
router.use(requireAuth, requireAdmin);

// GET /team - List team members with task counts
router.get('/', async (req, res) => {
  try {
    const teamMembers = await User.getAllWithTaskCount();
    // Exclude current logged in user if they want, but let's list everyone
    res.render('team/list', { teamMembers });
  } catch (err) {
    console.error('Fetch Team Members Error:', err);
    req.flash('error', 'Failed to retrieve team members list.');
    res.redirect('/dashboard');
  }
});

// GET /team/new - Show new team member form
router.get('/new', (req, res) => {
  res.render('team/new');
});

// POST /team/new - Create team member (generates random password)
router.post('/new', async (req, res) => {
  const { name, email, department, phone } = req.body;

  if (!name || !email) {
    req.flash('error', 'Please provide name and email.');
    return res.redirect('/team/new');
  }

  try {
    // Check if user already exists
    const existing = await User.findByEmail(email.trim().toLowerCase());
    if (existing) {
      req.flash('error', 'A user with this email address already exists.');
      return res.redirect('/team/new');
    }

    // Generate random 10-character password
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
    let tempPassword = '';
    for (let i = 0; i < 10; i++) {
      tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Create user in DB
    const userId = await User.create({
      name,
      email: email.trim().toLowerCase(),
      passwordHash,
      role: 'team_member',
      department,
      phone
    });

    await ActivityLog.log(req.session.userId, `Created team member: ${name}`, 'user', userId);
    
    // Render password confirmation page
    res.render('team/new-success', {
      name,
      email,
      tempPassword
    });
  } catch (err) {
    console.error('Create Team Member Error:', err);
    req.flash('error', 'Failed to create team member.');
    res.redirect('/team/new');
  }
});

// GET /team/:id - Team member detail and workload view
router.get('/:id', async (req, res) => {
  const memberId = parseInt(req.params.id);

  try {
    const member = await User.findById(memberId);
    if (!member) {
      req.flash('error', 'Team member not found.');
      return res.redirect('/team');
    }

    // Fetch member's tasks
    const tasks = await Task.getAll({ assigned_to: memberId });
    
    // Fetch stats
    const stats = await Task.getCountsByStatus(memberId);

    res.render('team/detail', { member, tasks, stats });
  } catch (err) {
    console.error('View Team Member Detail Error:', err);
    req.flash('error', 'Failed to load details.');
    res.redirect('/team');
  }
});

// POST /team/:id/reset-password - Reset password (generates random password)
router.post('/:id/reset-password', async (req, res) => {
  const memberId = parseInt(req.params.id);

  try {
    const member = await User.findById(memberId);
    if (!member) {
      req.flash('error', 'Team member not found.');
      return res.redirect('/team');
    }

    // Generate random 10-character password
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
    let tempPassword = '';
    for (let i = 0; i < 10; i++) {
      tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Update password in DB
    await User.updatePassword(memberId, passwordHash);

    await ActivityLog.log(req.session.userId, `Reset password for team member: ${member.name}`, 'user', memberId);

    // Render password confirmation page
    res.render('team/new-success', {
      name: member.name,
      email: member.email,
      tempPassword
    });
  } catch (err) {
    console.error('Reset Password Error:', err);
    req.flash('error', 'Failed to reset password.');
    res.redirect(`/team/${memberId}`);
  }
});

// POST /team/:id/delete - Delete team member (Admin only)
router.post('/:id/delete', async (req, res) => {
  const memberId = parseInt(req.params.id);

  if (memberId === req.session.userId) {
    req.flash('error', 'You cannot delete your own administrative account.');
    return res.redirect('/team');
  }

  try {
    const member = await User.findById(memberId);
    if (!member) {
      req.flash('error', 'Team member not found.');
      return res.redirect('/team');
    }

    await User.delete(memberId);
    await ActivityLog.log(req.session.userId, `Deleted team member: ${member.name}`, 'user', memberId);

    req.flash('success', 'Team member deleted successfully.');
    res.redirect('/team');
  } catch (err) {
    console.error('Delete Team Member Error:', err);
    req.flash('error', 'Failed to delete team member.');
    res.redirect('/team');
  }
});

module.exports = router;
