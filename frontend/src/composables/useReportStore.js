import { ref, watch } from 'vue';

export function useReportStore() {
    
    const fetchCountReservation = async (hotelId, startDate, endDate) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/report/res/count/${hotelId}/${startDate}/${endDate}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },                
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }

            return data;
            
        } catch (error) {
            console.error('Failed to fetch data', error);
        }
    };

    return {
        fetchCountReservation,
    };
}