const { getPool } = require('../../config/database');

async function getProjectsByClientId(requestId, clientId) {
    const pool = getPool(requestId); // Pass requestId
    // Using EXISTS with jsonb_array_elements is a common way to check for an element in a JSON array of objects.
    // The clientId in the JSON is assumed to be stored as a string, matching the typical UUID representation.
    // If clientId in the JSON is a UUID type, the cast might need to be to UUID.
    const query = `
        SELECT * FROM projects
        WHERE EXISTS (
            SELECT 1
            FROM jsonb_array_elements(related_clients) AS elem
            WHERE elem->>'clientId' = $1::text
        );
    `;
    const values = [clientId];

    try {
        console.log(`[${requestId}] Fetching projects for client ID: ${clientId}`);
        const result = await pool.query(query, values);
        console.log(`[${requestId}] Found ${result.rows.length} projects for client ID: ${clientId}`);
        return result.rows;
    } catch (error) {
        console.error(`[${requestId}] Error fetching projects for client ID: ${clientId}`, error);
        throw new Error(`Error fetching projects by client ID: ${error.message}`);
    }
}
async function getAllProjects(requestId, { limit = 10, offset = 0, searchTerm = '', filters = {} }) {
    const pool = getPool(requestId); // Pass requestId to getPool
    let queryParams = [];
    let countQueryParams = [];
    let paramIndex = 1;

    let baseQuery = `SELECT * FROM projects`;
    let countBaseQuery = `SELECT COUNT(*) FROM projects`;
    let whereClauses = [];

    if (searchTerm) {
        whereClauses.push(`project_name ILIKE $${paramIndex}`);
        queryParams.push(`%${searchTerm}%`);
        countQueryParams.push(`%${searchTerm}%`);
        paramIndex++;
    }

    // Example filter: specificSpecializedWorkApplicable
    if (filters.specificSpecializedWorkApplicable !== undefined && typeof filters.specificSpecializedWorkApplicable === 'boolean') {
        whereClauses.push(`specific_specialized_work_applicable = $${paramIndex}`);
        queryParams.push(filters.specificSpecializedWorkApplicable);
        countQueryParams.push(filters.specificSpecializedWorkApplicable);
        paramIndex++;
    }
    
    // Add more filters here as needed based on the 'filters' object
    // e.g., if (filters.orderSource) { ... }
    // e.g., if (filters.minBudget) { ... }


    if (whereClauses.length > 0) {
        const whereString = ` WHERE ${whereClauses.join(' AND ')}`;
        baseQuery += whereString;
        countBaseQuery += whereString;
    }

    // Add ordering
    baseQuery += ` ORDER BY project_name ASC`; // Default ordering

    // Add pagination to the main query
    baseQuery += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);
    
    try {
        console.log(`[${requestId}] Fetching all projects with limit: ${limit}, offset: ${offset}, searchTerm: '${searchTerm}', filters: ${JSON.stringify(filters)}`);
        
        const projectsResult = await pool.query(baseQuery, queryParams);
        const totalCountResult = await pool.query(countBaseQuery, countQueryParams);
        
        const response = {
            projects: projectsResult.rows,
            totalCount: parseInt(totalCountResult.rows[0].count, 10)
        };
        
        console.log(`[${requestId}] Found ${response.totalCount} total projects, returning ${response.projects.length}`);
        return response;

    } catch (error) {
        console.error(`[${requestId}] Error fetching all projects:`, error);
        throw new Error(`Error fetching all projects: ${error.message}`);
    }
}

module.exports = {
    getProjectsByClientId,
    getAllProjects,
};