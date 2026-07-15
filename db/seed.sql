-- Insert Admin User (password: adminpassword)
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

-- Insert Team Members (password: teampassword)
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

-- Insert Clients
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

-- Insert Tasks
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

-- Insert Payments
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
