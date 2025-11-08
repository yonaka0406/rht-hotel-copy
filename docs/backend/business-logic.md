# Business Logic

This document describes the business rules, validation logic, and domain-specific operations implemented in the WeHub.work Hotel Management System backend.

## Overview

Business logic is implemented across multiple layers:
- **Validation Layer**: Input validation and data integrity
- **Business Rules Layer**: Domain-specific rules and constraints
- **Calculation Layer**: Pricing, availability, and financial calculations
- **Workflow Layer**: Multi-step business processes

## Validation Rules

### Input Validation

#### Request Parameter Validation

The system uses centralized validation utilities located in `api/utils/validationUtils.js`:

```javascript
// Numeric ID validation
const validateNumericParam = (idString, paramName) => {
    if (!idString || isNaN(idString) || parseInt(idString) <= 0) {
        throw new Error(`Invalid ${paramName}: must be a positive integer`);
    }
    return parseInt(idString);
};

// UUID validation
const validateUuidParam = (uuidString, paramName) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidString || !uuidRegex.test(uuidString)) {
        throw new Error(`Invalid ${paramName}: must be a valid UUID`);
    }
    return uuidString;
};

// Date validation
const validateDateStringParam = (dateString, paramName) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateString || !dateRegex.test(dateString)) {
        throw new Error(`Invalid ${paramName}: must be in YYYY-MM-DD format`);
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid ${paramName}: not a valid date`);
    }
    
    return dateString;
};

// Non-empty string validation
const validateNonEmptyStringParam = (str, paramName) => {
    if (!str || typeof str !== 'string' || str.trim().length === 0) {
        throw new Error(`Invalid ${paramName}: must be a non-empty string`);
    }
    return str.trim();
};

// Integer validation (including negative and zero)
const validateIntegerParam = (intString, paramName) => {
    if (intString === undefined || intString === null || intString === '') {
        throw new Error(`Invalid ${paramName}: value is required`);
    }
    
    const num = Number(intString);
    if (isNaN(num) || !Number.isInteger(num)) {
        throw new Error(`Invalid ${paramName}: must be a valid integer`);
    }
    
    return num;
};
```

**Usage in Controllers:**
```javascript
const { validateNumericParam, validateDateStringParam } = require('../utils/validationUtils');

const getReservations = async (req, res) => {
    try {
        const hotelId = validateNumericParam(req.params.hotelId, 'Hotel ID');
        const startDate = validateDateStringParam(req.query.startDate, 'Start Date');
        
        // Proceed with validated parameters
        const reservations = await reservationModel.getReservations(
            req.requestId,
            hotelId,
            startDate
        );
        
        res.json({ success: true, data: reservations });
    } catch (error) {
        res.status(400).json({ success: false, error: { message: error.message } });
    }
};
```

### Data Validation

#### Reservation Validation

```javascript
const validateReservationData = (data) => {
    const errors = [];
    
    // Required fields
    if (!data.hotelId) errors.push('Hotel ID is required');
    if (!data.clientId) errors.push('Client ID is required');
    if (!data.checkInDate) errors.push('Check-in date is required');
    if (!data.checkOutDate) errors.push('Check-out date is required');
    
    // Date validation
    const checkIn = new Date(data.checkInDate);
    const checkOut = new Date(data.checkOutDate);
    
    if (checkOut <= checkIn) {
        errors.push('Check-out date must be after check-in date');
    }
    
    if (checkIn < new Date().setHours(0, 0, 0, 0)) {
        errors.push('Check-in date cannot be in the past');
    }
    
    // Guest count validation
    if (data.guestCount && data.guestCount < 1) {
        errors.push('Guest count must be at least 1');
    }
    
    // Amount validation
    if (data.totalAmount && data.totalAmount < 0) {
        errors.push('Total amount cannot be negative');
    }
    
    if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    
    return true;
};
```

#### Client Validation

```javascript
const validateClientData = (data) => {
    const errors = [];
    
    // At least one name field required
    if (!data.name && !data.name_kanji && !data.name_kana) {
        errors.push('At least one name field is required');
    }
    
    // Email validation
    if (data.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            errors.push('Invalid email format');
        }
    }
    
    // Phone validation
    if (data.phone) {
        const phoneRegex = /^[\d\-\+\(\)\s]+$/;
        if (!phoneRegex.test(data.phone)) {
            errors.push('Invalid phone number format');
        }
    }
    
    if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    
    return true;
};
```

## Business Rules

### Reservation Rules

#### Availability Rules

```javascript
const checkRoomAvailability = async (requestId, hotelId, roomTypeId, checkIn, checkOut) => {
    const pool = getPool(requestId);
    
    // Check for overlapping reservations
    const query = `
        SELECT COUNT(*) as conflict_count
        FROM reservations
        WHERE hotel_id = $1
        AND room_type_id = $2
        AND status IN ('confirmed', 'checked_in')
        AND (
            (check_in_date <= $3 AND check_out_date > $3) OR
            (check_in_date < $4 AND check_out_date >= $4) OR
            (check_in_date >= $3 AND check_out_date <= $4)
        )
    `;
    
    const result = await pool.query(query, [hotelId, roomTypeId, checkIn, checkOut]);
    const conflictCount = parseInt(result.rows[0].conflict_count);
    
    // Get total rooms of this type
    const roomCountQuery = `
        SELECT COUNT(*) as total_rooms
        FROM rooms
        WHERE hotel_id = $1
        AND room_type_id = $2
        AND status = 'available'
    `;
    
    const roomCountResult = await pool.query(roomCountQuery, [hotelId, roomTypeId]);
    const totalRooms = parseInt(roomCountResult.rows[0].total_rooms);
    
    return (totalRooms - conflictCount) > 0;
};
```

#### Cancellation Rules

```javascript
const calculateCancellationFee = (reservation, cancellationDate) => {
    const checkInDate = new Date(reservation.check_in_date);
    const cancelDate = new Date(cancellationDate);
    const daysUntilCheckIn = Math.ceil((checkInDate - cancelDate) / (1000 * 60 * 60 * 24));
    
    let feePercentage = 0;
    
    // Cancellation policy
    if (daysUntilCheckIn < 1) {
        feePercentage = 100; // Same day: 100% fee
    } else if (daysUntilCheckIn < 3) {
        feePercentage = 50; // 1-2 days: 50% fee
    } else if (daysUntilCheckIn < 7) {
        feePercentage = 25; // 3-6 days: 25% fee
    } else {
        feePercentage = 0; // 7+ days: No fee
    }
    
    const cancellationFee = (reservation.total_amount * feePercentage) / 100;
    
    return {
        feePercentage,
        cancellationFee,
        refundAmount: reservation.paid_amount - cancellationFee
    };
};
```

### Pricing Rules

#### Rate Calculation

```javascript
const calculateReservationRate = async (requestId, hotelId, roomTypeId, checkIn, checkOut, planId) => {
    const pool = getPool(requestId);
    
    // Get plan rates for date range
    const query = `
        SELECT 
            pr.rate,
            pr.day_of_week
        FROM plan_rates pr
        WHERE pr.plan_id = $1
        AND pr.room_type_id = $2
        AND (
            (pr.valid_from IS NULL OR pr.valid_from <= $3) AND
            (pr.valid_to IS NULL OR pr.valid_to >= $4)
        )
    `;
    
    const result = await pool.query(query, [planId, roomTypeId, checkIn, checkOut]);
    
    if (result.rows.length === 0) {
        throw new Error('No rates found for the specified dates');
    }
    
    // Calculate total for each night
    let totalAmount = 0;
    const currentDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    
    while (currentDate < endDate) {
        const dayOfWeek = currentDate.getDay();
        
        // Find applicable rate for this day
        const applicableRate = result.rows.find(rate => {
            if (!rate.day_of_week) return true; // No day restriction
            return rate.day_of_week.includes(dayOfWeek);
        });
        
        if (applicableRate) {
            totalAmount += parseFloat(applicableRate.rate);
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return totalAmount;
};
```

#### Addon Pricing

```javascript
const calculateAddonCosts = (addons, nights) => {
    let addonTotal = 0;
    
    addons.forEach(addon => {
        const quantity = addon.quantity || 1;
        const price = parseFloat(addon.price);
        
        // Some addons are per-night, others are one-time
        if (addon.per_night) {
            addonTotal += price * quantity * nights;
        } else {
            addonTotal += price * quantity;
        }
    });
    
    return addonTotal;
};
```

#### Tax Calculation

```javascript
const calculateTaxes = (subtotal, taxRate = 0.10) => {
    const taxAmount = Math.round(subtotal * taxRate);
    const totalAmount = subtotal + taxAmount;
    
    return {
        subtotal,
        taxAmount,
        totalAmount,
        taxRate
    };
};
```

### Client Management Rules

#### Loyalty Tier Calculation

```javascript
const calculateLoyaltyTier = (totalStays, totalSpent) => {
    if (totalStays >= 50 || totalSpent >= 1000000) {
        return 'platinum';
    } else if (totalStays >= 20 || totalSpent >= 500000) {
        return 'gold';
    } else if (totalStays >= 10 || totalSpent >= 200000) {
        return 'silver';
    } else {
        return 'standard';
    }
};
```

#### Loyalty Points Calculation

```javascript
const calculateLoyaltyPoints = (amount, tier) => {
    const basePoints = Math.floor(amount / 100); // 1 point per 100 yen
    
    // Tier multipliers
    const multipliers = {
        'standard': 1.0,
        'silver': 1.2,
        'gold': 1.5,
        'platinum': 2.0
    };
    
    const multiplier = multipliers[tier] || 1.0;
    return Math.floor(basePoints * multiplier);
};
```

### Billing Rules

#### Invoice Generation

```javascript
const generateInvoice = async (requestId, reservationId) => {
    const pool = getPool(requestId);
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Get reservation details
        const reservation = await getReservationById(requestId, reservationId);
        
        // Calculate nights
        const nights = calculateNights(reservation.check_in_date, reservation.check_out_date);
        
        // Get room rate
        const roomTotal = await calculateReservationRate(
            requestId,
            reservation.hotel_id,
            reservation.room_type_id,
            reservation.check_in_date,
            reservation.check_out_date,
            reservation.plan_id
        );
        
        // Get addons
        const addons = await getReservationAddons(requestId, reservationId);
        const addonTotal = calculateAddonCosts(addons, nights);
        
        // Calculate subtotal and taxes
        const subtotal = roomTotal + addonTotal;
        const { taxAmount, totalAmount } = calculateTaxes(subtotal);
        
        // Generate invoice number
        const invoiceNumber = await generateInvoiceNumber(requestId);
        
        // Create invoice
        const invoiceQuery = `
            INSERT INTO invoices (
                reservation_id,
                invoice_number,
                subtotal,
                tax_amount,
                total_amount,
                status
            ) VALUES ($1, $2, $3, $4, $5, 'pending')
            RETURNING *
        `;
        
        const result = await client.query(invoiceQuery, [
            reservationId,
            invoiceNumber,
            subtotal,
            taxAmount,
            totalAmount
        ]);
        
        await client.query('COMMIT');
        
        return result.rows[0];
        
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};
```

#### Payment Processing

```javascript
const processPayment = async (requestId, paymentData) => {
    const { invoiceId, amount, paymentMethod, transactionId } = paymentData;
    
    const pool = getPool(requestId);
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Get invoice
        const invoiceQuery = 'SELECT * FROM invoices WHERE id = $1';
        const invoiceResult = await client.query(invoiceQuery, [invoiceId]);
        const invoice = invoiceResult.rows[0];
        
        if (!invoice) {
            throw new Error('Invoice not found');
        }
        
        // Validate payment amount
        const remainingBalance = invoice.total_amount - invoice.paid_amount;
        if (amount > remainingBalance) {
            throw new Error('Payment amount exceeds remaining balance');
        }
        
        // Record payment
        const paymentQuery = `
            INSERT INTO payments (
                invoice_id,
                reservation_id,
                amount,
                payment_method,
                transaction_id,
                status
            ) VALUES ($1, $2, $3, $4, $5, 'completed')
            RETURNING *
        `;
        
        const paymentResult = await client.query(paymentQuery, [
            invoiceId,
            invoice.reservation_id,
            amount,
            paymentMethod,
            transactionId
        ]);
        
        // Update invoice paid amount
        const newPaidAmount = parseFloat(invoice.paid_amount) + parseFloat(amount);
        const newStatus = newPaidAmount >= invoice.total_amount ? 'paid' : 'partial';
        
        await client.query(
            'UPDATE invoices SET paid_amount = $1, status = $2 WHERE id = $3',
            [newPaidAmount, newStatus, invoiceId]
        );
        
        await client.query('COMMIT');
        
        return paymentResult.rows[0];
        
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};
```

## Workflow Processes

### Check-in Workflow

```javascript
const processCheckIn = async (requestId, reservationId) => {
    const pool = getPool(requestId);
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Get reservation
        const reservation = await getReservationById(requestId, reservationId);
        
        // Validate check-in is allowed
        const today = new Date().toISOString().split('T')[0];
        if (reservation.check_in_date > today) {
            throw new Error('Cannot check in before check-in date');
        }
        
        if (reservation.status !== 'confirmed') {
            throw new Error('Reservation must be confirmed to check in');
        }
        
        // Assign room if not already assigned
        if (!reservation.room_id) {
            const room = await assignAvailableRoom(
                requestId,
                reservation.hotel_id,
                reservation.room_type_id,
                client
            );
            
            await client.query(
                'UPDATE reservations SET room_id = $1 WHERE id = $2',
                [room.id, reservationId]
            );
        }
        
        // Update reservation status
        await client.query(
            'UPDATE reservations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['checked_in', reservationId]
        );
        
        // Update room status
        await client.query(
            'UPDATE rooms SET status = $1 WHERE id = $2',
            ['occupied', reservation.room_id]
        );
        
        await client.query('COMMIT');
        
        return { success: true, message: 'Check-in completed successfully' };
        
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};
```

### Check-out Workflow

```javascript
const processCheckOut = async (requestId, reservationId) => {
    const pool = getPool(requestId);
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Get reservation
        const reservation = await getReservationById(requestId, reservationId);
        
        if (reservation.status !== 'checked_in') {
            throw new Error('Reservation must be checked in to check out');
        }
        
        // Check for outstanding balance
        const invoice = await getInvoiceByReservation(requestId, reservationId);
        if (invoice && invoice.status !== 'paid') {
            const balance = invoice.total_amount - invoice.paid_amount;
            if (balance > 0) {
                throw new Error(`Outstanding balance of ${balance} must be paid before check-out`);
            }
        }
        
        // Update reservation status
        await client.query(
            'UPDATE reservations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['completed', reservationId]
        );
        
        // Update room status
        await client.query(
            'UPDATE rooms SET status = $1 WHERE id = $2',
            ['dirty', reservation.room_id]
        );
        
        // Award loyalty points
        if (reservation.client_id) {
            const points = calculateLoyaltyPoints(
                reservation.total_amount,
                reservation.client_loyalty_tier
            );
            
            await client.query(
                'UPDATE clients SET loyalty_points = loyalty_points + $1 WHERE id = $2',
                [points, reservation.client_id]
            );
        }
        
        await client.query('COMMIT');
        
        return { success: true, message: 'Check-out completed successfully' };
        
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};
```

## Best Practices

### 1. Always Validate Input

```javascript
// ✅ Correct
const hotelId = validateNumericParam(req.params.hotelId, 'Hotel ID');
validateReservationData(req.body);

// ❌ Incorrect
const hotelId = req.params.hotelId;
// No validation
```

### 2. Use Transactions for Multi-Step Operations

```javascript
// ✅ Correct
const client = await pool.connect();
try {
    await client.query('BEGIN');
    // Multiple operations
    await client.query('COMMIT');
} catch (error) {
    await client.query('ROLLBACK');
    throw error;
} finally {
    client.release();
}
```

### 3. Implement Business Rules in Service Layer

```javascript
// ✅ Correct - Business logic in service
const canCancelReservation = (reservation) => {
    const checkInDate = new Date(reservation.check_in_date);
    const now = new Date();
    const hoursUntilCheckIn = (checkInDate - now) / (1000 * 60 * 60);
    
    return hoursUntilCheckIn > 24; // Can cancel if more than 24 hours
};

// ❌ Incorrect - Business logic in controller
```

### 4. Return Meaningful Error Messages

```javascript
// ✅ Correct
throw new Error('Cannot check in before check-in date');

// ❌ Incorrect
throw new Error('Invalid operation');
```

## Related Documentation

- **[Backend Development](README.md)** - Backend overview
- **[Service Architecture](service-architecture.md)** - Service design
- **[Database Schema](database-schema.md)** - Database structure
- **[API Documentation](../api/README.md)** - API endpoints

---

*This business logic documentation provides comprehensive guidance for implementing and maintaining domain-specific rules and workflows.*
