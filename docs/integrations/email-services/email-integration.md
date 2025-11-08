# Email Services Integration

This document provides comprehensive guidance for integrating email services with the WeHub.work Hotel Management System for guest communications and notifications.

## Overview

Email integration enables automated guest communications, transactional emails, marketing campaigns, and system notifications. The PMS supports multiple email service providers with flexible configuration options.

### Key Features
- **Transactional Emails** - Booking confirmations, receipts, reminders
- **Marketing Campaigns** - Promotional emails and newsletters
- **Automated Notifications** - System alerts and staff notifications
- **Template Management** - Customizable email templates
- **Delivery Tracking** - Email delivery and engagement metrics

### Supported Email Providers
- **SendGrid** - Scalable email delivery platform
- **Amazon SES** - AWS Simple Email Service
- **Mailgun** - Email API service
- **SMTP** - Standard SMTP server support
- **Custom Providers** - Flexible API integration framework

## Integration Architecture

### Email Service Architecture

```
┌─────────────────┐
│   rht-hotel     │
│   PMS           │
└────────┬────────┘
         │
         ├──────────┐
         │          │
    ┌────▼────┐ ┌──▼──────┐
    │SendGrid │ │Amazon   │
    │         │ │SES      │
    └────┬────┘ └──┬──────┘
         │         │
         └────┬────┘
              │
         ┌────▼────┐
         │  Guest  │
         │  Email  │
         └─────────┘
```

### Email Flow

#### Transactional Email Flow
1. **Trigger Event** - Booking created, payment received, etc.
2. **Template Selection** - Select appropriate email template
3. **Data Preparation** - Gather reservation and guest data
4. **Template Rendering** - Populate template with data
5. **Email Sending** - Send via configured email provider
6. **Delivery Tracking** - Track delivery status and opens
7. **Error Handling** - Retry failed sends, log errors

#### Marketing Email Flow
1. **Campaign Creation** - Define campaign parameters
2. **Recipient Selection** - Select target guest segments
3. **Template Design** - Create or select email template
4. **Scheduling** - Schedule send time
5. **Batch Sending** - Send in batches to respect rate limits
6. **Analytics** - Track opens, clicks, conversions

## SendGrid Integration

### Configuration

#### API Key Setup
```javascript
{
  "email_provider": "sendgrid",
  "sendgrid": {
    "api_key": "SG.xxxxxxxxxxxxxxxxxxxxx",
    "from_email": "noreply@hotel.com",
    "from_name": "Grand Hotel",
    "reply_to": "reservations@hotel.com",
    "sandbox_mode": false
  }
}
```

#### Environment Variables
```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@hotel.com
SENDGRID_FROM_NAME=Grand Hotel
SENDGRID_REPLY_TO=reservations@hotel.com
```

### Sending Emails

#### Basic Email Send
```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmail(to, subject, html) {
  const msg = {
    to: to,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL,
      name: process.env.SENDGRID_FROM_NAME
    },
    replyTo: process.env.SENDGRID_REPLY_TO,
    subject: subject,
    html: html
  };

  try {
    await sgMail.send(msg);
    console.log('Email sent successfully');
    return { success: true };
  } catch (error) {
    console.error('SendGrid error:', error);
    throw error;
  }
}
```

#### Template-Based Email
```javascript
async function sendTemplateEmail(to, templateId, dynamicData) {
  const msg = {
    to: to,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL,
      name: process.env.SENDGRID_FROM_NAME
    },
    templateId: templateId,
    dynamicTemplateData: dynamicData
  };

  try {
    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error('SendGrid template error:', error);
    throw error;
  }
}
```

#### Booking Confirmation Email
```javascript
async function sendBookingConfirmation(reservation) {
  const templateData = {
    guest_name: `${reservation.guest.first_name} ${reservation.guest.last_name}`,
    confirmation_number: reservation.confirmation_number,
    check_in_date: formatDate(reservation.check_in),
    check_out_date: formatDate(reservation.check_out),
    room_type: reservation.room_type.name,
    total_amount: formatCurrency(reservation.total_amount),
    hotel_name: reservation.hotel.name,
    hotel_address: reservation.hotel.address,
    hotel_phone: reservation.hotel.phone
  };

  return await sendTemplateEmail(
    reservation.guest.email,
    'booking_confirmation',
    templateData
  );
}
```

### Webhook Handling

#### Webhook Configuration
```javascript
{
  "sendgrid_webhooks": {
    "enabled": true,
    "endpoint": "https://pms.hotel.com/api/webhooks/sendgrid",
    "events": [
      "delivered",
      "open",
      "click",
      "bounce",
      "dropped",
      "spam_report"
    ]
  }
}
```

#### Webhook Handler
```javascript
async function handleSendGridWebhook(req, res) {
  const events = req.body;

  for (const event of events) {
    try {
      await processEmailEvent(event);
    } catch (error) {
      console.error('Error processing event:', error);
    }
  }

  res.status(200).send('OK');
}

async function processEmailEvent(event) {
  const emailLog = {
    email: event.email,
    event_type: event.event,
    timestamp: new Date(event.timestamp * 1000),
    message_id: event.sg_message_id,
    reason: event.reason || null
  };

  await saveEmailLog(emailLog);

  // Handle specific events
  switch (event.event) {
    case 'bounce':
      await handleBounce(event);
      break;
    case 'spam_report':
      await handleSpamReport(event);
      break;
    case 'open':
      await trackEmailOpen(event);
      break;
    case 'click':
      await trackEmailClick(event);
      break;
  }
}
```

## Amazon SES Integration

### Configuration

#### AWS Credentials Setup
```javascript
{
  "email_provider": "ses",
  "ses": {
    "region": "us-east-1",
    "access_key_id": "AKIAIOSFODNN7EXAMPLE",
    "secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "from_email": "noreply@hotel.com",
    "from_name": "Grand Hotel",
    "configuration_set": "hotel-emails"
  }
}
```

#### Environment Variables
```bash
EMAIL_PROVIDER=ses
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
SES_FROM_EMAIL=noreply@hotel.com
SES_FROM_NAME=Grand Hotel
SES_CONFIGURATION_SET=hotel-emails
```

### Sending Emails

#### Basic SES Email Send
```javascript
const AWS = require('aws-sdk');

AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const ses = new AWS.SES({ apiVersion: '2010-12-01' });

async function sendEmailSES(to, subject, html) {
  const params = {
    Source: `${process.env.SES_FROM_NAME} <${process.env.SES_FROM_EMAIL}>`,
    Destination: {
      ToAddresses: [to]
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8'
      },
      Body: {
        Html: {
          Data: html,
          Charset: 'UTF-8'
        }
      }
    },
    ConfigurationSetName: process.env.SES_CONFIGURATION_SET
  };

  try {
    const result = await ses.sendEmail(params).promise();
    console.log('Email sent:', result.MessageId);
    return { success: true, messageId: result.MessageId };
  } catch (error) {
    console.error('SES error:', error);
    throw error;
  }
}
```

#### Template-Based SES Email
```javascript
async function sendTemplateSES(to, templateName, templateData) {
  const params = {
    Source: `${process.env.SES_FROM_NAME} <${process.env.SES_FROM_EMAIL}>`,
    Destination: {
      ToAddresses: [to]
    },
    Template: templateName,
    TemplateData: JSON.stringify(templateData),
    ConfigurationSetName: process.env.SES_CONFIGURATION_SET
  };

  try {
    const result = await ses.sendTemplatedEmail(params).promise();
    return { success: true, messageId: result.MessageId };
  } catch (error) {
    console.error('SES template error:', error);
    throw error;
  }
}
```

### SNS Notifications

#### SNS Topic Configuration
```javascript
{
  "ses_notifications": {
    "bounce_topic": "arn:aws:sns:us-east-1:123456789:ses-bounces",
    "complaint_topic": "arn:aws:sns:us-east-1:123456789:ses-complaints",
    "delivery_topic": "arn:aws:sns:us-east-1:123456789:ses-deliveries"
  }
}
```

#### SNS Handler
```javascript
async function handleSNSNotification(req, res) {
  const message = JSON.parse(req.body.Message);

  switch (message.notificationType) {
    case 'Bounce':
      await handleSESBounce(message.bounce);
      break;
    case 'Complaint':
      await handleSESComplaint(message.complaint);
      break;
    case 'Delivery':
      await handleSESDelivery(message.delivery);
      break;
  }

  res.status(200).send('OK');
}
```

## SMTP Integration

### Configuration

#### SMTP Settings
```javascript
{
  "email_provider": "smtp",
  "smtp": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "hotel@gmail.com",
      "pass": "app-specific-password"
    },
    "from_email": "hotel@gmail.com",
    "from_name": "Grand Hotel"
  }
}
```

#### Google Workspace Configuration
```javascript
{
  "email_provider": "smtp",
  "smtp": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "reservations@yourdomain.com",
      "pass": "app-specific-password"
    },
    "from_email": "reservations@yourdomain.com",
    "from_name": "Your Hotel Name"
  }
}
```

**Google Workspace Setup Steps:**
1. **Enable 2-Step Verification** - Required for app passwords
2. **Generate App Password** - Create app-specific password in Google Account settings
3. **Configure SMTP** - Use smtp.gmail.com with port 587 (TLS) or 465 (SSL)
4. **Set From Address** - Use your Google Workspace email address
5. **Test Connection** - Send test email to verify configuration

### Sending Emails

#### Nodemailer SMTP
```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendEmailSMTP(to, subject, html) {
  const mailOptions = {
    from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
    to: to,
    subject: subject,
    html: html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('SMTP error:', error);
    throw error;
  }
}
```

#### Google Workspace SMTP Example
```javascript
const nodemailer = require('nodemailer');

// Google Workspace transporter configuration
const googleWorkspaceTransporter = nodemailer.createTransporter({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use TLS
  auth: {
    user: process.env.GOOGLE_WORKSPACE_EMAIL, // e.g., reservations@yourdomain.com
    pass: process.env.GOOGLE_WORKSPACE_APP_PASSWORD // App-specific password
  },
  tls: {
    rejectUnauthorized: true
  }
});

async function sendEmailGoogleWorkspace(to, subject, html) {
  const mailOptions = {
    from: `${process.env.HOTEL_NAME} <${process.env.GOOGLE_WORKSPACE_EMAIL}>`,
    to: to,
    subject: subject,
    html: html,
    replyTo: process.env.GOOGLE_WORKSPACE_EMAIL
  };

  try {
    const info = await googleWorkspaceTransporter.sendMail(mailOptions);
    console.log('Email sent via Google Workspace:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Google Workspace SMTP error:', error);
    throw error;
  }
}
```

**Google Workspace Rate Limits:**
- **Free Gmail**: 500 emails per day
- **Google Workspace**: 2,000 emails per day per user
- **Relay Service**: Up to 10,000 emails per day (requires configuration)

## Email Templates

### Template Structure

#### Booking Confirmation Template
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Booking Confirmation</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #003366; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .details { background: white; padding: 15px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{hotel_name}}</h1>
      <p>Booking Confirmation</p>
    </div>
    <div class="content">
      <p>Dear {{guest_name}},</p>
      <p>Thank you for your reservation. Your booking has been confirmed.</p>
      
      <div class="details">
        <h3>Reservation Details</h3>
        <p><strong>Confirmation Number:</strong> {{confirmation_number}}</p>
        <p><strong>Check-in:</strong> {{check_in_date}}</p>
        <p><strong>Check-out:</strong> {{check_out_date}}</p>
        <p><strong>Room Type:</strong> {{room_type}}</p>
        <p><strong>Total Amount:</strong> {{total_amount}}</p>
      </div>
      
      <div class="details">
        <h3>Hotel Information</h3>
        <p>{{hotel_address}}</p>
        <p>Phone: {{hotel_phone}}</p>
      </div>
      
      <p>We look forward to welcoming you!</p>
    </div>
    <div class="footer">
      <p>&copy; 2024 {{hotel_name}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
```

### Template Management

#### Template Storage
```javascript
const emailTemplates = {
  booking_confirmation: {
    subject: 'Booking Confirmation - {{confirmation_number}}',
    template: 'booking_confirmation.html'
  },
  payment_receipt: {
    subject: 'Payment Receipt - {{confirmation_number}}',
    template: 'payment_receipt.html'
  },
  check_in_reminder: {
    subject: 'Check-in Reminder - {{hotel_name}}',
    template: 'check_in_reminder.html'
  },
  cancellation_confirmation: {
    subject: 'Cancellation Confirmation - {{confirmation_number}}',
    template: 'cancellation_confirmation.html'
  }
};
```

#### Template Rendering
```javascript
const Handlebars = require('handlebars');
const fs = require('fs').promises;

async function renderTemplate(templateName, data) {
  const templatePath = `./templates/${templateName}`;
  const templateSource = await fs.readFile(templatePath, 'utf-8');
  const template = Handlebars.compile(templateSource);
  return template(data);
}
```

## Email Types

### Transactional Emails

#### Booking Confirmation
- **Trigger**: Reservation created
- **Recipients**: Guest email
- **Content**: Confirmation number, dates, room details, total amount
- **Timing**: Immediate

#### Payment Receipt
- **Trigger**: Payment received
- **Recipients**: Guest email
- **Content**: Payment amount, method, transaction ID, balance
- **Timing**: Immediate

#### Check-in Reminder
- **Trigger**: 24 hours before check-in
- **Recipients**: Guest email
- **Content**: Reminder, check-in time, directions, contact info
- **Timing**: Scheduled

#### Cancellation Confirmation
- **Trigger**: Reservation cancelled
- **Recipients**: Guest email
- **Content**: Cancellation details, refund information
- **Timing**: Immediate

### Marketing Emails

#### Promotional Campaigns
- **Purpose**: Special offers, seasonal promotions
- **Recipients**: Segmented guest lists
- **Content**: Promotional offers, booking links
- **Timing**: Scheduled campaigns

#### Newsletter
- **Purpose**: Hotel updates, local events
- **Recipients**: Subscribed guests
- **Content**: News, events, tips
- **Timing**: Monthly or quarterly

### System Notifications

#### Staff Notifications
- **Trigger**: New booking, cancellation, payment
- **Recipients**: Staff email addresses
- **Content**: Reservation details, action required
- **Timing**: Immediate

#### Error Alerts
- **Trigger**: System errors, integration failures
- **Recipients**: Technical team
- **Content**: Error details, stack trace
- **Timing**: Immediate

## Delivery Tracking

### Email Logging

#### Email Log Schema
```javascript
{
  "email_logs": {
    "id": "uuid",
    "recipient": "guest@example.com",
    "subject": "Booking Confirmation",
    "template": "booking_confirmation",
    "provider": "sendgrid",
    "message_id": "provider_message_id",
    "status": "sent",
    "sent_at": "2024-01-15T10:00:00Z",
    "delivered_at": "2024-01-15T10:00:05Z",
    "opened_at": "2024-01-15T10:15:00Z",
    "clicked_at": "2024-01-15T10:16:00Z",
    "bounced": false,
    "bounce_reason": null,
    "reservation_id": "res_123"
  }
}
```

### Engagement Metrics

#### Tracking Metrics
- **Delivery Rate** - Percentage of emails delivered
- **Open Rate** - Percentage of emails opened
- **Click Rate** - Percentage of links clicked
- **Bounce Rate** - Percentage of emails bounced
- **Spam Rate** - Percentage marked as spam

#### Analytics Dashboard
```javascript
{
  "email_analytics": {
    "period": "last_30_days",
    "total_sent": 1250,
    "delivered": 1235,
    "opened": 987,
    "clicked": 456,
    "bounced": 15,
    "delivery_rate": 98.8,
    "open_rate": 79.9,
    "click_rate": 36.5,
    "bounce_rate": 1.2
  }
}
```

## Error Handling

### Bounce Handling

#### Hard Bounces
```javascript
async function handleHardBounce(email, reason) {
  // Mark email as invalid
  await markEmailInvalid(email, reason);
  
  // Stop sending to this address
  await addToSuppressionList(email);
  
  // Notify admin
  await notifyAdmin('hard_bounce', { email, reason });
  
  // Log event
  await logEmailEvent('hard_bounce', email, reason);
}
```

#### Soft Bounces
```javascript
async function handleSoftBounce(email, reason) {
  // Increment bounce count
  const bounceCount = await incrementBounceCount(email);
  
  // If too many soft bounces, treat as hard bounce
  if (bounceCount >= 5) {
    await handleHardBounce(email, 'Too many soft bounces');
  }
  
  // Log event
  await logEmailEvent('soft_bounce', email, reason);
}
```

### Retry Logic

#### Failed Send Retry
```javascript
async function sendEmailWithRetry(to, subject, html, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await sendEmail(to, subject, html);
    } catch (error) {
      lastError = error;
      console.error(`Email send attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await sleep(delay);
      }
    }
  }
  
  // All retries failed
  throw new Error(`Failed to send email after ${maxRetries} attempts: ${lastError.message}`);
}
```

## Best Practices

### Email Deliverability
- **Verify Domain** - Set up SPF, DKIM, and DMARC records
- **Warm Up IP** - Gradually increase sending volume
- **Clean Lists** - Remove invalid and bounced emails
- **Monitor Reputation** - Track sender reputation scores
- **Avoid Spam Triggers** - Follow email best practices

### Content Guidelines
- **Clear Subject Lines** - Descriptive and relevant
- **Personalization** - Use guest names and details
- **Mobile Responsive** - Optimize for mobile devices
- **Clear CTAs** - Obvious call-to-action buttons
- **Unsubscribe Link** - Always include unsubscribe option

### Security
- **Secure Credentials** - Store API keys securely
- **Encrypt Data** - Use TLS for transmission
- **Validate Recipients** - Verify email addresses
- **Rate Limiting** - Respect provider rate limits
- **Audit Logging** - Log all email activities

## Troubleshooting

See **[Integration Troubleshooting Guide](../troubleshooting.md)** for detailed troubleshooting procedures specific to email integrations.

### Quick Troubleshooting Checklist

- [ ] Verify email provider credentials are correct
- [ ] Check email provider service status
- [ ] Verify sender domain is verified
- [ ] Check SPF, DKIM, DMARC records
- [ ] Review bounce and complaint rates
- [ ] Check email logs for errors
- [ ] Verify template syntax is correct
- [ ] Test with sandbox/test mode first

## Related Documentation

- **[Integration Overview](../README.md)** - General integration documentation
- **[Integration Patterns](../../architecture/integration-patterns.md)** - Integration architecture
- **[API Security](../../api/authentication.md)** - Authentication and security
- **[Troubleshooting](../troubleshooting.md)** - Integration troubleshooting

---

*This guide provides comprehensive information for implementing email service integrations for guest communications and notifications.*
