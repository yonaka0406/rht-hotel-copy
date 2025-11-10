# Getting Started

Welcome to the WeHub.work Hotel Management System! This section will help you get up and running quickly, whether you're a new developer, system administrator, or business stakeholder.

## Quick Start

This guide provides a rapid introduction to the system. For detailed setup, refer to the [Quick Setup Guide](quick-setup.md).

## Quick Navigation

- **[Quick Setup Guide](quick-setup.md)** - Get the system running in minutes
- **[Prerequisites](prerequisites.md)** - Essential software and configurations
- **[Installation Guide](installation.md)** - Step-by-step installation instructions
- **[Development Environment Setup](development-environment.md)** - Set up your local development environment
- **[First-Time User Guide](first-time-user-guide.md)** - Orientation for new users

## Choose Your Path

### 👨‍💻 I'm a Developer
1. [Set up development environment](development-environment.md)
2. [Review system architecture](../architecture/system-overview.md)
3. [Check coding standards](../development/coding-standards.md)
4. [Run your first tests](../development/testing-strategy.md)

### 🔧 I'm a System Administrator
1. [Quick deployment setup](quick-setup.md)
2. [Full deployment guide](../deployment/deployment-guide.md)
3. [Environment configuration](../deployment/environment-setup.md)
4. [Monitoring setup](../deployment/monitoring-logging.md)

### 📊 I'm a Business Stakeholder
1. [System overview](first-time-user-guide.md)
2. [Feature capabilities](../features/README.md)
3. [Integration options](../integrations/README.md)
4. [Deployment status](../deployment/README.md)

## Prerequisites

Before getting started, ensure you have:

- **Node.js** (v18 or higher)
- **PostgreSQL** (v13 or higher)
- **Git** for version control
- **Docker** (optional, for containerized deployment)

## Installation

Follow these steps to install and set up the system:

1.  **Clone the repository**: `git clone [repository-url]`
2.  **Install dependencies**: `npm install` in both `api/` and `frontend/` directories
3.  **Database setup**: Run migration scripts
4.  **Environment variables**: Configure `.env` files

## Architecture Overview

The system follows a three-tier architecture:

-   **Frontend**: Vue.js application
-   **Backend**: Node.js/Express.js API
-   **Database**: PostgreSQL

For a detailed overview, see the [Architecture Overview](../architecture/README.md).

## Technology Stack

Key technologies used in the project:

-   **Backend**: Node.js, Express.js, PostgreSQL, Redis
-   **Frontend**: Vue.js 3, PrimeVue, Tailwind CSS
-   **DevOps**: Docker, PM2

For a complete list, see the [Technology Stack](../architecture/technology-stack.md).

## Next Steps

Once you've completed the initial setup:

1. **Explore the system**: Review the [feature documentation](../features/README.md)
2. **Understand integrations**: Check [integration options](../integrations/README.md)
3. **Learn development practices**: Review [development guidelines](../development/README.md)
4. **Set up monitoring**: Configure [monitoring and logging](../deployment/monitoring-logging.md)

## Need Help?

- **Technical issues**: Check the [troubleshooting guide](../deployment/troubleshooting.md)
- **Development questions**: Review [development documentation](../development/README.md)
- **Integration support**: See [integration guides](../integrations/README.md)

---

*For detailed technical information, see the [Architecture Overview](../architecture/README.md)*