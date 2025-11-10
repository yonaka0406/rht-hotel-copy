# Integration Testing and Maintenance Guide

This document provides comprehensive procedures for testing integrations and maintaining integration health in the WeHub.work Hotel Management System.

## Overview

Regular testing and maintenance of integrations ensures reliable operation, prevents data loss, and maintains system performance. This guide covers testing procedures, validation steps, and ongoing maintenance tasks.

## Integration Testing Procedures

### Pre-Production Testing

#### Test Environment Setup

**1. Configure Test Credentials**
```javascript
{
  "test_environment": {
    "booking_engine": {
      "api_url": "https://test-api.booking-engine.com",
      "api_key": "test_key_xxxxx"
    },
    "payment_gateway": {
      "api_url": "https://api.sandbox.paymentgateway.com",
      "api_key": "test_key_xxxxx"
    },
    "email_service": {
      "provider": "sendgrid",
      "api_key": "test_key_xxxxx",
      "sandbox_mode": true
    }
  }
}
```

**2. Prepare Test Data**
```javascript
const testData = {
  test_hotel: {
    id: 'TEST-HOTEL-001',
    name: 'Test Grand Hotel',
    rooms: 50
  },
  test_guest: {
    first_name: 'Test',
    last_name: 'Guest',
    email: 'test@example.com',
    phone: '+1-555-0199'
  },
  test_card: {
    number: '4242424242424242', // Test card
    exp_month: 12,
    exp_year: 2025,
    cvv: '123'
  }
};
```

### Booking Engine Integration Testing

#### Test Case 1: Availability Check
```javascript
async function testAvailabilityCheck() {
  console.log('Testing availability check...');
  
  const request = {
    hotel_id: 'TEST-HOTEL-001',
    check_in: '2024-03-01',
    check_out: '2024-03-05',
    adults: 2,
    children: 0
  };
  
  try {
    const response = await bookingEngine.checkAvailability(request);
    
    assert(response.available_rooms.length > 0, 'Should return available rooms');
    assert(response.available_rooms[0].rate > 0, 'Should have valid rate');
    
    console.log('✓ Availability check passed');
    return { success: true };
  } catch (error) {
    console.error('✗ Availability check failed:', error);
    return { success: false, error: error.message };
  }
}
```

#### Test Case 2: Reservation Creation
```javascript
async function testReservationCreation() {
  console.log('Testing reservation creation...');
  
  const reservation = {
    hotel_id: 'TEST-HOTEL-001',
    room_type: 'DELUXE',
    check_in: '2024-03-01',
    check_out: '2024-03-05',
    guest: testData.test_guest,
    adults: 2,
    children: 0
  };
  
  try {
    const response = await bookingEngine.createReservation(reservation);
    
    assert(response.reservation_id, 'Should return reservation ID');
    assert(response.confirmation_number, 'Should return confirmation number');
    assert(response.status === 'confirmed', 'Should be confirmed');
    
    console.log('✓ Reservation creation passed');
    return { success: true, reservation_id: response.reservation_id };
  } catch (error) {
    console.error('✗ Reservation creation failed:', error);
    return { success: false, error: error.message };
  }
}
```

#### Test Case 3: Cache Update
```javascript
async function testCacheUpdate() {
  console.log('Testing cache update...');
  
  try {
    // Trigger cache update
    const response = await bookingEngine.updateCache({
      hotel_id: 'TEST-HOTEL-001',
      cache_type: 'availability'
    });
    
    assert(response.status === 'success', 'Cache update should succeed');
    
    // Verify cache was updated
    const cacheStatus = await bookingEngine.getCacheStatus();
    assert(cacheStatus.last_updated, 'Should have last updated timestamp');
    
    console.log('✓ Cache update passed');
    return { success: true };
  } catch (error) {
    console.error('✗ Cache update failed:', error);
    return { success: false, error: error.message };
  }
}
```

### OTA Integration Testing

#### Test Case 1: Rate Push
```javascript
async function testRatePush() {
  console.log('Testing rate push to OTA...');
  
  const rateUpdate = {
    hotel_id: 'TEST-HOTEL-001',
    room_type: 'DELUXE',
    rate_plan: 'BAR',
    start_date: '2024-03-01',
    end_date: '2024-03-31',
    rate: 150.00,
    currency: 'USD'
  };
  
  try {
    const response = await ota.pushRates(rateUpdate);
    
    assert(response.status === 'success', 'Rate push should succeed');
    assert(response.ota_confirmation, 'Should receive OTA confirmation');
    
    console.log('✓ Rate push passed');
    return { success: true };
  } catch (error) {
    console.error('✗ Rate push failed:', error);
    return { success: false, error: error.message };
  }
}
```

#### Test Case 2: Availability Push
```javascript
async function testAvailabilityPush() {
  console.log('Testing availability push to OTA...');
  
  const availabilityUpdate = {
    hotel_id: 'TEST-HOTEL-001',
    room_type: 'DELUXE',
    start_date: '2024-03-01',
    end_date: '2024-03-31',
    available_rooms: 10,
    min_stay: 2,
    max_stay: 14
  };
  
  try {
    const response = await ota.pushAvailability(availabilityUpdate);
    
    assert(response.status === 'success', 'Availability push should succeed');
    
    console.log('✓ Availability push passed');
    return { success: true };
  } catch (error) {
    console.error('✗ Availability push failed:', error);
    return { success: false, error: error.message };
  }
}
```

#### Test Case 3: Reservation Import
```javascript
async function testReservationImport() {
  console.log('Testing reservation import from OTA...');
  
  // Simulate OTA reservation notification
  const otaReservation = {
    ota_reservation_id: 'OTA-TEST-001',
    hotel_id: 'TEST-HOTEL-001',
    room_type: 'DELUXE',
    check_in: '2024-03-01',
    check_out: '2024-03-05',
    guest: testData.test_guest,
    total_amount: 600.00
  };
  
  try {
    const response = await ota.importReservation(otaReservation);
    
    assert(response.pms_reservation_id, 'Should create PMS reservation');
    assert(response.status === 'confirmed', 'Should be confirmed');
    
    console.log('✓ Reservation import passed');
    return { success: true };
  } catch (error) {
    console.error('✗ Reservation import failed:', error);
    return { success: false, error: error.message };
  }
}
```

### Payment Gateway Testing

#### Test Case 1: Successful Payment
```javascript
async function testSuccessfulPayment() {
  console.log('Testing successful payment...');
  
  const payment = {
    amount: 100.00,
    currency: 'USD',
    card: testData.test_card,
    customer: testData.test_guest,
    reservation_id: 'TEST-RES-001'
  };
  
  try {
    const response = await paymentGateway.processPayment(payment);
    
    assert(response.status === 'succeeded', 'Payment should succeed');
    assert(response.transaction_id, 'Should return transaction ID');
    
    console.log('✓ Successful payment passed');
    return { success: true, transaction_id: response.transaction_id };
  } catch (error) {
    console.error('✗ Successful payment failed:', error);
    return { success: false, error: error.message };
  }
}
```

#### Test Case 2: Declined Payment
```javascript
async function testDeclinedPayment() {
  console.log('Testing declined payment...');
  
  const payment = {
    amount: 100.00,
    currency: 'USD',
    card: {
      number: '4000000000000002', // Test declined card
      exp_month: 12,
      exp_year: 2025,
      cvv: '123'
    },
    customer: testData.test_guest
  };
  
  try {
    await paymentGateway.processPayment(payment);
    console.error('✗ Should have thrown declined error');
    return { success: false, error: 'Expected decline error' };
  } catch (error) {
    assert(error.code === 'card_declined', 'Should be declined error');
    console.log('✓ Declined payment handled correctly');
    return { success: true };
  }
}
```

#### Test Case 3: Refund Processing
```javascript
async function testRefundProcessing() {
  console.log('Testing refund processing...');
  
  // First create a successful payment
  const payment = await testSuccessfulPayment();
  
  if (!payment.success) {
    return { success: false, error: 'Could not create test payment' };
  }
  
  try {
    const refund = await paymentGateway.processRefund({
      transaction_id: payment.transaction_id,
      amount: 50.00,
      reason: 'Test refund'
    });
    
    assert(refund.status === 'succeeded', 'Refund should succeed');
    assert(refund.refund_id, 'Should return refund ID');
    
    console.log('✓ Refund processing passed');
    return { success: true };
  } catch (error) {
    console.error('✗ Refund processing failed:', error);
    return { success: false, error: error.message };
  }
}
```

### Email Service Testing

#### Test Case 1: Send Confirmation Email
```javascript
async function testConfirmationEmail() {
  console.log('Testing confirmation email...');
  
  const emailData = {
    to: 'test@example.com',
    template: 'booking_confirmation',
    data: {
      guest_name: 'Test Guest',
      confirmation_number: 'TEST-CONF-001',
      check_in: '2024-03-01',
      check_out: '2024-03-05',
      room_type: 'Deluxe Room',
      total_amount: '$600.00'
    }
  };
  
  try {
    const response = await emailService.sendEmail(emailData);
    
    assert(response.message_id, 'Should return message ID');
    assert(response.status === 'sent', 'Should be sent');
    
    console.log('✓ Confirmation email passed');
    return { success: true };
  } catch (error) {
    console.error('✗ Confirmation email failed:', error);
    return { success: false, error: error.message };
  }
}
```

#### Test Case 2: Email Delivery Tracking
```javascript
async function testEmailDeliveryTracking() {
  console.log('Testing email delivery tracking...');
  
  // Send test email
  const email = await testConfirmationEmail();
  
  if (!email.success) {
    return { success: false, error: 'Could not send test email' };
  }
  
  try {
    // Wait for delivery
    await sleep(5000);
    
    // Check delivery status
    const status = await emailService.getDeliveryStatus(email.message_id);
    
    assert(status.delivered || status.pending, 'Should be delivered or pending');
    
    console.log('✓ Email delivery tracking passed');
    return { success: true };
  } catch (error) {
    console.error('✗ Email delivery tracking failed:', error);
    return { success: false, error: error.message };
  }
}
```

### Comprehensive Integration Test Suite

```javascript
async function runFullIntegrationTestSuite() {
  console.log('=== Starting Full Integration Test Suite ===\n');
  
  const results = {
    booking_engine: {},
    ota: {},
    payment: {},
    email: {}
  };
  
  // Booking Engine Tests
  console.log('--- Booking Engine Tests ---');
  results.booking_engine.availability = await testAvailabilityCheck();
  results.booking_engine.reservation = await testReservationCreation();
  results.booking_engine.cache = await testCacheUpdate();
  
  // OTA Tests
  console.log('\n--- OTA Integration Tests ---');
  results.ota.rate_push = await testRatePush();
  results.ota.availability_push = await testAvailabilityPush();
  results.ota.reservation_import = await testReservationImport();
  
  // Payment Tests
  console.log('\n--- Payment Gateway Tests ---');
  results.payment.successful = await testSuccessfulPayment();
  results.payment.declined = await testDeclinedPayment();
  results.payment.refund = await testRefundProcessing();
  
  // Email Tests
  console.log('\n--- Email Service Tests ---');
  results.email.confirmation = await testConfirmationEmail();
  results.email.tracking = await testEmailDeliveryTracking();
  
  // Summary
  console.log('\n=== Test Suite Summary ===');
  const summary = generateTestSummary(results);
  console.log(summary);
  
  return results;
}

function generateTestSummary(results) {
  let total = 0;
  let passed = 0;
  
  for (const category in results) {
    for (const test in results[category]) {
      total++;
      if (results[category][test].success) {
        passed++;
      }
    }
  }
  
  return `
Total Tests: ${total}
Passed: ${passed}
Failed: ${total - passed}
Success Rate: ${((passed / total) * 100).toFixed(2)}%
  `;
}
```

## Integration Validation Procedures

### Data Consistency Validation

#### Validate Reservation Data
```javascript
async function validateReservationConsistency() {
  console.log('Validating reservation data consistency...');
  
  const issues = [];
  
  // Check for reservations without guest data
  const noGuest = await db.query(`
    SELECT id FROM reservations 
    WHERE guest_id IS NULL
  `);
  if (noGuest.length > 0) {
    issues.push({ type: 'missing_guest', count: noGuest.length });
  }
  
  // Check for reservations with invalid dates
  const invalidDates = await db.query(`
    SELECT id FROM reservations 
    WHERE check_out <= check_in
  `);
  if (invalidDates.length > 0) {
    issues.push({ type: 'invalid_dates', count: invalidDates.length });
  }
  
  // Check for reservations without payment records
  const noPayment = await db.query(`
    SELECT r.id FROM reservations r
    LEFT JOIN payments p ON r.id = p.reservation_id
    WHERE p.id IS NULL AND r.status = 'confirmed'
  `);
  if (noPayment.length > 0) {
    issues.push({ type: 'missing_payment', count: noPayment.length });
  }
  
  return {
    valid: issues.length === 0,
    issues: issues
  };
}
```

#### Validate Inventory Consistency
```javascript
async function validateInventoryConsistency() {
  console.log('Validating inventory consistency...');
  
  const issues = [];
  
  // Check for negative availability
  const negativeAvailability = await db.query(`
    SELECT room_type_id, date, available_rooms
    FROM availability
    WHERE available_rooms < 0
  `);
  if (negativeAvailability.length > 0) {
    issues.push({ type: 'negative_availability', count: negativeAvailability.length });
  }
  
  // Check for overbookings
  const overbookings = await db.query(`
    SELECT a.room_type_id, a.date, 
           rt.total_rooms, 
           COUNT(r.id) as booked_rooms
    FROM availability a
    JOIN room_types rt ON a.room_type_id = rt.id
    JOIN reservations r ON r.room_type_id = a.room_type_id
    WHERE r.check_in <= a.date AND r.check_out > a.date
    GROUP BY a.room_type_id, a.date, rt.total_rooms
    HAVING COUNT(r.id) > rt.total_rooms
  `);
  if (overbookings.length > 0) {
    issues.push({ type: 'overbookings', count: overbookings.length });
  }
  
  return {
    valid: issues.length === 0,
    issues: issues
  };
}
```

### Integration Health Monitoring

#### Monitor Integration Performance
```javascript
async function monitorIntegrationPerformance() {
  const metrics = {
    booking_engine: await getBookingEngineMetrics(),
    ota: await getOTAMetrics(),
    payment: await getPaymentMetrics(),
    email: await getEmailMetrics()
  };
  
  // Check for performance issues
  const alerts = [];
  
  if (metrics.booking_engine.avg_response_time > 1000) {
    alerts.push({
      integration: 'booking_engine',
      issue: 'high_response_time',
      value: metrics.booking_engine.avg_response_time
    });
  }
  
  if (metrics.payment.error_rate > 5) {
    alerts.push({
      integration: 'payment',
      issue: 'high_error_rate',
      value: metrics.payment.error_rate
    });
  }
  
  if (metrics.email.bounce_rate > 5) {
    alerts.push({
      integration: 'email',
      issue: 'high_bounce_rate',
      value: metrics.email.bounce_rate
    });
  }
  
  return {
    metrics: metrics,
    alerts: alerts
  };
}
```

## Maintenance Procedures

### Daily Maintenance Tasks

#### Daily Health Check
```javascript
async function dailyHealthCheck() {
  console.log('Running daily health check...');
  
  const checks = {
    integrations: await checkIntegrationStatus(),
    data_consistency: await validateReservationConsistency(),
    inventory: await validateInventoryConsistency(),
    performance: await monitorIntegrationPerformance()
  };
  
  // Generate report
  const report = generateHealthReport(checks);
  
  // Send to operations team
  await sendHealthReport(report);
  
  return checks;
}
```

#### Clear Failed Queue Items
```javascript
async function clearFailedQueueItems() {
  console.log('Clearing old failed queue items...');
  
  // Get failed items older than 7 days
  const oldFailures = await db.query(`
    SELECT * FROM integration_queue
    WHERE status = 'failed'
    AND created_at < NOW() - INTERVAL '7 days'
  `);
  
  // Archive to failed_items table
  for (const item of oldFailures) {
    await db.query(`
      INSERT INTO integration_queue_archive
      SELECT * FROM integration_queue WHERE id = $1
    `, [item.id]);
  }
  
  // Delete from queue
  await db.query(`
    DELETE FROM integration_queue
    WHERE status = 'failed'
    AND created_at < NOW() - INTERVAL '7 days'
  `);
  
  console.log(`Archived ${oldFailures.length} failed items`);
}
```

### Weekly Maintenance Tasks

#### Weekly Performance Review
```javascript
async function weeklyPerformanceReview() {
  console.log('Running weekly performance review...');
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  
  const metrics = {
    booking_engine: await getWeeklyMetrics('booking_engine', startDate),
    ota: await getWeeklyMetrics('ota', startDate),
    payment: await getWeeklyMetrics('payment', startDate),
    email: await getWeeklyMetrics('email', startDate)
  };
  
  // Generate performance report
  const report = generatePerformanceReport(metrics);
  
  // Send to management
  await sendPerformanceReport(report);
  
  return metrics;
}
```

#### Credential Rotation Check
```javascript
async function checkCredentialExpiration() {
  console.log('Checking credential expiration...');
  
  const credentials = await db.query(`
    SELECT integration_name, credential_type, expires_at
    FROM integration_credentials
    WHERE expires_at IS NOT NULL
    AND expires_at < NOW() + INTERVAL '30 days'
  `);
  
  if (credentials.length > 0) {
    await sendAlert('credentials_expiring', {
      count: credentials.length,
      credentials: credentials
    });
  }
  
  return credentials;
}
```

### Monthly Maintenance Tasks

#### Monthly Integration Audit
```javascript
async function monthlyIntegrationAudit() {
  console.log('Running monthly integration audit...');
  
  const audit = {
    configurations: await auditConfigurations(),
    credentials: await auditCredentials(),
    mappings: await auditMappings(),
    performance: await auditPerformance(),
    security: await auditSecurity()
  };
  
  // Generate audit report
  const report = generateAuditReport(audit);
  
  // Send to management and compliance
  await sendAuditReport(report);
  
  return audit;
}
```

#### Update Integration Documentation
```javascript
async function updateIntegrationDocumentation() {
  console.log('Updating integration documentation...');
  
  // Generate current configuration documentation
  const configs = await exportIntegrationConfigs();
  
  // Update documentation files
  await updateConfigDocs(configs);
  
  // Generate API endpoint documentation
  const endpoints = await generateEndpointDocs();
  
  // Update endpoint documentation
  await updateEndpointDocs(endpoints);
  
  console.log('Documentation updated successfully');
}
```

## Automated Monitoring

### Monitoring Script
```javascript
// monitoring/integration-monitor.js
const cron = require('node-cron');

// Run health check every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    const health = await checkIntegrationHealth();
    if (!health.healthy) {
      await sendAlert('integration_unhealthy', health);
    }
  } catch (error) {
    console.error('Health check failed:', error);
  }
});

// Run daily maintenance at 2 AM
cron.schedule('0 2 * * *', async () => {
  try {
    await dailyHealthCheck();
    await clearFailedQueueItems();
  } catch (error) {
    console.error('Daily maintenance failed:', error);
  }
});

// Run weekly review on Mondays at 8 AM
cron.schedule('0 8 * * 1', async () => {
  try {
    await weeklyPerformanceReview();
    await checkCredentialExpiration();
  } catch (error) {
    console.error('Weekly review failed:', error);
  }
});

// Run monthly audit on 1st of month at 9 AM
cron.schedule('0 9 1 * *', async () => {
  try {
    await monthlyIntegrationAudit();
    await updateIntegrationDocumentation();
  } catch (error) {
    console.error('Monthly audit failed:', error);
  }
});
```

## Best Practices

### Testing Best Practices
- **Test in Sandbox First** - Always test in sandbox/test environment
- **Automate Tests** - Create automated test suites
- **Test Edge Cases** - Include error scenarios and edge cases
- **Document Results** - Keep records of test results
- **Regular Testing** - Run tests regularly, not just before releases

### Maintenance Best Practices
- **Schedule Maintenance** - Regular maintenance windows
- **Monitor Continuously** - 24/7 monitoring of critical integrations
- **Document Changes** - Record all configuration changes
- **Version Control** - Track integration code changes
- **Backup Configurations** - Regular backups of integration configs

### Security Best Practices
- **Rotate Credentials** - Regular credential rotation
- **Audit Access** - Regular access audits
- **Encrypt Secrets** - Secure storage of API keys and secrets
- **Monitor Anomalies** - Watch for unusual activity
- **Update Dependencies** - Keep integration libraries updated

## Related Documentation

- **[Integration Overview](README.md)** - General integration documentation
- **[Troubleshooting Guide](troubleshooting.md)** - Integration troubleshooting
- **[Booking Engine Integration](booking-engine/overview.md)** - Booking engine specifics
- **[OTA Integration](ota-systems/xml-integration.md)** - OTA integration details
- **[Payment Integration](payment-systems/square-integration.md)** - Payment gateway details

---

*This guide provides comprehensive procedures for testing and maintaining integrations to ensure reliable operation.*
