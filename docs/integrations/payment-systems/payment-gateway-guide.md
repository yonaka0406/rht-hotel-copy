# Payment Gateway Integration Guide

This document provides comprehensive guidance for integrating payment gateways with the WeHub.work Hotel Management System for secure payment processing.

## Overview

Payment gateway integration enables secure credit card processing, payment tokenization, refund handling, and PCI DSS compliance. The PMS supports multiple payment gateway providers with flexible configuration options.

### Key Features
- **Secure Payment Processing** - PCI DSS compliant payment handling
- **Multiple Payment Methods** - Credit cards, debit cards, digital wallets
- **Payment Tokenization** - Secure card data storage
- **Refund Processing** - Automated refund handling
- **Fraud Prevention** - Built-in fraud detection tools
- **3D Secure** - Additional authentication for online payments

### Supported Payment Gateways
- **Square** - Comprehensive payment platform
- **Stripe** - Developer-friendly payment API
- **Authorize.Net** - Established payment gateway
- **Braintree** - PayPal-owned payment platform
- **Custom Gateways** - Flexible integration framework

## Integration Architecture

### Payment Processing Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Guest     │────►│   PMS       │────►│  Payment    │
│             │     │             │     │  Gateway    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                           ▲                    │
                           │                    │
                           └────────────────────┘
                              Webhook/Callback
```

### Payment Flow Steps

1. **Payment Initiation** - Guest or staff initiates payment
2. **Amount Calculation** - Calculate total amount due
3. **Payment Method Selection** - Choose payment method
4. **Gateway Request** - Send payment request to gateway
5. **Authentication** - 3D Secure or additional verification
6. **Processing** - Gateway processes payment
7. **Response Handling** - Receive and process gateway response
8. **Confirmation** - Update PMS and notify guest
9. **Reconciliation** - Match payments with settlements

## Common Integration Patterns

### Direct API Integration

#### Payment Request
```javascript
async function processPayment(paymentData) {
  const request = {
    amount: paymentData.amount,
    currency: paymentData.currency,
    payment_method: paymentData.payment_method,
    customer: {
      email: paymentData.customer_email,
      name: paymentData.customer_name
    },
    metadata: {
      reservation_id: paymentData.reservation_id,
      payment_type: paymentData.payment_type
    }
  };

  try {
    const response = await paymentGateway.charge(request);
    
    if (response.status === 'succeeded') {
      await recordPayment({
        transaction_id: response.id,
        amount: response.amount,
        status: 'completed',
        reservation_id: paymentData.reservation_id
      });
      
      return { success: true, transaction_id: response.id };
    } else {
      throw new Error(`Payment failed: ${response.failure_message}`);
    }
  } catch (error) {
    // ⚠️ SECURITY: Log only safe, non-sensitive error context
    console.error('Payment processing failed', {
      error_code: error.code,
      error_type: error.type,
      http_status: error.statusCode
      // DO NOT log: error.message (may contain PII), full error object, raw response
    });
    throw error;
  }
}
```

### Hosted Payment Page

#### Redirect Flow
```javascript
async function createHostedPaymentSession(paymentData) {
  const session = await paymentGateway.createSession({
    amount: paymentData.amount,
    currency: paymentData.currency,
    success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/payment/cancel`,
    metadata: {
      reservation_id: paymentData.reservation_id
    }
  });

  return {
    session_id: session.id,
    redirect_url: session.url
  };
}
```

### Payment Tokenization

⚠️ **PCI DSS Compliance**: NEVER handle raw card data (card number, CVV, expiration) on your server. Always tokenize card data client-side using Stripe.js, Stripe Elements, or a hosted payment page.

#### Client-Side Tokenization (Required)

**Frontend - Tokenize card data using Stripe.js**:
```javascript
// Client-side code - tokenization happens in the browser
async function tokenizeCard() {
  const stripe = Stripe('pk_live_your_publishable_key');
  
  // Create payment method from card element (Stripe Elements)
  const {paymentMethod, error} = await stripe.createPaymentMethod({
    type: 'card',
    card: cardElement, // Stripe Elements card input
    billing_details: {
      name: customerName,
      email: customerEmail
    }
  });

  if (error) {
    // ⚠️ SECURITY: Log only safe error context, no payment details
    console.error('Tokenization failed', {
      error_code: error.code,
      error_type: error.type
      // DO NOT log: error object, card details, customer info
    });
    return null;
  }

  // Send ONLY the token to your server
  return paymentMethod.id; // e.g., "pm_1234567890abcdef"
}
```

#### Server-Side - Save Tokenized Payment Method

**Backend - Accept pre-tokenized payment method**:
```javascript
// ✅ PCI-COMPLIANT: Server only receives and stores tokens
async function savePaymentMethod(paymentMethodId, customerId) {
  // Validate that paymentMethodId is a valid token format
  if (!paymentMethodId || !paymentMethodId.startsWith('pm_')) {
    throw new Error('Invalid payment method token');
  }

  // Attach the pre-tokenized payment method to customer
  await paymentGateway.attachPaymentMethod(
    paymentMethodId,
    customerId
  );

  // Retrieve payment method details from gateway (non-sensitive data only)
  const paymentMethod = await paymentGateway.retrievePaymentMethod(paymentMethodId);

  // Store ONLY the token and non-sensitive metadata in your database
  await savePaymentToken({
    customer_id: customerId,
    payment_method_id: paymentMethodId, // Token only
    brand: paymentMethod.card.brand,    // e.g., "visa"
    last_four: paymentMethod.card.last4, // From gateway, not raw card
    exp_month: paymentMethod.card.exp_month,
    exp_year: paymentMethod.card.exp_year,
    fingerprint: paymentMethod.card.fingerprint // For duplicate detection
  });

  return paymentMethodId;
}
```

**Key Security Points**:
- ✅ **Client-side tokenization**: Card data never touches your server
- ✅ **Token validation**: Verify token format before processing
- ✅ **Gateway metadata**: Retrieve card details from payment gateway, not client
- ✅ **Store tokens only**: Never store raw card numbers, CVV, or full expiration dates
- ❌ **Never log**: Don't log payment method tokens in application logs
- ❌ **Never transmit**: Don't send raw card data in API requests

## Stripe Integration

### Configuration

#### API Keys Setup
```javascript
{
  "payment_gateway": "stripe",
  "stripe": {
    "publishable_key": "pk_live_xxxxxxxxxxxxxxxxxxxxx",
    "secret_key": "sk_live_xxxxxxxxxxxxxxxxxxxxx",
    "webhook_secret": "whsec_xxxxxxxxxxxxxxxxxxxxx",
    "currency": "USD",
    "capture_method": "automatic"
  }
}
```

### Payment Processing

#### Create Payment Intent
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createPaymentIntent(amount, currency, metadata) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: metadata,
      automatic_payment_methods: {
        enabled: true
      }
    });

    return {
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id
    };
  } catch (error) {
    // ⚠️ SECURITY: Log only safe, non-sensitive error context
    console.error('Stripe payment intent creation failed', {
      error_code: error.code,
      error_type: error.type,
      http_status: error.statusCode
      // DO NOT log: error.message (may contain PII), full error object, raw response
    });
    throw error;
  }
}
```

#### Confirm Payment
```javascript
async function confirmPayment(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      await recordPayment({
        transaction_id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: 'completed',
        payment_method: paymentIntent.payment_method,
        reservation_id: paymentIntent.metadata.reservation_id
      });
      
      return { success: true };
    }
    
    return { success: false, status: paymentIntent.status };
  } catch (error) {
    // ⚠️ SECURITY: Log only safe error context
    console.error('Stripe payment confirmation failed', {
      error_code: error.code,
      error_type: error.type,
      http_status: error.statusCode
      // DO NOT log: payment intent details, customer data, decline reasons
    });
    throw error;
  }
}
```

### Webhook Handling

#### Webhook Endpoint
```javascript
async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    // ⚠️ SECURITY: Log only safe error context, no webhook payload
    console.error('Webhook signature verification failed', {
      error_type: err.type
      // DO NOT log: err.message, webhook payload, signatures
    });
    return res.status(400).send('Webhook signature verification failed');
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailure(event.data.object);
      break;
    case 'charge.refunded':
      await handleRefund(event.data.object);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
}
```

## Authorize.Net Integration

### Configuration

#### API Credentials
```javascript
{
  "payment_gateway": "authorize_net",
  "authorize_net": {
    "api_login_id": "your_api_login_id",
    "transaction_key": "your_transaction_key",
    "environment": "production",
    "currency": "USD"
  }
}
```

### Payment Processing

#### Charge Credit Card
```javascript
const ApiContracts = require('authorizenet').APIContracts;
const ApiControllers = require('authorizenet').APIControllers;

async function chargeCard(cardData, amount, reservationId) {
  const merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
  merchantAuthenticationType.setName(process.env.AUTHORIZE_NET_API_LOGIN_ID);
  merchantAuthenticationType.setTransactionKey(process.env.AUTHORIZE_NET_TRANSACTION_KEY);

  // ⚠️ PCI COMPLIANCE: Use Accept.js for client-side tokenization
  // This example shows using a pre-tokenized payment nonce from Accept.js
  // Never send raw card data to your server
  
  const opaqueData = new ApiContracts.OpaqueDataType();
  opaqueData.setDataDescriptor('COMMON.ACCEPT.INAPP.PAYMENT');
  opaqueData.setDataValue(paymentNonce); // Token from Accept.js client-side

  const paymentType = new ApiContracts.PaymentType();
  paymentType.setOpaqueData(opaqueData);

  const transactionRequestType = new ApiContracts.TransactionRequestType();
  transactionRequestType.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
  transactionRequestType.setPayment(paymentType);
  transactionRequestType.setAmount(amount);

  const createRequest = new ApiContracts.CreateTransactionRequest();
  createRequest.setMerchantAuthentication(merchantAuthenticationType);
  createRequest.setTransactionRequest(transactionRequestType);

  const ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());

  return new Promise((resolve, reject) => {
    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();
      const response = new ApiContracts.CreateTransactionResponse(apiResponse);

      if (response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
        const transactionResponse = response.getTransactionResponse();
        resolve({
          success: true,
          transaction_id: transactionResponse.getTransId(),
          auth_code: transactionResponse.getAuthCode()
        });
      } else {
        reject(new Error(response.getMessages().getMessage()[0].getText()));
      }
    });
  });
}
```

## Refund Processing

### Full Refund

#### Process Full Refund
```javascript
async function processFullRefund(transactionId, amount) {
  try {
    const refund = await paymentGateway.refunds.create({
      charge: transactionId,
      amount: Math.round(amount * 100)
    });

    await recordRefund({
      original_transaction_id: transactionId,
      refund_transaction_id: refund.id,
      amount: amount,
      status: 'completed',
      refund_date: new Date()
    });

    return { success: true, refund_id: refund.id };
  } catch (error) {
    // ⚠️ SECURITY: Log only safe error context
    console.error('Refund processing failed', {
      error_code: error.code,
      error_type: error.type,
      http_status: error.statusCode
      // DO NOT log: refund details, payment method info, customer data
    });
    throw error;
  }
}
```

### Partial Refund

#### Process Partial Refund
```javascript
async function processPartialRefund(transactionId, refundAmount, reason) {
  try {
    const refund = await paymentGateway.refunds.create({
      charge: transactionId,
      amount: Math.round(refundAmount * 100),
      reason: reason
    });

    await recordRefund({
      original_transaction_id: transactionId,
      refund_transaction_id: refund.id,
      amount: refundAmount,
      reason: reason,
      status: 'completed',
      refund_date: new Date()
    });

    return { success: true, refund_id: refund.id };
  } catch (error) {
    // ⚠️ SECURITY: Log only safe error context
    console.error('Partial refund failed', {
      error_code: error.code,
      error_type: error.type,
      http_status: error.statusCode
      // DO NOT log: refund amounts, payment details, customer info
    });
    throw error;
  }
}
```

## Security Considerations

### PCI DSS Compliance

#### Scope Reduction
- **Never Store Card Data** - Use tokenization instead
- **Use Gateway SDKs** - Let gateway handle sensitive data
- **Hosted Payment Pages** - Redirect to gateway for card entry
- **Secure Transmission** - Always use HTTPS/TLS

#### PCI SAQ Requirements
- **SAQ A** - Fully outsourced payment processing
- **SAQ A-EP** - E-commerce with partial outsourcing
- **SAQ D** - All other merchants

### Data Protection

#### Sensitive Data Handling
```javascript
// NEVER log or store full card numbers
function maskCardNumber(cardNumber) {
  return `****-****-****-${cardNumber.slice(-4)}`;
}

// Store only necessary data
const paymentRecord = {
  transaction_id: response.id,
  last_four: cardData.number.slice(-4),
  brand: response.card.brand,
  // DO NOT store: full card number, CVV, PIN
};
```

### Fraud Prevention

#### Fraud Detection Rules
```javascript
const fraudChecks = {
  // Check for suspicious patterns
  async checkFraudRisk(paymentData) {
    const checks = [];
    
    // Check amount threshold
    if (paymentData.amount > 5000) {
      checks.push({ type: 'high_amount', risk: 'medium' });
    }
    
    // Check velocity (multiple transactions)
    const recentTransactions = await getRecentTransactions(
      paymentData.customer_email,
      24 // hours
    );
    if (recentTransactions.length > 5) {
      checks.push({ type: 'high_velocity', risk: 'high' });
    }
    
    // Check IP geolocation mismatch
    const ipCountry = await getCountryFromIP(paymentData.ip_address);
    if (ipCountry !== paymentData.billing_country) {
      checks.push({ type: 'geo_mismatch', risk: 'medium' });
    }
    
    return checks;
  }
};
```

## Error Handling

### Common Payment Errors

#### Declined Card
```javascript
async function handleDeclinedCard(error, paymentData) {
  await logPaymentFailure({
    reason: 'card_declined',
    decline_code: error.decline_code,
    message: error.message,
    reservation_id: paymentData.reservation_id
  });

  // Notify guest
  await sendEmail(paymentData.customer_email, 'payment_declined', {
    reason: getDeclineReason(error.decline_code)
  });

  return {
    success: false,
    error: 'card_declined',
    message: 'Your card was declined. Please try a different payment method.'
  };
}
```

#### Insufficient Funds
```javascript
async function handleInsufficientFunds(error, paymentData) {
  await logPaymentFailure({
    reason: 'insufficient_funds',
    reservation_id: paymentData.reservation_id
  });

  return {
    success: false,
    error: 'insufficient_funds',
    message: 'Insufficient funds. Please use a different card or payment method.'
  };
}
```

#### Gateway Timeout
```javascript
async function handleGatewayTimeout(paymentData) {
  // Queue for retry
  await queuePaymentRetry(paymentData);

  return {
    success: false,
    error: 'gateway_timeout',
    message: 'Payment processing timed out. We will retry automatically.'
  };
}
```

### Retry Logic

#### Automatic Retry
```javascript
async function processPaymentWithRetry(paymentData, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await processPayment(paymentData);
    } catch (error) {
      lastError = error;
      
      // Don't retry for certain errors
      if (isNonRetryableError(error)) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await sleep(delay);
      }
    }
  }
  
  throw new Error(`Payment failed after ${maxRetries} attempts: ${lastError.message}`);
}

function isNonRetryableError(error) {
  const nonRetryableCodes = [
    'card_declined',
    'insufficient_funds',
    'invalid_card',
    'expired_card'
  ];
  return nonRetryableCodes.includes(error.code);
}
```

## Testing

### Test Environments

#### Stripe Test Mode
```javascript
// Test card numbers
const testCards = {
  success: '4242424242424242',
  declined: '4000000000000002',
  insufficient_funds: '4000000000009995',
  expired: '4000000000000069'
};
```

#### Authorize.Net Sandbox
```javascript
{
  "environment": "sandbox",
  "api_login_id": "sandbox_login",
  "transaction_key": "sandbox_key"
}
```

### Test Scenarios

#### Successful Payment Test
```javascript
async function testSuccessfulPayment() {
  const result = await processPayment({
    amount: 100.00,
    currency: 'USD',
    payment_method: 'card',
    card_number: '4242424242424242',
    exp_month: 12,
    exp_year: 2025,
    cvv: '123',
    customer_email: 'test@example.com',
    reservation_id: 'TEST-001'
  });

  assert(result.success === true);
  assert(result.transaction_id !== null);
}
```

#### Declined Payment Test
```javascript
async function testDeclinedPayment() {
  try {
    await processPayment({
      amount: 100.00,
      card_number: '4000000000000002', // Test declined card
      // ... other fields
    });
    assert.fail('Should have thrown error');
  } catch (error) {
    assert(error.code === 'card_declined');
  }
}
```

## Monitoring and Reporting

### Payment Metrics

#### Key Performance Indicators
```javascript
{
  "payment_metrics": {
    "period": "last_30_days",
    "total_transactions": 1250,
    "successful_transactions": 1198,
    "failed_transactions": 52,
    "total_amount": 187500.00,
    "average_transaction": 150.00,
    "success_rate": 95.8,
    "decline_rate": 4.2,
    "refund_rate": 2.1
  }
}
```

### Reconciliation

#### Daily Reconciliation
```javascript
async function reconcilePayments(date) {
  // Get PMS transactions
  const pmsTransactions = await getTransactionsByDate(date);
  
  // Get gateway settlements
  const gatewaySettlements = await getGatewaySettlements(date);
  
  // Match transactions
  const matched = [];
  const unmatched = [];
  
  for (const pmsTransaction of pmsTransactions) {
    const settlement = gatewaySettlements.find(
      s => s.transaction_id === pmsTransaction.transaction_id
    );
    
    if (settlement) {
      matched.push({ pms: pmsTransaction, gateway: settlement });
    } else {
      unmatched.push(pmsTransaction);
    }
  }
  
  return {
    date: date,
    total_pms: pmsTransactions.length,
    total_gateway: gatewaySettlements.length,
    matched: matched.length,
    unmatched: unmatched.length,
    unmatched_transactions: unmatched
  };
}
```

## Best Practices

### Payment Processing
- **Validate Input** - Validate all payment data before processing
- **Use Idempotency** - Prevent duplicate charges
- **Handle Errors Gracefully** - Provide clear error messages
- **Log Everything** - Comprehensive audit trail
- **Test Thoroughly** - Test all payment scenarios

### Security
- **Never Store Cards** - Use tokenization
- **Use HTTPS** - Encrypt all communications
- **Validate Webhooks** - Verify webhook signatures
- **Monitor Fraud** - Implement fraud detection
- **Regular Audits** - Conduct security audits

### User Experience
- **Clear Messaging** - Explain payment process clearly
- **Progress Indicators** - Show payment processing status
- **Error Recovery** - Help users recover from errors
- **Receipt Generation** - Provide immediate receipts
- **Support Contact** - Easy access to support

## Troubleshooting

See **[Integration Troubleshooting Guide](../troubleshooting.md)** for detailed troubleshooting procedures specific to payment gateway integrations.

### Quick Troubleshooting Checklist

- [ ] Verify payment gateway credentials are correct
- [ ] Check payment gateway service status
- [ ] Verify SSL/TLS certificates are valid
- [ ] Check webhook endpoint is accessible
- [ ] Review payment logs for errors
- [ ] Verify test mode vs production mode
- [ ] Check for API version compatibility
- [ ] Test with gateway test cards first

## Related Documentation

- **[Square Integration](square-integration.md)** - Square-specific integration
- **[Integration Overview](../README.md)** - General integration documentation
- **[Integration Patterns](../../architecture/integration-patterns.md)** - Integration architecture
- **[API Security](../../api/authentication.md)** - Authentication and security
- **[Troubleshooting](../troubleshooting.md)** - Integration troubleshooting

---

*This guide provides comprehensive information for implementing payment gateway integrations for secure payment processing.*
