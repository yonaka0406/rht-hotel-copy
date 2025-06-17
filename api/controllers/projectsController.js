const projectsModel = require('../models/projects');

async function handleCreateProject(req, res) {
    const { requestId } = req;
    const projectData = req.body;
    const userId = req.user?.id;

    if (!userId) {
        console.warn(`[${requestId}] Unauthorized attempt to create project: No user ID found.`);
        return res.status(401).json({ message: 'Unauthorized: User ID not found.' });
    }

    if (!projectData || Object.keys(projectData).length === 0) {
        console.warn(`[${requestId}] Invalid project creation attempt: Project data is missing or empty.`);
        return res.status(400).json({ message: 'Bad Request: Project data is required.' });
    }
    
    // Basic validation for project_name as it's a NOT NULL field
    if (!projectData.project_name) {
        console.warn(`[${requestId}] Invalid project creation attempt: Project name is missing.`);
        return res.status(400).json({ message: 'Bad Request: Project name is required.' });
    }

    try {
        console.log(`[${requestId}] Processing create project request for user: ${userId}`);
        const newProject = await projectsModel.createProject(requestId, projectData, userId);
        console.log(`[${requestId}] Project created successfully with ID: ${newProject.id}`);
        res.status(201).json(newProject);
    } catch (error) {
        console.error(`[${requestId}] Error in handleCreateProject for user ${userId}:`, error);
        if (error.message.includes('already exists')) { // Example of specific error handling
            return res.status(409).json({ message: `Conflict: ${error.message}` });
        }
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}

async function handleGetClientProjects(req, res) {
    const { requestId } = req;
    const { clientId } = req.params;

    if (!clientId) {
        console.warn(`[${requestId}] Invalid get client projects attempt: Client ID is missing.`);
        return res.status(400).json({ message: 'Bad Request: Client ID parameter is required.' });
    }

    try {
        console.log(`[${requestId}] Processing get projects for client ID: ${clientId}`);
        const projects = await projectsModel.getProjectsByClientId(requestId, clientId);
                        
        console.log(`[${requestId}] Successfully fetched ${projects.length} projects for client ID: ${clientId}`);
        res.status(200).json(projects);
    } catch (error) {
        console.error(`[${requestId}] Error in handleGetClientProjects for client ID ${clientId}:`, error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}

async function handleGetAllProjects(req, res) {
    const { requestId } = req;
    const { 
        page = 1, 
        limit = 10, 
        searchTerm = '',         
        specificSpecializedWorkApplicable 
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const parsedLimit = parseInt(limit, 10);

    // Construct filters object
    const filters = {};
    if (specificSpecializedWorkApplicable !== undefined) {
        filters.specificSpecializedWorkApplicable = (specificSpecializedWorkApplicable === 'true');
    }    

    try {
        console.log(`[${requestId}] Processing get all projects request. Page: ${page}, Limit: ${parsedLimit}, Offset: ${offset}, SearchTerm: '${searchTerm}', Filters: ${JSON.stringify(filters)}`);
        const result = await projectsModel.getAllProjects(requestId, { 
            limit: parsedLimit, 
            offset, 
            searchTerm, 
            filters 
        });

        res.status(200).json({
            projects: result.projects,
            totalItems: result.totalCount,
            totalPages: Math.ceil(result.totalCount / parsedLimit),
            currentPage: parseInt(page, 10),
        });
    } catch (error) {
        console.error(`[${requestId}] Error in handleGetAllProjects:`, error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}

// Add this function with other handlers
const handleDeleteProject = async (req, res) => {
    const { projectId } = req.params;
    const requestId = req.requestId; // Assuming requestId is available on req

    try {
        const deletedProject = await projectsModel.deleteProjectById(requestId, projectId);

        if (!deletedProject) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Successfully deleted
        // Option 1: Send back the deleted project data
        // res.status(200).json({ message: 'Project deleted successfully', data: deletedProject });
        // Option 2: Send 204 No Content (common for DELETE)
        res.status(204).send();

    } catch (error) {
        console.error(`[${requestId}] Error in handleDeleteProject for project ID ${projectId}:`, error);
        res.status(500).json({ message: 'Failed to delete project', error: error.message });
    }
};

module.exports = {
    handleCreateProject,
    handleGetClientProjects,
    handleGetAllProjects,
    handleDeleteProject,
    handleUpdateProject // Add new handler here
};

// Add this function with other handlers
const handleUpdateProject = async (req, res) => {
    const { projectId } = req.params;
    const projectData = req.body;
    const userId = req.user?.id;
    const requestId = req.requestId;

    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized: User ID not found.' });
    }
    if (!projectData || Object.keys(projectData).length === 0) {
        return res.status(400).json({ message: 'Bad Request: Project data is required for update.' });
    }
     // Basic validation for project_name if it's part of the update and required
     if (projectData.hasOwnProperty('project_name') && !projectData.project_name) {
         return res.status(400).json({ message: 'Bad Request: Project name cannot be empty if provided for update.' });
     }

    try {
        const updatedProject = await projectsModel.updateProject(requestId, projectId, projectData, userId);

        if (!updatedProject) {
            return res.status(404).json({ message: 'Project not found or no changes made' });
        }

        res.status(200).json(updatedProject);
    } catch (error) {
        console.error(`[${requestId}] Error in handleUpdateProject for project ID ${projectId}:`, error);
        res.status(500).json({ message: 'Failed to update project', error: error.message });
    }
};