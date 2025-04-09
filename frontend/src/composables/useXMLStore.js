import { ref, watch } from 'vue';

const template = ref(null);
const responses = ref([]);

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
    const fetchXMLRecentResponses = async(name) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/xml/responses/recent`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,                    
                },                
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }
            
            responses.value = data;
            
        } catch (error) {
            responses.value = [];
            console.error('Failed to fetch data', error);
        }
    };

    const insertXMLResponse = async(name, xml) => {
        console.log('insertXMLResponse', name, xml);
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/xml/response/${name}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'text/xml',
                },
                body: xml,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', response.status, response.statusText, errorText);
                throw new Error(`Failed to post data: ${response.status} ${response.statusText} ${errorText}`);
            }

            const responseData = await response.json(); // Parse the JSON response from postXMLResponse
            console.log('XML response saved successfully', responseData);
            return responseData;
            
        } catch (error) {
            console.error('Failed to post data', error);
            throw error;
        }
    };   

    return {        
        template,
        responses,
        fetchXMLTemplate,
        fetchXMLRecentResponses,
        insertXMLResponse,
    };
}