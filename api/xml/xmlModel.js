require("dotenv").config();
const { getPool } = require("../config/database");

/*
Add to .env
XML_SYSTEM_ID=XXXXXXXX
XML_USER_ID=P2823341
XML_PASSWORD=g?Z+yy5U5!LR
XML_REQUEST_URL=https://www.tl-lincoln.net/pmsservice/V1/
*/

const selectXMLNetStockSearchService = async (requestId, params) => {
    try {
        const pool = getPool(requestId);
        const { extractionProcedure, searchFrom, searchTo } = params;

        const result = await pool.query(
            "SELECT template FROM xml_templates WHERE name = $1",
            ["NetStockSearchService"]
        );

        if (result.rows.length === 0) {
            throw new Error("XML template not found in database.");
        }

        let xml = result.rows[0].template;

        // Validate environment variables
        if (!process.env.XML_SYSTEM_ID || !process.env.XML_USER_ID || !process.env.XML_PASSWORD) {
            throw new Error("Missing required environment variables in .env file.");
        }

        // Replace placeholders
        xml = xml.replace("{{systemId}}", process.env.XML_SYSTEM_ID)
                 .replace("{{pmsUserId}}", process.env.XML_USER_ID)
                 .replace("{{pmsPassword}}", process.env.XML_PASSWORD)
                 .replace("{{extractionProcedure}}", extractionProcedure)
                 .replace("{{searchDurationFrom}}", searchFrom)
                 .replace("{{searchDurationTo}}", searchTo);

        return xml;
    } catch (error) {
        console.error("Error selecting XML template:", error.message);
        throw error; // Rethrow to be handled by the caller
    }
};

module.exports = { 
    selectXMLNetStockSearchService 
};
