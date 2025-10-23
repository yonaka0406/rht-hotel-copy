import { ref } from 'vue';

export function useProjectStore() {
    // Reactive state variables for related projects and client search
    const relatedProjects = ref([]);
    const isLoadingRelatedProjects = ref(false);
    const clientSearchResults = ref([]);
    const isLoadingClientSearch = ref(false);
    const allProjects = ref([]);
    const isLoadingAllProjects = ref(false);
    const allProjectsTotalCount = ref(0);
    const allProjectsCurrentPage = ref(1);
    const allProjectsSearchTerm = ref('');
    const allProjectsFilters = ref({});

    /**
     * Fetches projects related to a specific client ID.
     */
    async function fetchRelatedProjects(clientId) {
        if (!clientId) {
            console.warn('fetchRelatedProjects: clientId is required.');
            relatedProjects.value = [];
            return;
        }
        isLoadingRelatedProjects.value = true;
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/clients/${clientId}/projects`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`Failed to retrieve related projects. ${errorData.message || response.status}`);
            }
            relatedProjects.value = await response.json();
        } catch (error) {
            console.error('Failed to retrieve related projects.', error);
            relatedProjects.value = [];
        } finally {
            isLoadingRelatedProjects.value = false;
        }
    }

    /**
     * Creates a new project.
     */
    async function createProject(projectData) {
        // isCreatingProject.value = true;
        const token = localStorage.getItem('authToken');
        try {
            const response = await fetch(`/api/projects/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(projectData),
            });
            const responseData = await response.json();
            if (!response.ok) {
                console.error('Failed to create project.');
                throw new Error(responseData.message || `プロジェクトの作成に失敗しました。`);
            }
            // Optionally, trigger a refresh of related projects or allProjects list if relevant
            // For example, if the newly created project should appear in the allProjects list:
            // await fetchAllProjects({ page: allProjectsCurrentPage.value, searchTerm: allProjectsSearchTerm.value, filters: allProjectsFilters.value });
            return responseData;
        } catch (error) {
            console.error('Failed to create project.', error);
            throw error;
        } finally {
            // isCreatingProject.value = false;
        }
    }

    /**
     * Fetches all projects with pagination, search, and filters. (Newly added)
     */
    async function fetchAllProjects({ page = 1, limit = 10, searchTerm = '', filters = {} }) {
        isLoadingAllProjects.value = true;
        allProjectsSearchTerm.value = searchTerm;
        allProjectsFilters.value = filters;
        allProjectsCurrentPage.value = page; // Update current page

        try {
            const authToken = localStorage.getItem('authToken');
            const params = new URLSearchParams();
            params.append('page', page);
            params.append('limit', limit);
            if (searchTerm) {
                params.append('searchTerm', searchTerm);
            }
            Object.keys(filters).forEach(key => {
                if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
                    params.append(key, String(filters[key]));
                }
            });

            const response = await fetch(`/api/projects?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `HTTP error occurred. Status: ${response.status}`);
            }
            const data = await response.json();
            allProjects.value = data.projects;
            allProjectsTotalCount.value = data.totalItems; 
        } catch (error) {
            console.error('Failed to retrieve all projects.', error);
            allProjects.value = [];
            allProjectsTotalCount.value = 0;
        } finally {
            isLoadingAllProjects.value = false;
        }
    }

    /**
     * Updates an existing project.
     */
    async function updateProject(projectId, projectData) {
        // Consider adding a loading state specific to project update if needed
        // isLoadingUpdateProject.value = true;
        const token = localStorage.getItem('authToken');
        try {
            const response = await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(projectData),
            });
            const responseData = await response.json();
            if (!response.ok) {
                console.error('Failed to update project.');
                throw new Error(responseData.message || `Failed to update project. ${response.status}`);
            }
            // Optionally, refresh the specific project in the allProjects list or refetch if necessary
            // For example:
            // const index = allProjects.value.findIndex(p => p.id === projectId);
            // if (index !== -1) {
            //   allProjects.value[index] = { ...allProjects.value[index], ...responseData };
            // }
            return responseData;
        } catch (error) {
            console.error(`Failed to update project with ID ${projectId}.`, error);
            throw error;
        } finally {
            // isLoadingUpdateProject.value = false;
        }
    }
    
    return {
        relatedProjects,
        isLoadingRelatedProjects,
        clientSearchResults,
        isLoadingClientSearch,
        fetchRelatedProjects,
        createProject,      
        allProjects,
        isLoadingAllProjects,
        allProjectsTotalCount,
        allProjectsCurrentPage,
        allProjectsSearchTerm,
        allProjectsFilters,
        fetchAllProjects,
        deleteProjectById, // Add new action
        updateProject, // Add the new updateProject function
    };
}

const deleteProjectById = async (projectId) => {
    // isLoadingAllProjects.value = true; // Or a specific loading state for delete
    try {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                // 'Content-Type': 'application/json' // Not typically needed for DELETE if no body
            },
        });

        if (!response.ok) {
            // Try to parse error message from backend if available
            let errorData = { message: `HTTP error! Status: ${response.status}` };
            try {
                errorData = await response.json();
            } catch {
                // Ignore if response is not JSON or already handled
            }
            throw new Error(errorData.message || `Failed to delete project. Status: ${response.status}`);
        }

        // response.status should be 204 (No Content) if successful from backend
        // No JSON body expected for 204, so no need to parse response.json() here
        // If backend sends 200 with deleted object, then: return await response.json();

        return { success: true, message: 'Project deleted successfully' }; // Or simply return void/true

    } catch (error) {
        console.error(`Failed to delete project with ID ${projectId}.`, error);
        throw error; // Re-throw to be caught by the component
    } finally {
        // isLoadingAllProjects.value = false; // Reset loading state
    }
};
