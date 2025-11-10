# Integration Patterns

This document describes the integration patterns and approaches used in the Hotel Management System for connecting with external systems, including OTAs, payment gateways, booking engines, and other third-party services.

## Integration Architecture Overview

The system follows a modular integration architecture that supports multiple external systems while maintaining loose coupling and flexibility.

```
┌─────────────────────────────────────────────────────────────┐
│                   Hotel Management System                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Integration Layer                          │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │ │
│  │  │   OTA    │  │ Payment  │  │ Booking  │            │ │
│  │  │ Adapter  │  │ Adapter  │  │  Engine  │            │ │
│  │  └──────────┘  └──────────┘  └──────────┘            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
         ↕                ↕                ↕
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│     OTA     │  │   Payment   │  │   Booking   │
│   Systems   │  │  Gateways   │  │   Engine    │
└─────────────┘  └─────────────┘  └─────────────┘
```

## Core Integration Principles

### Adapter Pattern
Each external system has a dedicated adapter that:
- Translates between internal and external data formats
- Handles protocol-specific communication
- Manages authentication and authorization
- Implements retry logic and error handling
- Provides consistent interface to internal services

### Asynchronous Processing
Integration operations are handled asynchronously to:
- Prevent blocking of main application flow
- Handle slow external system responses
- Enable retry mechanisms
- Support batch operations
- Improve system resilience

### Error Handling and Resilience
Robust error handling ensures system stability:
- Graceful degradation when external systems are unavailable
- Automatic retry with exponential backoff
- Circuit breaker pattern for failing services
- Comprehensive error logging and alerting
- Fallback mechanisms for critical operations

### Data Synchronization
Bidirectional data synchronization maintains consistency:
- Real-time updates via webhooks
- Scheduled batch synchronization
- Conflict resolution strategies
- Data validation and transformation
- Audit trails for all synchronization operations

## OTA (Online Travel Agency) Integration

### Integration Overview

OTA integration enables the hotel to distribute inventory and receive bookings from major online travel agencies like Booking.com, Expedia, and Agoda.

### Communication Protocol

#### XML/SOAP Integration
Most OTAs use XML-based protocols for communication:

**Request/Response Pattern**:
```xml
<!-- Availability Request -->
<OTA_HotelAvailRQ>
    <HotelRef HotelCode="HOTEL123"/>
    <DateRange Start="2024-01-01" End="2024-01-07"/>
    <RoomStayCandidates>
        <RoomStayCandidate Quantity="1"/>
    </RoomStayCandidates>
</OTA_HotelAvailRQ>

<!-- Availability Response -->
<OTA_HotelAvailRS>
    <RoomStays>
        <RoomStay>
            <RoomTypes>
                <RoomType RoomTypeCode="DBL" NumberOfUnits="5"/>
            </RoomTypes>
            <RatePlans>
                <RatePlan RatePlanCode="BAR" Amount="150.00"/>
            </RatePlans>
        </RoomStay>
    </RoomStays>
</OTA_HotelAvailRS>
```

### Integration Patterns

#### Push Pattern (Inventory Updates)
The hotel system pushes inventory and rate updates to OTAs:

**Flow**:
1. Rate or inventory change in hotel system
2. Integration service detects change
3. Format data in OTA-specific XML format
4. Send update to OTA endpoint
5. Receive and log confirmation
6. Update synchronization status

**Implementation**:
```javascript
class OTAIntegrationService {
    async pushInventoryUpdate(hotelId, roomType, date, availability) {
        const xmlRequest = this.buildAvailabilityUpdateXML({
            hotelId,
            roomType,
            date,
            availability
        });
        
        const response = await this.sendToOTA(xmlRequest);
        await this.logSyncStatus(hotelId, 'inventory_update', response);
        
        return response;
    }
}
```

#### Pull Pattern (Booking Retrieval)
The hotel system retrieves new bookings from OTAs:

**Flow**:
1. Scheduled job triggers booking retrieval
2. Request new bookings since last sync
3. Parse XML response
4. Validate booking data
5. Create reservation in hotel system
6. Send confirmation to OTA
7. Update last sync timestamp

**Scheduled Retrieval**:
```javascript
// Cron job: Every 15 minutes
async function syncOTABookings() {
    const lastSync = await getLastSyncTime('ota_bookings');
    const bookings = await otaService.fetchNewBookings(lastSync);
    
    for (const booking of bookings) {
        await processOTABooking(booking);
    }
    
    await updateLastSyncTime('ota_bookings', new Date());
}
```

#### Webhook Pattern (Real-time Updates)
OTAs send real-time notifications for booking changes:

**Flow**:
1. OTA sends webhook POST request
2. Webhook endpoint receives request
3. Validate webhook signature
4. Parse booking data
5. Process booking update
6. Return acknowledgment
7. Log webhook event

**Webhook Handler**:
```javascript
app.post('/webhooks/ota/:provider', async (req, res) => {
    try {
        // Validate webhook signature
        const isValid = validateWebhookSignature(req);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid signature' });
        }
        
        // Process booking update
        const bookingData = parseOTAWebhook(req.body);
        await processBookingUpdate(bookingData);
        
        // Acknowledge receipt
        res.status(200).json({ success: true });
    } catch (error) {
        logger.error('Webhook processing error', error);
        res.status(500).json({ error: 'Processing failed' });
    }
});
```

### Data Mapping

#### Room Type Mapping
Map internal room types to OTA room codes:
```javascript
const roomTypeMapping = {
    'standard-single': { booking_com: 'SGL', expedia: 'SINGLE' },
    'standard-double': { booking_com: 'DBL', expedia: 'DOUBLE' },
    'deluxe-suite': { booking_com: 'STE', expedia: 'SUITE' }
};
```

#### Rate Plan Mapping
Map internal rate plans to OTA rate codes:
```javascript
const ratePlanMapping = {
    'best-available-rate': { booking_com: 'BAR', expedia: 'RACK' },
    'non-refundable': { booking_com: 'NRF', expedia: 'NONREF' },
    'advance-purchase': { booking_com: 'ADV', expedia: 'ADVANCE' }
};
```

### Error Handling

#### Retry Strategy
```javascript
async function sendToOTAWithRetry(request, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await sendToOTA(request);
        } catch (error) {
            if (attempt === maxRetries) throw error;
            
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
            await sleep(delay);
        }
    }
}
```

#### Circuit Breaker
```javascript
class CircuitBreaker {
    constructor(threshold = 5, timeout = 60000) {
        this.failureCount = 0;
        this.threshold = threshold;
        this.timeout = timeout;
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    }
    
    async execute(operation) {
        if (this.state === 'OPEN') {
            throw new Error('Circuit breaker is OPEN');
        }
        
        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }
}
```

## Payment Gateway Integration

### Integration Overview

Payment gateway integration enables secure payment processing for reservations and services.

### Supported Payment Methods
- Credit/Debit Cards (Visa, Mastercard, Amex)
- Digital Wallets (Apple Pay, Google Pay)
- Bank Transfers
- Cash (recorded in system)

### Payment Flow

#### Standard Payment Flow
```
1. User initiates payment → Frontend
2. Collect payment details → Secure form
3. Tokenize card data → Payment gateway
4. Receive payment token → Backend
5. Process payment → Payment gateway API
6. Receive confirmation → Update billing status
7. Send receipt → Email service
8. Update reservation → Mark as paid
```

#### Implementation Pattern
```javascript
class PaymentService {
    async processPayment(reservationId, paymentDetails) {
        try {
            // Create payment intent
            const paymentIntent = await this.gateway.createPaymentIntent({
                amount: paymentDetails.amount,
                currency: paymentDetails.currency,
                metadata: { reservationId }
            });
            
            // Process payment
            const result = await this.gateway.confirmPayment(
                paymentIntent.id,
                paymentDetails.paymentMethod
            );
            
            // Update billing record
            await billingService.updatePaymentStatus(
                reservationId,
                'paid',
                result.transactionId
            );
            
            // Send confirmation
            await notificationService.sendPaymentConfirmation(
                reservationId,
                result
            );
            
            return result;
        } catch (error) {
            await this.handlePaymentError(reservationId, error);
            throw error;
        }
    }
}
```

### Security Considerations

#### PCI DSS Compliance
- Never store raw card data
- Use tokenization for card information
- Secure transmission (TLS/SSL)
- Regular security audits
- Access logging and monitoring

#### Payment Token Flow
```javascript
// Frontend: Tokenize card data
const token = await paymentGateway.createToken({
    cardNumber: '****',  // Handled by gateway's secure form
    expiry: '****',
    cvv: '***'
});

// Backend: Process with token only
await paymentService.processPayment(reservationId, {
    token: token.id,
    amount: 150.00,
    currency: 'USD'
});
```

### Webhook Handling

#### Payment Status Updates

Webhooks from payment gateways must be handled securely and idempotently to prevent duplicate processing and ensure data integrity.

**Flow**:
1.  Receive webhook and immediately validate its signature.
2.  If the signature is invalid, reject the request with a `400` or `401` status.
3.  Extract a unique event ID from the webhook payload.
4.  Check a persistent store (e.g., Redis or a database table) to see if this event ID has already been processed.
5.  If already processed, acknowledge with a `200` status to prevent the provider from resending.
6.  If not processed, atomically mark the event ID as processed *before* executing business logic.
7.  Execute the relevant business logic (e.g., update payment status).
8.  Acknowledge with a `200` status.

**Implementation**:
```javascript
// Example using Express.js
// Note: bodyParser.raw() is needed to have the raw request body for signature validation.
app.post('/webhooks/payment', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
    // 1. Validate webhook signature (reusing pattern from OTA handler)
    const signature = req.headers['stripe-signature']; // Example for Stripe
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    
    if (!validateWebhookSignature(req.body, signature, secret)) {
        console.error('Webhook signature validation failed.');
        return res.status(400).send('Invalid signature.');
    }

    // 2. Parse event and check for idempotency
    const event = JSON.parse(req.body.toString());
    const eventId = event.id;

    if (!eventId) {
        return res.status(400).send('Event ID missing.');
    }

    try {
        if (await isEventProcessed(eventId)) {
            console.log(`Event ${eventId} already processed. Skipping.`);
            return res.status(200).send({ status: 'already processed' });
        }

        // 3. Mark as processed BEFORE handling to prevent race conditions
        await markEventAsProcessed(eventId);

        // 4. Handle the event
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentSuccess(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await handlePaymentFailure(event.data.object);
                break;
            case 'charge.refunded':
                await handlePaymentRefund(event.data.object);
                break;
            default:
                console.warn(`Unhandled event type: ${event.type}`);
        }

        // 5. Acknowledge receipt
        res.status(200).json({ received: true });

    } catch (error) {
        console.error(`Error processing event ${eventId}:`, error);
        // If a system error occurs, the event is not acknowledged with a 200,
        // allowing the provider to retry. The idempotency check will prevent reprocessing
        // if the error happened after the event was marked as processed.
        res.status(500).send('Internal Server Error.');
    }
});
```

## Booking Engine Integration

### Integration Overview

External booking engine integration allows guests to make reservations through a third-party booking interface while maintaining real-time inventory synchronization.

### API Integration Pattern

#### RESTful API
The booking engine communicates via REST API:

**Endpoints**:
- `GET /api/availability` - Check room availability
- `POST /api/reservations` - Create new reservation
- `GET /api/reservations/:id` - Get reservation details
- `PUT /api/reservations/:id` - Update reservation
- `DELETE /api/reservations/:id` - Cancel reservation

#### Authentication
```javascript
// JWT-based authentication
const token = jwt.sign(
    { clientId: 'booking-engine', scope: 'reservations' },
    process.env.API_SECRET,
    { expiresIn: '1h' }
);

// API request with authentication
const response = await axios.get('/api/availability', {
    headers: { Authorization: `Bearer ${token}` }
});
```

### Real-time Availability

#### Caching Strategy
```javascript
class AvailabilityService {
    async getAvailability(hotelId, dateRange) {
        const cacheKey = `availability:${hotelId}:${dateRange}`;
        
        // Check cache first
        let availability = await redis.get(cacheKey);
        if (availability) {
            return JSON.parse(availability);
        }
        
        // Query database
        availability = await this.queryAvailability(hotelId, dateRange);
        
        // Cache for 5 minutes
        await redis.setex(cacheKey, 300, JSON.stringify(availability));
        
        return availability;
    }
    
    async invalidateAvailabilityCache(hotelId, date) {
        const pattern = `availability:${hotelId}:*${date}*`;
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    }
}
```

### Reservation Synchronization

#### Bidirectional Sync
```javascript
// Booking engine creates reservation
app.post('/api/reservations', async (req, res) => {
    const reservation = await reservationService.create(req.body);
    
    // Invalidate availability cache
    await availabilityService.invalidateCache(
        reservation.hotelId,
        reservation.checkInDate
    );
    
    // Broadcast update via WebSocket
    io.to(`hotel:${reservation.hotelId}`).emit('reservation:created', {
        reservationId: reservation.id
    });
    
    res.status(201).json(reservation);
});
```

## Email Service Integration

### Integration Overview

Email service integration for automated notifications and communications.

### SMTP Configuration
```javascript
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});
```

### Email Templates

#### Template System
```javascript
class EmailService {
    async sendReservationConfirmation(reservation) {
        const template = await this.loadTemplate('reservation-confirmation');
        const html = this.renderTemplate(template, {
            guestName: reservation.client.name,
            confirmationNumber: reservation.confirmationNumber,
            checkIn: reservation.checkInDate,
            checkOut: reservation.checkOutDate,
            hotelName: reservation.hotel.name
        });
        
        await this.send({
            to: reservation.client.email,
            subject: 'Reservation Confirmation',
            html
        });
    }
}
```

### Email Queue

#### Asynchronous Email Sending
```javascript
class EmailQueue {
    async enqueue(emailData) {
        await redis.lpush('email:queue', JSON.stringify(emailData));
    }
    
    async processQueue() {
        while (true) {
            const emailData = await redis.brpop('email:queue', 0);
            if (emailData) {
                await this.sendEmail(JSON.parse(emailData[1]));
            }
        }
    }
}
```

## Google Services Integration

### Google OAuth Authentication
```javascript
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Store tokens and create user session
    await createUserSession(tokens);
    res.redirect('/dashboard');
});
```

### Google Calendar Integration
```javascript
async function createCalendarEvent(reservation) {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const event = {
        summary: `Reservation: ${reservation.client.name}`,
        description: `Confirmation: ${reservation.confirmationNumber}`,
        start: { dateTime: reservation.checkInDate },
        end: { dateTime: reservation.checkOutDate }
    };
    
    await calendar.events.insert({
        calendarId: 'primary',
        resource: event
    });
}
```

## Integration Monitoring

### Health Checks
```javascript
class IntegrationHealthCheck {
    async checkOTAConnection() {
        try {
            await otaService.ping();
            return { status: 'healthy', latency: 50 };
        } catch (error) {
            return { status: 'unhealthy', error: error.message };
        }
    }
    
    async checkPaymentGateway() {
        // Similar health check for payment gateway
    }
}
```

### Logging and Alerting
```javascript
// Log all integration events
logger.info('OTA sync completed', {
    provider: 'booking.com',
    bookingsProcessed: 15,
    duration: 2500,
    timestamp: new Date()
});

// Alert on failures
if (failureCount > threshold) {
    await alertService.send({
        severity: 'high',
        message: 'OTA integration failing',
        details: { provider, failureCount }
    });
}
```

## Related Documentation

- **[System Overview](system-overview.md)** - High-level architecture
- **[API Documentation](../api/README.md)** - API specifications
- **[Booking Engine Integration](../integrations/booking-engine/overview.md)** - Detailed booking engine docs
- **[Payment Integration](../integrations/payment-systems/square-integration.md)** - Payment system details
- **[OTA Integration](../integrations/ota-systems/xml-integration.md)** - OTA integration details

---

*These integration patterns ensure reliable, secure, and maintainable connections with external systems.*
