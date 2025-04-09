import { ref, watch } from 'vue';

const template = ref(null);
const apiError = ref(null);

export function useXMLStore() {
        
    const fetchXMLTemplate = async(name) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/xml/template/${name}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,                    
                },                
            });

            const data = await response.text();

            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }
            
            template.value = data;
            
        } catch (error) {
            template.value = null;
            console.error('Failed to fetch data', error);
        }
    };

    const insertXMLResponse = async(name, xml) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/xml/response/${name}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/xml',
                },
                body: xml,
            });

            if (!response.ok) {
                throw new Error('Failed to post data');
            }
            
        } catch (error) {
            apiError.value = error.message;
            console.error('Failed to post data', error);
        }
    };

    // Lincoln
    const submitXMLTemplate = async (name, xml) => {        
        apiError.value = null; // Reset error
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `https://test472.tl-lincoln.net/pmsservice/V1/${name}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/xml',
                },
                body: xml,
            });
            if (!response.ok) {
                throw new Error('Failed to submit XML template');
            }

            // Save the response using insertXMLResponse
            const responseXml = await response.text();
            await insertXMLResponse(name, responseXml);
            
        } catch (error) {
            apiError.value = error.message;
            console.error('Failed to submit XML template', error);
        } 
    };

    const testEndpoint = async (url) => {        
        apiError.value = null;
        try {
            const response = await fetch(url, {
                method: 'HEAD', // HEAD requests are faster for checking reachability
            });

            if (!response.ok) {
                return false; // API is not reachable
            }
            return true; // API is reachable
        } catch (error) {
            apiError.value = error.message;
            console.error('API reachability check failed', error);
            return false; // API is not reachable
        }
    };

    return {        
        template,
        apiError,
        fetchXMLTemplate,
        insertXMLResponse,
        submitXMLTemplate,
        testEndpoint,
    };
}