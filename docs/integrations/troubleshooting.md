# Integration Troubleshooting Guide

This document provides comprehensive troubleshooting procedures for all external system integrations in the WeHub.work Hotel Management System.

## Overview

This guide covers common integration issues, diagnostic procedures, and resolution steps for:
- Booking Engine Integration
- OTA Integrations
- Payment Gateway Integration
- Email Service Integration
- Channel Manager Integration

## General Troubleshooting Approach

### Diagnostic Steps

1. **Identify the Problem** - Determine which integration is affected
2. **Check System Status** - Verify external service availability
3. **Review Logs** - Examine integration logs for errors
4. **Verify Configuration** - Confirm settings are correct
5. **Test Connectivity** - Verify network connectivity
6. **Isolate the Issue** - Determine if issue is local or external
7. **Apply Fix** - Implement appropriate solution
8. **Verify Resolution** - Confirm issue is resolved
9. **Document** - Record issue and resolution

### Log Locations

```javascript
{
  "log_locations": {
    "integration_logs": "/var/log/pms/integrations/",
    "api_logs": "/var/log/pms/api/",
    "webhook_logs": "/var/log/pms/webhooks/",
    "error_logs": "/var/log/pms/errors/",
    "audit_logs": "/var/log/pms/audit/"
  }
}
```

## Booking Engine Integration Issues

### Issue: Availability Not Syncing

#### Symptoms
- Booking engine shows incorrect availability
- Rooms appear unavailable when they should be available
- Availability updates not reflecting in booking engine

#### Diagnostic Steps
```bash
# Check cache status
curl -X GET https://booking-engine.com/api/cache/status \
  -H "Authorization: Bearer YOUR_API_KEY"

# Check last sync time
grep "availability sync" /var/log/pms/integrations/booking-engine.log | tail -20

# Verify PMS availability data
SELECT room_type_id, date, available_rooms 
FROM availability 
WHERE date >= CURRENT_DATE 
ORDER BY date LIMIT 10;
```

#### Common Causes
- **Cache not refreshing** - Availability cache TTL expired but not updating
- **API credentials invalid** - Authentication failing
- **Network connectivity** - Cannot reach booking engine API
- **Data mismatch** - Room type mapping incorrect

#### Resolution Steps

**1. Manual Cache Refresh**
```bash
# Trigger manual cache update
curl -X POST https://booking-engine.com/api/cache/refresh-availability \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "hotel_id": "your-hotel-id",
    "start_date": "2024-02-01",
    "end_date": "2024-02-28"
  }'
```

**2. Verify Room Type Mapping**
```sql
-- Check room type mappings
SELECT pms_room_type_id, booking_engine_room_type_id, is_active
FROM room_type_mappings
WHERE is_active = true;
```

**3. Check API Credentials**
```javascript
// Test API connection
async function testBookingEngineConnection() {
  try {
    const response = await fetch('https://booking-engine.com/api/health', {
      headers: {
        'Authorization': `Bearer ${process.env.BOOKING_ENGINE_API_KEY}`
      }
    });
    console.log('Connection status:', response.status);
  } catch (error) {
    console.error('Connection failed:', error);
  }
}
```

**4. Restart Background Sync Service**
```bash
# Restart availability sync service
pm2 restart booking-engine-sync

# Check service status
pm2 status booking-engine-sync
```

### Issue: Reservations Not Importing

#### Symptoms
- Bookings made on booking engine not appearing in PMS
- Webhook notifications not being received
- Reservation import errors in logs

#### Diagnostic Steps
```bash
# Check webhook endpoint accessibility
curl -X POST https://pms.hotel.com/api/webhooks/booking-engine \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check recent webhook logs
tail -f /var/log/pms/webhooks/booking-engine.log

# Check for failed imports
SELECT * FROM reservation_import_errors 
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

#### Common Causes
- **Webhook endpoint not accessible** - Firewall blocking requests
- **Invalid webhook signature** - Signature verification failing
- **Room type not mapped** - Unknown room type in booking
- **Insufficient inventory** - No rooms available in PMS

#### Resolution Steps

**1. Verify Webhook Endpoint**
```bash
# Test webhook endpoint from external service
curl -X POST https://pms.hotel.com/api/webhooks/booking-engine \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: test-signature" \
  -d '{
    "event": "reservation.created",
    "reservation_id": "TEST-001"
  }'
```

**2. Check Firewall Rules**
```bash
# Allow booking engine IP addresses
sudo ufw allow from 203.0.113.0/24 to any port 443

# Verify firewall status
sudo ufw status
```

**3. Review Webhook Signature Verification**
```javascript
// Verify webhook signature implementation
function verifyWebhookSignature(payload, signature, secret) {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  const calculatedSignature = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(calculatedSignature)
  );
}
```

**4. Manual Reservation Import**
```javascript
// Manually import failed reservation
async function manualImportReservation(bookingEngineReservationId) {
  const reservation = await fetchReservationFromBookingEngine(bookingEngineReservationId);
  return await createReservationInPMS(reservation);
}
```

## OTA Integration Issues

### Issue: Rate Updates Not Pushing

#### Symptoms
- Rate changes in PMS not reflecting on OTA platforms
- OTA showing outdated rates
- Rate update errors in logs

#### Diagnostic Steps
```bash
# Check recent rate update attempts
grep "rate update" /var/log/pms/integrations/ota.log | tail -50

# Check OTA API status
curl -X GET https://ota-api.example.com/health

# Verify rate data in PMS
SELECT room_type, rate_plan, date, rate_amount 
FROM rates 
WHERE date >= CURRENT_DATE 
ORDER BY date LIMIT 10;
```

#### Common Causes
- **Authentication failure** - Invalid OTA credentials
- **XML validation error** - Malformed XML message
- **Rate plan not mapped** - Unknown rate plan code
- **OTA API outage** - External service unavailable

#### Resolution Steps

**1. Verify OTA Credentials**
```javascript
// Test OTA authentication
async function testOTAAuth() {
  const response = await fetch('https://ota-api.example.com/test', {
    headers: {
      'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
    }
  });
  console.log('Auth status:', response.status);
}
```

**2. Validate XML Message**
```javascript
// Validate XML against OTA schema
const libxmljs = require('libxmljs');

function validateOTAMessage(xmlString, schemaPath) {
  const xsdDoc = libxmljs.parseXml(fs.readFileSync(schemaPath));
  const xmlDoc = libxmljs.parseXml(xmlString);
  return xmlDoc.validate(xsdDoc);
}
```

**3. Check Rate Plan Mapping**
```sql
-- Verify rate plan mappings
SELECT pms_rate_plan_code, ota_rate_plan_code, ota_platform
FROM rate_plan_mappings
WHERE ota_platform = 'booking_com';
```

**4. Manual Rate Push**
```bash
# Manually push rates to OTA
node scripts/push-rates-to-ota.js --ota=booking_com --start-date=2024-02-01 --end-date=2024-02-28
```

### Issue: Reservation Modifications Not Processing

#### Symptoms
- Modified reservations from OTA not updating in PMS
- Modification errors in logs
- Guest information not updating

#### Diagnostic Steps
```bash
# Check modification logs
grep "modification" /var/log/pms/integrations/ota.log | tail -30

# Check for pending modifications
SELECT * FROM ota_modification_queue 
WHERE status = 'pending' 
ORDER BY created_at DESC;
```

#### Common Causes
- **Original reservation not found** - Cannot match OTA reservation ID
- **Validation failure** - Modified data fails validation
- **Inventory conflict** - New dates not available
- **Processing error** - Exception during modification

#### Resolution Steps

**1. Locate Original Reservation**
```sql
-- Find reservation by OTA ID
SELECT * FROM reservations 
WHERE ota_reservation_id = 'OTA-RES-12345';
```

**2. Validate Modification Data**
```javascript
// Validate modification request
async function validateModification(modification) {
  // Check availability for new dates
  const available = await checkAvailability(
    modification.room_type,
    modification.new_check_in,
    modification.new_check_out
  );
  
  if (!available) {
    throw new Error('No availability for modified dates');
  }
  
  return true;
}
```

**3. Process Modification Manually**
```javascript
// Manually process modification
async function processModificationManually(modificationId) {
  const modification = await getModification(modificationId);
  const reservation = await findReservation(modification.ota_reservation_id);
  
  await updateReservation(reservation.id, {
    check_in: modification.new_check_in,
    check_out: modification.new_check_out,
    adults: modification.new_adults,
    children: modification.new_children
  });
  
  await markModificationProcessed(modificationId);
}
```

## Payment Gateway Issues

### Issue: Payment Processing Failures

#### Symptoms
- Payments failing to process
- Card declined errors
- Gateway timeout errors

#### Diagnostic Steps
```bash
# Check payment logs
grep "payment" /var/log/pms/integrations/payment.log | tail -50

# Check gateway status
curl -X GET https://api.paymentgateway.com/v1/status

# Check recent failed payments
SELECT * FROM payment_failures 
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

#### Common Causes
- **Invalid card details** - Incorrect card number or CVV
- **Insufficient funds** - Card has insufficient balance
- **Gateway timeout** - Payment gateway not responding
- **Authentication failure** - Invalid API credentials

#### Resolution Steps

**1. Verify Gateway Credentials**
```javascript
// Test gateway connection
async function testGatewayConnection() {
  try {
    const response = await paymentGateway.testConnection();
    console.log('Gateway status:', response.status);
  } catch (error) {
    console.error('Gateway connection failed:', error);
  }
}
```

**2. Review Declined Reasons**
```javascript
// Get decline reason details
function getDeclineReason(declineCode) {
  const reasons = {
    'insufficient_funds': 'Card has insufficient funds',
    'card_declined': 'Card was declined by issuer',
    'expired_card': 'Card has expired',
    'invalid_card': 'Card number is invalid'
  };
  return reasons[declineCode] || 'Unknown decline reason';
}
```

**3. Retry Failed Payment**
```javascript
// Retry payment with exponential backoff
async function retryPayment(paymentId, maxRetries = 3) {
  const payment = await getPayment(paymentId);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await processPayment(payment);
    } catch (error) {
      if (attempt < maxRetries && isRetryableError(error)) {
        await sleep(Math.pow(2, attempt) * 1000);
      } else {
        throw error;
      }
    }
  }
}
```

### Issue: Webhook Notifications Not Received

#### Symptoms
- Payment confirmations not updating in PMS
- Webhook endpoint not being called
- Missing payment status updates

#### Diagnostic Steps
```bash
# Check webhook endpoint accessibility
curl -X POST https://pms.hotel.com/api/webhooks/payment \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check webhook logs
tail -f /var/log/pms/webhooks/payment.log

# Check gateway webhook configuration
# (via gateway dashboard)
```

#### Common Causes
- **Endpoint not accessible** - Firewall or network issue
- **Invalid webhook URL** - Incorrect URL configured
- **Signature verification failing** - Invalid webhook secret
- **SSL certificate issue** - Certificate expired or invalid

#### Resolution Steps

**1. Verify Webhook URL**
```bash
# Test webhook endpoint externally
curl -X POST https://pms.hotel.com/api/webhooks/payment \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: test" \
  -d '{"event": "payment.succeeded", "id": "test"}'
```

**2. Check SSL Certificate**
```bash
# Verify SSL certificate
openssl s_client -connect pms.hotel.com:443 -servername pms.hotel.com

# Check certificate expiration
echo | openssl s_client -connect pms.hotel.com:443 2>/dev/null | openssl x509 -noout -dates
```

**3. Update Webhook Configuration**
```javascript
// Update webhook URL in gateway
async function updateWebhookURL() {
  await paymentGateway.webhooks.update({
    url: 'https://pms.hotel.com/api/webhooks/payment',
    events: ['payment.succeeded', 'payment.failed', 'refund.created']
  });
}
```

## Email Service Issues

### Issue: Emails Not Being Delivered

#### Symptoms
- Confirmation emails not received by guests
- High bounce rate
- Emails going to spam

#### Diagnostic Steps
```bash
# Check email logs
grep "email" /var/log/pms/integrations/email.log | tail -50

# Check email service status
curl -X GET https://api.emailprovider.com/v1/status

# Check recent email failures
SELECT * FROM email_logs 
WHERE status = 'failed' 
AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

#### Common Causes
- **Invalid email address** - Recipient email is invalid
- **SPF/DKIM not configured** - Email authentication missing
- **Rate limit exceeded** - Too many emails sent
- **Blacklisted IP** - Sending IP is blacklisted

#### Resolution Steps

**1. Verify Email Configuration**
```bash
# Check SPF record
dig TXT hotel.com | grep spf

# Check DKIM record
dig TXT default._domainkey.hotel.com

# Check DMARC record
dig TXT _dmarc.hotel.com
```

**2. Test Email Delivery**
```javascript
// Send test email
async function sendTestEmail() {
  try {
    await sendEmail(
      'test@example.com',
      'Test Email',
      '<p>This is a test email</p>'
    );
    console.log('Test email sent successfully');
  } catch (error) {
    console.error('Test email failed:', error);
  }
}
```

**3. Check Sender Reputation**
```bash
# Check IP reputation
# Visit: https://mxtoolbox.com/blacklists.aspx
# Enter your sending IP address
```

**4. Review Bounce Handling**
```javascript
// Process bounced emails
async function processBounces() {
  const bounces = await getRecentBounces();
  
  for (const bounce of bounces) {
    if (bounce.type === 'hard') {
      await markEmailInvalid(bounce.email);
      await addToSuppressionList(bounce.email);
    }
  }
}
```

### Issue: Google Workspace SMTP Errors

#### Symptoms
- SMTP authentication failures
- "Username and Password not accepted" errors
- Connection timeout errors

#### Diagnostic Steps
```bash
# Test SMTP connection
telnet smtp.gmail.com 587

# Check SMTP logs
grep "smtp" /var/log/pms/integrations/email.log | tail -30

# Verify credentials
echo "Testing Google Workspace SMTP..."
```

#### Common Causes
- **App password not generated** - Using regular password instead of app password
- **2-Step Verification not enabled** - Required for app passwords
- **Incorrect SMTP settings** - Wrong host or port
- **Account locked** - Too many failed login attempts

#### Resolution Steps

**1. Generate App Password**
```
1. Go to Google Account settings
2. Navigate to Security > 2-Step Verification
3. Scroll to "App passwords"
4. Generate new app password for "Mail"
5. Use generated password in SMTP configuration
```

**2. Verify SMTP Configuration**
```javascript
// Google Workspace SMTP settings
const config = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: 'reservations@yourdomain.com',
    pass: 'your-app-specific-password' // 16-character app password
  }
};
```

**3. Test Connection**
```javascript
// Test Google Workspace SMTP
const nodemailer = require('nodemailer');

async function testGoogleWorkspaceSMTP() {
  const transporter = nodemailer.createTransporter({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GOOGLE_WORKSPACE_EMAIL,
      pass: process.env.GOOGLE_WORKSPACE_APP_PASSWORD
    }
  });

  try {
    await transporter.verify();
    console.log('Google Workspace SMTP connection successful');
  } catch (error) {
    console.error('Google Workspace SMTP connection failed:', error);
  }
}
```

**4. Check Rate Limits**
```javascript
// Monitor daily email count
async function checkEmailQuota() {
  const today = new Date().toISOString().split('T')[0];
  const count = await countEmailsSentToday(today);
  
  const limit = 2000; // Google Workspace limit
  const remaining = limit - count;
  
  console.log(`Emails sent today: ${count}/${limit}`);
  console.log(`Remaining: ${remaining}`);
  
  if (remaining < 100) {
    console.warn('Approaching daily email limit!');
  }
}
```

## Channel Manager Issues

### Issue: Synchronization Delays

#### Symptoms
- Updates taking too long to propagate
- Channels showing stale data
- Sync lag warnings

#### Diagnostic Steps
```bash
# Check sync status
curl -X GET https://channel-manager.com/api/sync/status \
  -H "Authorization: Bearer YOUR_API_KEY"

# Check sync logs
grep "sync" /var/log/pms/integrations/channel-manager.log | tail -50

# Check pending updates
SELECT * FROM channel_manager_queue 
WHERE status = 'pending' 
ORDER BY created_at ASC;
```

#### Common Causes
- **High update volume** - Too many updates queued
- **API rate limiting** - Hitting channel manager rate limits
- **Network latency** - Slow connection to channel manager
- **Processing bottleneck** - Sync service overloaded

#### Resolution Steps

**1. Check Queue Status**
```javascript
// Monitor sync queue
async function checkSyncQueue() {
  const pending = await countPendingUpdates();
  const processing = await countProcessingUpdates();
  const failed = await countFailedUpdates();
  
  console.log(`Pending: ${pending}, Processing: ${processing}, Failed: ${failed}`);
  
  if (pending > 1000) {
    console.warn('High number of pending updates!');
  }
}
```

**2. Increase Sync Workers**
```bash
# Scale up sync workers
pm2 scale channel-manager-sync +2

# Check worker status
pm2 status
```

**3. Batch Updates**
```javascript
// Batch multiple updates together
async function batchSyncUpdates() {
  const updates = await getPendingUpdates(100);
  const batches = chunkArray(updates, 10);
  
  for (const batch of batches) {
    await sendBatchUpdate(batch);
    await sleep(1000); // Rate limiting
  }
}
```

## Integration Testing Procedures

### Health Check Script

```javascript
// Comprehensive integration health check
async function runIntegrationHealthCheck() {
  const results = {
    booking_engine: await testBookingEngineIntegration(),
    ota: await testOTAIntegration(),
    payment: await testPaymentIntegration(),
    email: await testEmailIntegration(),
    channel_manager: await testChannelManagerIntegration()
  };
  
  console.log('Integration Health Check Results:');
  console.log(JSON.stringify(results, null, 2));
  
  return results;
}

async function testBookingEngineIntegration() {
  try {
    const response = await fetch('https://booking-engine.com/api/health', {
      headers: { 'Authorization': `Bearer ${process.env.BOOKING_ENGINE_API_KEY}` }
    });
    return { status: 'healthy', response_time: response.headers.get('x-response-time') };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}
```

### Monitoring Dashboard

```javascript
// Integration monitoring metrics
const integrationMetrics = {
  booking_engine: {
    status: 'healthy',
    last_sync: '2024-01-15T14:30:00Z',
    success_rate: 99.5,
    avg_response_time_ms: 180
  },
  ota: {
    status: 'healthy',
    last_sync: '2024-01-15T14:28:00Z',
    success_rate: 98.8,
    avg_response_time_ms: 320
  },
  payment: {
    status: 'healthy',
    last_transaction: '2024-01-15T14:25:00Z',
    success_rate: 97.2,
    avg_response_time_ms: 450
  },
  email: {
    status: 'healthy',
    last_sent: '2024-01-15T14:29:00Z',
    delivery_rate: 98.5,
    bounce_rate: 1.5
  }
};
```

## Escalation Procedures

### When to Escalate

- **Critical System Down** - Integration completely unavailable
- **Data Loss Risk** - Potential for losing reservation or payment data
- **Security Incident** - Suspected security breach or unauthorized access
- **Persistent Failures** - Issue not resolved after standard troubleshooting
- **Multiple Integrations Affected** - Systemic issue affecting multiple systems

### Escalation Contacts

```javascript
{
  "escalation_contacts": {
    "level_1": {
      "role": "Integration Support Team",
      "email": "integration-support@hotel.com",
      "phone": "+1-555-0100",
      "hours": "24/7"
    },
    "level_2": {
      "role": "Technical Lead",
      "email": "tech-lead@hotel.com",
      "phone": "+1-555-0101",
      "hours": "Business hours"
    },
    "level_3": {
      "role": "CTO",
      "email": "cto@hotel.com",
      "phone": "+1-555-0102",
      "hours": "Emergency only"
    }
  }
}
```

## Preventive Maintenance

### Regular Maintenance Tasks

#### Daily
- [ ] Review integration logs for errors
- [ ] Check sync queue status
- [ ] Monitor API response times
- [ ] Verify webhook deliveries

#### Weekly
- [ ] Review integration metrics
- [ ] Check for failed updates
- [ ] Verify data consistency
- [ ] Test backup procedures

#### Monthly
- [ ] Audit integration configurations
- [ ] Review and update credentials
- [ ] Performance optimization review
- [ ] Update integration documentation

### Monitoring Alerts

```javascript
// Configure monitoring alerts
const alertThresholds = {
  response_time_ms: 1000,
  error_rate_percent: 5,
  queue_size: 1000,
  sync_delay_minutes: 30
};

async function checkAlertConditions() {
  const metrics = await getIntegrationMetrics();
  
  if (metrics.avg_response_time > alertThresholds.response_time_ms) {
    await sendAlert('High response time detected');
  }
  
  if (metrics.error_rate > alertThresholds.error_rate_percent) {
    await sendAlert('High error rate detected');
  }
}
```

## Related Documentation

- **[Integration Overview](README.md)** - General integration documentation
- **[Booking Engine Integration](booking-engine/overview.md)** - Booking engine specifics
- **[OTA Integration](ota-systems/xml-integration.md)** - OTA integration details
- **[Payment Integration](payment-systems/square-integration.md)** - Payment gateway details
- **[Email Integration](email-services/email-integration.md)** - Email service details

---

*This troubleshooting guide provides comprehensive procedures for diagnosing and resolving integration issues.*
