import { ref } from 'vue';

const reservationLog = ref([]);
const clientLog = ref([]);

export function useLogStore() {

    const fetchReservationHistory = async (id) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/log/reservation/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            reservationLog.value = await response.json();
            
        } catch (error) {
            console.error('Failed to fetch reservation log', error);
        }
    };
    const fetchClientHistory = async (id) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/log/client/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            clientLog.value = await response.json();
            
        } catch (error) {
            console.error('Failed to fetch client log', error);
        }
    };

    return{
        reservationLog,
        clientLog,
        fetchReservationHistory,
        fetchClientHistory
    };
}