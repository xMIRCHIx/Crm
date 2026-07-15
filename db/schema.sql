-- Users (Admin + Team Members)
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

-- Clients
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

-- Tasks
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

-- Payments
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

-- Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  action VARCHAR(255) NOT NULL,      -- e.g. 'Updated task #12 status to Completed'
  entity_type VARCHAR(50),           -- 'client' / 'task' / 'payment' / 'user'
  entity_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
