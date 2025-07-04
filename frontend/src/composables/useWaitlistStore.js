import { ref, reactive, toRefs } from 'vue';
import { useToast } from 'primevue/usetoast';

// Define shared state outside the function if it needs to be truly global singleton
// For this composable, reactive state within the function scope is usually fine.
// For this composable, reactive state within the function scope is usually fine.
// However, to share entries across components (e.g. modal and top menu badge),
// For this composable, reactive state within the function scope is usually fine.

export function useWaitlistStore() {
    const toast = useToast();

    const state = reactive({
        entries: [],
        loading: false,
        error: null,
        pagination: {
            page: 1,
            size: 20,
            total: 0,
        },
        // filters: { status: '', startDate: '', ... } // Can be added later
    });

    const actions = {
        /**
         * Adds a new waitlist entry by calling the backend API.
         * @param {object} entryData - The data for the new waitlist entry.
         * Required fields: client_id, hotel_id, room_type_id, requested_check_in_date,
         * requested_check_out_date, number_of_guests, contact_email, communication_preference.
         * Optional: contact_phone, notes.
         * @returns {Promise<object|null>} The created entry object or null if an error occurred.
         */
        async addEntry(entryData) {
            state.loading = true;
            state.error = null;
            try {
                const authToken = localStorage.getItem('authToken');
                if (!authToken) {
                    throw new Error('認証トークンが見つかりません。'); // Authentication token not found.
                }

                const response = await fetch('/api/waitlist/', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(entryData),
                });

                const responseData = await response.json();

                if (!response.ok) {
                    const errorMessage = responseData.error || `順番待ちリストへの登録に失敗しました。ステータス: ${response.status}`; // Failed to add to waitlist. Status: ...
                    throw new Error(errorMessage);
                }

                // If successful, we might want to add to a local 'entries' array if we were managing a list:
                // state.entries.push(responseData);
                // For now, just show success and return the created entry.

                toast.add({
                    severity: 'success',
                    summary: '成功', // Success
                    detail: '順番待ちリストに正常に登録されました。', // Successfully added to waitlist.
                    life: 3000
                });
                return responseData; // Return the created entry

            } catch (err) {
                console.error('Error adding waitlist entry:', err);
                state.error = err.message;
                toast.add({
                    severity: 'error',
                    summary: 'エラー', // Error
                    detail: err.message || '順番待ちリストへの登録中にエラーが発生しました。', // An error occurred while adding to the waitlist.
                    life: 5000
                });
                return null; // Indicate failure
            } finally {
                state.loading = false;
            }
        },

        clearError() {
            state.error = null;
        },

        /**
         * Triggers a manual notification email for a waitlist entry.
         * @param {string} entryId - The ID of the waitlist entry.
         * @returns {Promise<object|null>} The updated entry object or null if an error occurred.
         */
        async sendManualNotification(entryId) {
            state.loading = true;
            state.error = null;
            try {
                const authToken = localStorage.getItem('authToken');
                if (!authToken) {
                    throw new Error('認証トークンが見つかりません。');
                }

                const response = await fetch(`/api/waitlist/${entryId}/manual-notify`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                    },
                    // No body needed if the backend can derive all info from entryId
                });

                const responseData = await response.json();

                if (!response.ok) {
                    const errorMessage = responseData.error || `手動通知メールの送信に失敗しました。ステータス: ${response.status}`;
                    throw new Error(errorMessage);
                }

                toast.add({
                    severity: 'success',
                    summary: '成功',
                    detail: '手動通知メールの送信処理を開始しました。', // Manual notification email process initiated.
                    life: 3000
                });
                // The responseData should be the updated waitlist entry
                // TODO: Update the local state.entries if it's being managed here.
                return responseData;

            } catch (err) {
                console.error('Error sending manual notification:', err);
                state.error = err.message;
                toast.add({
                    severity: 'error',
                    summary: 'エラー',
                    detail: err.message || '手動通知メールの送信中にエラーが発生しました。',
                    life: 5000
                });
                return null;
            } finally {
                state.loading = false;
            }
        },

        /**
         * Cancels a waitlist entry by updating its status to 'cancelled'.
         * @param {string} entryId - The ID of the waitlist entry to cancel.
         * @param {string} [cancelReason] - Optional reason for cancellation to append to notes.
         * @returns {Promise<object|null>} The cancelled entry object or null if an error occurred.
         */
        async cancelEntry(entryId, cancelReason = '') {
            state.loading = true;
            state.error = null;
            try {
                const authToken = localStorage.getItem('authToken');
                if (!authToken) {
                    throw new Error('認証トークンが見つかりません。');
                }

                const response = await fetch(`/api/waitlist/${entryId}/cancel`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ cancelReason }),
                });

                const responseData = await response.json();

                if (!response.ok) {
                    const errorMessage = responseData.error || `順番待ちエントリーのキャンセルに失敗しました。ステータス: ${response.status}`;
                    throw new Error(errorMessage);
                }

                toast.add({
                    severity: 'success',
                    summary: '成功',
                    detail: '順番待ちエントリーが正常にキャンセルされました。', // Waitlist entry successfully cancelled.
                    life: 3000
                });
                return responseData;

            } catch (err) {
                console.error('Error cancelling waitlist entry:', err);
                state.error = err.message;
                toast.add({
                    severity: 'error',
                    summary: 'エラー',
                    detail: err.message || '順番待ちエントリーのキャンセル中にエラーが発生しました。',
                    life: 5000
                });
                return null;
            } finally {
                state.loading = false;
            }
        },

        /**
         * Fetches waitlist entries for a given hotel with optional filters and pagination.
         * @param {number} hotelId - The ID of the hotel.
         * @param {object} [options={}] - Optional parameters.
         * @param {object} [options.filters={}] - Filtering criteria.
         * @param {number} [options.page=1] - Page number for pagination.
         * @param {number} [options.size=20] - Page size for pagination.
         */
        async fetchWaitlistEntries(hotelId, options = {}, debugLabel = '') {
            if (!hotelId) {
                state.entries = [];
                state.error = 'Hotel ID is required to fetch waitlist entries.';
                toast.add({ severity: 'warn', summary: '注意', detail: state.error, life: 3000 });
                return;
            }

            state.loading = true;
            state.error = null;

            // Always filter by status 'waiting' or 'notified' unless status is already provided
            const { filters = {}, page = state.pagination.page, size = state.pagination.size } = options;
            console.log('[fetchWaitlistEntries] filters.status before:', filters.status, '| debugLabel:', debugLabel);
            const mergedFilters = { ...filters };
            if (mergedFilters.status === 'all' || mergedFilters.status === undefined) {
                delete mergedFilters.status;
            }
            console.log('[fetchWaitlistEntries] mergedFilters.status after:', mergedFilters.status, '| debugLabel:', debugLabel);

            // Debug: log the label and call stack
            console.log(`[fetchWaitlistEntries] label: ${debugLabel}`, new Error().stack);

            try {
                const authToken = localStorage.getItem('authToken');
                if (!authToken) {
                    throw new Error('認証トークンが見つかりません。');
                }

                // Use POST with JSON body
                const response = await fetch(`/api/waitlist/hotel/${hotelId}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        page,
                        size,
                        filters: mergedFilters
                    })
                });

                const responseData = await response.json();

                if (!response.ok) {
                    const errorMessage = responseData.error || `順番待ちリストの取得に失敗しました。ステータス: ${response.status}`;
                    throw new Error(errorMessage);
                }

                state.entries = responseData.entries || [];
                state.pagination.page = responseData.pagination?.page || page;
                state.pagination.size = responseData.pagination?.size || size;
                state.pagination.total = responseData.pagination?.total || 0;

            } catch (err) {
                console.error('Error fetching waitlist entries:', err);
                state.error = err.message;
                state.entries = []; // Clear entries on error
                state.pagination.total = 0;
                toast.add({
                    severity: 'error',
                    summary: 'エラー',
                    detail: err.message || '順番待ちリストの取得中にエラーが発生しました。',
                    life: 5000
                });
            } finally {
                state.loading = false;
            }
        },
    };

    return {
        // Spread state directly if it's defined inside the composable,
        // or use toRefs(state) if state is defined outside and imported.
        // Since state is reactive() inside, its properties are already refs when accessed.
        // ...state, // This would spread entries, loading, error, pagination as top-level refs
        // However, convention is often to return state as an object and actions separately or use toRefs
        ...toRefs(state), // This is the common way to expose reactive state
        ...actions
    };
}
