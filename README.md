# Hotel Management System

A comprehensive hotel property management system designed to streamline hotel operations, from reservations and client management to billing and reporting.

## Quick Navigation

- [Getting Started](#getting-started) - Setup and installation guide
- [Documentation](#documentation) - Comprehensive system documentation
- [Features](#features) - Key system capabilities
- [Architecture](#architecture) - System design overview
- [Development](#development) - Development guidelines and best practices
- [Support](#support) - Help and troubleshooting resources

## Getting Started

### Quick Setup

1. **Prerequisites**: Node.js, PostgreSQL, Redis
2. **Database**: Run migration scripts from `api/migrations/` in numerical order
3. **Backend**: `cd api && npm install && npm start`
4. **Frontend**: `cd frontend && npm install && npm run dev`

For detailed setup instructions, see our [Deployment Guide](docs/operations/deployment-guide.md).

## Documentation

Our comprehensive documentation is organized into the following sections:

### 📋 Requirements & Specifications
- [Business Requirements](docs/requirements/business-requirements.md) - Business objectives and value statements
- [Functional Requirements](docs/requirements/functional-requirements.md) - System functionality specifications
- [Non-Functional Requirements](docs/requirements/non-functional-requirements.md) - Performance, security, and quality requirements
- [Requirements Traceability](docs/requirements/requirements-traceability.md) - Mapping from requirements to implementation

### 🏗️ System Design
- [System Architecture](docs/design/system-architecture.md) - High-level system design and component overview
- [Data Models](docs/design/data-models.md) - Database schema and entity relationships
- [API Design](docs/design/api-design.md) - REST API specifications and integration patterns
- [Component Diagrams](docs/design/component-diagrams.md) - Visual system component relationships
- [Data Flow Architecture](docs/design/data-flow-architecture.md) - Data movement and processing flows

### 🎯 Feature Documentation
- [Reservation Management](docs/features/reservation-management/feature-specification.md) - Core booking and reservation functionality
- [Client Management & CRM](docs/features/client-management-crm/feature-specification.md) - Customer relationship management features
- [Waitlist System](docs/features/waitlist-system/feature-specification.md) - Guest waitlist and notification system

### 🔧 Operations & Maintenance
- [Deployment Guide](docs/operations/deployment-guide.md) - Complete setup and deployment instructions
- [Troubleshooting](docs/operations/troubleshooting.md) - Common issues and solutions

## Project Overview

This is a comprehensive Hotel Management System designed to streamline hotel operations including reservations, client management, billing, reporting, and OTA integration. The system features a Node.js/Express backend with PostgreSQL database and a Vue.js frontend with PrimeVue components.

## Features

### Core Capabilities
- **Reservation Management** - Complete booking lifecycle with calendar interface
- **Client Management & CRM** - Customer profiles, communication tracking, and relationship management
- **Waitlist System** - Guest waitlist management with automated notifications
- **Billing & Invoicing** - Flexible pricing, plans, addons, and automated invoice generation
- **Reporting & Analytics** - Comprehensive operational metrics and insights
- **User Management** - Role-based access control and authentication (including Google OAuth)

### Integration & Technical Features
- **OTA Integration** - XML-based communication with Online Travel Agencies
- **Data Import/Export** - CSV and Excel support for various data sources
- **Real-time Updates** - Socket.io for live notifications and updates
- **Email Notifications** - Automated communications via nodemailer
- **Japanese Language Support** - Full text processing and conversion capabilities
- **Comprehensive Logging** - System and audit trail capabilities

For detailed feature specifications and implementation status, see our [Feature Documentation](#-feature-documentation) section above.

## Architecture

### Technology Stack
- **Backend**: Node.js, Express.js, PostgreSQL, Redis
- **Frontend**: Vue.js, PrimeVue, Tailwind CSS, Vite
- **Key Libraries**: Socket.io, JWT, Puppeteer, ECharts, Kuroshiro (Japanese support)

For detailed architecture information, see our [System Architecture](docs/design/system-architecture.md) documentation.

## Development

### Development Guidelines
For detailed coding guidelines, component usage conventions, and best practices, see our [Development Guidelines](instructions.md).

### Project Structure
- `/api` - Backend Node.js Express application
- `/frontend` - Vue.js frontend application  
- `/docs` - Comprehensive system documentation
- `/postgres` - Database backups and utilities
- `/scripts` - Development and deployment utilities

For detailed project structure information, see our [System Architecture](docs/design/system-architecture.md) documentation.

## Support

### Getting Help
- **Troubleshooting**: See our [Troubleshooting Guide](docs/operations/troubleshooting.md) for common issues and solutions
- **API Documentation**: Detailed API information available in `api/README.md`
- **Google OAuth Setup**: See `api/LOGIN_WITH_GOOGLE.md` for authentication configuration

### Contributing
For contribution guidelines and development standards, see our [Development Guidelines](instructions.md).

### Additional Resources
- [System Architecture](ARCHITECTURE.md) - Detailed technical architecture documentation
- Legacy design documents: `data_aggregation_strategies_postgresql.md`, `key_reservation_metrics_recommendations.md`, `multi_hotel_presentation_strategy.md`, `WAITLIST_STRATEGY.md`

## License

[Details to be added by project maintainers]
