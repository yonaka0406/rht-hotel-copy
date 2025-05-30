import { ref, watch } from 'vue';

const reservationList = ref(null);

export function useReportStore() {
    
    const fetchActiveReservationsChange = async (hotelId) => {
        try {
            const authToken = localStorage.getItem('authToken');
            // If hotelId is null, 0, or 'all', pass 'all' to the backend,
            // as the backend is designed to interpret 'all' or '0' as NULL.
            const effectiveHotelId = (hotelId === null || hotelId === 0 || hotelId === 'all') ? 'all' : hotelId;
            const url = `/api/report/active-reservations-change/${effectiveHotelId}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to fetch active reservations change. Response not OK.' }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
            
        } catch (error) {
            console.error('Failed to fetch active reservations change:', error);
            throw error; // Re-throw the error to be caught by the caller
        }
    };

    const fetchMonthlyReservationEvolution = async (hotelId, targetMonth) => {
        try {
            const authToken = localStorage.getItem('authToken');
            // Ensure hotelId is not null or undefined if it's a required parameter
            if (hotelId === null || typeof hotelId === 'undefined') {
                throw new Error('hotelId is required for monthly reservation evolution.');
            }
            // Ensure targetMonth is a valid YYYY-MM-DD string
            if (!/^\d{4}-\d{2}-\d{2}$/.test(targetMonth)) {
                throw new Error('targetMonth is required and must be in YYYY-MM-DD format.');
            }

            const url = `/api/report/monthly-reservation-evolution/${hotelId}/${targetMonth}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to fetch monthly reservation evolution. Response not OK.' }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
            
        } catch (error) {
            console.error('Failed to fetch monthly reservation evolution:', error);
            throw error; // Re-throw the error to be caught by the caller
        }
    };

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
                clients_json: reservation.clients_json ? JSON.parse(reservation.clients_json) : [],
                payers_json: reservation.payers_json ? JSON.parse(reservation.payers_json) : []
            }));
            
        } catch (error) {
            reservationList.value = [];
            console.error('Failed to fetch data', error);
        }
    };
    
    const fetchForecastData = async (hotelId, startDate, endDate) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/report/forecast/${hotelId}/${startDate}/${endDate}`;
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
    const fetchAccountingData = async (hotelId, startDate, endDate) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/report/accounting/${hotelId}/${startDate}/${endDate}`;
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

    // Export
    const exportReservationList = async(hotelId, startDate, endDate) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/report/download/res/list/${hotelId}/${startDate}/${endDate}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) {
                throw new Error("Failed to fetch CSV");
            }

            const blob = await response.blob();
            const dlURL = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = dlURL;
            link.setAttribute("download", "reservations.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } catch (error) {
            console.error("エクスポートエラー:", error);
            toast.add({ severity: "error", summary: "エラー", detail: "エクスポートに失敗しました", life: 3000 });
        }
    };
    const exportReservationDetails = async(hotelId, startDate, endDate) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/report/download/res/dtl/${hotelId}/${startDate}/${endDate}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) {
                throw new Error("Failed to fetch CSV");
            }

            const blob = await response.blob();
            const dlURL = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = dlURL;
            link.setAttribute("download", "reservation_details.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } catch (error) {
            console.error("エクスポートエラー:", error);
            toast.add({ severity: "error", summary: "エラー", detail: "エクスポートに失敗しました", life: 3000 });
        }
    };    
    const exportMealCount = async(hotelId, startDate, endDate) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/report/download/res/meals/${hotelId}/${startDate}/${endDate}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) {
                throw new Error("Failed to fetch CSV");
            }

            const blob = await response.blob();
            const dlURL = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = dlURL;
            link.setAttribute("download", "meal_count.xlsx");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } catch (error) {
            console.error("エクスポートエラー:", error);
            toast.add({ severity: "error", summary: "エラー", detail: "エクスポートに失敗しました", life: 3000 });
        }
    };

    return {
        reservationList,
        fetchCountReservation,
        fetchCountReservationDetails,
        fetchOccupationByPeriod,
        fetchReservationListView,
        fetchForecastData, 
        fetchAccountingData,
        exportReservationList,
        exportReservationDetails,
        exportMealCount,
        fetchActiveReservationsChange,
        fetchMonthlyReservationEvolution,
    };
}