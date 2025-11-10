# Quick Setup Guide

Get the WeHub.work Hotel Management System running in minutes with this streamlined setup guide. This guide is designed for rapid deployment and assumes you have basic familiarity with Node.js and PostgreSQL.

## Prerequisites

Before starting, ensure you have:

- **Node.js** v18 or higher ([Download](https://nodejs.org/))
- **PostgreSQL** v14 or higher ([Download](https://www.postgresql.org/download/))
- **Redis** v6 or higher ([Download](https://redis.io/download))
- **Git** for cloning the repository
- **npm** (comes with Node.js)

## Quick Start (5 Minutes)

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/almeida-rht/rht-hotel.git
cd rht-hotel

# Install root dependencies
npm install

# Install backend dependencies
cd api
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Database Setup

```bash
# Start PostgreSQL (if not already running)
# On Linux/Mac:
sudo systemctl start postgresql
# On Windows: Start PostgreSQL service from Services

# Create database and user
psql -U postgres << EOF
CREATE DATABASE pms_dev;
CREATE USER pms_dev WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE pms_dev TO pms_dev;
ALTER DATABASE pms_dev OWNER TO pms_dev;
EOF
```

### 3. Run Database Migrations

```bash
# Navigate to api directory
cd api

# Run migrations in order
psql -U pms_dev -d pms_dev -f migrations/001_initial_schema.sql
psql -U pms_dev -d pms_dev -f migrations/002_add_features.sql
# Continue with remaining migration files in numerical order

# Verify tables were created
psql -U pms_dev -d pms_dev -c "\dt"
```

### 4. Configure Environment

```bash
# Create environment file in root directory
cat > .env << EOF
NODE_ENV=development
PORT=3000

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=pms_dev
DATABASE_USER=pms_dev
DATABASE_PASSWORD=dev_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secret (change in production!)
JWT_SECRET=your_development_jwt_secret_min_32_chars
SESSION_SECRET=your_development_session_secret

# API URLs
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
EOF
```

### 5. Start Redis

```bash
# On Linux/Mac:
sudo systemctl start redis-server

# On Windows with WSL:
npm run redis

# Verify Redis is running:
redis-cli ping
# Should return: PONG
```

### 6. Start the Application

```bash
# Option 1: Start both frontend and backend together (recommended for development)
npm run dev

# Option 2: Start separately in different terminals
# Terminal 1 - Backend:
npm run dev:backend

# Terminal 2 - Frontend:
npm run dev:frontend
```

### 7. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Health Check**: http://localhost:3000/api/health

## Architecture Overview

The WeHub.work Hotel Management System follows a modern three-tier architecture:

-   **Frontend**: Built with Vue.js 3, providing a dynamic and responsive user interface.
-   **Backend**: A robust Node.js/Express.js API serving as the application's core logic and data provider.
-   **Database**: PostgreSQL, a powerful open-source relational database, for persistent data storage.

This separation ensures scalability, maintainability, and clear responsibilities for each layer.

## Technology Stack

The project leverages a comprehensive technology stack to deliver a high-performance and feature-rich application:

-   **Backend**: Node.js, Express.js, PostgreSQL, Redis (for caching and sessions), `jsonwebtoken` (JWT) for authentication.
-   **Frontend**: Vue.js 3 (with Composition API), PrimeVue (UI library), Tailwind CSS (for styling), Vite (build tool), Axios (HTTP client).
-   **DevOps**: Docker, Docker Compose (for containerization), PM2 (process management in production), Nodemon (for development).

## Default Login Credentials

After running migrations, you can log in with:

- **Email**: admin@example.com
- **Password**: admin123

**Important**: Change these credentials immediately after first login!

## Verify Installation

### Check Backend

```bash
# Test API health endpoint
curl http://localhost:3000/api/health

# Expected response:
# {"status":"ok","timestamp":"..."}
```

### Check Frontend

1. Open http://localhost:5173 in your browser
2. You should see the login page
3. Log in with default credentials
4. You should be redirected to the dashboard

### Check Database Connection

```bash
# Connect to database
psql -U pms_dev -d pms_dev

# List tables
\dt

# Check users table
SELECT id, email, role FROM users;

# Exit
\q
```

## Common Quick Setup Issues

### Port Already in Use

If port 3000 or 5173 is already in use:

```bash
# Find process using port 3000
# Linux/Mac:
lsof -i :3000

# Windows:
netstat -ano | findstr :3000

# Kill the process or change PORT in .env file
```

### Database Connection Failed

```bash
# Verify PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -U pms_dev -d pms_dev

# If connection fails, verify credentials in .env match database user
```

### Redis Connection Failed

```bash
# Check Redis status
redis-cli ping

# If not running, start Redis:
sudo systemctl start redis-server

# Or on Windows with WSL:
npm run redis
```

### Migration Errors

```bash
# If migrations fail, check which migrations have been applied
psql -U pms_dev -d pms_dev -c "SELECT * FROM schema_migrations;"

# Drop and recreate database if needed (WARNING: destroys all data)
psql -U postgres << EOF
DROP DATABASE IF EXISTS pms_dev;
CREATE DATABASE pms_dev;
GRANT ALL PRIVILEGES ON DATABASE pms_dev TO pms_dev;
\q
EOF

# Then re-run migrations
```

## Next Steps

Now that you have the system running:

1. **Explore the System**: Navigate through the interface to familiarize yourself with features
2. **Review Architecture**: Read the [System Overview](../architecture/system-overview.md)
3. **Setup Development Environment**: Follow the [Development Environment Setup](development-environment.md) for a complete dev setup
4. **Check Development Guidelines**: Review [Development Guidelines](../development/README.md)
5. **Explore Features**: See [Feature Documentation](../features/README.md) for detailed feature information

## Development Workflow

### Starting Development

```bash
# Start development servers with hot reload
npm run dev

# Backend runs on: http://localhost:3000
# Frontend runs on: http://localhost:5173
```

### Making Changes

- **Backend changes**: Automatically restart with nodemon
- **Frontend changes**: Hot module replacement (HMR) with Vite
- **Database changes**: Create new migration files in `api/migrations/`

### Stopping the Application

```bash
# If using npm run dev, press Ctrl+C in the terminal

# If using PM2:
npm run stop:backend

# Stop Redis (optional):
npm run redis:stop
```

## Production Deployment

For production deployment, see the comprehensive [Deployment Guide](../deployment/deployment-guide.md).

## Getting Help

- **Troubleshooting**: See [Troubleshooting Guide](../deployment/troubleshooting.md)
- **API Documentation**: Check [API Documentation](../api/README.md)
- **Feature Questions**: Review [Feature Documentation](../features/README.md)
- **Architecture Questions**: See [Architecture Documentation](../architecture/README.md)

---

*This quick setup guide gets you running fast. For a more comprehensive development environment setup, see the [Development Environment Setup](development-environment.md) guide.*
