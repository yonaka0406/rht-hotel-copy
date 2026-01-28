import { formatDate } from '@/utils/dateUtils';

export function useImportStore() {
    const getPrefilledTemplateData = async (type, month1, month2) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/import/prefilled-template?type=${type}&month1=${formatDate(month1)}&month2=${formatDate(month2)}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                },
            });

            const data = await response.text();
            return data;
        } catch (error) {
            console.error(`Error fetching prefilled ${type} template data:`, error);
            throw error;
        }
    };


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
    const yadomasterAddReservationRates = async (array) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/import/yadomaster/reservation-rates`, {
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

    const forecastAddData = async (array) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/import/finance/forecast`, {
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
    const accountingAddData = async (array) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/import/finance/accounting`, {
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

    const getFinancesData = async (hotelId, startMonth, endMonth) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/import/finance/data?hotelId=${hotelId}&startMonth=${startMonth}&endMonth=${endMonth}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                },
            });
            if (!response.ok) throw new Error('Failed to fetch finance data');
            return await response.json();
        } catch (error) {
            console.error('Error fetching finance data:', error);
            throw error;
        }
    };

    const upsertFinancesData = async (type, entries, tableData) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/import/finance/upsert`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ type, entries, tableData }),
            });
            if (!response.ok) throw new Error('Failed to save finance data');
            return await response.json();
        } catch (error) {
            console.error('Error saving finance data:', error);
            throw error;
        }
    };

    const syncFinanceData = async (endpoint, hotelId, month, errorLabel) => {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ hotelId, month }),
        });
        if (!response.ok) throw new Error(`Failed to sync ${errorLabel} data`);
        return await response.json();
    };

    const syncYayoi = async (hotelId, month) => {
        try {
            return await syncFinanceData('/api/import/finance/sync-yayoi', hotelId, month, 'Yayoi');
        } catch (error) {
            console.error('Error syncing Yayoi data:', error);
            throw error;
        }
    };

    const syncPMS = async (hotelId, month) => {
        try {
            return await syncFinanceData('/api/import/finance/sync-pms', hotelId, month, 'PMS');
        } catch (error) {
            console.error('Error syncing PMS data:', error);
            throw error;
        }
    };

    const getAccountingSettings = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/accounting/settings`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                },
            });
            if (!response.ok) throw new Error('Failed to fetch accounting settings');
            return await response.json();
        } catch (error) {
            console.error('Error fetching accounting settings:', error);
            throw error;
        }
    };

    return {
        yadomasterAddClients,
        yadomasterAddReservations,
        yadomasterAddReservationDetails,
        yadomasterAddReservationPayments,
        yadomasterAddReservationAddons,
        yadomasterAddReservationRates,
        forecastAddData,
        accountingAddData,
        getPrefilledTemplateData,
        getFinancesData,
        upsertFinancesData,
        syncYayoi,
        syncPMS,
        getAccountingSettings,
    };
}