# Growlix CRM — Product Requirements Document

## 1. Overview

Growlix CRM ek internal tool hai jo Growlix Production ke team members aur clients ko manage karega. Growlix multiple services deliver karta hai — videography, photography, video editing, social media marketing, web/software development — aur is CRM ka goal hai in sab services ke across client aur team ka kaam ek jagah track karna.

**Core problems it solves:**
- Kaun sa client kis stage pe hai (lead → ongoing → completed) — visibility nahi thi
- Kisko kaunsa task assign hai, uska status kya hai — scattered tha
- Revenue, pending payments, upcoming payments — Excel/manual tracking ho raha tha
- Team members ka access unregulated tha — sabko sab dikhta tha ya kuch bhi organized nahi tha

**Out of scope for v1:** invoicing/PDF generation, client-facing portal, payment gateway integration (Razorpay etc.), automated WhatsApp/email reminders. In sab ko Phase 2 mein rakha hai (section 8).

---

## 2. User Roles & Permissions

### 2.1 Admin
- Full access — sabhi clients, sabhi team members, sabhi tasks, sabhi payments
- Create/edit/delete: clients, team members, tasks, payment records
- Assign tasks to any team member
- Create team member accounts (team members can't self-register)
- View dashboard with company-wide aggregated data

### 2.2 Team Member
- Login with individual credentials (created by admin)
- Sees **only** their own assigned tasks and the clients linked to those tasks
- Can update task status (e.g. Not Started → In Progress → Under Review → Completed)
- Cannot see other team members' data, cannot see revenue/payment figures
- Cannot create/delete clients or other team members

> Admin ID aur team member ID dono same `users` table mein honge, differentiate karne ke liye ek `role` column (`admin` / `team_member`).

---

## 3. Core Modules

### 3.1 Authentication
- Simple email/username + password login (bcrypt hashed)
- Session-based auth (`express-session` + MariaDB session store, ya JWT — teri call, default: session-based kyunki EJS server-rendered hai)
- Role-based route protection middleware (`isAdmin`, `isAuthenticated`)
- No public signup — admin creates all accounts

### 3.2 Dashboard

**Admin Dashboard:**
- Total Revenue (monthly, with month selector/filter — changeable as tune bola)
- Pending Payments (amount + count of clients with pending dues)
- Upcoming Payments (next due dates, sorted)
- Total Clients (active / completed / lead breakdown)
- Total Team Members (active count)
- Task overview: total tasks, in-progress, completed this month
- Quick chart: Revenue trend (last 6 months) — bar/line chart

**Team Member Dashboard:**
- My assigned tasks (count by status)
- My clients (only clients linked to their tasks)
- No revenue/payment data visible

### 3.3 Client Management (Admin only for create/edit)
Fields:
- Client name
- Contact number, email
- Address
- Service type (Videography / Photography / Editing / Social Media / Web Dev / Multiple)
- Status (Lead → Ongoing → Completed → On Hold)
- Total project value (₹)
- Amount paid / Amount pending (auto-calculated from payment records)
- Assigned team member(s)
- Notes/remarks
- Created date, last updated

List view: searchable/filterable table (by status, service type, assigned team member)
Detail view: client profile page — shows linked tasks, payment history, timeline of updates

### 3.4 Team Management (Admin only)
Fields:
- Name, email, phone
- Role (Admin / Team Member)
- Department/specialty (Video Editor / Photographer / Social Media / Web Dev)
- Status (Active / Inactive)
- Login credentials (auto-generated password on creation, or admin sets it)

Admin view: list of all team members with their current task load (count of active tasks)
Team member view: their own profile only

### 3.5 Task Management
Fields:
- Task title, description
- Linked client
- Assigned to (team member)
- Status (Not Started / In Progress / Under Review / Completed)
- Priority (Low / Medium / High)
- Due date
- Created by (admin), created date

Admin: create task, assign/reassign, view all tasks (filterable by team member, client, status)
Team member: view only their own tasks, update status

### 3.6 Payment Tracking
Fields:
- Linked client
- Amount, payment date, payment type (Advance / Partial / Final)
- Mode (Cash / UPI / Bank Transfer)
- Recorded by (admin)
- Notes

This feeds directly into Dashboard's Revenue / Pending / Upcoming numbers.
Pending amount = Client's total project value − sum of payments recorded.

---

## 4. Database Schema (MariaDB)

```sql
-- Users (Admin + Team Members)
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'team_member') NOT NULL DEFAULT 'team_member',
  department VARCHAR(100),          -- e.g. 'Video Editor', 'Photographer'
  phone VARCHAR(20),
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients
CREATE TABLE clients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(150),
  address TEXT,
  service_type ENUM('videography','photography','editing','social_media','web_dev','multiple') NOT NULL,
  status ENUM('lead','ongoing','completed','on_hold') DEFAULT 'lead',
  total_value DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_by INT,                   -- FK -> users.id (admin who added)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Tasks
CREATE TABLE tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  client_id INT NOT NULL,
  assigned_to INT NOT NULL,          -- FK -> users.id
  status ENUM('not_started','in_progress','under_review','completed') DEFAULT 'not_started',
  priority ENUM('low','medium','high') DEFAULT 'medium',
  due_date DATE,
  created_by INT,                    -- FK -> users.id (admin)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Payments
CREATE TABLE payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_type ENUM('advance','partial','final') NOT NULL,
  payment_mode ENUM('cash','upi','bank_transfer') NOT NULL,
  payment_date DATE NOT NULL,
  recorded_by INT,                   -- FK -> users.id (admin)
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);

-- Activity Log (optional but useful for admin audit trail)
CREATE TABLE activity_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  action VARCHAR(255) NOT NULL,      -- e.g. 'Updated task #12 status to Completed'
  entity_type VARCHAR(50),           -- 'client' / 'task' / 'payment' / 'user'
  entity_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 5. Page / Route Structure

```
/login                          -> Login page

/dashboard                      -> Role-based: admin sees full, team sees own

/clients                        -> List (admin only)
/clients/new                    -> Add client (admin only)
/clients/:id                    -> Client detail (admin; team sees only if linked)
/clients/:id/edit               -> Edit client (admin only)

/team                           -> List of team members (admin only)
/team/new                       -> Add team member (admin only)
/team/:id                       -> Team member detail (admin only)

/tasks                          -> Admin: all tasks | Team: own tasks only
/tasks/new                      -> Create task (admin only)
/tasks/:id                      -> Task detail
/tasks/:id/edit                 -> Edit/reassign (admin only)
/tasks/:id/status               -> Update status (team member + admin)

/payments                       -> List (admin only)
/payments/new                   -> Record payment (admin only)

/profile                        -> Own profile (all roles)
/logout
```

Middleware:
- `requireAuth` on all routes except `/login`
- `requireAdmin` on client/team/payment create-edit-delete routes
- `scopeToOwnTasks` on `/tasks` and `/dashboard` for team_member role — filters queries by `assigned_to = req.session.userId`

---

## 6. Tech Stack

- **Backend:** Node.js + Express
- **Templating:** EJS (server-rendered, partials for navbar/sidebar based on role)
- **Styling:** Tailwind CSS
- **DB:** MariaDB
- **Auth:** express-session + bcrypt
- **Charts (dashboard):** Chart.js (lightweight, works fine with EJS + vanilla JS)
- **Optional:** GSAP for subtle dashboard/table transitions — not core, skip if it slows down build

---

## 7. Dashboard Data Logic (Monthly, Changeable)

- Dashboard default view = current month
- Month selector dropdown (or prev/next arrows) — re-queries data for selected month
- Revenue (selected month) = SUM(payments.amount) WHERE MONTH(payment_date) = selected
- Pending = SUM(clients.total_value) − SUM(all payments received for that client), aggregated across active clients
- Upcoming payments = clients with `on_hold`/`ongoing` status where pending > 0, sorted by last payment date (proxy for follow-up priority) — since there's no explicit "due date" field per payment yet, consider adding `expected_payment_date` to clients table if you want true "upcoming" tracking (flagging this as a v1.1 addition)

---

## 8. Phase 2 (Future Scope — not in v1)

- Client-facing portal (view their own project status)
- Auto invoice generation (PDF)
- Razorpay integration for online payments
- WhatsApp/email automated reminders (tu already WATI use kar raha hai Eklavya mein — reusable pattern)
- File/asset upload per client (deliverables, drafts)
- Comments/activity feed per task
- Notifications (task assigned, deadline approaching)

---

## 9. Open Question for You

Ek cheez decide karni hai — payments table mein abhi koi "due date" field nahi hai (sirf jab payment aaya tab record hota hai). "Upcoming Payments" ko dashboard pe properly show karne ke liye behtar hoga agar `clients` table mein `next_payment_due_date` field add kar de, jo admin manually set kare. Bata de agar chahiye — schema mein add kar dunga.
