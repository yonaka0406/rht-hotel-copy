export function useImportStore() {
    const getPrefilledTemplateData = async (type, month1, month2) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/import/prefilled-template?type=${type}&month1=${month1.toISOString()}&month2=${month2.toISOString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch prefilled data');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`Error fetching prefilled ${type} template data:`, error);
            throw error;
        }
    };

    
    const yadomasterAddClients = async (array) => {        
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/import/yadomaster/clients`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(array),
            });
        
            if (!response.ok) {
                throw new Error('Failed to import data');
            }
            const data = await response.json();            
            return data;
            
        } catch (error) {
            console.error('Failed to import data', error);
        }
    };
    const yadomasterAddReservations = async (array) => {        
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/import/yadomaster/reservations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(array),
            });
        
            if (!response.ok) {
                throw new Error('Failed to import data');
            }
            const data = await response.json();            
            return data;
            
        } catch (error) {
            console.error('Failed to import data', error);
        }
    };
    const yadomasterAddReservationDetails = async (array) => {        
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/import/yadomaster/reservation-details`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(array),
            });
        
            if (!response.ok) {
                throw new Error('Failed to import data');
            }
            const data = await response.json();            
            return data;
            
        } catch (error) {
            console.error('Failed to import data', error);
        }
    };
    const yadomasterAddReservationPayments = async (array) => {        
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/import/yadomaster/reservation-payments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(array),
            });
        
            if (!response.ok) {
                throw new Error('Failed to import data');
            }
            const data = await response.json();            
            return data;
            
        } catch (error) {
            console.error('Failed to import data', error);
        }
    };
    const yadomasterAddReservationAddons = async (array) => {        
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/import/yadomaster/reservation-addons`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(array),
            });
        
            if (!response.ok) {
                throw new Error('Failed to import data');
            }
            const data = await response.json();            
            return data;
            
        } catch (error) {
            console.error('Failed to import data', error);
        }
    };
    const yadomasterAddReservationRates = async (array) => {        
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/import/yadomaster/reservation-rates`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(array),
            });
        
            if (!response.ok) {
                throw new Error('Failed to import data');
            }
            const data = await response.json();            
            return data;
            
        } catch (error) {
            console.error('Failed to import data', error);
        }
    };

    const forecastAddData = async (array) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/import/finance/forecast`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(array),
            });
        
            if (!response.ok) {
                throw new Error('Failed to import data');
            }
            const data = await response.json();            
            return data;
            
        } catch (error) {
            console.error('Failed to import data', error);
        }
    };
    const accountingAddData = async (array) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/import/finance/accounting`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(array),
            });
        
            if (!response.ok) {
                throw new Error('Failed to import data');
            }
            const data = await response.json();            
            return data;
            
        } catch (error) {
            console.error('Failed to import data', error);
        }
    };

    return{
        yadomasterAddClients,
        yadomasterAddReservations,
        yadomasterAddReservationDetails,
        yadomasterAddReservationPayments,
        yadomasterAddReservationAddons,
        yadomasterAddReservationRates,
        forecastAddData,
        accountingAddData,
        getPrefilledTemplateData,
    };
}