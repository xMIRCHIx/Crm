-- =============================================================================
-- GROWLIX CRM DATABASE DOCUMENT: COMPLETE SCHEMAS, SEEDS, & QUERIES
-- =============================================================================

-- =============================================================================
-- PART 1: DATABASE SCHEMA (TABLE CREATION COMMANDS)
-- =============================================================================

-- Users Table (Admin + Team Members)
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'team_member') NOT NULL DEFAULT 'team_member',
  department VARCHAR(100),          -- e.g. 'Video Editor', 'Photographer', 'Web Developer'
  phone VARCHAR(20),
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients Table
CREATE TABLE IF NOT EXISTS clients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(150),
  address TEXT,
  service_type ENUM('videography','photography','editing','social_media','web_dev','multiple') NOT NULL,
  status ENUM('lead','ongoing','completed','on_hold') DEFAULT 'lead',
  total_value DECIMAL(10,2) DEFAULT 0.00,
  notes TEXT,
  created_by INT,                   -- FK -> users.id (admin who added)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
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
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_type ENUM('advance','partial','final') NOT NULL,
  payment_mode ENUM('cash','upi','bank_transfer') NOT NULL,
  payment_date DATE NOT NULL,
  recorded_by INT,                   -- FK -> users.id (admin)
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);

-- Activity Log Table
CREATE TABLE IF NOT EXISTS activity_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  action VARCHAR(255) NOT NULL,      -- e.g. 'Updated task #12 status to Completed'
  entity_type VARCHAR(50),           -- 'client' / 'task' / 'payment' / 'user'
  entity_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);


-- =============================================================================
-- PART 2: SEED DATA (MOCK POPULATION FOR TESTING)
-- =============================================================================

-- Default Admin Account (password: adminpassword)
INSERT INTO users (name, email, password_hash, role, department, phone, status)
VALUES (
  'Growlix Admin',
  'growlixproduction@gmail.com',
  '$2a$10$wK1mY6nKWh8KkZkCgO/v3.V7aLh3P.1TjK3Zeqt2n81D3k7v0m1Z2',
  'admin',
  'Management',
  '+919876543210',
  'active'
);

-- Default Team Members (password: teampassword)
INSERT INTO users (name, email, password_hash, role, department, phone, status)
VALUES 
(
  'Aarav Sharma',
  'editor@growlix.com',
  '$2a$10$T899i5P7bYpMvAen3JmCFeQ26759y7dG2Cj8b9Q5bZ0r315/sW81a',
  'team_member',
  'Video Editor',
  '+919876543211',
  'active'
),
(
  'Isha Patel',
  'photographer@growlix.com',
  '$2a$10$T899i5P7bYpMvAen3JmCFeQ26759y7dG2Cj8b9Q5bZ0r315/sW81a',
  'team_member',
  'Photographer',
  '+919876543212',
  'active'
);

-- Default Clients
INSERT INTO clients (name, phone, email, address, service_type, status, total_value, notes, created_by)
VALUES
(
  'Acme Tech Solutions',
  '+918888888888',
  'contact@acmetech.com',
  '123, Tech Park, Sector 62, Noida, UP',
  'editing',
  'ongoing',
  50000.00,
  'Ongoing editing project for corporate branding video series.',
  1
),
(
  'Nisha Weddings',
  '+917777777777',
  'hello@nishaweddings.com',
  '456, Heritage Enclave, Udaipur, Rajasthan',
  'videography',
  'lead',
  75000.00,
  'Pre-wedding shoot and main ceremony videography lead.',
  1
),
(
  'Apex Software Corp',
  '+919999999999',
  'billing@apexsoft.com',
  '789, Cyber City, Phase III, Gurugram, Haryana',
  'multiple',
  'completed',
  120000.00,
  'Full package: Video editing, social media marketing, and photography for annual meet.',
  1
);

-- Default Tasks
INSERT INTO tasks (title, description, client_id, assigned_to, status, priority, due_date, created_by)
VALUES
(
  'Edit Promo Video V1',
  'Assemble the clips and create the first draft of the 1-minute promotional video with background music and brand lower-thirds.',
  1,
  2, -- Aarav (Video Editor)
  'in_progress',
  'high',
  DATE_ADD(CURDATE(), INTERVAL 7 DAY),
  1
),
(
  'Rough Cut Selection',
  'Sort through the raw footage and select the best takes for the Acme Tech video.',
  1,
  2, -- Aarav (Video Editor)
  'completed',
  'medium',
  DATE_SUB(CURDATE(), INTERVAL 2 DAY),
  1
),
(
  'Venue Photography Planning',
  'Contact Nisha Weddings and plan the camera angles and gear required for the Udaipur venue.',
  2,
  3, -- Isha (Photographer)
  'not_started',
  'high',
  DATE_ADD(CURDATE(), INTERVAL 3 DAY),
  1
),
(
  'Color Grade Final Meet Edit',
  'Apply the color lookup table (LUT) and grade the Apex annual meet highlights video.',
  3,
  2, -- Aarav (Video Editor)
  'completed',
  'low',
  DATE_SUB(CURDATE(), INTERVAL 4 DAY),
  1
),
(
  'Keynote Speaker Photo Retouching',
  'Clean up, edit, and crop the keynote speaker portrait photographs for Apex.',
  3,
  3, -- Isha (Photographer)
  'completed',
  'medium',
  DATE_SUB(CURDATE(), INTERVAL 5 DAY),
  1
);

-- Default Payments
INSERT INTO payments (client_id, amount, payment_type, payment_mode, payment_date, recorded_by, notes)
VALUES
(
  1,
  15000.00,
  'partial',
  'upi',
  DATE_SUB(CURDATE(), INTERVAL 5 DAY),
  1,
  'First partial payment for ongoing editing services.'
),
(
  3,
  60000.00,
  'advance',
  'bank_transfer',
  DATE_SUB(CURDATE(), INTERVAL 15 DAY),
  1,
  '50% advance payment for Apex annual meet coverage.'
),
(
  3,
  60000.00,
  'final',
  'bank_transfer',
  DATE_SUB(CURDATE(), INTERVAL 1 DAY),
  1,
  'Final settlement payment after video deliverables were handed over.'
);


-- =============================================================================
-- PART 3: APPLICATION SQL QUERY LEDGER (ALL STATEMENTS EXECUTED BY MODELS)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SECTION A: USER MANAGEMENT QUERIES (models/users.js)
-- -----------------------------------------------------------------------------

-- Query 1: Find user details by email input (authentication)
-- JS Function: User.findByEmail(email)
SELECT * FROM users WHERE email = 'input_email' LIMIT 1;

-- Query 2: Find user profile details by ID
-- JS Function: User.findById(id)
SELECT * FROM users WHERE id = 1 LIMIT 1;

-- Query 3: Register a new team member
-- JS Function: User.create(...)
INSERT INTO users (name, email, password_hash, role, department, phone, status) 
VALUES ('Name', 'email@test.com', 'hashed_pwd', 'team_member', 'Department', 'Phone', 'active');

-- Query 4: List users alongside count of their open/active tasks
-- JS Function: User.getAllWithTaskCount()
SELECT u.id, u.name, u.email, u.role, u.department, u.phone, u.status, u.created_at,
       COUNT(CASE WHEN t.status != 'completed' THEN 1 END) AS active_tasks_count
FROM users u
LEFT JOIN tasks t ON u.id = t.assigned_to
GROUP BY u.id
ORDER BY u.role ASC, u.name ASC;

-- Query 5: Fetch list of active team members
-- JS Function: User.getAllTeamMembers()
SELECT id, name, email, department FROM users WHERE role = 'team_member' AND status = 'active' ORDER BY name ASC;


-- -----------------------------------------------------------------------------
-- SECTION B: CLIENT MANAGEMENT QUERIES (models/clients.js)
-- -----------------------------------------------------------------------------

-- Query 1: Find client details with dynamic billing totals
-- JS Function: Client.findById(id)
SELECT c.*, 
       COALESCE(p.paid_sum, 0) AS paid_amount, 
       (c.total_value - COALESCE(p.paid_sum, 0)) AS pending_amount,
       u.name AS creator_name
FROM clients c
LEFT JOIN (
  SELECT client_id, SUM(amount) AS paid_sum 
  FROM payments 
  GROUP BY client_id
) p ON c.id = p.client_id
LEFT JOIN users u ON c.created_by = u.id
WHERE c.id = 1
LIMIT 1;

-- Query 2: Onboard a new client
-- JS Function: Client.create(...)
INSERT INTO clients (name, phone, email, address, service_type, status, total_value, notes, created_by) 
VALUES ('Name', 'Phone', 'Email', 'Address', 'editing', 'lead', 50000.00, 'Notes', 1);

-- Query 3: Edit client profiles
-- JS Function: Client.update(id, ...)
UPDATE clients 
SET name = 'New Name', phone = 'Phone', email = 'Email', address = 'Address', service_type = 'editing', status = 'ongoing', total_value = 60000.00, notes = 'Notes'
WHERE id = 1;

-- Query 4: Retrieve clients with filters (Search, Status, Service, Assigned Team Member)
-- JS Function: Client.getAll(filters)
SELECT c.*, 
       COALESCE(p.paid_sum, 0) AS paid_amount, 
       (c.total_value - COALESCE(p.paid_sum, 0)) AS pending_amount
FROM clients c
LEFT JOIN (
  SELECT client_id, SUM(amount) AS paid_sum 
  FROM payments 
  GROUP BY client_id
) p ON c.id = p.client_id
WHERE c.id IN (SELECT DISTINCT client_id FROM tasks WHERE assigned_to = 2) -- (If team member filters)
  AND (c.name LIKE '%search%' OR c.email LIKE '%search%' OR c.phone LIKE '%search%') -- (If search text entered)
  AND c.status = 'ongoing' -- (If status filter selected)
  AND c.service_type = 'editing' -- (If service filter selected)
ORDER BY c.created_at DESC;

-- Query 5: Get recent clients assigned to a specific team member
-- JS Function: Client.getRecentClientsForTeam(teamMemberId)
SELECT DISTINCT c.id, c.name, c.service_type, c.status
FROM clients c
INNER JOIN tasks t ON c.id = t.client_id
WHERE t.assigned_to = 2
ORDER BY c.created_at DESC
LIMIT 10;

-- Query 6: Aggregate metrics of active and pending client pipelines
-- JS Function: Client.getAdminStats()
SELECT 
  COUNT(*) AS total_clients,
  COUNT(CASE WHEN status = 'lead' THEN 1 END) AS lead_count,
  COUNT(CASE WHEN status = 'ongoing' THEN 1 END) AS ongoing_count,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_count,
  COUNT(CASE WHEN status = 'on_hold' THEN 1 END) AS on_hold_count
FROM clients;


-- -----------------------------------------------------------------------------
-- SECTION C: TASK OPERATIONS QUERIES (models/tasks.js)
-- -----------------------------------------------------------------------------

-- Query 1: Find task parameters by ID
-- JS Function: Task.findById(id)
SELECT t.*, 
       c.name AS client_name, c.email AS client_email,
       u_assignee.name AS assignee_name, u_assignee.email AS assignee_email, u_assignee.department AS assignee_department,
       u_creator.name AS creator_name
FROM tasks t
INNER JOIN clients c ON t.client_id = c.id
INNER JOIN users u_assignee ON t.assigned_to = u_assignee.id
INNER JOIN users u_creator ON t.created_by = u_creator.id
WHERE t.id = 1
LIMIT 1;

-- Query 2: Delegate a new task assignment
-- JS Function: Task.create(...)
INSERT INTO tasks (title, description, client_id, assigned_to, status, priority, due_date, created_by)
VALUES ('Title', 'Description', 1, 2, 'not_started', 'medium', '2026-07-25', 1);

-- Query 3: Edit task details
-- JS Function: Task.update(id, ...)
UPDATE tasks
SET title = 'New Title', description = 'New Desc', client_id = 1, assigned_to = 2, status = 'in_progress', priority = 'high', due_date = '2026-07-30'
WHERE id = 1;

-- Query 4: Fast updates to status badge
-- JS Function: Task.updateStatus(id, status)
UPDATE tasks SET status = 'under_review' WHERE id = 1;

-- Query 5: Fetch tasks with optional filters
-- JS Function: Task.getAll(filters)
SELECT t.*, 
       c.name AS client_name,
       u.name AS assignee_name
FROM tasks t
INNER JOIN clients c ON t.client_id = c.id
INNER JOIN users u ON t.assigned_to = u.id
WHERE t.client_id = 1 -- (If filtered by client)
  AND t.assigned_to = 2 -- (If filtered by assigned staff)
  AND t.status = 'in_progress' -- (If filtered by status)
  AND t.priority = 'high' -- (If filtered by priority)
ORDER BY t.due_date ASC, t.created_at DESC;

-- Query 6: Count tasks grouped by progression state
-- JS Function: Task.getCountsByStatus(assigned_to)
SELECT 
  COUNT(*) AS total,
  COUNT(CASE WHEN status = 'not_started' THEN 1 END) AS not_started,
  COUNT(CASE WHEN status = 'in_progress' THEN 1 END) AS in_progress,
  COUNT(CASE WHEN status = 'under_review' THEN 1 END) AS under_review,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed
FROM tasks
WHERE assigned_to = 2; -- (Appended if querying for a single team member)


-- -----------------------------------------------------------------------------
-- SECTION D: BILLING & PAYMENT QUERIES (models/payments.js)
-- -----------------------------------------------------------------------------

-- Query 1: Log credit transaction
-- JS Function: Payment.create(...)
INSERT INTO payments (client_id, amount, payment_type, payment_mode, payment_date, recorded_by, notes)
VALUES (1, 15000.00, 'partial', 'upi', '2026-07-10', 1, 'Notes');

-- Query 2: Fetch history ledger
-- JS Function: Payment.getAll()
SELECT p.*, 
       c.name AS client_name,
       u.name AS recorder_name
FROM payments p
INNER JOIN clients c ON p.client_id = c.id
INNER JOIN users u ON p.recorded_by = u.id
ORDER BY p.payment_date DESC, p.created_at DESC;

-- Query 3: Find client transaction statement
-- JS Function: Payment.findByClientId(clientId)
SELECT p.*, u.name AS recorder_name
FROM payments p
INNER JOIN users u ON p.recorded_by = u.id
WHERE p.client_id = 1
ORDER BY p.payment_date DESC;

-- Query 4: Fetch monthly income sums
-- JS Function: Payment.getRevenueForMonth(year, month)
SELECT SUM(amount) AS monthly_revenue
FROM payments
WHERE YEAR(payment_date) = 2026 AND MONTH(payment_date) = 7;

-- Query 5: Compute dynamic system dues metrics
-- JS Function: Payment.getPendingPaymentsSummary()
SELECT 
  SUM(pending_amount) AS total_pending,
  COUNT(CASE WHEN pending_amount > 0 THEN 1 END) AS pending_clients_count
FROM (
  SELECT c.total_value - COALESCE(SUM(p.amount), 0) AS pending_amount
  FROM clients c
  LEFT JOIN payments p ON c.id = p.client_id
  GROUP BY c.id
) AS client_balances;

-- Query 6: Fetch list of clients with upcoming balance installments
-- JS Function: Payment.getUpcomingPaymentsList()
SELECT c.id, c.name, c.status, c.service_type, c.total_value,
       COALESCE(p.paid_sum, 0) AS paid_amount,
       (c.total_value - COALESCE(p.paid_sum, 0)) AS pending_amount,
       p.last_payment_date
FROM clients c
LEFT JOIN (
  SELECT client_id, SUM(amount) AS paid_sum, MAX(payment_date) AS last_payment_date
  FROM payments 
  GROUP BY client_id
) p ON c.id = p.client_id
WHERE c.status IN ('ongoing', 'on_hold') 
  AND (c.total_value - COALESCE(p.paid_sum, 0)) > 0
ORDER BY p.last_payment_date ASC, c.created_at ASC;

-- Query 7: Fetch 6-month historical billing inputs
-- JS Function: Payment.getSixMonthRevenueTrend()
SELECT amount, payment_date
FROM payments
WHERE payment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
ORDER BY payment_date ASC;


-- -----------------------------------------------------------------------------
-- SECTION E: AUDIT LOGS QUERIES (models/activityLog.js)
-- -----------------------------------------------------------------------------

-- Query 1: Log audit activity
-- JS Function: ActivityLog.log(userId, action, entityType, entityId)
INSERT INTO activity_log (user_id, action, entity_type, entity_id) VALUES (1, 'Action description', 'client', 1);

-- Query 2: Fetch recent logging trail
-- JS Function: ActivityLog.getRecent(limit)
SELECT a.*, u.name AS user_name
FROM activity_log a
INNER JOIN users u ON a.user_id = u.id
ORDER BY a.created_at DESC
LIMIT 10;
