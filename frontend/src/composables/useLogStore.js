import { ref } from 'vue';

const reservationLog = ref([]);

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

    return{
        reservationLog,
        fetchReservationHistory,
    };
}