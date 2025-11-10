# Component Architecture

This document provides detailed information about the system components, their responsibilities, relationships, and interactions within the Hotel Management System.

## Architecture Overview

The system follows a layered architecture with clear separation of concerns. Components are organized into distinct layers, each with specific responsibilities and well-defined interfaces.

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  (Vue.js Components, State Management, UI Framework)        │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│    (API Routes, Controllers, Services, Middleware)          │
└─────────────────────────────────────────────────────────────┘
                            ↕ SQL/Redis
┌─────────────────────────────────────────────────────────────┐
│                        Data Layer                            │
│     (PostgreSQL Database, Redis Cache, Repositories)        │
└─────────────────────────────────────────────────────────────┘
```

## Backend Component Architecture

### API Layer Components

#### Routes
**Responsibility**: Define API endpoints and map them to controllers

**Structure**:
```
api/
├── routes/
│   ├── auth.routes.js          # Authentication endpoints
│   ├── hotel.routes.js         # Hotel management endpoints
│   ├── reservation.routes.js   # Reservation endpoints
│   ├── client.routes.js        # Client/CRM endpoints
│   ├── billing.routes.js       # Billing and payment endpoints
│   ├── user.routes.js          # User management endpoints
│   └── report.routes.js        # Reporting endpoints
```

**Key Characteristics**:
- RESTful endpoint definitions
- HTTP method mapping (GET, POST, PUT, DELETE)
- Route parameter validation
- Middleware attachment (auth, validation)
- Route grouping and organization

#### Controllers
**Responsibility**: Handle HTTP requests and responses

**Key Functions**:
- Request parameter extraction and validation
- Service layer invocation
- Response formatting (JSON, status codes)
- Error handling and propagation
- HTTP-specific logic (headers, cookies)

**Example Controller Pattern**:
```javascript
class ReservationController {
    async getReservation(req, res, next) {
        try {
            const { id } = req.params;
            const reservation = await reservationService.getById(id);
            res.json({ success: true, data: reservation });
        } catch (error) {
            next(error);
        }
    }
}
```

#### Middleware
**Responsibility**: Cross-cutting concerns and request processing

**Types**:
- **Authentication Middleware**: JWT token validation
- **Authorization Middleware**: Role-based access control
- **Validation Middleware**: Request data validation
- **Logging Middleware**: Request/response logging
- **Error Handling Middleware**: Centralized error processing
- **Rate Limiting Middleware**: API rate limiting
- **CORS Middleware**: Cross-origin resource sharing

### Business Logic Layer Components

#### Services
**Responsibility**: Implement business logic and orchestrate operations

**Structure**:
```
api/services/
├── auth.service.js           # Authentication logic
├── hotel.service.js          # Hotel business logic
├── reservation.service.js    # Reservation management
├── client.service.js         # Client/CRM operations
├── billing.service.js        # Billing calculations
├── notification.service.js   # Notification handling
├── report.service.js         # Report generation
└── integration.service.js    # External system integration
```

**Key Characteristics**:
- Business rule enforcement
- Transaction management
- Service composition
- External API integration
- Data transformation
- Validation logic

**Service Layer Patterns**:
- **Domain Services**: Business logic for specific domains
- **Application Services**: Orchestrate multiple domain services
- **Integration Services**: External system communication
- **Utility Services**: Shared helper functions

#### Validators
**Responsibility**: Data validation and business rule checking

**Types**:
- **Input Validators**: Request data validation
- **Business Rule Validators**: Domain-specific rules
- **Data Integrity Validators**: Consistency checks
- **Format Validators**: Data format verification

### Data Access Layer Components

#### Repositories
**Responsibility**: Abstract database operations

**Structure**:
```
api/repositories/
├── base.repository.js        # Base repository with common operations
├── hotel.repository.js       # Hotel data access
├── reservation.repository.js # Reservation data access
├── client.repository.js      # Client data access
├── billing.repository.js     # Billing data access
└── user.repository.js        # User data access
```

**Key Operations**:
- **CRUD Operations**: Create, Read, Update, Delete
- **Query Building**: Complex query construction
- **Transaction Management**: Database transaction handling
- **Connection Pooling**: Efficient connection management
- **Error Handling**: Database error translation

**Repository Pattern Benefits**:
- Abstraction of data access logic
- Testability (easy to mock)
- Centralized query logic
- Database independence
- Reusable data access code

#### Database Models
**Responsibility**: Define data structure and relationships

**Key Entities**:
- **Hotel**: Property information and configuration
- **Room**: Room inventory and attributes
- **Reservation**: Booking information and status
- **Client**: Customer information and preferences
- **User**: System user accounts and roles
- **Billing**: Financial transactions and invoices
- **Plan**: Pricing plans and rate structures

### Supporting Backend Components

#### Authentication & Authorization
**Components**:
- **JWT Token Manager**: Token generation and validation
- **Password Manager**: Hashing and verification
- **Session Manager**: User session handling
- **Permission Manager**: Role-based access control

**Flow**:
```
Login Request → Validate Credentials → Generate JWT → Store Session → Return Token
API Request → Extract Token → Validate Token → Check Permissions → Allow/Deny
```

#### Real-time Engine
**Components**:
- **Socket.io Server**: WebSocket connection management
- **Event Emitter**: Event broadcasting system
- **Room Manager**: User grouping for targeted messages
- **Connection Handler**: Connection lifecycle management

**Use Cases**:
- Live reservation updates
- Real-time notifications
- Multi-user collaboration
- Dashboard live metrics

#### Background Jobs
**Components**:
- **Job Scheduler**: Cron-based task scheduling
- **Job Queue**: Asynchronous job processing
- **Job Handlers**: Specific job implementations
- **Job Monitor**: Job status tracking

**Job Types**:
- Data synchronization with external systems
- Report generation
- Email notifications
- Database maintenance
- Cache warming

## Frontend Component Architecture

### Component Hierarchy

```
App.vue
├── Layout Components
│   ├── AppHeader.vue
│   ├── AppSidebar.vue
│   ├── AppFooter.vue
│   └── AppBreadcrumb.vue
├── Feature Components
│   ├── Reservations/
│   │   ├── ReservationList.vue
│   │   ├── ReservationForm.vue
│   │   ├── ReservationCalendar.vue
│   │   └── ReservationDetails.vue
│   ├── Clients/
│   │   ├── ClientList.vue
│   │   ├── ClientForm.vue
│   │   └── ClientDetails.vue
│   ├── Billing/
│   │   ├── InvoiceList.vue
│   │   ├── InvoiceForm.vue
│   │   └── PaymentProcessor.vue
│   └── Dashboard/
│       ├── DashboardOverview.vue
│       ├── OccupancyChart.vue
│       └── RevenueChart.vue
└── UI Components
    ├── DataTable.vue
    ├── FormInput.vue
    ├── Modal.vue
    └── Button.vue
```

### Component Categories

#### Layout Components
**Responsibility**: Application shell and navigation structure

**Components**:
- **AppHeader**: Top navigation bar with user menu
- **AppSidebar**: Main navigation menu
- **AppFooter**: Footer information
- **AppBreadcrumb**: Breadcrumb navigation
- **AppLayout**: Overall layout wrapper

**Characteristics**:
- Persistent across route changes
- Responsive design
- User context awareness
- Navigation state management

#### Feature Components
**Responsibility**: Business domain functionality

**Characteristics**:
- Domain-specific logic
- State management integration
- API communication
- Complex user interactions
- Data validation and submission

**Examples**:
- **Reservation Management**: Booking creation, modification, cancellation
- **Client Management**: Customer information, booking history
- **Billing System**: Invoice generation, payment processing
- **Dashboard**: Metrics, charts, real-time updates

#### UI Components
**Responsibility**: Reusable interface elements

**Characteristics**:
- Presentation-focused
- Prop-based configuration
- Event emission for parent communication
- Minimal business logic
- Highly reusable

**Examples**:
- Form inputs with validation
- Data tables with sorting/filtering
- Modals and dialogs
- Buttons and action triggers
- Loading indicators

#### Form Components
**Responsibility**: User input handling and validation

**Characteristics**:
- Input validation
- Error display
- Form state management
- Submission handling
- Accessibility compliance

### State Management Components

#### Composable Stores
**Responsibility**: Global state management using Vue 3 Composition API

**Structure**:
```
frontend/src/composables/
├── useUserStore.js          # User authentication state
├── useHotelStore.js         # Hotel selection and data
├── useReservationStore.js   # Reservation state
├── useClientStore.js        # Client/CRM state
├── useBillingStore.js       # Billing state
└── useNotificationStore.js  # Notification state
```

**Store Pattern**:
```javascript
// Shared state (outside composable)
const state = ref(initialState);

export function useStore() {
    // Actions
    const fetchData = async () => { /* ... */ };
    const updateData = (data) => { /* ... */ };
    
    // Getters (computed)
    const derivedState = computed(() => { /* ... */ });
    
    return {
        state,
        fetchData,
        updateData,
        derivedState
    };
}
```

**Key Features**:
- Reactive state with Vue's reactivity system
- Shared state across components
- Computed properties for derived state
- Actions for state mutations
- API integration

### Routing Components

#### Vue Router Configuration
**Responsibility**: Application routing and navigation

**Route Structure**:
```javascript
const routes = [
    {
        path: '/',
        component: Layout,
        children: [
            { path: 'dashboard', component: Dashboard },
            { path: 'reservations', component: ReservationList },
            { path: 'reservations/:id', component: ReservationDetails },
            { path: 'clients', component: ClientList },
            { path: 'billing', component: BillingList }
        ]
    }
];
```

**Route Guards**:
- **Authentication Guard**: Verify user login
- **Authorization Guard**: Check user permissions
- **Data Loading Guard**: Pre-fetch required data
- **Navigation Guard**: Confirm unsaved changes

## Component Communication Patterns

### Parent-Child Communication
**Pattern**: Props down, events up
```javascript
// Parent
<ChildComponent :data="parentData" @update="handleUpdate" />

// Child
const props = defineProps(['data']);
const emit = defineEmits(['update']);
```

### Global State Communication
**Pattern**: Composable stores
```javascript
// Component A
const { state, updateState } = useStore();
updateState(newValue);

// Component B
const { state } = useStore();
// Automatically reactive to changes
```

### Event Bus Communication
**Pattern**: Global event emitter (for loosely coupled components)
```javascript
// Emitter
eventBus.emit('reservation-updated', reservationData);

// Listener
eventBus.on('reservation-updated', handleUpdate);
```

### Provide/Inject Communication
**Pattern**: Dependency injection for deep component trees
```javascript
// Provider (ancestor)
provide('hotelContext', hotelData);

// Consumer (descendant)
const hotelContext = inject('hotelContext');
```

## Component Lifecycle

### Backend Component Lifecycle
1. **Application Startup**: Initialize Express app, connect to database
2. **Middleware Registration**: Register global middleware
3. **Route Registration**: Register API routes
4. **Service Initialization**: Initialize services and dependencies
5. **Server Start**: Listen on configured port
6. **Request Processing**: Handle incoming requests through middleware chain
7. **Graceful Shutdown**: Close connections, cleanup resources

### Frontend Component Lifecycle
1. **Application Bootstrap**: Create Vue app, register plugins
2. **Router Initialization**: Setup routes and guards
3. **Store Initialization**: Initialize composable stores
4. **Component Mounting**: Mount root component
5. **Component Lifecycle Hooks**:
   - `onBeforeMount`: Before component is mounted
   - `onMounted`: After component is mounted to DOM
   - `onBeforeUpdate`: Before reactive data changes
   - `onUpdated`: After reactive data changes
   - `onBeforeUnmount`: Before component is unmounted
   - `onUnmounted`: After component is unmounted

## Component Lifecycle

### Backend Component Lifecycle
1. **Application Startup**: Initialize Express app, connect to database
2. **Middleware Registration**: Register global middleware
3. **Route Registration**: Register API routes
4. **Service Initialization**: Initialize services and dependencies
5. **Server Start**: Listen on configured port
6. **Request Processing**: Handle incoming requests through middleware chain
7. **Graceful Shutdown**: Close connections, cleanup resources

### Frontend Component Lifecycle
1. **Application Bootstrap**: Create Vue app, register plugins
2. **Router Initialization**: Setup routes and guards
3. **Store Initialization**: Initialize composable stores
4. **Component Mounting**: Mount root component
5. **Component Lifecycle Hooks**:
   - `onBeforeMount`: Before component is mounted
   - `onMounted`: After component is mounted to DOM
   - `onBeforeUpdate`: Before reactive data changes
   - `onUpdated`: After reactive data changes
   - `onBeforeUnmount`: Before component is unmounted
   - `onUnmounted`: After component is unmounted

## Component Design

When designing new components, consider the following principles:

-   **Single Responsibility Principle**: Each component should do one thing well.
-   **Reusability**: Design components to be reusable across different parts of the application.
-   **Testability**: Ensure components are easy to test in isolation.
-   **Maintainability**: Write clean, well-structured, and documented code.
-   **Performance**: Optimize for efficient rendering and data handling.
-   **Accessibility**: Design with accessibility in mind from the start.

## Component Testing Strategy

### Backend Component Testing
- **Unit Tests**: Test individual services and repositories
- **Integration Tests**: Test API endpoints with database
- **Contract Tests**: Verify API contracts
- **Load Tests**: Test performance under load

### Frontend Component Testing
- **Unit Tests**: Test component logic in isolation
- **Component Tests**: Test component rendering and interactions
- **Integration Tests**: Test component integration with stores
- **E2E Tests**: Test complete user workflows

## Related Documentation

- **[System Overview](system-overview.md)** - High-level architecture
- **[Data Architecture](data-architecture.md)** - Database design
- **[Integration Patterns](integration-patterns.md)** - External integrations
- **[Frontend Development](../frontend/README.md)** - Frontend details
- **[Backend Development](../backend/README.md)** - Backend details
- **[API Documentation](../api/README.md)** - API specifications

---

*This component architecture supports modularity, testability, and maintainability while enabling future scalability.*
