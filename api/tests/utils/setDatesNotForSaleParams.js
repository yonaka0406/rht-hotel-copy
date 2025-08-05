/**
 * setDatesNotForSale Parameter Test
 * 
 * Logs parameters that would be passed to setDatesNotForSale
 */

const { Pool } = require('pg');
require('dotenv').config();

// Create a database pool
const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT
});

// Helper function to format date to YYYYMMDD
function formatYYYYMMDD(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return null;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

async function logSetDatesNotForSaleParams() {
    console.log('Starting setDatesNotForSale parameter test with real database data...');
    
    const hotelId = 10;
    const requestId = `test-${Date.now()}`;
    let client;

    try {
        // Get a client from the pool
        client = await pool.connect();
        
        // Query the ota_reservation_queue table for recent entries
        const { rows: queueEntries } = await client.query(`
            SELECT * FROM ota_reservation_queue 
            WHERE reservation_data IS NOT NULL
            AND reservation_data->'RisaplsInformation'->'RisaplsCommonInformation'->'RoomAndRoomRateInformation' IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 5
        `);

        if (queueEntries.length === 0) {
            console.warn('No valid queue entries found with RoomAndRoomRateInformation');
            return;
        }

        console.log(`Found ${queueEntries.length} queue entries to test`);

        // Collect all unique room type group codes and date ranges
        const allRoomTypeGroupCodes = new Set();
        const allDateRanges = [];

        // First pass: collect all room type group codes and date ranges
        for (const [index, entry] of queueEntries.entries()) {
            console.log(`\n--- Processing Queue Entry ${index + 1}/${queueEntries.length} ---`);
            console.log(`Reservation ID: ${entry.id || 'undefined'}`);
            console.log(`Status: ${entry.status || 'undefined'}`);
            
            try {
                const { reservation_data } = entry;
                
                if (!reservation_data) {
                    console.log('Skipping - No reservation_data found');
                    continue;
                }
                
                if (!reservation_data.BasicInformation) {
                    console.log('Skipping - Missing BasicInformation in reservation_data');
                    continue;
                }
                
                const roomAndRateInfo = reservation_data.RisaplsInformation?.RisaplsCommonInformation?.RoomAndRoomRateInformation;
                if (!roomAndRateInfo) {
                    console.log('Skipping - Missing or invalid RoomAndRoomRateInformation in reservation_data');
                    continue;
                }
                
                // Extract room type group codes
                let netRmTypeGroupCodes = [];
                if (Array.isArray(roomAndRateInfo)) {
                    netRmTypeGroupCodes = roomAndRateInfo.map(item => item.RoomInformation?.NetRmTypeGroupCode);
                } else if (typeof roomAndRateInfo === 'object' && roomAndRateInfo !== null) {
                    netRmTypeGroupCodes = Object.values(roomAndRateInfo).map(item => item.RoomInformation?.NetRmTypeGroupCode);
                }
                
                // Add unique room type group codes to the set
                netRmTypeGroupCodes.filter(Boolean).forEach(code => allRoomTypeGroupCodes.add(code));
                
                // Add date range to our collection
                const { CheckInDate: checkIn, CheckOutDate: checkOut } = reservation_data.BasicInformation;
                if (checkIn && checkOut) {
                    allDateRanges.push({ checkIn, checkOut });
                    console.log(`Added date range: ${checkIn} to ${checkOut}`);
                }
            } catch (error) {
                console.error(`❌ Error processing queue entry ${index + 1}:`, error);
            }
        }

        // Process all collected data
        const uniqueRoomTypeGroupCodes = Array.from(allRoomTypeGroupCodes);
        
        console.log('\n=== Processing All Queue Entries ===');
        console.log(`Found ${allDateRanges.length} valid date ranges`);
        console.log(`Found ${uniqueRoomTypeGroupCodes.length} unique room type group codes:`, uniqueRoomTypeGroupCodes);
        
        if (allDateRanges.length === 0 || uniqueRoomTypeGroupCodes.length === 0) {
            console.log('No valid date ranges or room type group codes found');
            return;
        }
        
        // Process dates using the same logic as production
        const allDates = new Set();
        console.log('\nProcessing date ranges:');
        
        allDateRanges.forEach(({ checkIn, checkOut }, index) => {
            console.log(`\n[${index + 1}] Processing range: ${checkIn} to ${checkOut}`);
            
            try {
                // Convert to YYYYMMDD format if needed
                const formatDate = (dateStr) => {
                    if (!dateStr) return null;
                    // If already in YYYYMMDD format
                    if (/^\d{8}$/.test(dateStr)) return dateStr;
                    // Convert from YYYY-MM-DD to YYYYMMDD
                    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                        return dateStr.replace(/-/g, '');
                    }
                    throw new Error(`Invalid date format: ${dateStr}`);
                };
                
                const startDateStr = formatDate(checkIn);
                const endDateStr = formatDate(checkOut);
                
                if (!startDateStr || !endDateStr) {
                    console.log(`  - Skipping: Invalid date format (${checkIn} - ${checkOut})`);
                    return;
                }
                
                console.log(`  - Formatted dates: ${startDateStr} to ${endDateStr}`);
                
                // Parse dates
                const parseDate = (dateStr) => {
                    const year = parseInt(dateStr.slice(0, 4));
                    const month = parseInt(dateStr.slice(4, 6)) - 1; // 0-based month
                    const day = parseInt(dateStr.slice(6, 8));
                    return new Date(year, month, day);
                };
                
                const startDate = parseDate(startDateStr);
                const endDate = parseDate(endDateStr);
                
                console.log(`  - Parsed dates: ${startDate.toISOString()} to ${endDate.toISOString()}`);
                
                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                    console.error('  - Invalid date range:', { checkIn, checkOut, startDate, endDate });
                    return;
                }
                
                // Create a new date object for iteration to avoid modifying the original
                const currentDate = new Date(startDate);
                let dateCount = 0;
                
                while (currentDate < endDate) {
                    const saleDate = `${currentDate.getFullYear()}` +
                        `${(currentDate.getMonth() + 1).toString().padStart(2, '0')}` +
                        `${currentDate.getDate().toString().padStart(2, '0')}`;
                    allDates.add(saleDate);
                    dateCount++;
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                
                console.log(`  - Added ${dateCount} dates to the set`);
                
            } catch (error) {
                console.error(`  - Error processing date range:`, error);
            }
        });
        
        const uniqueDates = Array.from(allDates).sort();
        console.log(`\nFound ${uniqueDates.length} unique dates across all reservations`);
        if (uniqueDates.length > 0) {
            console.log('Date range:', `${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]}`);
            console.log('All dates:', uniqueDates);
        }
        
        // Generate inventory updates using the same logic as production
        const inventoryToUpdate = [];
        if (uniqueDates.length > 0 && uniqueRoomTypeGroupCodes.length > 0) {
            for (const saleDate of uniqueDates) {
                for (const groupCode of uniqueRoomTypeGroupCodes) {
                    inventoryToUpdate.push({
                        saleDate: saleDate,
                        netRmTypeGroupCode: groupCode
                    });
                }
            }
        }
        
        console.log(`\nGenerated ${inventoryToUpdate.length} total inventory updates`);
        
        // Log what would be passed to setDatesNotForSale
        console.log('\nWould call setDatesNotForSale with:');
        console.log('Request object:', {
            requestId,
            logger: { info: '[Function]', error: '[Function]', warn: '[Function]' }
        });
        console.log('Response object: null (mock)');
        console.log('Hotel ID:', hotelId);
        console.log('Inventory to update (first 10 items):', JSON.stringify(inventoryToUpdate.slice(0, 10), null, 2));
        if (inventoryToUpdate.length > 10) {
            console.log(`...and ${inventoryToUpdate.length - 10} more items`);
        }
        
        } catch (error) {
            console.error('Test failed:', error);
            throw error;
        } finally {
            // Release the client back to the pool
            if (client) {
                client.release();
            }
        }
}

// Run the test
console.log('Starting setDatesNotForSale parameter test...');
logSetDatesNotForSaleParams()
    .then(() => {
        console.log('Test completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
