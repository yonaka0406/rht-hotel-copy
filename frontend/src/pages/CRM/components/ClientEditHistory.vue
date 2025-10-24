<template>
    <div v-if="loading" class="flex justify-center items-center p-6">
        <ProgressSpinner />
    </div>
    <Timeline v-else :value="clientLog">
        <template #opposite="slotProps">
            <small class="text-surface-500 dark:text-surface-400">{{ slotProps.item.name }}</small><br/>
            <small class="text-surface-500 dark:text-surface-400">{{ formatDateTime(slotProps.item.log_time) }}</small>
        </template>
        <template #content="slotProps">
            <span v-html="formatChangedFields(slotProps.item.changed_fields, slotProps.item.action)"></span>
        </template>
    </Timeline>
</template>
<script setup>
    // Vue
    import { ref, onMounted } from 'vue';
    import { useRoute } from 'vue-router';
    const route = useRoute();
    
    // Stores
    import { useLogStore } from '@/composables/useLogStore';
    const { clientLog, fetchClientHistory } = useLogStore();    

    // Primevue
    import { Timeline, ProgressSpinner } from 'primevue';

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

    // Client
    const clientId = ref(route.params.clientId);

    // Timeline
    const loading = ref(false);
    const formatChangedFields = (changedFields, action) => {
        if (!changedFields) return '';

        if (typeof changedFields === 'string') {
            try {
                changedFields = JSON.parse(changedFields); // Ensure it's an object
            } catch (_error) {
                return changedFields;
            }
        }

        // Handle INSERT and DELETE actions
        if (action === 'INSERT') return '顧客が作成されました';
        if (action === 'DELETE') return '顧客が削除されました';

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
            insert: '顧客が作成されました。',
            delete: '顧客が削除されました。',
            customer_id: '顧客ID',
            name: '氏名・名称',            
            name_kana: 'カナ',
            name_kanji: '漢字',
            date_of_birth: '誕生日・設立日',
            legal_or_natural_person: '個人・法人区分',
            gender: '性別',            
            email: 'メールアドレス',
            phone: '電話番号',
            fax: 'FAX',
            loyalty_tier: 'ロイヤルティ層',
            client_group_id: '所属グループ',
            website: 'ウェブサイト',
            billing_preference: '請求書希望',            
            comment: '備考',
        };
        return labels[key] || key; // Return Japanese label or default key
    };
    const getValue = (key, value) => {
        if (key === 'legal_or_natural_person') {
            const personLabels = {
                legal: '法人',
                natural: '個人'                
            };
            return personLabels[value] || value;
        }
        if (key === 'gender') {
            const genderLabels = {
                male: '男性',
                female: '女性',
                other: 'その他'                
            };
            return genderLabels[value] || value;
        }
        if (key === 'billing_preference') {
            const billingLabels = {
                paper: '紙請求',
                digital: '電子請求'                
            };
            return billingLabels[value] || value;
        }
        if (key === 'loyalty_tier') {
            const loyaltyLabels = {
                prospect: '潜在顧客',
                newbie: '新規顧客',
                repeater: 'リピーター',
                hotel_loyal: 'ホテルロイヤル',
                brand_loyal: 'ブランドロイヤル'                
            };
            return loyaltyLabels[value] || value;
        }

        return value;
    };

    onMounted(async () => {
        loading.value = true;

        await fetchClientHistory(clientId.value);        
                
        loading.value = false;
    });

</script>