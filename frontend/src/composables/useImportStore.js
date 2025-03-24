export function useImportStore() {
    
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

    return{
        yadomasterAddClients,
        yadomasterAddReservations,
        yadomasterAddReservationDetails,
        yadomasterAddReservationPayments,
        yadomasterAddReservationAddons,
    };
}