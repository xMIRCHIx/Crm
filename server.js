const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Setup Template Engine (EJS)
const ejs = require('ejs');
app.engine('ejs', (filePath, data, callback) => {
  ejs.renderFile(filePath, data, { client: false }, callback);
});
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body Parser Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Request Logging (Helper to trace path routing issues in production)
app.use((req, res, next) => {
  console.log(`[ROUTE-TRACE] Method: ${req.method} | OriginalURL: ${req.originalUrl} | Path: ${req.path}`);
  next();
});

// Serve Static Assets
app.use(express.static(path.join(__dirname, 'public')));

// Session Middleware (MemoryStore for local testing, should use a DB-backed session store like connect-session-sequelize or connect-redis in production)
app.use(session({
  secret: process.env.SESSION_SECRET || 'growlix_crm_secret_key_change_me_in_prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000 // 1 day session longevity
  }
}));

// Connect-Flash for flash message notifications
app.use(flash());

// Import Auth Middleware
const { dbGuard, exposeSession } = require('./middleware/auth');

// Expose session variables and flash messages to EJS templates globally
app.use(exposeSession);

// Unprotected Auth Routes
app.use('/', require('./routes/auth'));

// Protected, DB-Guarded Feature Routes
app.use('/dashboard', dbGuard, require('./routes/dashboard'));
app.use('/clients', dbGuard, require('./routes/clients'));
app.use('/team', dbGuard, require('./routes/team'));
app.use('/tasks', dbGuard, require('./routes/tasks'));
app.use('/payments', dbGuard, require('./routes/payments'));
app.use('/portal', dbGuard, require('./routes/portal'));
app.use('/tickets', dbGuard, require('./routes/tickets'));

// Root route redirect
app.get('/', (req, res) => {
  if (req.session && req.session.role === 'client') {
    return res.redirect('/portal');
  }
  res.redirect('/dashboard');
});

// 404 Route handler
app.use((req, res) => {
  res.status(404).render('db-setup', {
    dbError: '404 - Page Not Found. Make sure you are logged in and navigating valid endpoints.',
    layout: false
  });
});

// Start Server
app.listen(PORT, () => {
  console.log('==================================================');
  console.log(`  Growlix CRM running locally on port: ${PORT}     `);
  console.log(`  Access dashboard at: http://localhost:${PORT}      `);
  console.log('==================================================');
});
