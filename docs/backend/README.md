# Backend Development

This section provides comprehensive documentation for backend development in the WeHub.work Hotel Management System, built with Node.js and Express.js.

## Quick Navigation

- **[Service Architecture](service-architecture.md)** - Backend service design and patterns
- **[Database Schema](database-schema.md)** - PostgreSQL schema and relationships
- **[Business Logic](business-logic.md)** - Business rules and validation
- **[Background Jobs](background-jobs.md)** - Async processing and scheduled tasks
- **[Testing Backend](testing-backend.md)** - Backend testing strategies

## Backend Architecture Overview

The backend follows a layered architecture pattern with clear separation of concerns:

### 🏗️ **Technology Stack**
- **Node.js** with Express.js framework
- **PostgreSQL** for primary data storage
- **Redis** for caching and session management
- **JWT** for authentication and authorization
- **Winston** for comprehensive logging
- **PM2** for process management in production

### 📦 **Project Structure**
```
api/
├── controllers/         # Request handlers and route logic
├── models/             # Database models and schemas
├── services/           # Business logic layer
├── middleware/         # Express middleware functions
├── routes/             # API route definitions
├── utils/              # Utility functions and helpers
├── config/             # Configuration files
├── migrations/         # Database migration scripts
├── tests/              # Backend test suites
└── jobs/               # Background job definitions
```

## Backend Architecture Overview

The backend follows a layered architecture pattern with clear separation of concerns:

### 🏗️ **Technology Stack**
- **Node.js** with Express.js framework
- **PostgreSQL** for primary data storage
- **Redis** for caching and session management
- **JWT** for authentication and authorization
- **Winston** for comprehensive logging
- **PM2** for process management in production

### 📦 **Project Structure**
```
api/
├── controllers/         # Request handlers and route logic
├── models/             # Database models and schemas
├── services/           # Business logic layer
├── middleware/         # Express middleware functions
├── routes/             # API route definitions
├── utils/              # Utility functions and helpers
├── config/             # Configuration files
├── migrations/         # Database migration scripts
├── tests/              # Backend test suites
└── jobs/               # Background job definitions
```

## Service Architecture

The backend is structured around a service-oriented architecture, where each service encapsulates specific business logic and interacts with its own data models. This promotes modularity, reusability, and easier maintenance.

### Key Principles:

-   **Separation of Concerns**: Each service has a single responsibility.
-   **Loose Coupling**: Services interact via well-defined interfaces.
-   **Scalability**: Services can be scaled independently.

## Business Logic

The business logic layer is responsible for implementing the core rules and processes of the application. It resides within the `services/` directory and is designed to be independent of the underlying data storage or presentation layers.

### Key Aspects:

-   **Validation**: Ensures data integrity and adherence to business rules.
-   **Transactions**: Manages complex operations that require atomicity.
-   **Domain-Specific Operations**: Encapsulates the unique logic of the hotel management system.

## Configuration

### Environment Variables and Configuration Management
The application relies heavily on environment variables for sensitive information and environment-specific settings. These are managed using `dotenv` for local development (see `api/.env` example) and typically injected via the deployment environment in production. Configuration files in `api/config/` (e.g., `appConfig.js`, `database.js`) load these variables, providing a structured way to access settings. Key variables include `DB_USER`, `JWT_SECRET`, `REDIS_HOST`, and `EMAIL_HOST`.

### Database Connection Pooling Configuration
Database connections are managed via a connection pool to optimize performance and resource usage. The `api/config/database.js` file configures the `pg` pool, with settings like `max` (defaulting to 20 connections) and `idleTimeoutMillis` (30000ms). These values are crucial for balancing database load and application responsiveness, and should be tuned based on expected traffic and database capacity.

### Rate Limiting Configuration Details
Rate limiting is implemented to protect API endpoints from abuse and ensure fair usage. While specific middleware details are in `api/middleware/`, the general policy is `100 requests per minute per API key`. This can be overridden per route as needed. When limits are exceeded, a `429 Too Many Requests` status is returned, often with `X-RateLimit-*` headers and a `Retry-After` header to guide client retry behavior.

## Core Backend Features

### 🏨 **Hotel Management Services**
- Multi-property management
- Room type and rate management
- Inventory tracking and allocation
- Property configuration and settings

### 📅 **Reservation Processing**
- Booking creation and modification
- Availability calculation and caching
- Rate calculation and pricing rules
- Cancellation and modification policies

### 👥 **Client Management (CRM)**
- Client profile management
- Booking history tracking
- Preference and loyalty management
- Communication history

### 💰 **Billing & Payment Processing**
- Invoice generation and management
- Payment processing workflows
- Financial reporting and analytics
- Integration with payment gateways

### 🔗 **Integration Services**
- OTA (Online Travel Agency) connectivity
- Booking engine API endpoints
- Payment gateway integrations
- Channel manager synchronization

## API Design Patterns

### 🔌 **RESTful API Structure**
```
/api/v1/
├── /auth              # Authentication endpoints
├── /hotels            # Hotel management
├── /reservations      # Booking operations
├── /clients           # Client management
├── /billing           # Financial operations
├── /reports           # Analytics and reporting
└── /integrations      # External system APIs
```

### 📝 **Request/Response Patterns**
```javascript
// Standard API Response Format
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation completed successfully",
  "timestamp": "2024-11-08T10:30:00Z"
}

// Error Response Format
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": { /* error details */ }
  },
  "timestamp": "2024-11-08T10:30:00Z"
}
```

### 🔐 **Authentication & Authorization**
- **JWT Tokens**: Stateless authentication
- **Role-Based Access**: Granular permission system
- **API Key Authentication**: For external integrations
- **Session Management**: Redis-based session storage

## Database Architecture

### 🗄️ **PostgreSQL Schema Design**
- **Normalized Structure**: Efficient relational design
- **Audit Trails**: Comprehensive change tracking
- **Indexing Strategy**: Optimized query performance
- **Constraint Management**: Data integrity enforcement

### 📊 **Key Entity Relationships**
```
Hotels → Rooms → Room Types
Hotels → Reservations → Clients
Reservations → Payments → Billing
Clients → Preferences → History
```

### 🔄 **Migration Management**
- **Version Control**: Sequential migration scripts
- **Rollback Support**: Safe schema changes
- **Environment Sync**: Consistent across environments
- **Data Seeding**: Initial data population

## Background Processing

### ⚙️ **Job Types**
- **Scheduled Tasks**: Daily/hourly maintenance jobs
- **Event Processing**: Real-time event handling
- **Data Synchronization**: External system sync
- **Report Generation**: Automated reporting

### 🔄 **Queue Management**
- **Job Prioritization**: Critical vs. background tasks
- **Retry Logic**: Failed job recovery
- **Monitoring**: Job status and performance tracking
- **Scaling**: Horizontal job processing

## Performance & Optimization

### ⚡ **Caching Strategies**
- **Redis Caching**: Frequently accessed data
- **Query Optimization**: Efficient database queries
- **Connection Pooling**: Database connection management
- **Response Compression**: Reduced bandwidth usage

### 📈 **Monitoring & Logging**
- **Winston Logging**: Structured application logs
- **Performance Metrics**: Response time tracking
- **Error Tracking**: Comprehensive error logging
- **Health Checks**: System status monitoring

## Security Implementation

### 🔒 **Security Measures**
- **Input Validation**: SQL injection prevention
- **XSS Protection**: Cross-site scripting prevention
- **CORS Configuration**: Cross-origin request control
- **Rate Limiting**: API abuse prevention

### 🛡️ **Data Protection**
- **Encryption**: Sensitive data encryption
- **Audit Logging**: Security event tracking
- **Access Control**: Principle of least privilege
- **Compliance**: Data protection regulations

## Operational Best Practices

### Error Handling Patterns and Conventions
All API errors adhere to a standard JSON error response format, including a `success: false` flag, an `error` object with `code`, `message`, and optional `details`. A centralized error handling middleware (e.g., `api/middleware/errorHandler.js`) catches and formats errors consistently. Each error is logged with a unique correlation ID for easier tracing across logs.

### Logging Best Practices and Log Level Guidance
Structured logging is implemented using Winston (configured in `api/config/logger.js`) to ensure logs are machine-readable and easily searchable. Log levels (e.g., `debug`, `info`, `warn`, `error`) are used to categorize messages, allowing for granular control over log verbosity. Log rotation is handled by the deployment environment (e.g., PM2 or Docker logging drivers) to prevent disk exhaustion.

## Development Workflow

### 🛠️ **Development Setup**
1. **Environment Setup**: Local development configuration
2. **Database Setup**: PostgreSQL and Redis installation
3. **Dependency Installation**: `npm install`
4. **Migration Execution**: Database schema setup
5. **Development Server**: `npm run dev`

### 📝 **API Development Process**
1. **Route Definition**: Express route setup
2. **Controller Implementation**: Request handling logic
3. **Service Layer**: Business logic implementation
4. **Model Integration**: Database interaction
5. **Testing**: Unit and integration tests
6. **Documentation**: API endpoint documentation

## Testing Strategy

### 🧪 **Testing Approaches**
- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **Database Tests**: Data layer testing
- **Performance Tests**: Load and stress testing

### 🔧 **Testing Tools**
- **Jest**: JavaScript testing framework
- **Supertest**: HTTP assertion testing
- **Database Fixtures**: Test data management
- **Mock Services**: External service mocking

## Related Documentation

- **[API Documentation](../api/README.md)** - Complete API reference
- **[Database Schema](database-schema.md)** - Detailed schema documentation
- **[Integration Guides](../integrations/README.md)** - External system integration
- **[Deployment Guide](../deployment/README.md)** - Production deployment

## Common Development Tasks

### Adding a New API Endpoint
1. Define route in `routes/` directory
2. Create controller function
3. Implement service layer logic
4. Add database model if needed
5. Write tests and documentation

### Database Schema Changes
1. Create migration script
2. Update model definitions
3. Test migration locally
4. Update related services
5. Document schema changes

### Integrating External Services
1. Create service wrapper
2. Implement error handling
3. Add configuration options
4. Write integration tests
5. Document integration process

---

*For detailed implementation guides, see the specific documentation sections for each backend aspect.*