# Development Environment Setup

This comprehensive guide walks you through setting up a complete development environment for the WeHub.work Hotel Management System. Follow these steps to configure your local machine for efficient development.

## Overview

This guide covers:
- Complete development environment setup
- IDE configuration and recommended extensions
- Development tools and utilities
- Testing environment setup
- Debugging configuration
- Best practices for local development

## Quick Start

For a rapid setup, refer to the [Quick Setup Guide](quick-setup.md). This document provides a streamlined approach to get the system operational with minimal configuration.

## Architecture Overview

The WeHub.work Hotel Management System is built upon a robust three-tier architecture:

-   **Frontend**: A dynamic user interface developed with Vue.js.
-   **Backend**: A powerful Node.js/Express.js API handling business logic and data access.
-   **Database**: PostgreSQL, serving as the primary data store.

This modular design facilitates independent development, scaling, and maintenance of each component. For a deeper dive, consult the [System Overview](../architecture/system-overview.md).

## Technology Stack

Our development environment leverages a modern and efficient technology stack:

-   **Backend**: Node.js, Express.js, PostgreSQL, Redis, and various Node.js libraries for authentication, logging, and utilities.
-   **Frontend**: Vue.js 3 (Composition API), PrimeVue (UI components), Tailwind CSS (for styling), and Vite (for fast development builds).
-   **Development Tools**: Git, npm, Docker (for containerization), and recommended IDE extensions for VS Code.

A comprehensive list of technologies can be found in the [Technology Stack](../architecture/technology-stack.md) documentation.

## System Requirements

### Hardware Requirements
- **CPU**: 2+ cores (4+ recommended)
- **RAM**: 8GB minimum (16GB recommended)
- **Storage**: 20GB free space (SSD recommended)
- **Display**: 1920x1080 or higher resolution recommended

### Operating System
- **Linux**: Ubuntu 20.04+ or equivalent
- **macOS**: 10.15 (Catalina) or later
- **Windows**: Windows 10/11 with WSL2 (recommended for best compatibility) or native PowerShell

**Windows Users:** While native PowerShell is supported, we strongly recommend using WSL2 for the most consistent development experience, especially for database migrations and Redis. See the [WSL2 Setup Guide](#wsl2-setup-for-windows) below.

## WSL2 Setup for Windows

**Recommended for Windows users** to ensure compatibility with all development tools and scripts.

### Installing WSL2

1. **Enable WSL2** (PowerShell as Administrator):
```powershell
wsl --install
```

2. **Restart your computer** when prompted

3. **Set up Ubuntu** (default distribution):
   - Open "Ubuntu" from Start menu
   - Create a username and password
   - Update packages:
```bash
sudo apt update && sudo apt upgrade -y
```

4. **Install Windows Terminal** (optional but recommended):
   - Download from Microsoft Store
   - Provides better terminal experience

### Using WSL2 for Development

Once WSL2 is set up:

1. **Access your Windows files** from WSL2:
```bash
cd /mnt/c/Users/YourUsername/Projects
```

2. **Clone the repository** in WSL2:
```bash
git clone https://github.com/your-org/rht-hotel.git
cd rht-hotel
```

3. **Follow Linux instructions** for all subsequent setup steps

4. **Access from VS Code**:
   - Install "Remote - WSL" extension
   - Open folder in WSL: `code .` from WSL terminal
   - Or use "Open Folder in WSL" from VS Code

### Benefits of WSL2

- ✅ Native Linux environment for development
- ✅ All bash scripts work without modification
- ✅ Better performance for file operations
- ✅ Consistent with production Linux environment
- ✅ Full PostgreSQL and Redis compatibility

## Prerequisites Installation

### 1. Node.js and npm

#### Linux (Ubuntu/Debian)
```bash
# Install Node.js 24 LTS using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v24.x.x
npm --version   # Should show 11.x.x or higher
```

#### macOS
```bash
# Using Homebrew
brew install node@18

# Verify installation
node --version
npm --version
```

#### Windows
1. Download Node.js 18 LTS from [nodejs.org](https://nodejs.org/)
2. Run the installer and follow the prompts
3. Verify in Command Prompt or PowerShell:
```powershell
node --version
npm --version
```

### 2. PostgreSQL

#### Linux (Ubuntu/Debian)
```bash
# Install PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
sudo systemctl status postgresql
```

#### macOS
```bash
# Using Homebrew
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Verify installation
psql --version
```

#### Windows
1. Download PostgreSQL from [postgresql.org](https://www.postgresql.org/download/windows/)
2. Run the installer (include pgAdmin and command line tools)
3. Note the password you set for the postgres user
4. Verify in Command Prompt:
```powershell
psql --version
```

### 3. Redis

#### Linux (Ubuntu/Debian)
```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis to use systemd
sudo nano /etc/redis/redis.conf
# Set: supervised systemd

# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Verify installation
redis-cli ping  # Should return PONG
```

#### macOS
```bash
# Using Homebrew
brew install redis

# Start Redis service
brew services start redis

# Verify installation
redis-cli ping  # Should return PONG
```

#### Windows

**Option 1: WSL2 (Recommended)**

```bash
# Install Redis in WSL2 Ubuntu
sudo apt install redis-server

# Start Redis
sudo service redis-server start

# Verify
redis-cli ping  # Should return PONG
```

**Option 2: Native Windows (Using Memurai or Redis for Windows)**

1. Download Memurai (Redis-compatible) from [memurai.com](https://www.memurai.com/)
2. Install and start the service
3. Verify in PowerShell:
```powershell
redis-cli ping  # Should return PONG
```

**Note:** For consistency with the development workflow (especially for running migrations), we recommend using WSL2 on Windows. This provides a Linux environment that matches production more closely.

### 4. Git

#### Linux
```bash
sudo apt install -y git
git --version
```

#### macOS
```bash
# Git comes with Xcode Command Line Tools
xcode-select --install

# Or using Homebrew
brew install git
```

#### Windows
Download and install from [git-scm.com](https://git-scm.com/download/win)

### 5. Additional Development Tools

```bash
# Install build essentials (Linux)
sudo apt install -y build-essential

# Install useful utilities
sudo apt install -y curl wget vim htop

# Install PM2 globally (optional for local development)
npm install -g pm2

# Install nodemon globally (optional)
npm install -g nodemon
```

## Project Setup

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/rht-hotel.git
cd rht-hotel

# Checkout development branch
git checkout develop  # or main, depending on your workflow
```

### 2. Install Dependencies

```bash
# Install root-level dependencies
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

### 3. Database Configuration

#### Create Development Database

```bash
# Switch to postgres user (Linux)
sudo -u postgres psql

# Or connect directly (macOS/Windows)
psql -U postgres
```

```sql
-- Create development database
CREATE DATABASE pms_dev;

-- Create development user
CREATE USER pms_dev WITH ENCRYPTED PASSWORD 'dev_password_123';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE pms_dev TO pms_dev;
ALTER DATABASE pms_dev OWNER TO pms_dev;

-- Exit
\q
```

#### Create Test Database

```sql
-- Connect as postgres user
psql -U postgres

-- Create test database
CREATE DATABASE pms_test;
CREATE USER pms_test WITH ENCRYPTED PASSWORD 'test_password_123';
GRANT ALL PRIVILEGES ON DATABASE pms_test TO pms_test;
ALTER DATABASE pms_test OWNER TO pms_test;

\q
```

#### Run Migrations

**Linux/macOS:**

```bash
# Navigate to api directory
cd api

# Run development migrations
for file in migrations/*.sql; do
  echo "Running migration: $file"
  psql -U pms_dev -d pms_dev -f "$file"
done

# Verify migrations
psql -U pms_dev -d pms_dev -c "\dt"

# Run test migrations
for file in migrations/*.sql; do
  psql -U pms_test -d pms_test -f "$file"
done
```

**Windows (PowerShell):**

```powershell
# Navigate to api directory
cd api

# Run development migrations
Get-ChildItem migrations\*.sql | ForEach-Object {
  Write-Host "Running migration: $($_.Name)"
  psql -U pms_dev -d pms_dev -f $_.FullName
}

# Verify migrations
psql -U pms_dev -d pms_dev -c "\dt"

# Run test migrations
Get-ChildItem migrations\*.sql | ForEach-Object {
  psql -U pms_test -d pms_test -f $_.FullName
}
```

**Windows (WSL2):**

If you're using WSL2 (recommended for Windows), use the Linux/macOS commands above within your WSL2 terminal.

### 4. Environment Configuration

#### Development Environment File

Create `.env` in the project root:

```bash
# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Database - Development
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=pms_dev
DATABASE_USER=pms_dev
DATABASE_PASSWORD=dev_password_123
DATABASE_URL=postgresql://pms_dev:dev_password_123@localhost:5432/pms_dev

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=development_jwt_secret_change_in_production_min_32_chars
JWT_EXPIRATION=24h
SESSION_SECRET=development_session_secret_change_in_production
BCRYPT_ROUNDS=10

# URLs
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# Email (Development - use Mailtrap or similar)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_SECURE=false
SMTP_USER=your_mailtrap_user
SMTP_PASSWORD=your_mailtrap_password
EMAIL_FROM=dev@localhost

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Logging
LOG_FILE_PATH=./logs/app.log

# Development Features
ENABLE_DEBUG_ROUTES=true
ENABLE_QUERY_LOGGING=true
```

#### Test Environment File

Create `.env.test` in the project root:

```bash
NODE_ENV=test
PORT=3001

# Test Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=pms_test
DATABASE_USER=pms_test
DATABASE_PASSWORD=test_password_123
DATABASE_URL=postgresql://pms_test:test_password_123@localhost:5432/pms_test

# Redis (use different DB number for tests)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=1

# Test-specific settings
JWT_SECRET=test_jwt_secret_for_testing_only
SESSION_SECRET=test_session_secret
BCRYPT_ROUNDS=4  # Lower for faster tests

# Disable external services in tests
ENABLE_EMAIL=false
ENABLE_EXTERNAL_APIS=false
```

### 5. Create Required Directories

```bash
# Create logs directory
mkdir -p logs

# Create uploads directory
mkdir -p uploads

# Create test fixtures directory
mkdir -p api/tests/fixtures
mkdir -p frontend/tests/fixtures

# Set permissions
chmod 755 logs uploads
```

## IDE Setup

### Visual Studio Code (Recommended)

#### Install VS Code
Download from [code.visualstudio.com](https://code.visualstudio.com/)

#### Recommended Extensions

Install these extensions for optimal development experience:

```bash
# Essential Extensions
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension Vue.volar
code --install-extension bradlc.vscode-tailwindcss

# Database Extensions
code --install-extension ckolkman.vscode-postgres
code --install-extension mtxr.sqltools

# Git Extensions
code --install-extension eamodio.gitlens

# Utility Extensions
code --install-extension christian-kohler.path-intellisense
code --install-extension formulahendry.auto-rename-tag
code --install-extension naumovs.color-highlight
```

#### VS Code Settings

Create `.vscode/settings.json` in project root:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "vue"
  ],
  "files.associations": {
    "*.vue": "vue"
  },
  "[vue]": {
    "editor.defaultFormatter": "Vue.volar"
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "tailwindCSS.experimental.classRegex": [
    ["class:\\s*?[\"'`]([^\"'`]*).*?[\"'`]", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

#### VS Code Launch Configuration

Create `.vscode/launch.json` for debugging:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/api/index.js",
      "envFile": "${workspaceFolder}/.env",
      "console": "integratedTerminal"
    },
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug Frontend",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/frontend/src"
    }
  ]
}
```

### WebStorm / IntelliJ IDEA

#### Configuration
1. Open project in WebStorm
2. Configure Node.js interpreter: Settings → Languages & Frameworks → Node.js
3. Enable ESLint: Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
4. Enable Prettier: Settings → Languages & Frameworks → JavaScript → Prettier
5. Configure Vue.js: Settings → Languages & Frameworks → JavaScript → Frameworks → Vue.js

## Development Workflow

### Starting Development Servers

#### Option 1: Concurrent Development (Recommended)

```bash
# Start both frontend and backend with hot reload
npm run dev

# This runs:
# - Backend on http://localhost:3000 (with nodemon)
# - Frontend on http://localhost:5173 (with Vite HMR)
```

#### Option 2: Separate Terminals

```bash
# Terminal 1 - Backend
cd api
npm run dev
# or
npm run dev:backend

# Terminal 2 - Frontend
cd frontend
npm run dev
# or
npm run dev:frontend
```

#### Option 3: Using PM2 (Production-like)

```bash
# Start backend with PM2
npm run start:backend:dev

# Start frontend separately
npm run dev:frontend

# View PM2 logs
pm2 logs backend-dev

# Stop PM2 process
npm run stop:backend:dev
```

### Database Management

#### Accessing Database

```bash
# Connect to development database
psql -U pms_dev -d pms_dev

# Common commands:
\dt              # List tables
\d table_name    # Describe table
\du              # List users
\l               # List databases
\q               # Quit
```

#### Creating Migrations

```bash
# Create new migration file
cd api/migrations
touch $(date +%Y%m%d%H%M%S)_description.sql

# Example migration structure:
-- Migration: Add new feature
-- Date: 2024-01-15

BEGIN;

-- Your SQL changes here
ALTER TABLE reservations ADD COLUMN new_field VARCHAR(255);

COMMIT;
```

#### Running Migrations

**Run Specific Migration:**

```bash
# Linux/macOS/WSL2
psql -U pms_dev -d pms_dev -f api/migrations/20240115_add_feature.sql
```

```powershell
# Windows PowerShell
psql -U pms_dev -d pms_dev -f api\migrations\20240115_add_feature.sql
```

**Run All Pending Migrations:**

**Linux/macOS/WSL2:**

```bash
cd api
for file in migrations/*.sql; do
  echo "Running migration: $file"
  psql -U pms_dev -d pms_dev -f "$file"
done
```

**Windows (PowerShell):**

```powershell
cd api
Get-ChildItem migrations\*.sql | ForEach-Object {
  Write-Host "Running migration: $($_.Name)"
  psql -U pms_dev -d pms_dev -f $_.FullName
}
```

### Redis Management

```bash
# Connect to Redis CLI
redis-cli

# Common commands:
PING                    # Test connection
KEYS *                  # List all keys (dev only!)
GET key_name            # Get value
DEL key_name            # Delete key
FLUSHDB                 # Clear current database (dev only!)
INFO                    # Server information
QUIT                    # Exit
```

### Testing

#### Backend Tests

```bash
# Run all backend tests
cd api
npm test

# Run specific test file
npm test -- tests/models/reservation.test.js

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

#### Frontend Tests

```bash
# Run all frontend tests
cd frontend
npm test

# Run tests with UI
npm run test:ui

# Run specific test
npm test -- src/components/ReservationForm.test.js

# Run tests with coverage
npm run test:coverage
```

### Debugging

#### Backend Debugging

##### Using VS Code
1. Set breakpoints in your code
2. Press F5 or use Debug → Start Debugging
3. Select "Debug Backend" configuration
4. Debug in the integrated debugger

##### Using Chrome DevTools
```bash
# Start backend with inspect flag
node --inspect api/index.js

# Open Chrome and navigate to:
chrome://inspect

# Click "inspect" under your Node.js process
```

##### Using Console Logging
```javascript
// Use Winston logger (preferred)
const logger = require('./utils/logger');
logger.debug('Debug message', { data: someData });
logger.info('Info message');
logger.error('Error message', error);
```
**Important:** While `console.log` can be used for transient local debugging, **it must never be committed to the repository.** All logging intended for the codebase should use the Winston logger. Any `console.log` statements found in committed code will be flagged during code review.


#### Frontend Debugging

##### Using Browser DevTools
1. Open application in browser (http://localhost:5173)
2. Open DevTools (F12)
3. Use Console, Network, and Vue DevTools tabs

##### Using Vue DevTools
1. Install Vue DevTools browser extension
2. Open DevTools
3. Navigate to Vue tab
4. Inspect components, state, and events

### Code Quality Tools

#### ESLint

```bash
# Run ESLint on backend
cd api
npx eslint .

# Fix auto-fixable issues
npx eslint . --fix

# Run ESLint on frontend
cd frontend
npm run lint
```

#### Prettier

```bash
# Format all files
npx prettier --write "**/*.{js,vue,json,md}"

# Check formatting
npx prettier --check "**/*.{js,vue,json,md}"
```

## Development Best Practices

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit frequently
git add .
git commit -m "feat: add new feature"

# Keep branch updated
git fetch origin
git rebase origin/develop

# Push changes
git push origin feature/your-feature-name
```

### Commit Message Convention

Follow conventional commits format:

```
feat: add new reservation feature
fix: resolve date picker bug
docs: update API documentation
style: format code with prettier
refactor: restructure reservation service
test: add unit tests for billing
chore: update dependencies
```

### Code Review Checklist

Before submitting pull requests:

- [ ] Code follows project style guidelines
- [ ] All tests pass
- [ ] New features have tests
- [ ] Documentation is updated
- [ ] No console.log statements (use logger)
- [ ] Environment variables are documented
- [ ] Database migrations are included
- [ ] No sensitive data in code

## Troubleshooting Development Issues

### Port Conflicts

```bash
# Find process using port
lsof -i :3000  # Linux/Mac
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # Linux/Mac
taskkill /PID <PID> /F  # Windows
```

### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check connection
psql -U pms_dev -d pms_dev -c "SELECT 1;"
```

### Redis Connection Issues

```bash
# Check Redis status
redis-cli ping

# Restart Redis
sudo systemctl restart redis-server

# Check Redis logs
sudo journalctl -u redis-server -n 50
```

### Node Modules Issues

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear npm cache
npm cache clean --force
```

### Build Issues

```bash
# Clear Vite cache
cd frontend
rm -rf node_modules/.vite

# Rebuild
npm run build
```

## Performance Optimization

### Development Server Performance

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Or in package.json scripts:
"dev": "NODE_OPTIONS='--max-old-space-size=4096' nodemon api/index.js"
```

### Database Query Optimization

```sql
-- Enable query timing
\timing

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM reservations WHERE hotel_id = 1;

-- Check slow queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;
```

## Next Steps

Now that your development environment is set up:

1. **Review Coding Standards**: Read [Development Guidelines](../development/README.md)
2. **Understand Architecture**: Study [System Architecture](../architecture/system-overview.md)
3. **Explore Features**: Check [Feature Documentation](../features/README.md)
4. **Learn API**: Review [API Documentation](../api/README.md)
5. **Start Contributing**: Follow [Contribution Guide](../development/contribution-guide.md)

## Additional Resources

- **[Quick Setup Guide](quick-setup.md)** - Fast setup for experienced developers
- **[Deployment Guide](../deployment/deployment-guide.md)** - Production deployment
- **[Troubleshooting](../deployment/troubleshooting.md)** - Common issues and solutions
- **[Testing Strategy](../development/testing-strategy.md)** - Testing approaches

---

*This development environment setup provides everything you need for productive development. For questions or issues, consult the troubleshooting section or reach out to the team.*
