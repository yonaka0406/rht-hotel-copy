import { ref } from 'vue';
import { useApi } from './useApi';

const reservationList = ref(null);
const limitedFunctionality = ref(false);
const apiErrorCount = ref(0); // Counter for API errors
const availableDates = ref([]);
const reportData = ref([]);
const isLoading = ref(false);

export function useReportStore() {
    // Use static import for API
    const api = useApi();

    // Helper function to return limited functionality response
    const getLimitedFunctionalityResponse = () => {
        return {
            message: 'API not available, report functionality limited',
            data: [],
            count: 0
        };
    };

    const getAvailableMetricDates = async () => {
        isLoading.value = true;
        try {
            const data = await api.get('/report/daily/available-dates');
            availableDates.value = data.map(d => new Date(d));
        } catch (error) {
            console.error('Error fetching available metric dates:', error);
            availableDates.value = [];
        } finally {
            isLoading.value = false;
        }
    };

    const fetchDailyReportData = async (metricDate) => {
        try {
            const data = await api.get(`/report/daily/data/${metricDate}`);
            return data;
        } catch (error) {
            console.error('Error fetching daily report data:', error);
            throw error;
        }
    };

    const fetchActiveReservationsChange = async (hotelId, dateString) => {
        try {
            // If hotelId is null, 0, or 'all', pass 'all' to the backend,
            // as the backend is designed to interpret 'all' or '0' as NULL.
            const effectiveHotelId = (hotelId === null || hotelId === 0 || hotelId === 'all') ? 'all' : hotelId;

            // Validate dateString format (basic check, more robust validation can be added if needed)
            if (!/^[\d]{4}-[\d]{2}-[\d]{2}$/.test(dateString)) {
                console.error('Invalid dateString format in store. Expected YYYY-MM-DD.');
                throw new Error('Invalid date format in store. Please use YYYY-MM-DD.');
            }

            // If API is not available, return empty data with limited functionality message
            if (limitedFunctionality.value) {
                console.debug('API not available, report functionality limited');
                return {
                    message: 'API not available, report functionality limited',
                    data: [],
                    count: 0
                };
            }

            const data = await api.get(`/report/active-reservations-change/${effectiveHotelId}/${dateString}`);
            return data;

        } catch (error) {
            console.error('Failed to fetch active reservations change:', error);
            throw error; // Re-throw the error to be caught by the caller
        }
    };

    const fetchMonthlyReservationEvolution = async (hotelId, targetMonth) => {
        try {
            // Ensure hotelId is not null or undefined if it's a required parameter
            if (hotelId === null || typeof hotelId === 'undefined') {
                throw new Error('hotelId is required for monthly reservation evolution.');
            }
            // Ensure targetMonth is a valid YYYY-MM-DD string
            if (!/^\d{4}-\d{2}-\d{2}$/.test(targetMonth)) {
                throw new Error('targetMonth is required and must be in YYYY-MM-DD format.');
            }

            // If API is not available, return empty data with limited functionality message
            if (limitedFunctionality.value) {
                console.debug('API not available, report functionality limited');
                return {
                    message: 'API not available, report functionality limited',
                    data: [],
                    count: 0
                };
            }

            const data = await api.get(`/report/monthly-reservation-evolution/${hotelId}/${targetMonth}`);
            return data;

        } catch (error) {
            console.error('Failed to fetch monthly reservation evolution:', error);
            throw error; // Re-throw the error to be caught by the caller
        }
    };

    const fetchCountReservation = async (hotelId, startDate, endDate) => {
        try {
            // If API is not available, return limited functionality response
            if (limitedFunctionality.value) {
                console.debug('API not available, report functionality limited');
                return getLimitedFunctionalityResponse();
            }

            // Get data from API
            const data = await api.get(`/report/res/count/${hotelId}/${startDate}/${endDate}`);

            // Ensure we return an array even if the API returns something else
            // This is important for backward compatibility with components that expect an array
            if (!data) return [];
            return Array.isArray(data) ? data : [];

        } catch (error) {
            console.error('Failed to fetch reservation count data:', error);
            // Return empty array on error to avoid breaking UI components
            return [];
        }
    };

    const fetchCountReservationDetails = async (hotelId, startDate, endDate) => {
        try {
            // If API is not available, return limited functionality response
            if (limitedFunctionality.value) {
                console.debug('API not available, report functionality limited');
                return getLimitedFunctionalityResponse();
            }

            const data = await api.get(`/report/res/count/dtl/${hotelId}/${startDate}/${endDate}`);

            // Return the data as-is if it's an object, otherwise return an empty object
            return data && typeof data === 'object' ? data : {};

        } catch (error) {
            console.error('Failed to fetch reservation details count data:', error);
            // Return empty object on error to avoid breaking UI components
            return {};
        }
    };

    /**
     * Batch fetch reservation count data for multiple hotels
     * @param {Array<number>} hotelIds - Array of hotel IDs
     * @param {string} startDate - Start date in YYYY-MM-DD format
     * @param {string} endDate - End date in YYYY-MM-DD format
     * @returns {Object} Object with hotel IDs as keys and data arrays as values
     */
    const fetchBatchCountReservation = async (hotelIds, startDate, endDate) => {
        try {
            if (limitedFunctionality.value) {
                console.debug('API not available, report functionality limited');
                return {};
            }

            const response = await api.post('/report/batch/count', {
                hotelIds,
                startDate,
                endDate
            });

            return response?.results || {};
        } catch (error) {
            console.error('Failed to fetch batch reservation count data:', error);
            return {};
        }
    };

    /**
     * Batch fetch forecast data for multiple hotels
     * @param {Array<number>} hotelIds - Array of hotel IDs
     * @param {string} startDate - Start date in YYYY-MM-DD format
     * @param {string} endDate - End date in YYYY-MM-DD format
     * @returns {Object} Object with hotel IDs as keys and data arrays as values
     */
    const fetchBatchForecastData = async (hotelIds, startDate, endDate) => {
        try {
            if (limitedFunctionality.value) {
                console.debug('API not available, report functionality limited');
                return {};
            }

            const response = await api.post('/report/batch/forecast', {
                hotelIds,
                startDate,
                endDate
            });

            return response?.results || {};
        } catch (error) {
            console.error('Failed to fetch batch forecast data:', error);
            return {};
        }
    };

    /**
     * Batch fetch accounting data for multiple hotels
     * @param {Array<number>} hotelIds - Array of hotel IDs
     * @param {string} startDate - Start date in YYYY-MM-DD format
     * @param {string} endDate - End date in YYYY-MM-DD format
     * @returns {Object} Object with hotel IDs as keys and data arrays as values
     */
    const fetchBatchAccountingData = async (hotelIds, startDate, endDate) => {
        try {
            if (limitedFunctionality.value) {
                console.debug('API not available, report functionality limited');
                return {};
            }

            const response = await api.post('/report/batch/accounting', {
                hotelIds,
                startDate,
                endDate
            });

            return response?.results || {};
        } catch (error) {
            console.error('Failed to fetch batch accounting data:', error);
            return {};
        }
    };

    /**
     * Batch fetch occupation breakdown data for multiple hotels
     * @param {Array<number>} hotelIds - Array of hotel IDs
     * @param {string} startDate - Start date in YYYY-MM-DD format
     * @param {string} endDate - End date in YYYY-MM-DD format
     * @returns {Object} Object with hotel IDs as keys and data arrays as values
     */
    const fetchBatchOccupationBreakdown = async (hotelIds, startDate, endDate) => {
        try {
            if (limitedFunctionality.value) {
                console.debug('API not available, report functionality limited');
                return {};
            }

            const response = await api.post('/report/batch/occupation-breakdown', {
                hotelIds,
                startDate,
                endDate
            });

            return response?.results || {};
        } catch (error) {
            console.error('Failed to fetch batch occupation breakdown data:', error);
            return {};
        }
    };

    /**
     * Batch fetch future outlook data (6 months) for multiple hotels
     * @param {Array<number>} hotelIds - Array of hotel IDs
     * @param {string|Date} referenceDate - (Optional) Pivot date to start 6-month window
     * @returns {Object} Object with month labels as keys, each containing hotel data
     */
    const fetchBatchFutureOutlook = async (hotelIds, referenceDate = null) => {
        try {
            if (limitedFunctionality.value) {
                console.debug('API not available, report functionality limited');
                return {};
            }

            const response = await api.post('/report/batch/future-outlook', {
                hotelIds,
                referenceDate
            });

            return response?.results || {};
        } catch (error) {
            console.error('Failed to fetch batch future outlook data:', error);
            return {};
        }
    };

    /**
     * Fetch daily report data aggregated by hotel for a specific date and hotel IDs.
     * @param {string} date - Metric date in YYYY-MM-DD format
     * @param {Array<number>} hotelIds - Array of hotel IDs (optional)
     * @returns {Array} Array of aggregated data objects
     */
    const fetchDailyReportDataByHotel = async (date, hotelIds = []) => {
        try {
            if (limitedFunctionality.value) return [];
            const data = await api.post('/report/daily/data-by-hotel', {
                date,
                hotelIds
            });
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Failed to fetch daily report data by hotel:', error);
            return [];
        }
    };

    /**
     * Fetch the latest available daily report date
     * @returns {string|null} YYYY-MM-DD string or null
     */
    const fetchLatestDailyReportDate = async () => {
        try {
            if (limitedFunctionality.value) return null;
            const data = await api.get('/report/daily/latest-date');
            return data; // should be YYYY-MM-DD or null
        } catch (error) {
            console.error('Failed to fetch latest daily report date:', error);
            return null;
        }
    };


    const fetchOccupationByPeriod = async (period, hotelId, refDate) => {
        try {
            // If API is not available, return limited functionality response
            if (limitedFunctionality.value) {
                console.debug('API not available, report functionality limited');
                return getLimitedFunctionalityResponse();
            }

            const data = await api.get(`/report/occ/${period}/${hotelId}/${refDate}`);

            // Ensure we return an array even if the API returns something else
            if (!data) return [];
            return Array.isArray(data) ? data : [];

        } catch (error) {
            console.error('Failed to fetch occupation data:', error);
            // Return empty array on error to avoid breaking UI components
            return [];
        }
    };

    const fetchReservationListView = async (hotelId, startDate, endDate, searchType = 'stay_period') => {
        try {
            // If API is not available, return limited functionality response
            if (limitedFunctionality.value) {
                console.debug('API not available, report functionality limited');
                reservationList.value = [];
                return getLimitedFunctionalityResponse();
            }

            const data = await api.get(`/report/res/list/${searchType}/${hotelId}/${startDate}/${endDate}`);

            // Convert clients_json field from string to JSON
            if (Array.isArray(data)) {
                reservationList.value = data.map(reservation => ({
                    ...reservation,
                    clients_json: reservation.clients_json ? JSON.parse(reservation.clients_json) : [],
                    payers_json: reservation.payers_json ? JSON.parse(reservation.payers_json) : []
                }));
            } else {
                // Handle case where data is not an array
                reservationList.value = [];
                console.warn('Reservation list data is not an array:', data);
            }

            return data;

        } catch (error) {
            reservationList.value = [];
            console.error('Failed to fetch reservation list data:', error);
            throw error;
        }
    };

    const fetchForecastData = async (hotelId, startDate, endDate) => {
        try {
            // If API is not available, return limited functionality response
            if (limitedFunctionality.value) {
                console.debug('API not available, report functionality limited');
                return getLimitedFunctionalityResponse();
            }

            const data = await api.get(`/report/forecast/${hotelId}/${startDate}/${endDate}`);

            // Ensure we return an array even if the API returns something else
            if (!data) return [];
            return Array.isArray(data) ? data : [];

        } catch (error) {
            console.error('Failed to fetch forecast data:', error);
            // Return empty array on error to avoid breaking UI components
            return [];
        }
    };
    const fetchAccountingData = async (hotelId, startDate, endDate) => {
        try {
            // If API is not available, return limited functionality response
            if (limitedFunctionality.value) {
                console.debug('API not available, report functionality limited');
                return getLimitedFunctionalityResponse();
            }

            const data = await api.get(`/report/accounting/${hotelId}/${startDate}/${endDate}`);

            // Ensure we return an array even if the API returns something else
            if (!data) return [];
            return Array.isArray(data) ? data : [];

        } catch (error) {
            console.error('Failed to fetch accounting data:', error);
            // Return empty array on error to avoid breaking UI components
            return [];
        }
    };

    const fetchForecastDataByPlan = async (hotelId, startDate, endDate) => {
        try {
            if (limitedFunctionality.value) {
                console.debug('API not available, report functionality limited');
                return getLimitedFunctionalityResponse();
            }
            const data = await api.get(`/report/forecast-by-plan/${hotelId}/${startDate}/${endDate}`);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Failed to fetch forecast data by plan:', error);
            return [];
        }
    };

    const fetchAccountingDataByPlan = async (hotelId, startDate, endDate) => {
        try {
            if (limitedFunctionality.value) {
                console.debug('API not available, report functionality limited');
                return getLimitedFunctionalityResponse();
            }
            const data = await api.get(`/report/accounting-by-plan/${hotelId}/${startDate}/${endDate}`);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Failed to fetch accounting data by plan:', error);
            return [];
        }
    };

    const downloadDailyReportExcel = async (startDate, endDate) => {
        try {
            const response = await api.get(`/report/daily/download-excel/${startDate}/${endDate}`, { responseType: 'blob' });

            if (!response) { // api.get might return null on auth errors or other issues
                return 'no_data'; // Or throw a more specific error if needed
            }

            const blob = response; // response is already the blob
            if (blob.size === 0) {
                return 'no_data';
            }
            const dlURL = window.URL.createObjectURL(blob);

            // Handle file download
            try {
                const link = document.createElement("a");
                link.href = dlURL;
                link.setAttribute("download", `daily_report_${startDate}_${endDate}.xlsx`);
                document.body.appendChild(link);

                if (typeof link.click === 'function') {
                    link.click();
                }

                document.body.removeChild(link);
            } catch { /* Ignore errors during link click, as it's a fallback */ }


            return { success: true };

        } catch (error) {
            console.error("エクスポートエラー:", error);
            console.error('Export failed:', error.message);
            throw error;
        }
    };

    // Export methods
    const exportReservationList = async (hotelId, startDate, endDate) => {
        try {
            // If API is not available, return limited functionality response
            if (limitedFunctionality.value) {
                console.debug('API not available, export functionality limited');
                throw new Error('API not available, export functionality limited');
            }

            // For blob responses, we need to use fetch directly
            const response = await fetch(`/api/report/download/res/list/${hotelId}/${startDate}/${endDate}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch CSV");
            }

            const blob = await response.blob();
            const dlURL = window.URL.createObjectURL(blob);

            // Handle file download
            try {
                const link = document.createElement("a");
                link.href = dlURL;
                link.setAttribute("download", "reservations.csv");
                document.body.appendChild(link);

                // In test environment, link.click might not be available
                if (typeof link.click === 'function') {
                    link.click();
                }

                document.body.removeChild(link);
            } catch { /* Ignore errors during link click, as it's a fallback */ }

            return { success: true };

        } catch (error) {
            console.error("エクスポートエラー:", error);
            // Just log the error without trying to use toast
            console.error('Export failed:', error.message);
            throw error;
        }
    };
    const exportReservationDetails = async (hotelId, startDate, endDate) => {
        try {
            // If API is not available, return limited functionality response
            if (limitedFunctionality.value) {
                console.debug('API not available, export functionality limited');
                throw new Error('API not available, export functionality limited');
            }

            // For blob responses, we need to use fetch directly
            const response = await fetch(`/api/report/download/res/dtl/${hotelId}/${startDate}/${endDate}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch CSV");
            }

            const blob = await response.blob();
            const dlURL = window.URL.createObjectURL(blob);

            // Handle file download
            try {
                const link = document.createElement("a");
                link.href = dlURL;
                link.setAttribute("download", "reservation_details.csv");
                document.body.appendChild(link);

                // In test environment, link.click might not be available
                if (typeof link.click === 'function') {
                    link.click();
                }

                document.body.removeChild(link);
            } catch { /* Ignore errors during link click, as it's a fallback */ }

            return { success: true };

        } catch (error) {
            console.error("エクスポートエラー:", error);
            // Just log the error without trying to use toast
            console.error('Export failed:', error.message);
            throw error;
        }
    };
    const exportMealCount = async (hotelId, startDate, endDate) => {
        try {
            // If API is not available, return limited functionality response
            if (limitedFunctionality.value) {
                console.debug('API not available, export functionality limited');
                throw new Error('API not available, export functionality limited');
            }

            // For blob responses, we need to use fetch directly
            const response = await fetch(`/api/report/download/res/meals/${hotelId}/${startDate}/${endDate}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.status === 404) {
                return 'no_data';
            }
            if (!response.ok) {
                throw new Error("Failed to fetch CSV");
            }

            const blob = await response.blob();
            if (blob.size === 0) {
                return 'no_data';
            }
            const dlURL = window.URL.createObjectURL(blob);

            // Handle file download
            try {
                const link = document.createElement("a");
                link.href = dlURL;
                link.setAttribute("download", "meal_count.xlsx");
                document.body.appendChild(link);

                if (typeof link.click === 'function') {
                    link.click();
                }

                document.body.removeChild(link);
            } catch { /* Ignore errors during link click, as it's a fallback */ }

            return { success: true };

        } catch (error) {
            console.error("エクスポートエラー:", error);
            // Just log the error without trying to use toast
            console.error('Export failed:', error.message);
            throw error;
        }
    };

    const exportAccommodationTax = async (hotelId, startDate, endDate) => {
        try {
            if (limitedFunctionality.value) {
                console.debug('API not available, export functionality limited');
                throw new Error('API not available, export functionality limited');
            }

            const response = await fetch(`/api/report/download/accommodation-tax/${hotelId}/${startDate}/${endDate}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch Excel");
            }

            const blob = await response.blob();
            const dlURL = window.URL.createObjectURL(blob);

            try {
                const link = document.createElement("a");
                link.href = dlURL;
                link.setAttribute("download", `accommodation_tax_${startDate}_${endDate}.xlsx`);
                document.body.appendChild(link);

                if (typeof link.click === 'function') {
                    link.click();
                }

                document.body.removeChild(link);
            } catch { }

            return { success: true };

        } catch (error) {
            console.error("エクスポートエラー:", error);
            console.error('Export failed:', error.message);
            throw error;
        }
    };

    // Search-specific API methods
    const searchReservations = async (hotelId, searchParams) => {
        const { query, filters = [], fuzzy = false, phoneticSearch = true } = searchParams;

        // Validate required parameters
        if (!query && (!filters || filters.length === 0)) {
            throw new Error('Search query or filters are required');
        }

        const effectiveHotelId = (hotelId === null || hotelId === 0 || hotelId === 'all') ? 'all' : hotelId;

        try {
            const data = await api.post(`/reservations/search/${effectiveHotelId}`, {
                query,
                filters,
                fuzzy,
                phoneticSearch
            });

            // Process the response to match expected format
            const processedResults = data.results ? data.results.map(result => ({
                ...result,
                clients_json: result.clients_json ? JSON.parse(result.clients_json) : [],
                payers_json: result.payers_json ? JSON.parse(result.payers_json) : []
            })) : [];

            return {
                results: processedResults,
                totalCount: data.totalCount || processedResults.length,
                suggestions: data.suggestions || [],
                searchTime: data.searchTime || 0
            };

        } catch (error) {
            console.error('Failed to search reservations:', error);

            // Add specific error handling for search timeouts and server errors
            if (error.message.includes('timeout') || error.message.includes('408') || error.message.includes('504')) {
                const timeoutError = new Error('検索がタイムアウトしました。条件を絞り込んでください。');
                timeoutError.type = 'timeout';
                throw timeoutError;
            } else if (error.message.includes('500') || error.message.includes('server')) {
                const serverError = new Error('サーバーエラーが発生しました。しばらく待ってから再試行してください。');
                serverError.type = 'server';
                throw serverError;
            }

            throw error;
        }
    };

    const getSearchSuggestions = async (hotelId, partialQuery) => {
        // Validate input
        if (!partialQuery || partialQuery.trim().length < 1) {
            return { suggestions: [] };
        }

        const effectiveHotelId = (hotelId === null || hotelId === 0 || hotelId === 'all') ? 'all' : hotelId;

        try {
            const data = await api.post(`/search/suggestions/${effectiveHotelId}`, {
                query: partialQuery.trim(),
                limit: 10 // Limit suggestions for performance
            });

            return {
                suggestions: data.suggestions || [],
                categories: data.categories || {}
            };

        } catch (error) {
            console.error('Failed to fetch search suggestions:', error);
            // Return empty suggestions on error to avoid breaking the UI
            return { suggestions: [] };
        }
    };

    const getSavedSearches = async (hotelId) => {
        const effectiveHotelId = (hotelId === null || hotelId === 0 || hotelId === 'all') ? 'all' : hotelId;

        try {
            const data = await api.get(`/reservations/saved-searches/${effectiveHotelId}`);

            return {
                savedSearches: data.savedSearches || [],
                totalCount: data.totalCount || 0
            };

        } catch (error) {
            console.error('Failed to fetch saved searches:', error);
            throw error;
        }
    };

    const manageSavedSearches = async (hotelId, action, searchData) => {
        try {
            const effectiveHotelId = (hotelId === null || hotelId === 0 || hotelId === 'all') ? 'all' : hotelId;

            // Validate action
            const validActions = ['save', 'update', 'delete', 'load'];
            if (!validActions.includes(action)) {
                throw new Error(`Invalid action: ${action}. Must be one of: ${validActions.join(', ')}`);
            }

            let endpoint = `/reservations/saved-searches/${effectiveHotelId}`;
            let data;

            // Handle different actions
            if (action === 'delete' && searchData.searchId) {
                data = await api.del(`${endpoint}/${searchData.searchId}`);
                return { success: true, message: '検索を削除しました。' };
            } else if (action === 'load' && searchData.searchId) {
                data = await api.get(`${endpoint}/${searchData.searchId}`);
                return {
                    success: true,
                    savedSearch: data.savedSearch
                };
            } else if (action === 'update' && searchData.searchId) {
                const updateData = { ...searchData };
                delete updateData.searchId; // Remove ID from body as it's in URL
                data = await api.put(`${endpoint}/${searchData.searchId}`, updateData);
                return {
                    success: true,
                    message: '検索を更新しました。',
                    savedSearch: data.savedSearch
                };
            } else if (action === 'save') {
                data = await api.post(endpoint, { ...searchData });
                return {
                    success: true,
                    message: '検索を保存しました。',
                    savedSearch: data.savedSearch
                };
            }

            throw new Error(`Unsupported action: ${action}`);

        } catch (error) {
            console.error(`Failed to ${action} saved search:`, error);

            // Add specific error handling for common issues
            if (error.message.includes('404')) {
                const notFoundError = new Error('保存された検索が見つかりません。');
                notFoundError.type = 'validation';
                throw notFoundError;
            } else if (error.message.includes('409')) {
                const conflictError = new Error('同じ名前の検索が既に存在します。');
                conflictError.type = 'validation';
                throw conflictError;
            } else if (error.message.includes('400')) {
                const validationError = new Error('検索データが無効です。');
                validationError.type = 'validation';
                throw validationError;
            }

            // Add error type if not already set
            if (!error.type) {
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    error.type = 'network';
                    error.message = 'ネットワーク接続を確認してください。';
                } else {
                    error.type = 'unknown';
                }
            }

            throw error;
        }
    };

    const fetchSalesByPlan = async (hotelId, startDate, endDate) => {
        try {
            if (limitedFunctionality.value) {
                return getLimitedFunctionalityResponse();
            }
            const data = await api.get(`/report/sales-by-plan/${hotelId}/${startDate}/${endDate}`);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Failed to fetch sales by plan:', error);
            return [];
        }
    };

    const fetchOccupationBreakdown = async (hotelId, startDate, endDate) => {
        try {
            if (limitedFunctionality.value) {
                return getLimitedFunctionalityResponse();
            }
            const data = await api.get(`/report/occupation-breakdown/${hotelId}/${startDate}/${endDate}`);
            return data || []; // Expect an array
        } catch (error) {
            console.error('Failed to fetch occupation breakdown:', error);
            return {};
        }
    };

    const fetchBookingSourceBreakdown = async (hotelId, startDate, endDate) => {
        try {
            if (limitedFunctionality.value) {
                return getLimitedFunctionalityResponse();
            }
            const data = await api.get(`/metrics/booking-source?hotelId=${hotelId}&startDate=${startDate}&endDate=${endDate}`);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Failed to fetch booking source breakdown:', error);
            return [];
        }
    };

    const fetchPaymentTimingBreakdown = async (hotelId, startDate, endDate) => {
        try {
            if (limitedFunctionality.value) {
                return getLimitedFunctionalityResponse();
            }
            const data = await api.get(`/metrics/payment-timing?hotelId=${hotelId}&startDate=${startDate}&endDate=${endDate}`);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Failed to fetch payment timing breakdown:', error);
            return [];
        }
    };

    const fetchBookerTypeBreakdown = async (hotelId, startDate, endDate) => {
        try {
            if (limitedFunctionality.value) {
                return getLimitedFunctionalityResponse();
            }
            const data = await api.get(`/metrics/booker-type?hotelId=${hotelId}&startDate=${startDate}&endDate=${endDate}`);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Failed to fetch booker type breakdown:', error);
            return [];
        }
    };

    /**
     * Batch fetch booker type breakdown data for multiple hotels
     * @param {Array<number>} hotelIds - Array of hotel IDs
     * @param {string} startDate - Start date in YYYY-MM-DD format
     * @param {string} endDate - End date in YYYY-MM-DD format
     * @returns {Object} Object with hotel IDs as keys and data arrays as values
     */
    const fetchBatchBookerTypeBreakdown = async (hotelIds, startDate, endDate) => {
        try {
            if (limitedFunctionality.value) {
                console.debug('API not available, report functionality limited');
                return {};
            }

            const response = await api.post('/report/batch/booker-type', {
                hotelIds,
                startDate,
                endDate
            });

            return response?.results || {};
        } catch (error) {
            console.error('Failed to fetch batch booker type breakdown data:', error);
            return {};
        }
    };



    const fetchChannelSummary = async (hotelIds, startDate, endDate) => {
        try {
            if (limitedFunctionality.value) {
                return getLimitedFunctionalityResponse();
            }
            const data = await api.post('/report/channel-summary', { hotelIds, startDate, endDate });
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Failed to fetch channel summary:', error);
            return [];
        }
    };

    const fetchCheckInOutReport = async (hotelId, startDate, endDate) => {
        try {
            if (limitedFunctionality.value) {
                console.debug('API not available, report functionality limited');
                return getLimitedFunctionalityResponse();
            }
            const data = await api.get(`/report/checkin-out/${hotelId}/${startDate}/${endDate}`);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Failed to fetch check-in/out report data:', error);
            return [];
        }
    };

    const generateDailyMetricsForToday = async () => {
        isLoading.value = true;
        try {
            await api.post('/report/daily/generate-for-today');
            return { success: true };
        } catch (error) {
            console.error('Error generating daily metrics for today:', error);
            return { success: false, error };
        } finally {
            isLoading.value = false;
        }
    };

    const generatePdfReport = async (reportType, requestData) => {
        try {
            if (limitedFunctionality.value) {
                console.debug('API not available, PDF generation limited');
                throw new Error('API not available, PDF generation limited');
            }

            let url = '';
            // Dynamically construct the URL based on reportType
            switch (reportType) {
                case 'singleMonthSingleHotel':
                    url = '/report/pdf/single-month/single-hotel';
                    break;
                case 'singleMonthMultipleHotels':
                    url = '/report/pdf/single-month/multiple-hotels';
                    break;
                case 'cumulativeSingleHotel':
                    url = '/report/pdf/cumulative/single-hotel';
                    break;
                case 'cumulativeMultipleHotels':
                    url = '/report/pdf/cumulative/multiple-hotels';
                    break;
                default:
                    throw new Error('Invalid report type provided for PDF generation.');
            }

            const response = await api.post(url, requestData, {
                responseType: 'blob' // Important: receive response as a binary blob
            });

            return response; // This will be the blob
        } catch (error) {
            console.error('Failed to generate PDF report:', error);
            throw error;
        }
    };

    const downloadDailyTemplate = async (data, date, format = 'pdf') => {
        try {
            if (limitedFunctionality.value) {
                console.debug('API not available, download functionality limited');
                throw new Error('API not available, download functionality limited');
            }

            const response = await api.post('/report/download/daily-template-pdf', {
                outlookData: data,
                targetDate: date,
                format: format
            }, {
                responseType: 'blob'
            });

            if (!response) throw new Error('Download failed');

            const blob = response;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Format date for filename: YYYY-MM-DD -> YYYYMMDD
            const formattedDate = date ? date.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '');
            a.download = `daily_report_${formattedDate}.${format}`;
            
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            return { success: true };
        } catch (error) {
            console.error(`Failed to download daily template ${format}:`, error);
            throw error;
        }
    };

    /**
     * Batch fetch reservation list data for multiple hotels.
     * @param {Array<number>} hotelIds - Array of hotel IDs.
     * @param {string} startDate - Start date in YYYY-MM-DD format.
     * @param {string} endDate - End date in YYYY-MM-DD format.
     * @param {string} searchType - Type of search (e.g., 'stay_period', 'check_in').
     * @returns {Array<Object>} A flat array of reservation list items.
     */
    const fetchBatchReservationListView = async (hotelIds, startDate, endDate, searchType = 'stay_period') => {
        try {
            if (limitedFunctionality.value) {
                console.debug('API not available, report functionality limited');
                return [];
            }

            const data = await api.post('/report/batch/res-list', {
                hotelIds,
                startDate,
                endDate,
                searchType
            });

            // Convert clients_json and payers_json fields from string to JSON
            if (Array.isArray(data)) {
                return data.map(reservation => ({
                    ...reservation,
                    clients_json: reservation.clients_json ? JSON.parse(reservation.clients_json) : [],
                    payers_json: reservation.payers_json ? JSON.parse(reservation.payers_json) : []
                }));
            } else {
                console.warn('Batch reservation list data is not an array:', data);
                return [];
            }
        } catch (error) {
            console.error('Failed to fetch batch reservation list data:', error);
            throw error;
        }
    };

    return {
        reservationList,
        apiErrorCount,
        availableDates,
        reportData,
        isLoading,
        getAvailableMetricDates,
        fetchDailyReportData,
        downloadDailyReportExcel,
        fetchCountReservation,
        fetchCountReservationDetails,
        fetchOccupationByPeriod,
        fetchReservationListView, // Keep old one for now if still used elsewhere
        fetchForecastData,
        fetchAccountingData,
        exportReservationList,
        exportReservationDetails,
        exportMealCount,
        exportAccommodationTax,
        fetchActiveReservationsChange,
        fetchMonthlyReservationEvolution,
        searchReservations,
        getSearchSuggestions,
        getSavedSearches,
        manageSavedSearches,
        fetchSalesByPlan,
        fetchOccupationBreakdown,
        fetchBookingSourceBreakdown,
        fetchPaymentTimingBreakdown,
        fetchChannelSummary,
        fetchCheckInOutReport,
        fetchBookerTypeBreakdown,
        fetchForecastDataByPlan,
        fetchAccountingDataByPlan,
        generateDailyMetricsForToday,
        fetchBatchCountReservation,
        fetchBatchForecastData,
        fetchBatchAccountingData,
        fetchBatchOccupationBreakdown,
        generatePdfReport,
        fetchBatchReservationListView, // Add new batch function
        fetchBatchBookerTypeBreakdown,
        fetchBatchFutureOutlook,
        fetchLatestDailyReportDate,
        fetchDailyReportDataByHotel,
        downloadDailyTemplate,
    };
}