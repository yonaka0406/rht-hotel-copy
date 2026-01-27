-- OTA / Site Controller Related Tables

CREATE TABLE sc_user_info (
    hotel_id INT NOT NULL REFERENCES hotels(id),
    name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    password TEXT NOT NULL,
    PRIMARY KEY (hotel_id, name)
);

CREATE TABLE sc_tl_rooms (
   hotel_id INT NOT NULL REFERENCES hotels(id),
   room_type_id INT NULL,
   rmTypeCode TEXT NOT NULL,
   rmTypeName TEXT,
   netRmTypeGroupCode TEXT NOT NULL,
   netRmTypeGroupName TEXT,
   agtCode TEXT,
   netAgtRmTypeCode TEXT,
   netAgtRmTypeName TEXT,
   isStockAdjustable TEXT,
   lincolnUseFlag TEXT,
   FOREIGN KEY (room_type_id, hotel_id) REFERENCES room_types(id, hotel_id)
);

CREATE TABLE sc_tl_plans (
   hotel_id INT NOT NULL REFERENCES hotels(id),
   plans_global_id INT REFERENCES plans_global(id),
   plans_hotel_id INT,
   plan_key TEXT NOT NULL,
   planGroupCode TEXT NOT NULL,
   planGroupName TEXT NOT NULL,
   FOREIGN KEY (plans_hotel_id, hotel_id) REFERENCES plans_hotel(id, hotel_id)
);

CREATE TABLE xml_templates (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    template XML NOT NULL
);

INSERT INTO xml_templates (name, template) VALUES
('NetRoomTypeMasterSearchService',
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc1002.pmsfc10.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <extractionCondition>
               <extractionProcedureCode>{{extractionProcedureCode}}</extractionProcedureCode>
            </extractionCondition>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('NetStockSearchService',
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc2002.pmsfc20.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <extractionCondition>
               <extractionProcedure>{{extractionProcedure}}</extractionProcedure>
               <searchDurationFrom>{{searchDurationFrom}}</searchDurationFrom>
               <searchDurationTo>{{searchDurationTo}}</searchDurationTo>
            </extractionCondition>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('NetStockAdjustmentService',
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc3002.pmsfc30.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <adjustmentTarget>
               <adjustmentProcedureCode>{{adjustmentProcedureCode}}</adjustmentProcedureCode>
               <netRmTypeGroupCode>{{netRmTypeGroupCode}}</netRmTypeGroupCode>
               <adjustmentDate>{{adjustmentDate}}</adjustmentDate>
               <remainingCount>{{remainingCount}}</remainingCount>
               <salesStatus>{{salesStatus}}</salesStatus>
               <requestId>{{requestId}}</requestId>
            </adjustmentTarget>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('NetStockAdjustmentResponseResendService',
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc3004.pmsfc30.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <resendTarget>
               <requestId>{{requestId}}</requestId>
            </resendTarget>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('NetPlanMasterSearchR2Service',
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc1005.pmsfc10.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <extractionCondition>
               <extractionProcedureCode>{{extractionProcedureCode}}</extractionProcedureCode>
            </extractionCondition>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('NetPriceAdjustmentService',
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc4001.pmsfc40.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <adjustmentTarget>
               <adjustmentProcedureCode>{{adjustmentProcedureCode}}</adjustmentProcedureCode>
               <planGroupCode>{{planGroupCode}}</planGroupCode>
               <adjustmentDate>{{adjustmentDate}}</adjustmentDate>
               <priceRange1>{{priceRange1}}</priceRange1>
               <salesStatus>{{salesStatus}}</salesStatus>
               <requestId>{{requestId}}</requestId>
            </adjustmentTarget>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('NetPriceAdjustmentResponseResendService',
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc4002.pmsfc40.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <resendTarget>
               <requestId>{{requestId}}</requestId>
            </resendTarget>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('BookingInfoOutputService',
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc5001.pmsfc50.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <outputTarget>
               <systemCode>1</systemCode>
            </outputTarget>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('OutputCompleteService',
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc5002.pmsfc50.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <outputTarget>
               <systemCode>1</systemCode>
               <outputId>{{outputId}}</outputId>
            </outputTarget>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('PlanSaleSituationSearchService',
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc6001.pmsfc60.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <extractionCondition>
               <extractionProcedureCode>{{extractionProcedureCode}}</extractionProcedureCode>
               <searchDurationFrom>{{searchDurationFrom}}</searchDurationFrom>
               <searchDurationTo>{{searchDurationTo}}</searchDurationTo>
               <planGroupCode>{{planGroupCode}}</planGroupCode>
            </extractionCondition>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('NetStockBulkAdjustmentService',
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc3005.pmsfc30.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <adjustmentTarget>
               <adjustmentProcedureCode>{{adjustmentProcedureCode}}</adjustmentProcedureCode>
               <netRmTypeGroupCode>{{netRmTypeGroupCode}}</netRmTypeGroupCode>
               <adjustmentDate>{{adjustmentDate}}</adjustmentDate>
               <remainingCount>{{remainingCount}}</remainingCount>
               <salesStatus>{{salesStatus}}</salesStatus>
            </adjustmentTarget>
            <adjustmentTarget>
               <adjustmentProcedureCode>{{adjustmentProcedureCode2}}</adjustmentProcedureCode>
               <netRmTypeGroupCode>{{netRmTypeGroupCode2}}</netRmTypeGroupCode>
               <adjustmentDate>{{adjustmentDate2}}</adjustmentDate>
               <remainingCount>{{remainingCount2}}</remainingCount>
               <salesStatus>{{salesStatus2}}</salesStatus>
            </adjustmentTarget>
            <requestId>{{requestId}}</requestId>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('NetStockBulkAdjustmentResponseResendService',
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc3006.pmsfc30.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <resendTarget>
               <requestId>{{requestId}}</requestId>
            </resendTarget>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('NetPriceBulkAdjustmentService',
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc4003.pmsfc40.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <adjustmentTarget>
               <adjustmentProcedureCode>{{adjustmentProcedureCode}}</adjustmentProcedureCode>
               <planGroupCode>{{planGroupCode}}</planGroupCode>
               <adjustmentDate>{{adjustmentDate}}</adjustmentDate>
               <priceRange1>{{priceRange1}}</priceRange1>
               <salesStatus>{{salesStatus}}</salesStatus>
            </adjustmentTarget>
            <adjustmentTarget>
               <adjustmentProcedureCode>{{adjustmentProcedureCode_2}}</adjustmentProcedureCode>
               <planGroupCode>{{planGroupCode_2}}</planGroupCode>
               <adjustmentDate>{{adjustmentDate_2}}</adjustmentDate>
               <priceRange1>{{priceRange1_2}}</priceRange1>
               <salesStatus>{{salesStatus_2}}</salesStatus>
            </adjustmentTarget>
            <requestId>{{requestId}}</requestId>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('NetPriceBulkAdjustmentResponseResendService',
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc4004.pmsfc40.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <resendTarget>
               <requestId>{{requestId}}</requestId>
            </resendTarget>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('NetRestrictionAdjustmentService',
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc4011.pmsfc40.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <adjustmentTarget>
               <adjustmentProcedureCode>{{adjustmentProcedureCode}}</adjustmentProcedureCode>
               <planGroupCode>{{planGroupCode}}</planGroupCode>
               <adjustmentDate>{{adjustmentDate}}</adjustmentDate>
               <minLOS>{{minLOS}}</minLOS>
               <maxLOS>{{maxLOS}}</maxLOS>
               <cta>{{cta}}</cta>
               <ctd>{{ctd}}</ctd>
            </adjustmentTarget>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('NetRestrictionBulkAdjustmentService',
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc4013.pmsfc40.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <adjustmentTarget>
               <adjustmentProcedureCode>{{adjustmentProcedureCode1}}</adjustmentProcedureCode>
               <planGroupCode>{{planGroupCode1}}</planGroupCode>
               <adjustmentDate>{{adjustmentDate1}}</adjustmentDate>
               <minLOS>{{minLOS1}}</minLOS>
               <maxLOS>{{maxLOS1}}</maxLOS>
               <cta>{{cta1}}</cta>
               <ctd>{{ctd1}}</ctd>
            </adjustmentTarget>
            <adjustmentTarget>
               <adjustmentProcedureCode>{{adjustmentProcedureCode2}}</adjustmentProcedureCode>
               <planGroupCode>{{planGroupCode2}}</planGroupCode>
               <adjustmentDate>{{adjustmentDate2}}</adjustmentDate>
               <minLOS>{{minLOS2}}</minLOS>
               <maxLOS>{{maxLOS2}}</maxLOS>
               <cta>{{cta2}}</cta>
               <ctd>{{ctd2}}</ctd>
            </adjustmentTarget>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('RestrictionSearchService',
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc6011.pmsfc60.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <extractionCondition>
               <extractionProcedureCode>{{extractionProcedureCode}}</extractionProcedureCode>
               <searchDurationFrom>{{searchDurationFrom}}</searchDurationFrom>
               <searchDurationTo>{{searchDurationTo}}</searchDurationTo>
               <planGroupCode>{{planGroupCode}}</planGroupCode>
            </extractionCondition>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>');

CREATE TABLE xml_requests (
   id SERIAL,
   hotel_id INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
   name TEXT NOT NULL,
   sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   request XML NOT NULL,
   PRIMARY KEY (id, hotel_id)
) PARTITION BY LIST (hotel_id);

CREATE TABLE xml_responses (
   id SERIAL,
   hotel_id INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
   name TEXT NOT NULL,
   received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   response XML NOT NULL,
   PRIMARY KEY (id, hotel_id)
) PARTITION BY LIST (hotel_id);

CREATE TABLE ota_reservation_queue (
   id SERIAL PRIMARY KEY,
   hotel_id INTEGER NOT NULL,
   ota_reservation_id VARCHAR(255) NOT NULL,
   transaction_id VARCHAR(255) NOT NULL, -- Unique transaction ID from OTA
   reservation_data JSONB NOT NULL,
   status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processed, failed
   conflict_details JSONB,
   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
   CONSTRAINT uq_ota_transaction UNIQUE (hotel_id, transaction_id)
);

-- Index for faster lookups by transaction_id
CREATE INDEX idx_ota_reservation_transaction ON ota_reservation_queue (hotel_id, transaction_id);

-- Index for querying by status
CREATE INDEX idx_ota_reservation_status ON ota_reservation_queue (status);

-- Grant permissions on the sequence to the application user
GRANT USAGE, SELECT ON SEQUENCE ota_reservation_queue_id_seq TO application_user;

-- OTA XML Queue for asynchronous processing
CREATE TABLE IF NOT EXISTS ota_xml_queue (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER NOT NULL,
    service_name VARCHAR(255) NOT NULL,
    xml_body TEXT NOT NULL,
    current_request_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    retries INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_ota_xml_queue_hotel_id FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

COMMENT ON TABLE ota_xml_queue IS 'Queue for asynchronous OTA XML requests to handle rate limits.';
COMMENT ON COLUMN ota_xml_queue.hotel_id IS 'The ID of the hotel associated with the request.';
COMMENT ON COLUMN ota_xml_queue.service_name IS 'The name of the OTA service being called (e.g., NetStockBulkAdjustmentService).';
COMMENT ON COLUMN ota_xml_queue.xml_body IS 'The full XML payload to be sent to the OTA service.';
COMMENT ON COLUMN ota_xml_queue.current_request_id IS 'Our internal request ID for tracking purposes.';
COMMENT ON COLUMN ota_xml_queue.status IS 'Current status of the queue item (pending, processing, completed, failed).';
COMMENT ON COLUMN ota_xml_queue.retries IS 'Number of times the request has been retried.';
COMMENT ON COLUMN ota_xml_queue.last_error IS 'Details of the last error encountered during processing.';
COMMENT ON COLUMN ota_xml_queue.created_at IS 'Timestamp when the request was added to the queue.';
COMMENT ON COLUMN ota_xml_queue.processed_at IS 'Timestamp when the request was last processed or completed.';

-- Create a partial index for active statuses
CREATE INDEX idx_ota_xml_queue_active_status_created_at ON ota_xml_queue (status, created_at) WHERE status IN ('pending', 'processing');

-- Create a composite index on (hotel_id, status)
CREATE INDEX idx_ota_xml_queue_hotel_status ON ota_xml_queue (hotel_id, status);
