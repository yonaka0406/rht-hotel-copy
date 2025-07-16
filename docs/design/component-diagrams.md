# Component Diagrams

## Overview

This document provides detailed component diagrams showing the major system components and their interactions within the Hotel PMS system.

## Frontend Component Architecture

### Main Application Structure

```mermaid
graph TB
    subgraph "Vue.js Application"
        APP[App.vue]
        ROUTER[Vue Router]
        STORE[Pinia Store]
        
        subgraph "Core Components"
            HEADER[Header Component]
            NAV[Navigation Component]
            FOOTER[Footer Component]
        end
        
        subgraph "Page Components"
            DASH[Dashboard Page]
            RES[Reservations Page]
            GUEST[Guests Page]
            REPORT[Reports Page]
            ADMIN[Admin Page]
        end
        
        subgraph "Feature Components"
            RESCMP[Reservation Components]
            GUESTCMP[Guest Components]
            BILLCMP[Billing Components]
            CHARTCMP[Chart Components]
        end
        
        subgraph "Shared Components"
            MODAL[Modal Component]
            TABLE[Data Table Component]
            FORM[Form Components]
            BUTTON[Button Components]
        end
    end
    
    APP --> ROUTER
    APP --> STORE
    APP --> HEADER
    APP --> NAV
    APP --> FOOTER
    
    ROUTER --> DASH
    ROUTER --> RES
    ROUTER --> GUEST
    ROUTER --> REPORT
    ROUTER --> ADMIN
    
    DASH --> CHARTCMP
    RES --> RESCMP
    GUEST --> GUESTCMP
    REPORT --> CHARTCMP
    ADMIN --> FORM
    
    RESCMP --> MODAL
    RESCMP --> TABLE
    RESCMP --> FORM
    GUESTCMP --> TABLE
    GUESTCMP --> FORM
    BILLCMP --> TABLE
    CHARTCMP --> BUTTON
```

### Dashboard Component Hierarchy

```mermaid
graph TB
    subgraph "Dashboard Page"
        DASHPAGE[Dashboard.vue]
        
        subgraph "KPI Cards"
            RESCARD[Reservations Card]
            OCCCARD[Occupancy Card]
            REVCARD[Revenue Card]
            CANCELCARD[Cancellations Card]
        end
        
        subgraph "Charts Section"
            TRENDCHART[Trend Chart]
            OCCGAUGE[Occupancy Gauge]
            REVCHART[Revenue Chart]
        end
        
        subgraph "Quick Actions"
            NEWRES[New Reservation]
            CHECKIN[Check-in]
            CHECKOUT[Check-out]
        end
        
        subgraph "Recent Activity"
            ACTIVITY[Activity Feed]
            ALERTS[Alert Panel]
        end
    end
    
    DASHPAGE --> RESCARD
    DASHPAGE --> OCCCARD
    DASHPAGE --> REVCARD
    DASHPAGE --> CANCELCARD
    DASHPAGE --> TRENDCHART
    DASHPAGE --> OCCGAUGE
    DASHPAGE --> REVCHART
    DASHPAGE --> NEWRES
    DASHPAGE --> CHECKIN
    DASHPAGE --> CHECKOUT
    DASHPAGE --> ACTIVITY
    DASHPAGE --> ALERTS
```

### Reservation Management Components

```mermaid
graph TB
    subgraph "Reservation Module"
        RESPAGE[Reservations Page]
        
        subgraph "Reservation List"
            RESTABLE[Reservation Table]
            RESFILTER[Filter Component]
            RESPAGING[Pagination Component]
        end
        
        subgraph "Reservation Details"
            RESDETAIL[Reservation Detail]
            GUESTINFO[Guest Information]
            ROOMINFO[Room Information]
            BILLING[Billing Information]
        end
        
        subgraph "Reservation Actions"
            NEWRESBTN[New Reservation]
            EDITRES[Edit Reservation]
            CANCELRES[Cancel Reservation]
            CHECKINBTN[Check-in Button]
            CHECKOUTBTN[Check-out Button]
        end
        
        subgraph "Modals & Forms"
            RESFORM[Reservation Form]
            GUESTFORM[Guest Form]
            PAYMENTFORM[Payment Form]
        end
    end
    
    RESPAGE --> RESTABLE
    RESPAGE --> RESFILTER
    RESPAGE --> RESPAGING
    RESPAGE --> RESDETAIL
    
    RESDETAIL --> GUESTINFO
    RESDETAIL --> ROOMINFO
    RESDETAIL --> BILLING
    
    RESTABLE --> NEWRESBTN
    RESTABLE --> EDITRES
    RESTABLE --> CANCELRES
    RESTABLE --> CHECKINBTN
    RESTABLE --> CHECKOUTBTN
    
    NEWRESBTN --> RESFORM
    EDITRES --> RESFORM
    RESFORM --> GUESTFORM
    RESFORM --> PAYMENTFORM
```

## Backend Component Architecture

### API Server Structure

```mermaid
graph TB
    subgraph "Express.js Application"
        SERVER[Express Server]
        MIDDLEWARE[Middleware Stack]
        
        subgraph "Authentication"
            AUTHWARE[Auth Middleware]
            JWTSERVICE[JWT Service]
            RBAC[RBAC Service]
        end
        
        subgraph "API Routes"
            AUTHROUTES[Auth Routes]
            RESROUTES[Reservation Routes]
            GUESTROUTES[Guest Routes]
            ROOMROUTES[Room Routes]
            REPORTROUTES[Report Routes]
            ADMINROUTES[Admin Routes]
        end
        
        subgraph "Controllers"
            AUTHCTRL[Auth Controller]
            RESCTRL[Reservation Controller]
            GUESTCTRL[Guest Controller]
            ROOMCTRL[Room Controller]
            REPORTCTRL[Report Controller]
            ADMINCTRL[Admin Controller]
        end
        
        subgraph "Services"
            RESSERVICE[Reservation Service]
            GUESTSERVICE[Guest Service]
            ROOMSERVICE[Room Service]
            BILLSERVICE[Billing Service]
            EMAILSERVICE[Email Service]
            INTEGSERVICE[Integration Service]
        end
        
        subgraph "Data Access"
            RESDAO[Reservation DAO]
            GUESTDAO[Guest DAO]
            ROOMDAO[Room DAO]
            USERDAO[User DAO]
        end
    end
    
    SERVER --> MIDDLEWARE
    MIDDLEWARE --> AUTHWARE
    AUTHWARE --> JWTSERVICE
    AUTHWARE --> RBAC
    
    SERVER --> AUTHROUTES
    SERVER --> RESROUTES
    SERVER --> GUESTROUTES
    SERVER --> ROOMROUTES
    SERVER --> REPORTROUTES
    SERVER --> ADMINROUTES
    
    AUTHROUTES --> AUTHCTRL
    RESROUTES --> RESCTRL
    GUESTROUTES --> GUESTCTRL
    ROOMROUTES --> ROOMCTRL
    REPORTROUTES --> REPORTCTRL
    ADMINROUTES --> ADMINCTRL
    
    RESCTRL --> RESSERVICE
    GUESTCTRL --> GUESTSERVICE
    ROOMCTRL --> ROOMSERVICE
    RESCTRL --> BILLSERVICE
    RESCTRL --> EMAILSERVICE
    RESCTRL --> INTEGSERVICE
    
    RESSERVICE --> RESDAO
    GUESTSERVICE --> GUESTDAO
    ROOMSERVICE --> ROOMDAO
    AUTHCTRL --> USERDAO
```

### Service Layer Architecture

```mermaid
graph TB
    subgraph "Business Logic Services"
        subgraph "Core Services"
            RESSERVICE[Reservation Service]
            GUESTSERVICE[Guest Service]
            ROOMSERVICE[Room Service]
            USERSERVICE[User Service]
        end
        
        subgraph "Supporting Services"
            BILLSERVICE[Billing Service]
            EMAILSERVICE[Email Service]
            REPORTSERVICE[Report Service]
            VALIDSERVICE[Validation Service]
        end
        
        subgraph "Integration Services"
            OTASERVICE[OTA Service]
            PAYMENTSERVICE[Payment Service]
            SMSSERVICE[SMS Service]
        end
        
        subgraph "Utility Services"
            LOGSERVICE[Logging Service]
            CACHESERVICE[Cache Service]
            FILESERVICE[File Service]
            CONFIGSERVICE[Config Service]
        end
    end
    
    RESSERVICE --> BILLSERVICE
    RESSERVICE --> EMAILSERVICE
    RESSERVICE --> VALIDSERVICE
    RESSERVICE --> OTASERVICE
    
    GUESTSERVICE --> EMAILSERVICE
    GUESTSERVICE --> VALIDSERVICE
    
    ROOMSERVICE --> VALIDSERVICE
    ROOMSERVICE --> CACHESERVICE
    
    BILLSERVICE --> PAYMENTSERVICE
    BILLSERVICE --> EMAILSERVICE
    
    REPORTSERVICE --> CACHESERVICE
    REPORTSERVICE --> LOGSERVICE
```

## Database Component Architecture

### Database Schema Overview

```mermaid
erDiagram
    HOTELS ||--o{ ROOMS : contains
    HOTELS ||--o{ USERS : employs
    HOTELS ||--o{ RESERVATIONS : receives
    
    GUESTS ||--o{ RESERVATIONS : makes
    GUESTS ||--o{ GUEST_HISTORY : has
    
    RESERVATIONS ||--o{ RESERVATION_ROOMS : includes
    RESERVATIONS ||--o{ PAYMENTS : has
    RESERVATIONS ||--o{ RESERVATION_HISTORY : tracks
    
    ROOMS ||--o{ RESERVATION_ROOMS : assigned_to
    ROOMS ||--o{ ROOM_TYPES : belongs_to
    
    ROOM_TYPES ||--o{ RATE_PLANS : has
    RATE_PLANS ||--o{ RATES : contains
    
    USERS ||--o{ USER_ROLES : has
    USER_ROLES ||--o{ PERMISSIONS : grants
    
    HOTELS {
        int hotel_id PK
        string name
        string address
        string phone
        string email
        json settings
        timestamp created_at
        timestamp updated_at
    }
    
    GUESTS {
        int guest_id PK
        string first_name
        string last_name
        string email
        string phone
        date date_of_birth
        json preferences
        timestamp created_at
        timestamp updated_at
    }
    
    RESERVATIONS {
        int reservation_id PK
        int hotel_id FK
        int guest_id FK
        string confirmation_number
        date arrival_date
        date departure_date
        string status
        decimal total_amount
        timestamp created_at
        timestamp updated_at
    }
    
    ROOMS {
        int room_id PK
        int hotel_id FK
        int room_type_id FK
        string room_number
        string status
        json amenities
        timestamp created_at
        timestamp updated_at
    }
```

### Data Access Layer Components

```mermaid
graph TB
    subgraph "Data Access Layer"
        subgraph "Database Connection"
            POOL[Connection Pool]
            TRANS[Transaction Manager]
            MIGRATE[Migration Manager]
        end
        
        subgraph "Data Access Objects"
            HOTELDAO[Hotel DAO]
            GUESTDAO[Guest DAO]
            RESDAO[Reservation DAO]
            ROOMDAO[Room DAO]
            USERDAO[User DAO]
            PAYMENTDAO[Payment DAO]
        end
        
        subgraph "Query Builders"
            BASEQUERY[Base Query Builder]
            RESQUERY[Reservation Queries]
            REPORTQUERY[Report Queries]
            AGGQUERY[Aggregation Queries]
        end
        
        subgraph "Cache Layer"
            REDISCACHE[Redis Cache]
            QUERYCACHE[Query Cache]
            SESSIONCACHE[Session Cache]
        end
    end
    
    HOTELDAO --> POOL
    GUESTDAO --> POOL
    RESDAO --> POOL
    ROOMDAO --> POOL
    USERDAO --> POOL
    PAYMENTDAO --> POOL
    
    RESDAO --> TRANS
    PAYMENTDAO --> TRANS
    
    RESQUERY --> BASEQUERY
    REPORTQUERY --> BASEQUERY
    AGGQUERY --> BASEQUERY
    
    RESDAO --> RESQUERY
    REPORTQUERY --> QUERYCACHE
    AGGQUERY --> REDISCACHE
```

## Integration Component Architecture

### External System Integration

```mermaid
graph TB
    subgraph "Integration Layer"
        subgraph "OTA Integration"
            OTAMANAGER[OTA Manager]
            BOOKINGCOM[Booking.com Adapter]
            EXPEDIA[Expedia Adapter]
            AIRBNB[Airbnb Adapter]
        end
        
        subgraph "Payment Integration"
            PAYMANAGER[Payment Manager]
            STRIPE[Stripe Adapter]
            PAYPAL[PayPal Adapter]
            SQUARE[Square Adapter]
        end
        
        subgraph "Communication Integration"
            COMMMANAGER[Communication Manager]
            EMAILPROVIDER[Email Provider]
            SMSPROVIDER[SMS Provider]
            PUSHNOTIF[Push Notification]
        end
        
        subgraph "Utility Integration"
            FILEMANAGER[File Manager]
            CLOUDSTORAGE[Cloud Storage]
            BACKUP[Backup Service]
            MONITORING[Monitoring Service]
        end
    end
    
    OTAMANAGER --> BOOKINGCOM
    OTAMANAGER --> EXPEDIA
    OTAMANAGER --> AIRBNB
    
    PAYMANAGER --> STRIPE
    PAYMANAGER --> PAYPAL
    PAYMANAGER --> SQUARE
    
    COMMMANAGER --> EMAILPROVIDER
    COMMMANAGER --> SMSPROVIDER
    COMMMANAGER --> PUSHNOTIF
    
    FILEMANAGER --> CLOUDSTORAGE
    FILEMANAGER --> BACKUP
    FILEMANAGER --> MONITORING
```

### Message Flow Architecture

```mermaid
graph TB
    subgraph "Message Processing"
        subgraph "Inbound Messages"
            OTAMSG[OTA Messages]
            PAYMENTMSG[Payment Webhooks]
            EMAILMSG[Email Events]
        end
        
        subgraph "Message Queue"
            QUEUE[Message Queue]
            PROCESSOR[Message Processor]
            HANDLER[Event Handlers]
        end
        
        subgraph "Outbound Messages"
            NOTIFICATIONS[Notifications]
            CONFIRMATIONS[Confirmations]
            UPDATES[Status Updates]
        end
        
        subgraph "Error Handling"
            RETRY[Retry Logic]
            DEADLETTER[Dead Letter Queue]
            ALERTS[Error Alerts]
        end
    end
    
    OTAMSG --> QUEUE
    PAYMENTMSG --> QUEUE
    EMAILMSG --> QUEUE
    
    QUEUE --> PROCESSOR
    PROCESSOR --> HANDLER
    
    HANDLER --> NOTIFICATIONS
    HANDLER --> CONFIRMATIONS
    HANDLER --> UPDATES
    
    PROCESSOR --> RETRY
    RETRY --> DEADLETTER
    DEADLETTER --> ALERTS
```

## Component Interaction Patterns

### Request-Response Flow

```mermaid
sequenceDiagram
    participant Frontend
    participant API Gateway
    participant Controller
    participant Service
    participant DAO
    participant Database
    
    Frontend->>API Gateway: HTTP Request
    API Gateway->>Controller: Route Request
    Controller->>Service: Business Logic Call
    Service->>DAO: Data Access Call
    DAO->>Database: SQL Query
    Database-->>DAO: Query Result
    DAO-->>Service: Data Object
    Service-->>Controller: Business Result
    Controller-->>API Gateway: HTTP Response
    API Gateway-->>Frontend: JSON Response
```

### Event-Driven Communication

```mermaid
sequenceDiagram
    participant Reservation Service
    participant Event Bus
    participant Email Service
    participant OTA Service
    participant Billing Service
    
    Reservation Service->>Event Bus: Reservation Created Event
    Event Bus->>Email Service: Send Confirmation
    Event Bus->>OTA Service: Update Availability
    Event Bus->>Billing Service: Process Payment
    
    Email Service-->>Event Bus: Email Sent Event
    OTA Service-->>Event Bus: Availability Updated Event
    Billing Service-->>Event Bus: Payment Processed Event
```

## Component Dependencies

### Frontend Dependencies

```mermaid
graph TB
    subgraph "Frontend Dependencies"
        VUE[Vue.js 3]
        ROUTER[Vue Router]
        PINIA[Pinia]
        TAILWIND[Tailwind CSS]
        CHARTJS[Chart.js]
        AXIOS[Axios]
        VUELIDATE[Vuelidate]
        MOMENT[Moment.js]
    end
    
    VUE --> ROUTER
    VUE --> PINIA
    VUE --> TAILWIND
    VUE --> CHARTJS
    VUE --> AXIOS
    VUE --> VUELIDATE
    VUE --> MOMENT
```

### Backend Dependencies

```mermaid
graph TB
    subgraph "Backend Dependencies"
        NODE[Node.js]
        EXPRESS[Express.js]
        PG[node-postgres]
        JWT[jsonwebtoken]
        BCRYPT[bcrypt]
        CORS[cors]
        HELMET[helmet]
        MORGAN[morgan]
        NODEMAILER[nodemailer]
        CRON[node-cron]
    end
    
    NODE --> EXPRESS
    EXPRESS --> PG
    EXPRESS --> JWT
    EXPRESS --> BCRYPT
    EXPRESS --> CORS
    EXPRESS --> HELMET
    EXPRESS --> MORGAN
    EXPRESS --> NODEMAILER
    EXPRESS --> CRON
```