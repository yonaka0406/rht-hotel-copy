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
    };
}