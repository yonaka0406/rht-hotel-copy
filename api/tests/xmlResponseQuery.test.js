/**
 * XML Response Query Test
 * 
 * This test file demonstrates how to connect to the database and execute a query
 * to fetch XML response data by ID.
 */

const { processXMLResponse } = require('../ota/xmlModel');
const { getPool } = require('../config/database');

// Helper function to process a single response ID
const processResponseById = async (requestId, responseId) => {
    console.log(`\n===== Processing Response ID: ${responseId} =====`);
    
    // Get the raw XML response
    const pool = getPool(requestId);
    const dbResult = await pool.query('SELECT * FROM xml_responses WHERE id = $1', [responseId]);
    const rawXml = dbResult.rows[0]?.response;
    
    if (!rawXml) {
        console.error(`No XML found for ID: ${responseId}`);
        return null;
    }
    
    // Process the XML response
    try {
        const response = await processXMLResponse(requestId, responseId);
        console.log(`Successfully processed response ID: ${responseId}`);
        return response;
    } catch (error) {
        console.error(`Error processing response ID ${responseId}:`, error.message);
        return { error: error.message };
    }
};

// Helper function to extract all XML tags and their values
const extractXmlTags = (xmlString) => {
    const tags = {};
    const tagRegex = /<([^>]+)>([^<]*)<\/\1>/g;
    let match;
    
    while ((match = tagRegex.exec(xmlString)) !== null) {
        const tagName = match[1];
        const value = match[2].trim();
        if (value) {
            if (!tags[tagName]) {
                tags[tagName] = [];
            }
            if (!tags[tagName].includes(value)) {
                tags[tagName].push(value);
            }
        }
    }
    
    return tags;
};

// Function to find unique identifiers in reservation data
const findUniqueIdentifiers = (parsedData) => {
    const identifiers = {};
    
    // Extract potential unique identifiers
    if (parsedData.TransactionType) {
        if (parsedData.TransactionType.DataID) {
            identifiers.transactionId = parsedData.TransactionType.DataID;
        }
        if (parsedData.TransactionType.SystemDate) {
            identifiers.transactionDate = parsedData.TransactionType.SystemDate;
        }
    }
    
    if (parsedData.BasicInformation) {
        const basic = parsedData.BasicInformation;
        if (basic.TravelAgencyBookingNumber) {
            identifiers.bookingNumber = basic.TravelAgencyBookingNumber;
        }
        if (basic.TravelAgencyBookingDate && basic.TravelAgencyBookingTime) {
            identifiers.bookingDateTime = `${basic.TravelAgencyBookingDate} ${basic.TravelAgencyBookingTime}`;
        }
        if (basic.GuestOrGroupNameSingleByte) {
            identifiers.guestName = basic.GuestOrGroupNameSingleByte;
        }
        if (basic.CheckInDate && basic.CheckOutDate) {
            identifiers.stayPeriod = `${basic.CheckInDate} to ${basic.CheckOutDate}`;
        }
    }
    
    return identifiers;
};

// Function to compare two responses with deep XML comparison
const compareResponses = async (requestId, response1, response2) => {
    if (!response1 || !response2) {
        return {
            areEqual: false,
            differences: ['One or both responses are invalid'],
            uniqueIdentifiers: {}
        };
    }
    
    if (response1.error || response2.error) {
        return {
            areEqual: false,
            differences: [
                response1.error ? `Response 1 error: ${response1.error}` : null,
                response2.error ? `Response 2 error: ${response2.error}` : null
            ].filter(Boolean),
            uniqueIdentifiers: {}
        };
    }
    
    const differences = [];
    const keys1 = Object.keys(response1);
    const keys2 = Object.keys(response2);
    const allKeys = new Set([...keys1, ...keys2]);
    
    // Get raw XML for both responses
    const pool = getPool(requestId);
    const [raw1, raw2] = await Promise.all([
        pool.query('SELECT response FROM xml_responses WHERE id = $1', [response1.responseId]),
        pool.query('SELECT response FROM xml_responses WHERE id = $1', [response2.responseId])
    ]);
    
    const xml1 = raw1.rows[0]?.response;
    const xml2 = raw2.rows[0]?.response;
    
    // Extract all tags from both XMLs
    const tags1 = xml1 ? extractXmlTags(xml1) : {};
    const tags2 = xml2 ? extractXmlTags(xml2) : {};
    
    // Compare XML tags
    const allTags = new Set([...Object.keys(tags1), ...Object.keys(tags2)]);
    const xmlDifferences = [];
    
    for (const tag of allTags) {
        if (!tags1[tag] && tags2[tag]) {
            xmlDifferences.push(`Tag '${tag}' exists only in response 2`);
        } else if (tags1[tag] && !tags2[tag]) {
            xmlDifferences.push(`Tag '${tag}' exists only in response 1`);
        } else if (JSON.stringify(tags1[tag]) !== JSON.stringify(tags2[tag])) {
            xmlDifferences.push(`Tag '${tag}' values differ:`);
            xmlDifferences.push(`  Response 1: ${JSON.stringify(tags1[tag])}`);
            xmlDifferences.push(`  Response 2: ${JSON.stringify(tags2[tag])}`);
        }
    }
    
    // Find unique identifiers from parsed data
    const identifiers1 = response1.parsedData ? findUniqueIdentifiers(response1.parsedData) : {};
    const identifiers2 = response2.parsedData ? findUniqueIdentifiers(response2.parsedData) : {};
    
    // Compare high-level fields
    for (const key of allKeys) {
        if (key === 'rawResponse' || key === 'parsedData') continue;
        
        if (!(key in response1)) {
            differences.push(`Field '${key}' exists in response 2 but not in response 1`);
        } else if (!(key in response2)) {
            differences.push(`Field '${key}' exists in response 1 but not in response 2`);
        } else if (JSON.stringify(response1[key]) !== JSON.stringify(response2[key])) {
            differences.push(`Field '${key}' differs:`);
            differences.push(`  Response 1: ${JSON.stringify(response1[key])}`);
            differences.push(`  Response 2: ${JSON.stringify(response2[key])}`);
        }
    }
    
    // Combine all differences
    const allDifferences = [
        ...differences,
        ...xmlDifferences
    ];
    
    return {
        areEqual: allDifferences.length === 0,
        differences: allDifferences,
        uniqueIdentifiers: {
            response1: identifiers1,
            response2: identifiers2
        }
    };
};

const testXMLResponseQuery = async () => {
    const requestId = 'test-xml-query-' + Date.now();
    const responseId1 = 3803; // First response ID to compare
    const responseId2 = 3802; // Second response ID to compare
    
    try {
        console.log(`Starting XML response comparison test...`);
        
        // Process both responses
        const response1 = await processResponseById(requestId, responseId1);
        const response2 = await processResponseById(requestId, responseId2);
        
        // Compare the responses
        console.log('\n===== Comparing Responses =====');
        const comparison = await compareResponses(requestId, response1, response2);
        
        // Display unique identifiers
        console.log('\n===== Unique Identifiers =====');
        console.log('Response 1:');
        console.log(JSON.stringify(comparison.uniqueIdentifiers.response1, null, 2));
        console.log('\nResponse 2:');
        console.log(JSON.stringify(comparison.uniqueIdentifiers.response2, null, 2));
        
        // Display differences
        if (comparison.areEqual) {
            console.log('\nThe responses are identical in all compared aspects');
        } else {
            console.log('\n===== Differences Found =====');
            comparison.differences.forEach((diff, index) => {
                console.log(`${index + 1}. ${diff}`);
            });
            
            // Suggest a unique key based on the data
            const suggestUniqueKey = () => {
                const id1 = comparison.uniqueIdentifiers.response1;
                const id2 = comparison.uniqueIdentifiers.response2;
                
                // Check if transaction ID and booking number match
                if (id1.transactionId && id1.transactionId === id2.transactionId) {
                    return 'transactionId';
                }
                
                // Check if booking number matches
                if (id1.bookingNumber && id1.bookingNumber === id2.bookingNumber) {
                    return 'bookingNumber';
                }
                
                // If we have guest name and stay period, that's a good composite key
                if (id1.guestName && id1.stayPeriod && 
                    id1.guestName === id2.guestName && 
                    id1.stayPeriod === id2.stayPeriod) {
                    return 'guestName + stayPeriod';
                }
                
                return 'No reliable unique identifier found - consider using a composite key';
            };
            
            console.log('\n===== Suggested Unique Key =====');
            console.log(suggestUniqueKey());
        }
        
        console.log('\n===== Test completed successfully =====');
    } catch (error) {
        console.error('Error during test:', error);
        
        // If the error is from processXMLResponse, it might have its own error details
        if (error.response) {
            console.error('Response error details:', error.response);
        }
        
        // Log the full error stack for debugging
        console.error('Error stack:', error.stack);
        
        // Re-throw to fail the test
        throw error;
    } finally {
        // Clean up the test database connection
        const pool = getPool(requestId);
        await pool.end();
    }
};

// Self-executing async function to run the test
(async () => {
    await testXMLResponseQuery();
})();
