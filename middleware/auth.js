const db = require('../config/db');

/**
 * Middleware to check if database is connected.
 * If not, displays the database setup page.
 */
function dbGuard(req, res, next) {
  if (!db.isConnected()) {
    return res.render('db-setup', {
      dbError: db.getError(),
      layout: false // Do not use main layout for DB setup page
    });
  }
  next();
}

/**
 * Middleware to require the user to be authenticated.
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    req.flash('error', 'Please log in to access this page.');
    return res.redirect('/login');
  }
  next();
}

/**
 * Middleware to restrict access to Admins only.
 */
function requireAdmin(req, res, next) {
  if (req.session.role !== 'admin') {
    req.flash('error', 'Access denied. Administrator privileges required.');
    return res.redirect('/dashboard');
  }
  next();
}

/**
 * Middleware to restrict access to Admins or Managers.
 */
function requireAdminOrManager(req, res, next) {
  if (req.session.role !== 'admin' && req.session.role !== 'manager') {
    req.flash('error', 'Access denied. Administrator or Manager privileges required.');
    return res.redirect('/dashboard');
  }
  next();
}

/**
 * Middleware to restrict access to Clients only.
 */
function requireClient(req, res, next) {
  if (req.session.role !== 'client') {
    req.flash('error', 'Access denied. Client privileges required.');
    return res.redirect('/login');
  }
  next();
}

/**
 * Helper middleware to expose session details to all EJS templates.
 */
function exposeSession(req, res, next) {
  res.locals.user = req.session ? {
    id: req.session.userId,
    name: req.session.name,
    email: req.session.email,
    role: req.session.role,
    clientId: req.session.clientId
  } : null;
  res.locals.flash = {
    success: req.flash('success'),
    error: req.flash('error')
  };
  res.locals.path = req.path;
  next();
}

module.exports = {
  dbGuard,
  requireAuth,
  requireAdmin,
  requireAdminOrManager,
  requireClient,
  exposeSession
};
