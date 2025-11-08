# Integration Testing Guide

This document provides comprehensive testing procedures for all external system integrations in the WeHub.work Hotel Management System.

## Overview

Integration testing ensures that all external system connections work correctly and reliably. This guide covers testing procedures for:
- **TL-Lincoln Channel Manager**
- **OTA Integrations** (Booking.com, Rakuten Travel, Jalan, Tripla)
- **Payment Systems** (Square)
- **Email Services**
- **Booking Engine**

## Testing Strategy

### Test Environments

#### Development Environment
- **Purpose**: Initial development and unit testing
- **Data**: Test data only
- **External Services**: Sandbox/test APIs when available

#### Staging Environment
- **Purpose**: Integration testing and UAT
- **Data**: Sanitized production-like data
- **External Services**: Sandbox/test APIs

#### Production Environment
- **Purpose**: Live operations
- **Data**: Real customer data
- **External Services**: Production APIs
- **Testing**: Limited to non-disruptive health checks

### Test Types

#### Unit Tests
- Test individual integration components in isolation
- Mock external API responses
- Fast execution, run frequently

#### Integration Tests
- Test actual communication with external systems
- Use sandbox/test environments
- Verify end-to-end workflows

#### End-to-End Tests
- Test complete user workflows
- Verify data flows through all systems
- Test in staging environment before production

## TL-Lincoln Channel Manager Testing

### Connection Testing

#### Test API Connectivity
```javascript
describe('TL-Lincoln Connection', () => {
  test('should connect to TL-Lincoln API', async () => {
    const response = await tlLincoln.testConnection();
    expect(response.status).toBe('connected');
  });

  test('should authenticate successfully', async () => {
    const auth = await tlLincoln.authenticate();
    expect(auth.authenticated).toBe(true);
  });
});
```

### Rate Update Testing

#### Test Rate Push
```javascript
describe('Rate Updates', () => {
  test('should push rate update to TL-Lincoln', async () => {
    const rateData = {
      room_type: 'DELUXE',
      rate_plan: 'BAR',
      start_date: '2024-02-01',
      end_date: '2024-02-28',
      rate: 150.00
    };

    const result = await tlLincoln.pushRates(rateData);
    expect(result.success).toBe(true);
  });

  test('should handle rate validation errors', async () => {
    const invalidRate = {
      room_type: 'INVALID',
      rate: -100  // Invalid negative rate
    };

    await expect(tlLincoln.pushRates(invalidRate))
      .rejects.toThrow('Invalid rate data');
  });
});
```

### Availability Update Testing

#### Test Availability Push
```javascript
describe('Availability Updates', () => {
  test('should push availability update', async () => {
    const availData = {
      room_type: 'DELUXE',
      start_date: '2024-02-01',
      end_date: '2024-02-28',
      available_rooms: 10
    };

    const result = await tlLincoln.pushAvailability(availData);
    expect(result.success).toBe(true);
  });
});
```

### Booking Import Testing

#### Test Webhook Reception
```javascript
describe('Booking Webhooks', () => {
  test('should receive and process booking webhook', async () => {
    const webhookPayload = {
      event_type: 'booking.created',
      booking_id: 'TL-TEST-123',
      guest: {
        first_name: 'Test',
        last_name: 'Guest',
        email: 'test@example.com'
      },
      check_in: '2024-02-01',
      check_out: '2024-02-03',
      room_type: 'DELUXE'
    };

    const result = await processBookingWebhook(webhookPayload);
    expect(result.reservation_created).toBe(true);
  });
});
```

## OTA-Specific Testing

### Booking.com Testing

#### Test Scenarios
```javascript
describe('Booking.com Integration', () => {
  test('should sync rates to Booking.com', async () => {
    const result = await tlLincoln.syncToChannel('booking_com', {
      type: 'rates',
      room_type: 'DELUXE'
    });
    expect(result.success).toBe(true);
  });

  test('should import Booking.com reservation', async () => {
    const bookingComReservation = {
      channel: 'booking_com',
      booking_id: 'BK-TEST-123',
      // ... reservation data
    };

    const result = await importOTABooking(bookingComReservation);
    expect(result.imported).toBe(true);
  });
});
```

### Rakuten Travel Testing

#### Test Japanese Character Handling
```javascript
describe('Rakuten Travel Integration', () => {
  test('should handle Japanese characters correctly', async () => {
    const japaneseData = {
      guest_name: '山田太郎',
      room_description: '豪華なデラックスルーム'
    };

    const result = await processRakutenBooking(japaneseData);
    expect(result.guest_name).toBe('山田太郎');
  });

  test('should sync to Rakuten Travel', async () => {
    const result = await tlLincoln.syncToChannel('rakuten', {
      type: 'availability'
    });
    expect(result.success).toBe(true);
  });
});
```

### Jalan Testing

#### Test Plan Code Mapping
```javascript
describe('Jalan Integration', () => {
  test('should map Jalan plan codes correctly', async () => {
    const jalanPlanCode = 'JALAN_PLAN_001';
    const pmsPlanCode = mapJalanPlanCode(jalanPlanCode);
    expect(pmsPlanCode).toBe('BAR');
  });

  test('should parse Jalan guest names', async () => {
    const jalanName = '山田 太郎';  // Surname first
    const parsed = parseJalanGuestName(jalanName);
    expect(parsed.firstName).toBe('太郎');
    expect(parsed.lastName).toBe('山田');
  });
});
```

### Tripla Testing

#### Test Multi-language Content
```javascript
describe('Tripla Integration', () => {
  test('should provide multi-language content', async () => {
    const roomData = await getTriplaRoomData('DELUXE');
    expect(roomData.description.ja).toBeDefined();
    expect(roomData.description.en).toBeDefined();
  });

  test('should sync availability to Tripla', async () => {
    const result = await tlLincoln.syncToChannel('tripla', {
      type: 'availability'
    });
    expect(result.success).toBe(true);
  });
});
```

## Payment Integration Testing

### Square Payment Testing

#### Test Payment Link Generation
```javascript
describe('Square Payment Links', () => {
  test('should generate payment link', async () => {
    const paymentData = {
      amount: 150.00,
      currency: 'USD',
      reservation_id: 'RES-TEST-001',
      customer_email: 'test@example.com'
    };

    const result = await generateSquarePaymentLink(paymentData);
    expect(result.payment_link_url).toBeDefined();
    expect(result.link_id).toBeDefined();
  });

  test('should handle payment link errors', async () => {
    const invalidData = {
      amount: -100  // Invalid amount
    };

    await expect(generateSquarePaymentLink(invalidData))
      .rejects.toThrow();
  });
});
```

#### Test Webhook Processing
```javascript
describe('Square Webhooks', () => {
  test('should verify webhook signature', () => {
    const payload = JSON.stringify({ test: 'data' });
    const signature = generateTestSignature(payload);
    
    const isValid = verifySquareSignature(payload, signature);
    expect(isValid).toBe(true);
  });

  test('should process payment success webhook', async () => {
    const webhookPayload = {
      type: 'payment.updated',
      data: {
        object: {
          payment: {
            id: 'pay_test_123',
            status: 'COMPLETED',
            amount_money: {
              amount: 15000,
              currency: 'USD'
            }
          }
        }
      }
    };

    const result = await processSquareWebhook(webhookPayload);
    expect(result.payment_updated).toBe(true);
  });
});
```

### Payment Processing Testing

#### Test Card Processing
```javascript
describe('Payment Processing', () => {
  test('should process successful payment', async () => {
    const paymentData = {
      amount: 100.00,
      card_number: '4242424242424242',  // Test card
      exp_month: 12,
      exp_year: 2025,
      cvv: '123'
    };

    const result = await processPayment(paymentData);
    expect(result.success).toBe(true);
    expect(result.transaction_id).toBeDefined();
  });

  test('should handle declined card', async () => {
    const paymentData = {
      card_number: '4000000000000002'  // Test declined card
    };

    await expect(processPayment(paymentData))
      .rejects.toThrow('card_declined');
  });
});
```

## Email Service Testing

### Email Sending Testing

#### Test Email Delivery
```javascript
describe('Email Sending', () => {
  test('should send booking confirmation email', async () => {
    const emailData = {
      to: 'test@example.com',
      template: 'booking_confirmation',
      data: {
        guest_name: 'Test Guest',
        confirmation_number: 'CONF-123',
        check_in: '2024-02-01',
        check_out: '2024-02-03'
      }
    };

    const result = await sendEmail(emailData);
    expect(result.success).toBe(true);
    expect(result.message_id).toBeDefined();
  });

  test('should handle invalid email address', async () => {
    const emailData = {
      to: 'invalid-email',
      template: 'test'
    };

    await expect(sendEmail(emailData))
      .rejects.toThrow('Invalid email address');
  });
});
```

### Template Testing

#### Test Template Rendering
```javascript
describe('Email Templates', () => {
  test('should render booking confirmation template', () => {
    const templateData = {
      guest_name: 'Test Guest',
      confirmation_number: 'CONF-123',
      hotel_name: 'Test Hotel'
    };

    const html = renderTemplate('booking_confirmation', templateData);
    expect(html).toContain('Test Guest');
    expect(html).toContain('CONF-123');
  });

  test('should handle missing template data', () => {
    const incompleteData = {
      guest_name: 'Test Guest',
      // Missing required fields
    };

    expect(() => renderTemplate('booking_confirmation', incompleteData))
      .toThrow('Missing required template data');
  });
});
```

## Booking Engine Testing

### Cache Testing

#### Test Cache Operations
```javascript
describe('Booking Engine Cache', () => {
  test('should update hotel cache', async () => {
    const result = await updateHotelCache();
    expect(result.success).toBe(true);
    expect(result.hotels_updated).toBeGreaterThan(0);
  });

  test('should update room type cache', async () => {
    const result = await updateRoomTypeCache();
    expect(result.success).toBe(true);
  });

  test('should refresh availability cache', async () => {
    const result = await refreshAvailabilityCache({
      hotel_id: 'test-hotel',
      start_date: '2024-02-01',
      end_date: '2024-02-28'
    });
    expect(result.success).toBe(true);
  });
});
```

### Booking Creation Testing

#### Test Booking Flow
```javascript
describe('Booking Engine Bookings', () => {
  test('should create booking in PMS', async () => {
    const bookingData = {
      hotel_id: 'test-hotel',
      room_type: 'DELUXE',
      check_in: '2024-02-01',
      check_out: '2024-02-03',
      guest: {
        first_name: 'Test',
        last_name: 'Guest',
        email: 'test@example.com'
      }
    };

    const result = await createBookingEngineReservation(bookingData);    expect(result.reservation_id).toBeDefined();
    expect(result.confirmation_number).toBeDefined();
  });

  test('should prevent duplicate bookings', async () => {
    const bookingData = {
      // Same booking data as above
    };

    // Create first booking
    await createBookingEngineReservation(bookingData);

    // Attempt duplicate
    await expect(createBookingEngineReservation(bookingData))
      .rejects.toThrow('Duplicate booking');
  });
});
```

## Test Data Management

### Test Data Setup

#### Create Test Data
```javascript
async function setupTestData() {
  // Create test hotel
  const hotel = await createTestHotel({
    name: 'Test Hotel',
    code: 'TEST-HOTEL'
  });

  // Create test room types
  const roomTypes = await createTestRoomTypes([
    { code: 'STANDARD', name: 'Standard Room' },
    { code: 'DELUXE', name: 'Deluxe Room' }
  ]);

  // Create test rate plans
  const ratePlans = await createTestRatePlans([
    { code: 'BAR', name: 'Best Available Rate' },
    { code: 'NRF', name: 'Non-Refundable' }
  ]);

  return { hotel, roomTypes, ratePlans };
}
```

#### Cleanup Test Data
```javascript
async function cleanupTestData() {
  await deleteTestReservations();
  await deleteTestPayments();
  await deleteTestGuests();
  await deleteTestRatePlans();
  await deleteTestRoomTypes();
  await deleteTestHotels();
}
```

## Automated Testing

### Continuous Integration

#### Test Pipeline
```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run integration tests
        run: npm run test:integration
        env:
          TL_LINCOLN_API_KEY: ${{ secrets.TL_LINCOLN_TEST_KEY }}
          SQUARE_API_KEY: ${{ secrets.SQUARE_TEST_KEY }}
```

### Scheduled Testing

#### Daily Health Checks
```javascript
// Schedule daily integration health checks
cron.schedule('0 2 * * *', async () => {
  console.log('Running daily integration health checks');
  
  const results = {
    tl_lincoln: await testTLLincolnIntegration(),
    booking_com: await testBookingComIntegration(),
    rakuten: await testRakutenIntegration(),
    jalan: await testJalanIntegration(),
    tripla: await testTriplaIntegration(),
    square: await testSquareIntegration(),
    email: await testEmailIntegration(),
    booking_engine: await testBookingEngineIntegration()
  };

  await sendHealthCheckReport(results);
});
```

## Test Reporting

### Test Results Format

#### Test Report Structure
```javascript
{
  "test_run": {
    "timestamp": "2024-01-15T10:00:00Z",
    "environment": "staging",
    "total_tests": 150,
    "passed": 148,
    "failed": 2,
    "skipped": 0,
    "duration_ms": 45000
  },
  "test_suites": [
    {
      "name": "TL-Lincoln Integration",
      "tests": 25,
      "passed": 25,
      "failed": 0,
      "duration_ms": 8000
    },
    {
      "name": "Square Payment Integration",
      "tests": 20,
      "passed": 18,
      "failed": 2,
      "duration_ms": 12000,
      "failures": [
        {
          "test": "should process refund",
          "error": "Timeout waiting for refund confirmation"
        }
      ]
    }
  ]
}
```

## Best Practices

### Testing Guidelines

1. **Test in Isolation** - Each test should be independent
2. **Use Test Data** - Never test with production data
3. **Clean Up** - Always clean up test data after tests
4. **Mock External Calls** - Mock external APIs in unit tests
5. **Test Error Cases** - Test both success and failure scenarios
6. **Verify Idempotency** - Ensure operations can be safely retried
7. **Test Performance** - Include performance benchmarks
8. **Document Tests** - Clear test descriptions and comments

### Test Coverage Goals

- **Unit Tests**: 80%+ code coverage
- **Integration Tests**: All critical workflows
- **End-to-End Tests**: Key user journeys
- **Performance Tests**: Response time benchmarks

## Related Documentation

- **[Troubleshooting Guide](troubleshooting.md)** - Integration troubleshooting
- **[Integration Overview](README.md)** - General integration documentation
- **[TL-Lincoln Integration](ota-systems/channel-management.md)** - Channel manager integration
- **[Payment Integration](payment-systems/payment-gateway-guide.md)** - Payment testing
- **[Email Integration](email-services/email-integration.md)** - Email testing

---

*This testing guide provides comprehensive procedures for testing all integration components to ensure reliability and correctness.*
