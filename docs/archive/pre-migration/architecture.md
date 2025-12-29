# System Architecture Overview

This document provides a high-level overview of the Hotel Management System architecture. For detailed technical specifications, please refer to our comprehensive [Design Documentation](docs/design/).

## Quick Navigation

- [System Overview](#system-overview) - High-level system design
- [Technology Stack](#technology-stack) - Core technologies and frameworks
- [Component Architecture](#component-architecture) - Major system components
- [Data Architecture](#data-architecture) - Database and data flow design
- [Integration Patterns](#integration-patterns) - External system integrations
- [Detailed Documentation](#detailed-documentation) - Links to comprehensive design docs

## System Overview

The Hotel Management System is a comprehensive property management solution built with modern web technologies. The system follows a three-tier architecture pattern with clear separation of concerns:

### High-Level Architecture
- **Presentation Layer**: Vue.js frontend with PrimeVue components
- **Application Layer**: Node.js/Express.js REST API with business logic
- **Data Layer**: PostgreSQL database with Redis caching

### Key Architectural Principles
- **Microservices-Ready**: Modular design supporting future service decomposition
- **Event-Driven**: Real-time updates via Socket.io for live notifications
- **Security-First**: JWT authentication, role-based access control, input validation
- **Performance-Optimized**: Data aggregation strategies, caching, and optimized queries

## Technology Stack

### Backend Technologies
- **Runtime**: Node.js with Express.js framework
- **Database**: PostgreSQL with Redis for caching and sessions
- **Authentication**: JWT tokens with bcryptjs hashing
- **Real-time**: Socket.io for live updates
- **File Processing**: Multer for uploads, Playwright for PDF generation
- **External Integration**: XML/SOAP for OTA connectivity

### Frontend Technologies
- **Framework**: Vue.js 3 with Composition API
- **UI Library**: PrimeVue 4+ with Tailwind CSS 4
- **Build Tool**: Vite for fast development and optimized builds
- **Charts**: ECharts for data visualization
- **HTTP Client**: Axios for API communication

### Supporting Technologies
- **Process Management**: PM2 for production deployment
- **Language Support**: Kuroshiro for Japanese text processing
- **Logging**: Winston for comprehensive system logging

## Component Architecture

### Core System Components
- **API Layer**: Express.js routes, controllers, and middleware
- **Business Logic**: Service layer with domain-specific operations
- **Data Access**: Repository pattern with PostgreSQL models
- **Authentication**: JWT-based auth with role-based permissions
- **Real-time Engine**: Socket.io for live updates and notifications
- **Background Jobs**: Scheduled tasks for maintenance and processing

### Frontend Architecture
- **Component Structure**: Vue 3 Composition API with reusable components
- **State Management**: Composable stores for reactive data management
- **UI Framework**: PrimeVue components with Tailwind CSS styling
- **Routing**: Vue Router for single-page application navigation
- **Data Visualization**: ECharts integration for reporting and analytics

## Data Architecture

### Database Design
- **Primary Database**: PostgreSQL with normalized schema design
- **Caching Layer**: Redis for session storage and performance optimization
- **Data Aggregation**: Materialized views and summary tables for reporting
- **Migration System**: Versioned SQL scripts for schema evolution

### Key Data Entities
- **Hotels & Rooms**: Property and inventory management
- **Clients & Reservations**: Customer and booking lifecycle
- **Billing & Plans**: Pricing, addons, and financial transactions
- **Users & Permissions**: Authentication and authorization
- **Waitlist & Notifications**: Guest queue and communication system

## Integration Patterns

### External System Integration
- **OTA Connectivity**: XML/SOAP integration with Online Travel Agencies
- **Payment Processing**: Secure payment gateway integration
- **Email Services**: SMTP integration for automated notifications
- **Google Services**: OAuth authentication and API integrations

### Internal Communication
- **REST API**: Standard HTTP endpoints for CRUD operations
- **Real-time Events**: WebSocket connections for live updates
- **Background Processing**: Asynchronous job queues for heavy operations


## Detailed Documentation

For comprehensive technical specifications and detailed design information, please refer to our structured documentation:

### 📋 Requirements Documentation
- [Business Requirements](docs/requirements/business-requirements.md) - Business objectives and value statements
- [Functional Requirements](docs/requirements/functional-requirements.md) - System functionality specifications
- [Non-Functional Requirements](docs/requirements/non-functional-requirements.md) - Performance, security, and quality requirements

### 🏗️ Design Documentation
- [System Architecture](docs/design/system-architecture.md) - Detailed technical architecture and patterns
- [Data Models](docs/design/data-models.md) - Database schema and entity relationships
- [API Design](docs/design/api-design.md) - REST API specifications and integration patterns
- [Data Flow Architecture](docs/design/data-flow-architecture.md) - Data movement and processing flows
- [Component Diagrams](docs/design/component-diagrams.md) - Visual system component relationships

### 🎯 Feature Specifications
- [Reservation Management](docs/features/reservation-management/feature-specification.md) - Core booking functionality
- [Client Management & CRM](docs/features/client-management-crm/feature-specification.md) - Customer relationship management
- [Waitlist System](docs/features/waitlist-system/feature-specification.md) - Guest waitlist and notification system

### 🔧 Operations Documentation
- [Deployment Guide](docs/operations/deployment-guide.md) - Setup and deployment instructions
- [Troubleshooting](docs/operations/troubleshooting.md) - Common issues and solutions

## Legacy Design Documents

The following documents contain detailed technical specifications that have been consolidated into the structured documentation above:

- **Data Aggregation Strategies**: Detailed PostgreSQL aggregation techniques for dashboard performance
- **Key Reservation Metrics**: Comprehensive metric definitions and calculation methods  
- **Multi-Hotel Presentation Strategy**: Portfolio management and multi-property display patterns

These legacy documents remain available for reference but should be considered superseded by the structured documentation in the `docs/` directory.