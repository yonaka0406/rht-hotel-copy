# OTA XML Integration Guide

This document provides comprehensive guidance for integrating the WeHub.work Hotel Management System with Online Travel Agencies (OTAs) using XML-based protocols.

## Overview

OTA integrations enable hotels to distribute inventory and rates across multiple booking channels, synchronize reservations, and manage content across various platforms. This integration follows industry-standard OTA 2015A specifications.

### Key Features
- Real-time inventory and rate distribution
- Bidirectional reservation synchronization
- Automated booking confirmation
- Content management and updates
- Multi-channel distribution support

### Supported OTA Platforms
- **Booking.com** - XML API integration
- **Expedia** - EQC (Expedia QuickConnect) integration
- **Agoda** - YCS (Your Control System) integration
- **Custom OTAs** - Flexible XML integration framework

## Integration Architecture

### Communication Protocol

#### XML over HTTPS
All OTA communications use XML messages transmitted over HTTPS for security and reliability.

```
┌─────────────────┐    XML/HTTPS    ┌─────────────────┐
│   rht-hotel     │ ◄──────────────► │   OTA Platform  │
│   PMS           │                  │                 │
│                 │                  │                 │
│ • Push Updates  │                  │ • Pull Requests │
│ • Pull Bookings │                  │ • Confirmations │
└─────────────────┘                  └─────────────────┘
```

#### Message Types
- **OTA_HotelAvailNotifRQ** - Availability updates
- **OTA_HotelRateAmountNotifRQ** - Rate updates
- **OTA_HotelResNotifRQ** - Reservation notifications
- **OTA_HotelDescriptiveContentNotifRQ** - Content updates
- **OTA_HotelInvCountNotifRQ** - Inventory count updates

### Authentication Methods

#### Basic Authentication
```xml
Authorization: Basic base64(username:password)
Content-Type: application/xml
```

#### Certificate-Based Authentication
Some OTAs require SSL client certificates for enhanced security.

#### API Key Authentication
```xml
<Authentication>
  <APIKey>your-api-key</APIKey>
  <PropertyID>property-123</PropertyID>
</Authentication>
```

## Rate and Inventory Management

### Pushing Rates to OTAs

#### Rate Update Message Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelRateAmountNotifRQ 
    xmlns="http://www.opentravel.org/OTA/2003/05"
    EchoToken="12345"
    TimeStamp="2024-01-15T10:30:00Z"
    Version="1.0">
  <POS>
    <Source>
      <RequestorID Type="22" ID="HOTEL123"/>
    </Source>
  </POS>
  <RateAmountMessages HotelCode="HOTEL123">
    <RateAmountMessage>
      <StatusApplicationControl 
          Start="2024-02-01" 
          End="2024-02-28"
          InvTypeCode="DELUXE"
          RatePlanCode="BAR"/>
      <Rates>
        <Rate>
          <BaseByGuestAmts>
            <BaseByGuestAmt 
                AmountAfterTax="150.00" 
                CurrencyCode="USD"
                NumberOfGuests="2"/>
          </BaseByGuestAmts>
        </Rate>
      </Rates>
    </RateAmountMessage>
  </RateAmountMessages>
</OTA_HotelRateAmountNotifRQ>
```

#### Rate Update Workflow
1. **Rate Change Detection** - PMS detects rate changes in the system
2. **Message Construction** - Build OTA_HotelRateAmountNotifRQ message
3. **Validation** - Validate XML structure and data
4. **Transmission** - Send to OTA endpoint via HTTPS POST
5. **Response Handling** - Process OTA response and log results
6. **Error Recovery** - Retry failed updates with exponential backoff

### Pushing Availability to OTAs

#### Availability Update Message Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelAvailNotifRQ 
    xmlns="http://www.opentravel.org/OTA/2003/05"
    EchoToken="12346"
    TimeStamp="2024-01-15T10:35:00Z"
    Version="1.0">
  <POS>
    <Source>
      <RequestorID Type="22" ID="HOTEL123"/>
    </Source>
  </POS>
  <AvailStatusMessages HotelCode="HOTEL123">
    <AvailStatusMessage>
      <StatusApplicationControl 
          Start="2024-02-01" 
          End="2024-02-28"
          InvTypeCode="DELUXE"/>
      <RestrictionStatus 
          Status="Open"
          MinLOS="2"
          MaxLOS="14"/>
      <LengthsOfStay>
        <LengthOfStay Time="2" TimeUnit="Day" MinMaxMessageType="SetMinLOS"/>
      </LengthsOfStay>
    </AvailStatusMessage>
  </AvailStatusMessages>
</OTA_HotelAvailNotifRQ>
```

#### Availability Update Workflow
1. **Inventory Change** - Room availability changes in PMS
2. **Calculate Available Rooms** - Determine rooms available for OTA
3. **Build Message** - Construct availability notification
4. **Send Update** - Transmit to OTA platform
5. **Confirm Receipt** - Verify OTA acknowledgment
6. **Audit Log** - Record update in integration audit log

### Inventory Count Updates

#### Inventory Message Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelInvCountNotifRQ 
    xmlns="http://www.opentravel.org/OTA/2003/05"
    EchoToken="12347"
    TimeStamp="2024-01-15T10:40:00Z"
    Version="1.0">
  <POS>
    <Source>
      <RequestorID Type="22" ID="HOTEL123"/>
    </Source>
  </POS>
  <Inventories HotelCode="HOTEL123">
    <Inventory>
      <StatusApplicationControl 
          Start="2024-02-01" 
          End="2024-02-28"
          InvTypeCode="DELUXE"/>
      <InvCounts>
        <InvCount Count="10" CountType="2"/>
      </InvCounts>
    </Inventory>
  </Inventories>
</OTA_HotelInvCountNotifRQ>
```

## Reservation Management

### Receiving Reservations from OTAs

#### Reservation Notification Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelResNotifRQ 
    xmlns="http://www.opentravel.org/OTA/2003/05"
    EchoToken="OTA12345"
    TimeStamp="2024-01-15T11:00:00Z"
    Version="1.0">
  <POS>
    <Source>
      <RequestorID Type="22" ID="BOOKING_COM"/>
    </Source>
  </POS>
  <HotelReservations>
    <HotelReservation CreateDateTime="2024-01-15T11:00:00Z">
      <UniqueID Type="14" ID="BK123456789"/>
      <RoomStays>
        <RoomStay>
          <RoomTypes>
            <RoomType RoomTypeCode="DELUXE"/>
          </RoomTypes>
          <RatePlans>
            <RatePlan RatePlanCode="BAR"/>
          </RatePlans>
          <RoomRates>
            <RoomRate>
              <Rates>
                <Rate EffectiveDate="2024-02-01" ExpireDate="2024-02-03">
                  <Base AmountAfterTax="150.00" CurrencyCode="USD"/>
                </Rate>
              </Rates>
            </RoomRate>
          </RoomRates>
          <GuestCounts>
            <GuestCount AgeQualifyingCode="10" Count="2"/>
          </GuestCounts>
          <TimeSpan Start="2024-02-01" End="2024-02-03"/>
          <Total AmountAfterTax="300.00" CurrencyCode="USD"/>
        </RoomStay>
      </RoomStays>
      <ResGuests>
        <ResGuest>
          <Profiles>
            <ProfileInfo>
              <Profile>
                <Customer>
                  <PersonName>
                    <GivenName>John</GivenName>
                    <Surname>Doe</Surname>
                  </PersonName>
                  <Telephone PhoneNumber="+1-555-0123"/>
                  <Email>john.doe@example.com</Email>
                </Customer>
              </Profile>
            </ProfileInfo>
          </Profiles>
        </ResGuest>
      </ResGuests>
      <ResGlobalInfo>
        <Total AmountAfterTax="300.00" CurrencyCode="USD"/>
        <HotelReservationIDs>
          <HotelReservationID ResID_Type="14" ResID_Value="BK123456789"/>
        </HotelReservationIDs>
      </ResGlobalInfo>
    </HotelReservation>
  </HotelReservations>
</OTA_HotelResNotifRQ>
```

#### Reservation Processing Workflow
1. **Receive Notification** - OTA sends reservation XML to PMS endpoint
2. **Validate XML** - Verify XML structure and required fields
3. **Extract Data** - Parse guest, room, and rate information
4. **Check Availability** - Verify room availability in PMS
5. **Create Reservation** - Create reservation record in PMS database
6. **Update Inventory** - Adjust available room count
7. **Send Confirmation** - Return success response to OTA
8. **Notify Staff** - Alert front desk of new OTA booking

#### Confirmation Response Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelResNotifRS 
    xmlns="http://www.opentravel.org/OTA/2003/05"
    EchoToken="OTA12345"
    TimeStamp="2024-01-15T11:00:05Z"
    Version="1.0">
  <Success/>
  <HotelReservations>
    <HotelReservation>
      <UniqueID Type="14" ID="BK123456789"/>
      <ResGlobalInfo>
        <HotelReservationIDs>
          <HotelReservationID ResID_Type="14" ResID_Value="BK123456789"/>
          <HotelReservationID ResID_Type="10" ResID_Value="PMS-RES-001"/>
        </HotelReservationIDs>
      </ResGlobalInfo>
    </HotelReservation>
  </HotelReservations>
</OTA_HotelResNotifRS>
```

### Reservation Modifications

#### Modification Notification
OTAs send modification requests using the same OTA_HotelResNotifRQ structure with:
- `ResStatus="Modified"` attribute
- Original reservation ID reference
- Updated reservation details

#### Modification Processing
1. **Identify Original Reservation** - Match by OTA reservation ID
2. **Validate Changes** - Verify modification is possible
3. **Update Reservation** - Apply changes to PMS reservation
4. **Adjust Inventory** - Update room availability if dates changed
5. **Confirm Modification** - Send success response to OTA
6. **Notify Guest** - Send modification confirmation email

### Reservation Cancellations

#### Cancellation Notification Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<OTA_CancelRQ 
    xmlns="http://www.opentravel.org/OTA/2003/05"
    EchoToken="CANCEL123"
    TimeStamp="2024-01-15T12:00:00Z"
    Version="1.0">
  <POS>
    <Source>
      <RequestorID Type="22" ID="BOOKING_COM"/>
    </Source>
  </POS>
  <UniqueID Type="14" ID="BK123456789"/>
  <CancelType>Cancel</CancelType>
</OTA_CancelRQ>
```

#### Cancellation Processing
1. **Receive Cancellation** - OTA sends cancellation request
2. **Locate Reservation** - Find reservation by OTA ID
3. **Apply Cancellation Policy** - Calculate any penalties
4. **Cancel Reservation** - Update reservation status to cancelled
5. **Release Inventory** - Return room to available inventory
6. **Process Refund** - Handle refund if applicable
7. **Confirm Cancellation** - Send confirmation to OTA
8. **Notify Guest** - Send cancellation confirmation email

## Content Management

### Property Content Updates

#### Descriptive Content Message Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelDescriptiveContentNotifRQ 
    xmlns="http://www.opentravel.org/OTA/2003/05"
    EchoToken="CONTENT123"
    TimeStamp="2024-01-15T13:00:00Z"
    Version="1.0">
  <POS>
    <Source>
      <RequestorID Type="22" ID="HOTEL123"/>
    </Source>
  </POS>
  <HotelDescriptiveContents>
    <HotelDescriptiveContent HotelCode="HOTEL123">
      <HotelInfo>
        <HotelName>Grand Hotel Example</HotelName>
        <CategoryCodes>
          <HotelCategory Code="4"/>
        </CategoryCodes>
        <Descriptions>
          <MultimediaDescriptions>
            <MultimediaDescription>
              <TextItems>
                <TextItem>
                  <Description>Luxury hotel in downtown location</Description>
                </TextItem>
              </TextItems>
            </MultimediaDescription>
          </MultimediaDescriptions>
        </Descriptions>
      </HotelInfo>
      <FacilityInfo>
        <GuestRooms>
          <GuestRoom>
            <TypeRoom RoomTypeCode="DELUXE">
              <RoomDescription>
                <Text>Spacious deluxe room with city view</Text>
              </RoomDescription>
            </TypeRoom>
          </GuestRoom>
        </GuestRooms>
      </FacilityInfo>
      <Policies>
        <Policy>
          <CheckInTime>15:00:00</CheckInTime>
          <CheckOutTime>11:00:00</CheckOutTime>
        </Policy>
      </Policies>
    </HotelDescriptiveContent>
  </HotelDescriptiveContents>
</OTA_HotelDescriptiveContentNotifRQ>
```

### Image Management

#### Image Upload Process
1. **Prepare Images** - Optimize images for OTA requirements
2. **Upload to CDN** - Store images on accessible CDN
3. **Build Image URLs** - Generate public image URLs
4. **Send Content Update** - Include image URLs in content message
5. **Verify Display** - Confirm images appear on OTA platform

## Error Handling

### Common Error Scenarios

#### Authentication Errors
```xml
<OTA_HotelResNotifRS>
  <Errors>
    <Error Type="6" Code="392">
      Authentication failed - Invalid credentials
    </Error>
  </Errors>
</OTA_HotelResNotifRS>
```

**Resolution**: Verify API credentials and authentication method

#### Validation Errors
```xml
<OTA_HotelResNotifRS>
  <Errors>
    <Error Type="3" Code="385">
      Invalid room type code: INVALID_CODE
    </Error>
  </Errors>
</OTA_HotelResNotifRS>
```

**Resolution**: Verify room type mapping between PMS and OTA

#### Availability Errors
```xml
<OTA_HotelResNotifRS>
  <Errors>
    <Error Type="4" Code="424">
      No availability for requested dates
    </Error>
  </Errors>
</OTA_HotelResNotifRS>
```

**Resolution**: Check inventory levels and update availability

### Error Recovery Strategies

#### Retry Logic
- **Transient Errors**: Retry with exponential backoff
- **Max Retries**: Limit to 3 retry attempts
- **Backoff Schedule**: 1s, 5s, 15s intervals

#### Error Logging
```javascript
{
  "timestamp": "2024-01-15T14:00:00Z",
  "ota_platform": "booking_com",
  "message_type": "OTA_HotelRateAmountNotifRQ",
  "error_code": "385",
  "error_message": "Invalid room type code",
  "request_payload": "...",
  "response_payload": "...",
  "retry_count": 1
}
```

#### Manual Intervention
For persistent errors:
1. **Alert Operations Team** - Send notification of repeated failures
2. **Queue for Review** - Store failed messages for manual processing
3. **Provide Tools** - Admin interface to retry failed updates
4. **Document Resolution** - Record fix for future reference

## Configuration

### OTA Connection Settings

#### Configuration Structure
```javascript
{
  "ota_integrations": {
    "booking_com": {
      "enabled": true,
      "endpoint_url": "https://supply-xml.booking.com/hotels/xml/",
      "hotel_id": "HOTEL123",
      "username": "api_user",
      "password": "encrypted_password",
      "timeout_seconds": 30,
      "retry_attempts": 3,
      "sync_interval_minutes": 15
    },
    "expedia": {
      "enabled": true,
      "endpoint_url": "https://services.expediapartnercentral.com/eqc/ar",
      "hotel_id": "12345",
      "username": "eqc_user",
      "password": "encrypted_password",
      "timeout_seconds": 30,
      "retry_attempts": 3,
      "sync_interval_minutes": 15
    }
  }
}
```

### Room Type Mapping

#### Mapping Configuration
```javascript
{
  "room_type_mappings": {
    "booking_com": {
      "1": "STANDARD",
      "2": "DELUXE",
      "3": "SUITE"
    },
    "expedia": {
      "STD": "STANDARD",
      "DLX": "DELUXE",
      "STE": "SUITE"
    }
  }
}
```

### Rate Plan Mapping

#### Rate Plan Configuration
```javascript
{
  "rate_plan_mappings": {
    "booking_com": {
      "BAR": "Best Available Rate",
      "NRF": "Non-Refundable",
      "ADV": "Advance Purchase"
    },
    "expedia": {
      "BAR": "Standard Rate",
      "NRFN": "Non-Refundable",
      "ADVP": "Advance Purchase"
    }
  }
}
```

## Testing

### Sandbox Environments

#### Booking.com Test Environment
- **Endpoint**: `https://supply-xml.booking.com/hotels/xml/test`
- **Test Hotel ID**: Provided by Booking.com
- **Test Credentials**: Separate test account credentials

#### Expedia Test Environment
- **Endpoint**: `https://test-services.expediapartnercentral.com/eqc/ar`
- **Test Hotel ID**: Provided by Expedia
- **Test Credentials**: Separate test account credentials

### Test Scenarios

#### Rate Update Testing
1. Update rate in PMS
2. Verify XML message generation
3. Send to OTA test endpoint
4. Verify successful response
5. Check rate display on OTA test site

#### Reservation Testing
1. Create test booking on OTA platform
2. Verify PMS receives notification
3. Check reservation created in PMS
4. Verify inventory updated
5. Confirm booking confirmation sent

#### Cancellation Testing
1. Cancel test booking on OTA
2. Verify PMS receives cancellation
3. Check reservation status updated
4. Verify inventory released
5. Confirm cancellation processed

## Monitoring and Maintenance

### Health Monitoring

#### Integration Health Checks
- **Connection Status**: Verify OTA endpoint accessibility
- **Authentication Status**: Test credentials validity
- **Message Success Rate**: Track successful vs failed messages
- **Response Times**: Monitor API response times

#### Monitoring Dashboard
```javascript
{
  "ota_health": {
    "booking_com": {
      "status": "healthy",
      "last_successful_sync": "2024-01-15T14:30:00Z",
      "success_rate_24h": 99.5,
      "avg_response_time_ms": 250,
      "failed_messages_24h": 2
    },
    "expedia": {
      "status": "healthy",
      "last_successful_sync": "2024-01-15T14:28:00Z",
      "success_rate_24h": 98.8,
      "avg_response_time_ms": 320,
      "failed_messages_24h": 5
    }
  }
}
```

### Performance Optimization

#### Batch Updates
- Group multiple rate/availability updates into single messages
- Reduce API call frequency
- Improve overall performance

#### Caching Strategy
- Cache OTA responses for duplicate requests
- Reduce unnecessary API calls
- Improve response times

#### Queue Management
- Use message queues for asynchronous processing
- Handle high-volume updates efficiently
- Prevent system overload

## Troubleshooting

See **[Integration Troubleshooting Guide](../troubleshooting.md)** for detailed troubleshooting procedures specific to OTA integrations.

### Quick Troubleshooting Checklist

- [ ] Verify OTA credentials are correct and not expired
- [ ] Check network connectivity to OTA endpoints
- [ ] Validate XML message structure against OTA schema
- [ ] Verify room type and rate plan mappings
- [ ] Check integration logs for error messages
- [ ] Confirm hotel ID matches OTA configuration
- [ ] Test with OTA sandbox environment first
- [ ] Review OTA platform status page for outages

## Related Documentation

- **[Integration Overview](../README.md)** - General integration documentation
- **[Channel Management](channel-management.md)** - Multi-channel distribution
- **[Integration Patterns](../../architecture/integration-patterns.md)** - Integration architecture
- **[API Security](../../api/authentication.md)** - Authentication and security
- **[Troubleshooting](../troubleshooting.md)** - Integration troubleshooting

---

*This guide provides comprehensive information for implementing OTA XML integrations following industry standards and best practices.*
