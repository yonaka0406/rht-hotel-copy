const { getPool } = require('../config/database');

async function createProject(requestId, projectData, userId) {
    const pool = getPool(requestId); // Pass requestId
    const {
        bid_date,
        order_source,
        project_name,
        project_location,
        target_store,
        budget,
        assigned_work_content,
        specific_specialized_work_applicable = false,
        start_date,
        end_date,
        related_clients // This is an array of objects
    } = projectData;

    // Ensure related_clients is stringified to JSON for JSONB column
    const relatedClientsJson = JSON.stringify(related_clients || []);

    // Explicitly stringify target_store for the JSONB column
    let targetStoreJson;
    if (target_store && Array.isArray(target_store) && target_store.length > 0) {
        try {
            targetStoreJson = JSON.stringify(target_store);
        } catch (jsonError) {
            // Log with requestId if available, or adapt logging
            console.error(`[${requestId}] Invalid JSON structure for target_store:`, jsonError, projectData.target_store);
            throw new Error('Invalid target_store data provided');
        }
    } else if (Array.isArray(target_store) && target_store.length === 0) {
        targetStoreJson = JSON.stringify([]); // Store as empty JSON array '[]'
    } else {
        targetStoreJson = null; // Default to NULL if not a populated array
    }

    const query = `
        INSERT INTO projects (
            bid_date, order_source, project_name, project_location, target_store,
            budget, assigned_work_content, specific_specialized_work_applicable,
            start_date, end_date, related_clients, created_by, updated_by
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        ) RETURNING *;
    `;
    const values = [
        bid_date, order_source, project_name, project_location, targetStoreJson, // Changed from targetStoreValue
        budget, assigned_work_content, specific_specialized_work_applicable,
        start_date, end_date, relatedClientsJson, userId, userId
    ];

    try {
        console.log(`[${requestId}] Creating project: ${project_name} with target_store (stringified): ${targetStoreJson}`);
        const result = await pool.query(query, values);
        console.log(`[${requestId}] Project created successfully: ${result.rows[0].id}`);
        return result.rows[0];
    } catch (error) {
        console.error(`[${requestId}] Error creating project: ${project_name}`, error);
        throw new Error(`Error creating project: ${error.message}`);
    }
}
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
        //console.log(`[${requestId}] Fetching projects for client ID: ${clientId}`);
        const result = await pool.query(query, values);
        //console.log(`[${requestId}] Found ${result.rows.length} projects for client ID: ${clientId}`);
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
    createProject,
    getProjectsByClientId,
    getAllProjects,
    deleteProjectById,
    updateProject // Add new function here
};

async function updateProject(requestId, projectId, projectData, userId) {
    const pool = getPool(requestId);
    const {
        bid_date,
        order_source,
        project_name,
        project_location,
        target_store, // Expected as an array of objects or null
        budget,
        assigned_work_content,
        specific_specialized_work_applicable, // Should have a default if not provided
        start_date,
        end_date,
        related_clients // Expected as an array of objects or null
    } = projectData;

    // Explicitly stringify JSONB fields
    let targetStoreJson;
    if (target_store && Array.isArray(target_store) && target_store.length > 0) {
        targetStoreJson = JSON.stringify(target_store);
    } else if (Array.isArray(target_store) && target_store.length === 0) {
        targetStoreJson = JSON.stringify([]);
    } else {
        targetStoreJson = null;
    }

    const relatedClientsJson = related_clients ? JSON.stringify(related_clients) : JSON.stringify([]);

    const query = `
        UPDATE projects
        SET
            bid_date = $1,
            order_source = $2,
            project_name = $3,
            project_location = $4,
            target_store = $5,
            budget = $6,
            assigned_work_content = $7,
            specific_specialized_work_applicable = $8,
            start_date = $9,
            end_date = $10,
            related_clients = $11,
            updated_by = $12,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $13
        RETURNING *;
    `;
    const values = [
        bid_date, order_source, project_name, project_location, targetStoreJson,
        budget, assigned_work_content,
        specific_specialized_work_applicable === undefined ? false : specific_specialized_work_applicable, // Ensure boolean default
        start_date, end_date, relatedClientsJson,
        userId, projectId
    ];

    try {
        console.log(`[${requestId}] Attempting to update project with ID: ${projectId}`);
        const result = await pool.query(query, values);
        if (result.rowCount === 0) {
            console.warn(`[${requestId}] No project found with ID: ${projectId} to update.`);
            return null; // Or throw an error
        }
        console.log(`[${requestId}] Project updated successfully: ${result.rows[0].id}`);
        return result.rows[0]; // Return the updated project data
    } catch (error) {
        console.error(`[${requestId}] Error updating project with ID: ${projectId}`, error);
        throw new Error(`Error updating project: ${error.message}`);
    }
}

async function deleteProjectById(requestId, projectId) {
    const pool = getPool(requestId);
    const query = `
        DELETE FROM projects
        WHERE id = $1
        RETURNING *;
    `;
    // RETURNING * is optional, but useful to confirm what was deleted or if anything was deleted.
    // If not needed, it can be just DELETE FROM projects WHERE id = $1;
    const values = [projectId];

    try {
        console.log(`[${requestId}] Attempting to delete project with ID: ${projectId}`);
        const result = await pool.query(query, values);
        if (result.rowCount === 0) {
            // No project was deleted, likely because the ID was not found.
            console.warn(`[${requestId}] No project found with ID: ${projectId} to delete.`);
            return null; // Or throw an error: throw new Error('Project not found');
        }
        console.log(`[${requestId}] Project deleted successfully: ${result.rows[0].id}`);
        return result.rows[0]; // Return the deleted project data
    } catch (error) {
        console.error(`[${requestId}] Error deleting project with ID: ${projectId}`, error);
        throw new Error(`Error deleting project: ${error.message}`);
    }
}
