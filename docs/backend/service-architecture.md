# Service Architecture

This document describes the backend service architecture of the WeHub.work Hotel Management System, including layered design patterns, service organization, and integration approaches.

## Architecture Overview

The backend follows a **layered architecture pattern** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
│              (Frontend, Mobile, External APIs)               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   API Layer (Routes)                         │
│         - Route definitions                                  │
│         - Request routing                                    │
│         - Middleware chain                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                Controller Layer                              │
│         - Request validation                                 │
│         - Authentication/Authorization                       │
│         - Response formatting                                │
│         - Error handling                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                 Service Layer                                │
│         - Business logic                                     │
│         - Data processing                                    │
│         - Transaction management                             │
│         - External integrations                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Data Access Layer (Models)                      │
│         - Database queries                                   │
│         - Data validation                                    │
│         - ORM/Query building                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  Database Layer                              │
│              (PostgreSQL, Redis)                             │
└─────────────────────────────────────────────────────────────┘
```

## Layer Responsibilities

### 1. API Layer (Routes)

**Purpose**: Define API endpoints and route requests to appropriate controllers

**Location**: `api/routes/`

**Responsibilities**:
- Define RESTful endpoints
- Apply route-level middleware
- Group related endpoints
- Version API endpoints

**Example**:
```javascript
// routes/reservationsRoutes.js
const express = require('express');
const router = express.Router();
const reservationsController = require('../controllers/reservationsController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Define routes
router.get('/', reservationsController.getAllReservations);
router.get('/:id', reservationsController.getReservationById);
router.post('/', reservationsController.createReservation);
router.put('/:id', reservationsController.updateReservation);
router.delete('/:id', reservationsController.cancelReservation);

module.exports = router;
```

### 2. Controller Layer

**Purpose**: Handle HTTP requests and responses

**Location**: `api/controllers/`

**Responsibilities**:
- Validate request parameters
- Extract request data
- Call appropriate service methods
- Format responses
- Handle errors
- Return HTTP status codes

**Example**:
```javascript
// controllers/reservationsController.js
const { validateNumericParam, validateUuidParam } = require('../utils/validationUtils');
const reservationModel = require('../models/reservations/reservation');
const logger = require('../config/logger');

const getReservationById = async (req, res) => {
    try {
        // Validate parameters
        const reservationId = validateUuidParam(req.params.id, 'Reservation ID');
        
        // Call model/service
        const reservation = await reservationModel.getReservationById(
            req.requestId,
            reservationId
        );
        
        if (!reservation) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Reservation not found'
                }
            });
        }
        
        // Return success response
        res.status(200).json({
            success: true,
            data: reservation,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Error fetching reservation:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message
            }
        });
    }
};

module.exports = {
    getReservationById
};
```

### 3. Service Layer

**Purpose**: Implement business logic and orchestrate operations

**Location**: `api/services/`

**Responsibilities**:
- Implement business rules
- Coordinate multiple model operations
- Handle complex transactions
- Integrate with external services
- Process and transform data
- Cache management

**Example**:
```javascript
// services/reservationService.js
const reservationModel = require('../models/reservations/reservation');
const billingModel = require('../models/billing');
const emailUtils = require('../utils/emailUtils');
const logger = require('../config/logger');

const createReservationWithBilling = async (requestId, reservationData) => {
    const pool = require('../config/database').getPool(requestId);
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Create reservation
        const reservation = await reservationModel.createReservation(
            requestId,
            reservationData,
            client
        );
        
        // Calculate billing
        const billingAmount = calculateReservationCost(reservationData);
        
        // Create invoice
        const invoice = await billingModel.createInvoice(
            requestId,
            {
                reservationId: reservation.id,
                amount: billingAmount,
                dueDate: reservationData.checkInDate
            },
            client
        );
        
        await client.query('COMMIT');
        
        // Send confirmation email (async, don't wait)
        emailUtils.sendReservationConfirmation(reservation).catch(err => {
            logger.error('Failed to send confirmation email:', err);
        });
        
        return {
            reservation,
            invoice
        };
        
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Error creating reservation with billing:', error);
        throw error;
    } finally {
        client.release();
    }
};

const calculateReservationCost = (reservationData) => {
    // Business logic for cost calculation
    const nights = calculateNights(reservationData.checkInDate, reservationData.checkOutDate);
    const baseRate = reservationData.roomRate;
    const addons = reservationData.addons || [];
    
    let total = nights * baseRate;
    
    // Add addon costs
    addons.forEach(addon => {
        total += addon.price * addon.quantity;
    });
    
    // Apply taxes
    const taxRate = 0.10; // 10% tax
    total = total * (1 + taxRate);
    
    return Math.round(total);
};

module.exports = {
    createReservationWithBilling,
    calculateReservationCost
};
```

### 4. Data Access Layer (Models)

**Purpose**: Interact with the database

**Location**: `api/models/`

**Responsibilities**:
- Execute database queries
- Map database results to objects
- Handle database errors
- Implement data validation
- Manage database connections

**Example**:
```javascript
// models/reservations/reservation.js
const { getPool } = require('../config/database');

const getReservationById = async (requestId, reservationId) => {
    const pool = getPool(requestId);
    
    const query = `
        SELECT 
            r.*,
            c.name_kanji as client_name,
            c.email as client_email,
            h.name as hotel_name,
            rt.name as room_type_name
        FROM reservations r
        LEFT JOIN clients c ON r.client_id = c.id
        LEFT JOIN hotels h ON r.hotel_id = h.id
        LEFT JOIN room_types rt ON r.room_type_id = rt.id
        WHERE r.id = $1
    `;
    
    const result = await pool.query(query, [reservationId]);
    return result.rows[0] || null;
};

const createReservation = async (requestId, data, client = null) => {
    const pool = client || getPool(requestId);
    
    const query = `
        INSERT INTO reservations (
            hotel_id,
            client_id,
            room_type_id,
            check_in_date,
            check_out_date,
            guest_count,
            status,
            total_amount,
            notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
    `;
    
    const values = [
        data.hotelId,
        data.clientId,
        data.roomTypeId,
        data.checkInDate,
        data.checkOutDate,
        data.guestCount,
        data.status || 'pending',
        data.totalAmount,
        data.notes
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
};

module.exports = {
    getReservationById,
    createReservation
};
```

## Core Services

### Authentication Service

**Purpose**: Handle user authentication and authorization

**Key Functions**:
- User login/logout
- JWT token generation and validation
- Password hashing and verification
- Session management
- Role-based access control

**Example**:
```javascript
// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = await userModel.getUserByEmail(req.requestId, email);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: { message: 'Invalid credentials' }
            });
        }
        
        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isValid) {
            return res.status(401).json({
                success: false,
                error: { message: 'Invalid credentials' }
            });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                }
            }
        });
        
    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Login failed' }
        });
    }
};
```

### Reservation Service

**Purpose**: Manage reservation lifecycle

**Key Functions**:
- Create reservations
- Update reservation details
- Cancel reservations
- Check availability
- Calculate pricing
- Process check-in/check-out

### Billing Service

**Purpose**: Handle financial operations

**Key Functions**:
- Generate invoices
- Process payments
- Calculate totals and taxes
- Apply discounts
- Track payment history
- Generate financial reports

### Integration Service

**Purpose**: Communicate with external systems

**Key Functions**:
- OTA synchronization
- Booking engine API
- Payment gateway integration
- Email service integration
- Calendar synchronization

## Middleware Architecture

### Authentication Middleware

```javascript
// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            error: { message: 'Authentication required' }
        });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            error: { message: 'Invalid or expired token' }
        });
    }
};

const requireRole = (role) => {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({
                success: false,
                error: { message: 'Insufficient permissions' }
            });
        }
        next();
    };
};

module.exports = {
    authenticateToken,
    requireRole
};
```

### Request ID Middleware

```javascript
// middleware/requestIdMiddleware.js
const { v4: uuidv4 } = require('uuid');

const assignRequestId = (req, res, next) => {
    req.requestId = uuidv4();
    res.setHeader('X-Request-ID', req.requestId);
    next();
};

module.exports = assignRequestId;
```

### Error Handling Middleware

```javascript
// middleware/errorHandler.js
const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
    logger.error('Unhandled error:', {
        error: err.message,
        stack: err.stack,
        requestId: req.requestId,
        path: req.path,
        method: req.method
    });
    
    // Don't leak error details in production
    const message = process.env.NODE_ENV === 'production'
        ? 'An error occurred'
        : err.message;
    
    res.status(err.status || 500).json({
        success: false,
        error: {
            code: err.code || 'INTERNAL_ERROR',
            message: message
        },
        requestId: req.requestId
    });
};

module.exports = errorHandler;
```

## Database Connection Management

### Connection Pooling

```javascript
// config/database.js
const { Pool } = require('pg');

// Production pool
const prodPool = new Pool({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Development pool
const devPool = new Pool({
    host: process.env.DEV_DATABASE_HOST || 'localhost',
    port: process.env.DEV_DATABASE_PORT || 5432,
    database: process.env.DEV_DATABASE_NAME || 'pms_dev',
    user: process.env.DEV_DATABASE_USER || 'pms_dev',
    password: process.env.DEV_DATABASE_PASSWORD,
    max: 10,
    idleTimeoutMillis: 30000,
});

const getPool = (requestId) => {
    if (!requestId) {
        throw new Error('RequestId is required to select the correct database pool');
    }
    
    // Determine which pool to use based on environment
    return process.env.NODE_ENV === 'production' ? prodPool : devPool;
};

const getProdPool = () => prodPool;
const getDevPool = () => devPool;

module.exports = {
    getPool,
    getProdPool,
    getDevPool
};
```

### Transaction Management

```javascript
// Example transaction pattern
const performComplexOperation = async (requestId, data) => {
    const pool = getPool(requestId);
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Perform multiple operations
        const result1 = await client.query('INSERT INTO table1 ...', values1);
        const result2 = await client.query('INSERT INTO table2 ...', values2);
        const result3 = await client.query('UPDATE table3 ...', values3);
        
        await client.query('COMMIT');
        
        return { result1, result2, result3 };
        
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};
```

## Caching Strategy

### Redis Integration

```javascript
// config/redis.js
const Redis = require('ioredis');

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

redis.on('error', (err) => {
    logger.error('Redis error:', err);
});

redis.on('connect', () => {
    logger.info('Redis connected');
});

module.exports = redis;
```

### Cache Patterns

```javascript
// Example caching pattern
const getHotelWithCache = async (requestId, hotelId) => {
    const cacheKey = `hotel:${hotelId}`;
    
    // Try to get from cache
    const cached = await redis.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }
    
    // Get from database
    const hotel = await hotelModel.getHotelById(requestId, hotelId);
    
    // Store in cache (expire after 1 hour)
    await redis.setex(cacheKey, 3600, JSON.stringify(hotel));
    
    return hotel;
};

// Invalidate cache on update
const updateHotel = async (requestId, hotelId, updates) => {
    const hotel = await hotelModel.updateHotel(requestId, hotelId, updates);
    
    // Invalidate cache
    await redis.del(`hotel:${hotelId}`);
    
    return hotel;
};
```

## Best Practices

### 1. Always Pass requestId

```javascript
// ✅ Correct
const reservation = await reservationModel.getReservationById(req.requestId, id);

// ❌ Incorrect
const reservation = await reservationModel.getReservationById(id);
```

### 2. Use Validation Utilities

```javascript
// ✅ Correct
const hotelId = validateNumericParam(req.params.hotelId, 'Hotel ID');
const reservationId = validateUuidParam(req.params.id, 'Reservation ID');

// ❌ Incorrect
const hotelId = parseInt(req.params.hotelId);
const reservationId = req.params.id;
```

### 3. Handle Errors Properly

```javascript
// ✅ Correct
try {
    const result = await someOperation();
    res.json({ success: true, data: result });
} catch (error) {
    logger.error('Operation failed:', error);
    res.status(500).json({
        success: false,
        error: { message: error.message }
    });
}
```

### 4. Use Transactions for Multiple Operations

```javascript
// ✅ Correct - Use transaction
const client = await pool.connect();
try {
    await client.query('BEGIN');
    await operation1(client);
    await operation2(client);
    await client.query('COMMIT');
} catch (error) {
    await client.query('ROLLBACK');
    throw error;
} finally {
    client.release();
}
```

### 5. Release Database Clients

```javascript
// ✅ Correct - Always release in finally block
const client = await pool.connect();
try {
    // Operations
} finally {
    client.release();
}
```

## Related Documentation

- **[Backend Development](README.md)** - Backend overview
- **[Database Schema](database-schema.md)** - Database design
- **[Business Logic](business-logic.md)** - Business rules
- **[API Documentation](../api/README.md)** - API endpoints

---

*This service architecture provides a solid foundation for scalable and maintainable backend development.*
