# Growlix CRM

A professional, aesthetic, and role-based internal Client Relationship Management (CRM) web application built for Growlix Production.

## Features

- **Role-based Authentication**:
  - **Admin**: Full access across clients, team members, tasks, and payments.
  - **Team Member**: Access restricted to their assigned tasks and associated clients only.
- **Performance Analytics**: Visual monthly revenues and 6-month transaction trends via Chart.js on the dashboard.
- **Client & Billing Operations**: Lead status pipelines, project valuations, and payment ledgers with automatic balance reconciliation.
- **Workload Delegations**: Assignments, status boards, and priorities managed under strict SQL-level data filters for team members.
- **Graceful DB Fallback**: Starts without crashing when database credentials are not configured or offline, redirecting users to a configuration setup dashboard.

---

## Tech Stack

- **Backend**: Node.js + Express
- **Template Engine**: EJS (Server-side rendering with sidebar/header layout partials)
- **Styling**: Tailwind CSS (compiled via CLI)
- **Database**: MariaDB / MySQL (via connection pool with `mysql2/promise`)
- **Sessions & Auth**: `express-session` (MemoryStore) + `bcryptjs` (hash)
- **Visuals**: Chart.js, FontAwesome

---

## Folder Structure

```text
/config       -> db.js (connection pool setup, reads from .env)
/db           -> schema.sql (table definitions), seed.sql (sample data)
/middleware   -> auth.js (authentication and DB availability guards)
/models       -> SQL queries grouped by table (users, clients, tasks, payments)
/public       -> input.css, compiled output.css, assets
/routes       -> auth.js, dashboard.js, clients.js, team.js, tasks.js, payments.js
/views        -> template files with layouts separated by user roles
server.js     -> entry point
```

---

## Local Setup Instructions

### 1. Install Dependencies
Run the command to install packages:
```bash
npm install
```

### 2. Configure Environment variables
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```
Fill in your local MySQL/MariaDB credentials:
```text
PORT=3000
SESSION_SECRET=your_secret_key
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=growlix_crm
```

### 3. Initialize Database
Create a database named `growlix_crm` (or matching your `DB_NAME` value).
Run the schema script to create tables, followed by the seed script to load mock data:
```bash
mysql -u root -p growlix_crm < db/schema.sql
mysql -u root -p growlix_crm < db/seed.sql
```

### 4. Build Styles (Tailwind)
Compile input CSS into optimized static layout styles:
```bash
npm run build:css
```

### 5. Run Server
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your web browser.

---

## Seed Credentials

After seeding, use the following logins to test different roles:

- **Admin Account**:
  - **Email**: `growlixproduction@gmail.com`
  - **Password**: `adminpassword`

- **Team Member Account (Video Editor)**:
  - **Email**: `editor@growlix.com`
  - **Password**: `teampassword`

- **Team Member Account (Photographer)**:
  - **Email**: `photographer@growlix.com`
  - **Password**: `teampassword`
