Build a complete, working CRM web application called "Growlix CRM" based on the attached PRD (growlix-crm-prd.md). Follow the PRD exactly for roles, features, routes, and database schema. Do NOT connect to a live database yet — use a `.env.example` file with placeholder values, and make sure the app fails gracefully with a clear console message if DB credentials aren't set. I will plug in real Hostinger MySQL credentials later.

## Tech Stack
- Node.js + Express
- EJS templating (with partials for header/sidebar/footer, and separate layouts for admin vs team_member roles)
- Tailwind CSS (via CLI build, not CDN — set up a proper build pipeline with `npm run build:css`)
- MariaDB/MySQL (use `mysql2` package with connection pooling, `mysql2/promise` for async/await)
- express-session for auth (MemoryStore for now, note in comments that it should move to a DB-backed session store in production)
- bcrypt for password hashing
- Chart.js (via CDN or npm) for the dashboard revenue chart
- dotenv for environment config

## Project Setup
1. Initialize `package.json` with all required dependencies (express, ejs, mysql2, bcrypt, express-session, dotenv, connect-flash for flash messages)
2. Set up folder structure:
```
/config       -> db.js (connection pool setup, reads from .env)
/middleware   -> auth.js (requireAuth, requireAdmin, scopeToOwnTasks)
/routes       -> auth.js, dashboard.js, clients.js, team.js, tasks.js, payments.js
/controllers  -> matching controller files with the actual logic
/models       -> db query functions per table (users.js, clients.js, tasks.js, payments.js)
/views
  /partials   -> header.ejs, sidebar-admin.ejs, sidebar-team.ejs, footer.ejs, flash-messages.ejs
  /auth       -> login.ejs
  /dashboard  -> admin.ejs, team.ejs
  /clients    -> list.ejs, new.ejs, detail.ejs, edit.ejs
  /team       -> list.ejs, new.ejs, detail.ejs
  /tasks      -> list.ejs, new.ejs, detail.ejs, edit.ejs
  /payments   -> list.ejs, new.ejs
/public
  /css        -> input.css (Tailwind directives) and output.css (generated)
  /js         -> any client-side JS (e.g. chart rendering, month selector)
/db
  -> schema.sql (full CREATE TABLE statements from the PRD, exactly as specified)
  -> seed.sql (a few sample rows: 1 admin user, 2 team members, 3 clients, 5 tasks, 3 payments — for local testing only)
.env.example
server.js (entry point)
```

## Build Order (do this step by step, verify each step works before moving to the next)
1. Scaffold `package.json`, install dependencies, set up Tailwind build pipeline
2. Create `db/schema.sql` exactly matching the schema in the PRD (users, clients, tasks, payments, activity_log tables)
3. Create `config/db.js` — a MySQL connection pool using `mysql2/promise`, reading host/user/password/database/port from `process.env`
4. Build auth: login page, session-based login/logout, password check with bcrypt, `requireAuth` and `requireAdmin` middleware
5. Build the role-based layout: after login, admin sees full sidebar (Dashboard, Clients, Team, Tasks, Payments), team_member sees only (Dashboard, My Tasks)
6. Build Dashboard:
   - Admin dashboard: revenue this month, pending payments total, upcoming payments list, total clients count, total team members, task status breakdown, a month selector dropdown that re-queries data, and a Chart.js bar chart for last-6-months revenue
   - Team member dashboard: their own task counts by status, their linked clients only
7. Build Client Management (admin-only for create/edit/delete): list view with search/filter by status and service type, add client form, client detail page showing linked tasks and payment history, edit form
8. Build Team Management (admin-only): list of team members with active task count, add team member form (auto-generates a temporary password, admin can see/copy it once), team member detail page
9. Build Task Management: admin sees all tasks with filters (by team member, client, status), can create/assign/reassign; team member sees ONLY their own tasks and can update status via a simple dropdown/button
10. Build Payment Tracking (admin-only): record a payment against a client, list all payments, auto-recalculate the client's pending amount
11. Wire up the `scopeToOwnTasks` middleware so all task and client queries for a team_member role are filtered by `assigned_to = req.session.userId` at the SQL level, not just hidden in the UI
12. Add basic activity_log inserts on key actions (task status change, client created, payment recorded)
13. Write `db/seed.sql` with realistic sample data so I can log in and see a populated dashboard immediately

## Design Direction
- Clean, professional dashboard aesthetic — not generic Bootstrap-looking. Use Tailwind with a neutral base (slate/gray) and one accent color (use a warm amber/gold, similar spirit to `#C29B5C` used in my other Growlix/Template Theory projects) for primary buttons, active nav states, and key metrics
- Sidebar navigation (fixed left), top bar with logged-in user name + role badge + logout
- Dashboard cards should be clear and scannable — big number, small label, no clutter
- Tables need to be readable on a laptop screen — sortable-looking headers, status shown as small colored pill badges (e.g. green=completed, amber=in_progress, gray=not_started, red=on_hold)
- Mobile responsiveness is not a priority for v1 — desktop-first is fine

## Important Constraints
- Do not hardcode any DB credentials anywhere in the code — everything through `.env`
- Do not implement Phase 2 features (invoicing, Razorpay, client portal, notifications) — stick strictly to the PRD's v1 scope
- Add a root-level `README.md` explaining how to: install dependencies, set up `.env` from `.env.example`, run `schema.sql` + `seed.sql` against a local MySQL instance, run `npm run build:css`, and start the dev server
- After scaffolding, run the app locally (if a local MySQL is available) and confirm login works with a seeded admin user; otherwise clearly report what still needs a live DB connection to test

Once this is done, I will connect it to my real Hostinger MySQL database and deploy via Git import on Hostinger.
