const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/users');
const ActivityLog = require('../models/activityLog');

// GET /login
router.get('/login', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('auth/login', { error: req.flash('error'), success: req.flash('success') });
});

// POST /login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    req.flash('error', 'Please provide both email and password.');
    return res.redirect('/login');
  }

  try {
    const user = await User.findByEmail(email.trim().toLowerCase());

    if (!user) {
      req.flash('error', 'Invalid email or password.');
      return res.redirect('/login');
    }

    if (user.status !== 'active') {
      req.flash('error', 'Your account has been deactivated. Please contact an admin.');
      return res.redirect('/login');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      req.flash('error', 'Invalid email or password.');
      return res.redirect('/login');
    }

    // Set session details
    req.session.userId = user.id;
    req.session.name = user.name;
    req.session.email = user.email;
    req.session.role = user.role;

    // Log the login activity
    await ActivityLog.log(user.id, 'User logged in successfully', 'user', user.id);

    req.flash('success', `Welcome back, ${user.name}!`);
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Login Error:', err);
    req.flash('error', 'An internal error occurred. Please try again.');
    res.redirect('/login');
  }
});

// GET /logout
router.get('/logout', async (req, res) => {
  const userId = req.session ? req.session.userId : null;
  if (userId) {
    await ActivityLog.log(userId, 'User logged out', 'user', userId);
  }
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login');
  });
});

module.exports = router;
