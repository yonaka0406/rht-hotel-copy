import { ref, reactive, toRefs } from 'vue';
import { useToast } from 'primevue/usetoast';

// Define shared state outside the function if it needs to be truly global singleton
// For this composable, reactive state within the function scope is usually fine.
// const globalWaitlistState = reactive({
// entries: [], // Example if we were fetching and storing a list
// loading: false,
// error: null,
// });

export function useWaitlistStore() {
    const toast = useToast();

    const state = reactive({
        // entries: [], // Not fetching entries in this step, but good for future
        loading: false,
        error: null,
        // filters and pagination would go here if implementing getByHotel
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

                const response = await fetch('/api/waitlist', {
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
        }

        // Future actions as per WAITLIST_STRATEGY.md:
        // async fetchEntries(hotelId) { /* ... */ }
        // async updateEntryStatus(id, status) { /* ... */ }
        // async deleteEntry(id) { /* ... */ }
        // setFilters(newFilters) { /* ... */ }
    };

    return {
        ...toRefs(state),
        ...actions
    };
}
