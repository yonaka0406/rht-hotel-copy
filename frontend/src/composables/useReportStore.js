import { ref, watch } from 'vue';

const reservationList = ref(null);

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

    const fetchCountReservationDetails = async (hotelId, startDate, endDate) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/report/res/count/dtl/${hotelId}/${startDate}/${endDate}`;
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

    const fetchOccupationByPeriod = async (period, hotelId, refDate) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/report/occ/${period}/${hotelId}/${refDate}`;
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

    const fetchReservationListView = async(hotelId, startDate, endDate) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/report/res/list/${hotelId}/${startDate}/${endDate}`;
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

            // Convert clients_json field from string to JSON
            reservationList.value = data.map(reservation => ({
                ...reservation,
                clients_json: reservation.clients_json ? JSON.parse(reservation.clients_json) : []
            }));
            
        } catch (error) {
            reservationList.value = [];
            console.error('Failed to fetch data', error);
        }
    }

    return {
        reservationList,
        fetchCountReservation,
        fetchCountReservationDetails,
        fetchOccupationByPeriod,
        fetchReservationListView,
    };
}