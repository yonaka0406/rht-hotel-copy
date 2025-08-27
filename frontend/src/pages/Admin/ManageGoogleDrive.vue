<template>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6">
        <h2 class="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6">Google スプレッドシートエクスポート</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-4">
                <div>
                    <label for="hotel"
                           class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ホテルを選択</label>
                    <Select v-model="selectedHotel" :options="hotels" optionLabel="name" optionValue="id"
                            placeholder="ホテルを選択" class="w-full" :filter="true" filterPlaceholder="検索..."
                            :filterFields="['name']" />
                </div>
                <div>
                    <label for="sheetId"
                           class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">シートID</label>
                    <InputText id="sheetId" v-model="sheetId" type="text" class="w-full"
                              placeholder="Google スプレッドシートIDを入力" />
                </div>
            </div>
            <div class="space-y-4">
                <div>
                    <label for="startDate"
                           class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">開始日</label>
                    <DatePicker id="startDate" v-model="startDate" :showIcon="true" dateFormat="yy-mm-dd"
                               class="w-full" :showButtonBar="true" />
                </div>
                <div>
                    <label for="endDate"
                           class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">終了日</label>
                    <DatePicker id="endDate" v-model="endDate" :showIcon="true" dateFormat="yy-mm-dd"
                               class="w-full" :showButtonBar="true" />
                </div>
            </div>
        </div>
        <div class="mt-6 flex flex-col items-end space-y-2">
            <div v-if="!isDateRangeValid" class="text-red-500 text-sm mr-2">
                期間は31日以内に設定してください
            </div>
            <div class="flex items-center">
                <span v-if="isLoading" class="mr-2 text-sm text-gray-500">処理中...</span>
                <Button :label="isLoading ? '処理中...' : 'ドライブ更新'"
                        :icon="isLoading ? 'pi pi-spin pi-spinner' : 'pi pi-upload'" class="p-button-primary"
                        :disabled="!isExportFormValid" :loading="isLoading"
                        @click="handleExportToGoogleSheets" />
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useHotelStore } from '@/composables/useHotelStore';
import { useToast } from 'primevue/usetoast';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';

const { hotels, fetchHotels } = useHotelStore();
const toast = useToast();

const selectedHotel = ref(null);
const sheetId = ref('');
const startDate = ref(null);
const endDate = ref(null);
const isLoading = ref(false);

const getDaysDifference = (date1, date2) => {
    const diffTime = Math.abs(date2 - date1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const isDateRangeValid = computed(() => {
    if (!startDate.value || !endDate.value) return false;
    const days = getDaysDifference(new Date(startDate.value), new Date(endDate.value));
    return days <= 31;
});

const isExportFormValid = computed(() => {
    return selectedHotel.value && sheetId.value && startDate.value && endDate.value && isDateRangeValid.value;
});

const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
};

const handleExportToGoogleSheets = async () => {
    if (!isExportFormValid.value) return;
    
    isLoading.value = true;
    
    try {
        const response = await fetch('/api/export/google-sheets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                hotelId: selectedHotel.value,
                sheetId: sheetId.value,
                startDate: formatDate(startDate.value),
                endDate: formatDate(endDate.value)
            })
        });

        if (!response.ok) {
            throw new Error('エクスポートに失敗しました');
        }

        const result = await response.json();
        toast.add({
            severity: 'success',
            summary: '成功',
            detail: 'Google スプレッドシートにエクスポートしました',
            life: 5000
        });
    } catch (error) {
        console.error('Export error:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: error.message || 'エクスポート中にエラーが発生しました',
            life: 5000
        });
    } finally {
        isLoading.value = false;
    }
};

onMounted(async () => {
    await fetchHotels();
    
    // Set default date range to current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    startDate.value = firstDay;
    endDate.value = lastDay;
});
</script>
