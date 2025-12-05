const { getPool } = require('../../config/database');

async function insertProject(requestId, projectData, userId, dbClient = null) {
    const pool = dbClient || getPool(requestId);
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

async function updateProject(requestId, projectId, projectData, userId, dbClient = null) {
    const pool = dbClient || getPool(requestId);
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
};

async function deleteProjectById(requestId, projectId, dbClient = null) {
    const pool = dbClient || getPool(requestId);
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
};

module.exports = {
    insertProject,
    updateProject,
    deleteProjectById
};
