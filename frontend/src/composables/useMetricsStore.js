import { ref } from 'vue';

const reservationsToday = ref(0);
const averageBookingLeadTime = ref(0);
const averageArrivalLeadTime = ref(0);
const waitlistEntriesToday = ref(0);

export function useMetricsStore() {

    const fetchReservationsToday = async (hotelId, date) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/metrics/reservations-today/${hotelId}/${date}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            reservationsToday.value = await response.json();
            
        } catch (error) {
            console.error('Failed to fetch reservation count', error);
        }
    };

    const fetchBookingLeadTime = async (hotelId, lookback, date) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/metrics/average-lead-time/booking/${hotelId}/${lookback}/${date}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            averageBookingLeadTime.value = await response.json();
            
        } catch (error) {
            console.error('Failed to fetch lead time', error);
        }
    };
    const fetchArrivalLeadTime = async (hotelId, lookback, date) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/metrics/average-lead-time/arrival/${hotelId}/${lookback}/${date}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            averageArrivalLeadTime.value = await response.json();
            
        } catch (error) {
            console.error('Failed to fetch lead time', error);
        }
    };

    const fetchWaitlistEntriesToday = async (hotelId, date) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/metrics/waitlist-entries-today/${hotelId}/${date}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            waitlistEntriesToday.value = await response.json();
            
        } catch (error) {
            console.error('Failed to fetch waitlist entries count', error);
        }
    };

    return{
        reservationsToday,
        averageBookingLeadTime,
        averageArrivalLeadTime,
        waitlistEntriesToday,
        fetchReservationsToday,
        fetchBookingLeadTime,
        fetchArrivalLeadTime,
        fetchWaitlistEntriesToday,
    };
}