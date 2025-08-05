const { getPool } = require('../config/database');
const { parseXMLResponse } = require('../ota/xmlController');

/**
 * Process a response by ID and return the parsed data
 */
const processResponseById = async (requestId, responseId, pool) => {
    console.log(`\n===== Processing Response ID: ${responseId} =====`);
    
    // Get the raw XML response using the provided pool
    if (!pool) {
        throw new Error('Database pool is required');
    }
    const dbResult = await pool.query('SELECT * FROM xml_responses WHERE id = $1', [responseId]);
    const row = dbResult.rows[0];
    
    if (!row) {
        console.error(`No record found for ID: ${responseId}`);
        return null;
    }
    
    // Return the full response data
    return {
        ...row,
        xml_response: row.response,
        parsedData: await parseXMLResponse(row.response)
    };
};

/**
 * Helper function to simulate a delay
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    processResponseById,
    delay
};
