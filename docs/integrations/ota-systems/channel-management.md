# Channel Management Integration

This document provides guidance for integrating the WeHub.work Hotel Management System (project name: rht-hotel) with channel management systems for multi-channel distribution.

**Note**: Throughout this documentation, "WeHub.work" refers to the product/brand name, while "rht-hotel" is the internal project/repository name.

## Overview

Channel management systems act as intermediaries between the PMS and multiple OTA platforms, enabling centralized management of rates, inventory, and reservations across all distribution channels.

### Benefits of Channel Manager Integration
- **Centralized Control** - Manage all channels from single interface
- **Real-time Synchronization** - Instant updates across all channels
- **Overbooking Prevention** - Automated inventory management
- **Rate Parity** - Maintain consistent pricing across channels
- **Reduced Manual Work** - Eliminate duplicate data entry

### Supported Channel Managers
- **SiteMinder** - Leading global channel manager
- **Cloudbeds** - All-in-one hospitality platform
- **RateGain** - Distribution and revenue management
- **D-EDGE** - Hospitality technology solutions
- **Custom Integrations** - Flexible API framework

## Integration Architecture

### Hub-and-Spoke Model

```
                    ┌─────────────────┐
                    │   Channel       │
                    │   Manager       │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐         ┌────▼────┐        ┌────▼────┐
    │Booking  │         │Expedia  │        │ Agoda   │
    │.com     │         │         │        │         │
    └─────────┘         └─────────┘        └─────────┘
         ▲                   ▲                   ▲
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                    ┌────────▼────────┐
                    │  WeHub.work     │
                    │  PMS            │
                    └─────────────────┘
```

### Communication Flow

#### Outbound (PMS → Channel Manager → OTAs)
1. **Rate/Inventory Change** - Update occurs in PMS
2. **Push to Channel Manager** - PMS sends update via API
3. **Distribution** - Channel manager distributes to all connected OTAs
4. **Confirmation** - Channel manager confirms successful distribution

#### Inbound (OTAs → Channel Manager → PMS)
1. **Booking Created** - Guest books on OTA platform
2. **Notification** - Channel manager receives booking
3. **Forward to PMS** - Channel manager sends booking to PMS
4. **Confirmation** - PMS confirms receipt and creates reservation

## API Integration

### Authentication

#### API Key Authentication
```javascript
const headers = {
  'X-API-Key': process.env.CHANNEL_MANAGER_API_KEY,
  'Content-Type': 'application/json'
};
```

#### OAuth 2.0 Authentication
```javascript
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
};
```

### Rate and Inventory Updates

#### Push Rate Update
```javascript
POST /api/v1/rates/update
Content-Type: application/json

{
  "hotel_id": "HOTEL123",
  "room_type_id": "DELUXE",
  "rate_plan_id": "BAR",
  "start_date": "2024-02-01",
  "end_date": "2024-02-28",
  "rates": [
    {
      "date": "2024-02-01",
      "amount": 150.00,
      "currency": "USD",
      "occupancy": 2
    }
  ]
}
```

#### Push Availability Update
```javascript
POST /api/v1/availability/update
Content-Type: application/json

{
  "hotel_id": "HOTEL123",
  "room_type_id": "DELUXE",
  "start_date": "2024-02-01",
  "end_date": "2024-02-28",
  "availability": [
    {
      "date": "2024-02-01",
      "available_rooms": 10,
      "min_stay": 2,
      "max_stay": 14,
      "closed": false
    }
  ]
}
```

### Reservation Management

#### Receive Reservation Webhook
```javascript
POST /api/v1/webhooks/reservations
Content-Type: application/json

{
  "event_type": "reservation.created",
  "reservation_id": "CM-RES-12345",
  "hotel_id": "HOTEL123",
  "channel": "booking_com",
  "guest": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1-555-0123"
  },
  "room_type": "DELUXE",
  "rate_plan": "BAR",
  "check_in": "2024-02-01",
  "check_out": "2024-02-03",
  "adults": 2,
  "children": 0,
  "total_amount": 300.00,
  "currency": "USD",
  "status": "confirmed"
}
```

#### Confirm Reservation Receipt
```javascript
POST /api/v1/reservations/{reservation_id}/confirm
Content-Type: application/json

{
  "pms_reservation_id": "PMS-RES-001",
  "status": "confirmed",
  "confirmation_number": "CONF-12345"
}
```

## Configuration

### Channel Manager Settings

#### Connection Configuration
```javascript
{
  "channel_manager": {
    "provider": "siteminder",
    "enabled": true,
    "api_url": "https://api.siteminder.com/v1",
    "api_key": "your-api-key",
    "hotel_id": "HOTEL123",
    "timeout_seconds": 30,
    "retry_attempts": 3
  }
}
```

#### Channel Configuration
```javascript
{
  "channels": {
    "booking_com": {
      "enabled": true,
      "channel_id": "BDC",
      "auto_accept": true,
      "rate_multiplier": 1.0
    },
    "expedia": {
      "enabled": true,
      "channel_id": "EXP",
      "auto_accept": true,
      "rate_multiplier": 1.0
    },
    "agoda": {
      "enabled": true,
      "channel_id": "AGO",
      "auto_accept": false,
      "rate_multiplier": 1.0
    }
  }
}
```

### Room Type Mapping

#### Mapping Configuration
```javascript
{
  "room_mappings": {
    "STANDARD": {
      "pms_code": "STD",
      "channel_manager_code": "STANDARD",
      "booking_com_code": "1",
      "expedia_code": "STD",
      "agoda_code": "STANDARD"
    },
    "DELUXE": {
      "pms_code": "DLX",
      "channel_manager_code": "DELUXE",
      "booking_com_code": "2",
      "expedia_code": "DLX",
      "agoda_code": "DELUXE"
    }
  }
}
```

### Rate Plan Mapping

#### Rate Plan Configuration
```javascript
{
  "rate_plan_mappings": {
    "BAR": {
      "pms_code": "BAR",
      "channel_manager_code": "BAR",
      "description": "Best Available Rate",
      "cancellation_policy": "flexible"
    },
    "NRF": {
      "pms_code": "NRF",
      "channel_manager_code": "NONREF",
      "description": "Non-Refundable",
      "cancellation_policy": "non_refundable"
    }
  }
}
```

## Synchronization Strategy

### Initial Setup Synchronization

#### Property Information Sync
1. **Export Property Data** - Extract hotel information from PMS
2. **Upload to Channel Manager** - Send property details via API
3. **Verify Data** - Confirm data received correctly
4. **Map Room Types** - Configure room type mappings
5. **Map Rate Plans** - Configure rate plan mappings

#### Historical Data Sync
1. **Export Rates** - Extract current rates for next 365 days
2. **Export Availability** - Extract availability for next 365 days
3. **Bulk Upload** - Send data to channel manager
4. **Verify Sync** - Confirm data distributed to all channels
5. **Test Bookings** - Create test reservations on each channel

### Ongoing Synchronization

#### Real-time Updates
- **Rate Changes** - Push immediately when rates updated
- **Availability Changes** - Push immediately when inventory changes
- **Restrictions** - Push immediately when restrictions change
- **Closures** - Push immediately when rooms closed

#### Scheduled Synchronization
- **Daily Full Sync** - Complete rate and availability sync at 2 AM
- **Hourly Reconciliation** - Verify data consistency every hour
- **Weekly Audit** - Full data audit and correction weekly

### Conflict Resolution

#### Overbooking Prevention
1. **Inventory Tracking** - Track bookings from all channels
2. **Real-time Updates** - Update availability immediately after booking
3. **Buffer Inventory** - Maintain safety buffer for manual bookings
4. **Automatic Closure** - Close channels when inventory depleted

#### Rate Parity Management
1. **Monitor Rates** - Track rates across all channels
2. **Detect Discrepancies** - Identify rate differences
3. **Alert Management** - Notify of rate parity violations
4. **Automatic Correction** - Push correct rates to all channels

## Webhook Handling

### Webhook Security

#### Signature Verification
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const calculatedSignature = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(calculatedSignature)
  );
}
```

#### IP Whitelisting
```javascript
const allowedIPs = [
  '203.0.113.1',
  '203.0.113.2',
  '203.0.113.3'
];

function isAllowedIP(requestIP) {
  return allowedIPs.includes(requestIP);
}
```

### Webhook Processing

#### Reservation Webhook Handler
```javascript
async function handleReservationWebhook(payload) {
  try {
    // Validate webhook signature
    if (!verifyWebhookSignature(payload, signature, secret)) {
      throw new Error('Invalid webhook signature');
    }

    // Parse reservation data
    const reservation = parseReservationData(payload);

    // Check for duplicate
    const existing = await findExistingReservation(
      reservation.channel_reservation_id
    );
    if (existing) {
      return { status: 'duplicate', reservation_id: existing.id };
    }

    // Create reservation in PMS
    const pmsReservation = await createReservation(reservation);

    // Update inventory
    await updateInventory(
      reservation.room_type,
      reservation.check_in,
      reservation.check_out,
      -1
    );

    // Send confirmation to channel manager
    await confirmReservation(
      reservation.channel_reservation_id,
      pmsReservation.id
    );

    // Notify staff
    await notifyStaff('new_reservation', pmsReservation);

    return { status: 'success', reservation_id: pmsReservation.id };
  } catch (error) {
    console.error('Webhook processing error:', error);
    throw error;
  }
}
```

## Monitoring and Reporting

### Integration Health Monitoring

#### Health Check Metrics
```javascript
{
  "channel_manager_health": {
    "status": "healthy",
    "last_sync": "2024-01-15T14:30:00Z",
    "sync_success_rate": 99.5,
    "avg_response_time_ms": 180,
    "failed_updates_24h": 3,
    "pending_updates": 0
  }
}
```

#### Channel-Specific Metrics
```javascript
{
  "channel_metrics": {
    "booking_com": {
      "bookings_today": 5,
      "bookings_month": 87,
      "revenue_today": 750.00,
      "revenue_month": 13050.00,
      "avg_rate": 150.00,
      "last_booking": "2024-01-15T13:45:00Z"
    },
    "expedia": {
      "bookings_today": 3,
      "bookings_month": 62,
      "revenue_today": 450.00,
      "revenue_month": 9300.00,
      "avg_rate": 150.00,
      "last_booking": "2024-01-15T12:30:00Z"
    }
  }
}
```

### Performance Reports

#### Distribution Performance
- **Channel Contribution** - Revenue by channel
- **Booking Patterns** - Booking trends by channel
- **Rate Performance** - Average rates by channel
- **Conversion Rates** - Views to bookings by channel

#### Operational Metrics
- **Sync Success Rate** - Percentage of successful updates
- **Response Times** - API response time trends
- **Error Rates** - Failed updates by type
- **Inventory Accuracy** - Availability discrepancies

## Troubleshooting

### Common Issues

#### Synchronization Failures
**Symptoms**: Rates or availability not updating on channels

**Causes**:
- Network connectivity issues
- Invalid API credentials
- Incorrect room/rate mappings
- Channel manager system outage

**Solutions**:
1. Verify network connectivity
2. Check API credentials validity
3. Review room and rate plan mappings
4. Check channel manager status page
5. Review error logs for specific errors
6. Retry failed updates manually

#### Booking Import Failures
**Symptoms**: Reservations not appearing in PMS

**Causes**:
- Webhook endpoint not accessible
- Invalid webhook signature
- Room type mapping errors
- Insufficient inventory

**Solutions**:
1. Verify webhook endpoint is publicly accessible
2. Check webhook signature verification
3. Review room type mappings
4. Check inventory levels
5. Review webhook logs
6. Manually import failed bookings

#### Rate Parity Issues
**Symptoms**: Different rates showing on different channels

**Causes**:
- Failed rate updates
- Channel-specific rate multipliers
- Manual rate changes on channels
- Cached rates on OTA platforms

**Solutions**:
1. Push fresh rates to all channels
2. Verify rate multiplier settings
3. Check for manual overrides on channels
4. Wait for OTA cache refresh
5. Contact channel manager support

## Best Practices

### Configuration Management
- **Document Mappings** - Maintain clear documentation of all mappings
- **Version Control** - Track configuration changes
- **Regular Audits** - Review mappings quarterly
- **Test Changes** - Test configuration changes in sandbox first

### Data Quality
- **Validate Data** - Validate all data before sending
- **Monitor Accuracy** - Regular data accuracy checks
- **Clean Data** - Remove outdated or incorrect data
- **Consistent Naming** - Use consistent naming conventions

### Performance Optimization
- **Batch Updates** - Group multiple updates when possible
- **Async Processing** - Process webhooks asynchronously
- **Caching** - Cache frequently accessed data
- **Rate Limiting** - Respect API rate limits

### Security
- **Secure Credentials** - Store credentials securely
- **Verify Webhooks** - Always verify webhook signatures
- **HTTPS Only** - Use HTTPS for all communications
- **Regular Audits** - Conduct security audits regularly

## Related Documentation

- **[OTA XML Integration](xml-integration.md)** - Direct OTA integration
- **[Integration Overview](../README.md)** - General integration documentation
- **[Integration Patterns](../../architecture/integration-patterns.md)** - Integration architecture
- **[Troubleshooting](../troubleshooting.md)** - Integration troubleshooting

---

*This guide provides comprehensive information for implementing channel manager integrations for multi-channel distribution.*
