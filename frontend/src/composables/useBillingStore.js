import { ref, watch } from 'vue';

const billableList = ref(null);
const billedList = ref(null);

export function useBillingStore() {
        
    const fetchBillableListView = async(hotelId, startDate, endDate) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/billing/res/billable-list/${hotelId}/${startDate}/${endDate}`;
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
            billableList.value = data.map(reservation => ({
                ...reservation,
                clients_json: reservation.clients_json ? JSON.parse(reservation.clients_json) : [],
                payers_json: reservation.payers_json ? JSON.parse(reservation.payers_json) : []
            }));
            
        } catch (error) {
            billableList.value = [];
            console.error('Failed to fetch data', error);
        }
    };

    return {
        billableList,
        billedList,
        fetchBillableListView,        
    };
}