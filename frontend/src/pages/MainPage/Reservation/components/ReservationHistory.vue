<template>
    <Panel>
        <div v-if="loading" class="flex justify-center items-center p-6">
            <ProgressSpinner />
        </div>
        <Timeline v-else :value="reservationLog">
            <template #opposite="slotProps">
                <small class="text-surface-500 dark:text-surface-400">{{ slotProps.item.name }}</small><br/>
                <small class="text-surface-500 dark:text-surface-400">{{ formatDateTime(slotProps.item.log_time) }}</small>
            </template>
            <template #content="slotProps">
                <span v-html="formatChangedFields(slotProps.item.changed_fields, slotProps.item.action)"></span>
            </template>
        </Timeline>
    </Panel>
</template>
<script setup>
    // Vue
    import { ref, onMounted } from 'vue';

    // Stores
    import { useLogStore } from '@/composables/useLogStore';
    const { reservationLog, fetchReservationHistory } = useLogStore();
    import { useClientStore } from '@/composables/useClientStore';
    const { fetchClient } = useClientStore();
    import { useUserStore } from '@/composables/useUserStore';
    const { getUserById } = useUserStore();
    import { translateStatus, translateType, translatePaymentTiming } from '@/utils/reservationUtils';

    // Primevue
    import { Panel, Timeline, ProgressSpinner } from 'primevue';

    const props = defineProps({
        reservation_id: {
            type: String,
            required: true,
        },    
    });

    // Helper
    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // Timeline
    const loading = ref(false);
    const formatChangedFields = (changedFields, action) => {
        if (!changedFields) return '';

        if (typeof changedFields === 'string') {
            try {
                changedFields = JSON.parse(changedFields); // Ensure it's an object
            } catch {
                return changedFields;
            }
        }

        // Handle INSERT and DELETE actions
        if (action === 'INSERT') return '予約が作成されました';
        if (action === 'DELETE') return '予約が削除されました';

        // Handle UPDATE
        return Object.entries(changedFields)
            .map(([key, value]) => {
                if (typeof value === 'object' && value.from !== undefined && value.to !== undefined) {
                    const oldValue = value.from !== null ? value.from : 'なし';
                    const newValue = value.to !== null ? value.to : 'なし';
                    return `${getLabel(key)} 旧：${getValue(key, oldValue)} 新：${getValue(key, newValue)}`;
                }
                return `${getLabel(key)}`;
            })
            .join('<br/>');
    };
    const getLabel = (key) => {        
        const labels = {
            insert: '予約が作成されました。',
            delete: '予約が削除されました。',
            reservation_client_id: '予約者',
            check_in: 'チェックイン',            
            check_in_time: 'チェックイン時間',
            check_out: 'チェックアウト',
            check_out_time: 'チェックアウト時間',
            number_of_people: '予約人数変更',
            status: 'ステータス変更',            
            type: '種類',
            agent: 'エージェント',
            comment: '備考',
            has_important_comment: '重要コメント',
            payment_timing: '支払いタイミング',
            updated_by: '更新者',
        };
        return labels[key] || key; // Return Japanese label or default key
    };
    const getValue = (key, value) => {
        if (key === 'status') {
            return translateStatus(value);
        }
        if (key === 'type') {
            return translateType(value);
        }
        if (key === 'reservation_client_id') {
            return value;
        }
        if (key === 'payment_timing') {
            return translatePaymentTiming(value);
        }

        if (key === 'number_of_people') {
            return `${value}人`;
        }

        return value;
    };

    async function replaceClientIdsWithNames(clientIds) {
        if (clientIds.length === 0) return;

        try {
            const clientMap = {};
            for (const clientId of clientIds) {
                // Call fetchClients for each individual clientId
                const response = await fetchClient(clientId);
                clientMap[clientId] = response.client.client.name_kanji || response.client.client.name_kana || response.client.client.name;
            }
            // console.log('clientMap:',clientMap);

            // Replace client IDs with names in reservationLog
            reservationLog.value = reservationLog.value.map(log => {
                if (log.changed_fields?.reservation_client_id) {
                    const { from, to } = log.changed_fields.reservation_client_id;
                    log.changed_fields.reservation_client_id = {
                        from: from ? clientMap[from] || '不明な顧客' : 'なし',
                        to: to ? clientMap[to] || '不明な顧客' : 'なし'
                    };
                }
                return log;
            });

        } catch (error) {
            console.error('Failed to fetch clients:', error);
        }
    };

    async function replaceUserIdsWithNames(userIds) {
        if (userIds.length === 0) {
            console.log('No user IDs to process');
            return;
        }

        console.log('Processing user IDs:', Array.from(userIds));
        
        try {
            const userMap = {};
            for (const userId of userIds) {
                try {
                    console.log(`Fetching user with ID: ${userId}`);
                    const response = await getUserById(userId);
                    console.log(`Received user data for ${userId}:`, response);
                    
                    // Access the nested user object from the response
                    const userData = response?.user;
                    
                    if (userData?.name) {
                        userMap[userId] = userData.name;
                        console.log(`Mapped user ${userId} to name: ${userData.name}`);
                    } else {
                        userMap[userId] = '不明なユーザー';
                        console.warn(`Could not get user name for ID ${userId}. Received:`, response);
                    }
                } catch (error) {
                    console.error(`Error fetching user ${userId} in replaceUserIdsWithNames loop:`, error);
                    userMap[userId] = '不明なユーザー';
                }
            }

            console.log('User ID to name mapping:', userMap);
            
            reservationLog.value = reservationLog.value.map(log => {
                if (log.changed_fields?.updated_by) {
                    const { from, to } = log.changed_fields.updated_by;
                    console.log(`Updating log entry ${log.id}:`, { original: { from, to } });
                    
                    const updatedLog = {
                        ...log,
                        changed_fields: {
                            ...log.changed_fields,
                            updated_by: {
                                from: from ? userMap[from] || '不明なユーザー' : 'なし',
                                to: to ? userMap[to] || '不明なユーザー' : 'なし'
                            }
                        }
                    };
                    
                    console.log(`Updated log entry ${log.id}:`, updatedLog);
                    return updatedLog;
                }
                return log;
            });
        } catch (error) {
            console.error('Failed to process user names:', error);
        }
    };

    onMounted(async () => {
        loading.value = true;
        console.log('Fetching reservation history for ID:', props.reservation_id);

        await fetchReservationHistory(props.reservation_id);
        console.log('Fetched reservation logs:', reservationLog.value);

        const clientIds = new Set();
        reservationLog.value.forEach(log => {
            if (log.changed_fields?.reservation_client_id) {
                const { from, to } = log.changed_fields.reservation_client_id;
                if (from) clientIds.add(from);
                if (to) clientIds.add(to);
            }
        });
        console.log('Found client IDs to resolve:', Array.from(clientIds));
        await replaceClientIdsWithNames(clientIds);

        const userIds = new Set();
        reservationLog.value.forEach(log => {
            if (log.changed_fields?.updated_by) {
                const { from, to } = log.changed_fields.updated_by;
                if (from) userIds.add(from);
                if (to) userIds.add(to);
            }
        });
        console.log('Found user IDs to resolve:', Array.from(userIds));
        await replaceUserIdsWithNames(userIds);

        console.log('Completed processing reservation history');
        loading.value = false;
    });

</script>