<template>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6 mb-4">
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
                    <InputText id="startDate" v-model="startDate" type="date" class="w-full" />
                </div>
                <div>
                    <label for="endDate"
                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">終了日</label>
                    <InputText id="endDate" v-model="endDate" type="date" class="w-full" />
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
                    :disabled="!isExportFormValid" :loading="isLoading" @click="handleExportToGoogleSheets" />
            </div>
        </div>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6 mb-4">
        <h2 class="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6">駐車場予約 Google スプレッドシートエクスポート</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-4">
                <div>
                    <label for="parkingHotel"
                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ホテルを選択</label>
                    <Select v-model="selectedParkingHotel" :options="hotels" optionLabel="name" optionValue="id"
                        placeholder="ホテルを選択" class="w-full" :filter="true" filterPlaceholder="検索..."
                        :filterFields="['name']" />
                </div>
                <div>
                    <label for="parkingSheetId"
                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">シートID</label>
                    <InputText id="parkingSheetId" v-model="parkingSheetId" type="text" class="w-full"
                        placeholder="Google スプレッドシートIDを入力" />
                </div>
            </div>
            <div class="space-y-4">
                <div>
                    <label for="parkingStartDate"
                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">開始日</label>
                    <InputText id="parkingStartDate" v-model="parkingStartDate" type="date" class="w-full" />
                </div>
                <div>
                    <label for="parkingEndDate"
                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">終了日</label>
                    <InputText id="parkingEndDate" v-model="parkingEndDate" type="date" class="w-full" />
                </div>
            </div>
        </div>
        <div class="mt-6 flex flex-col items-end space-y-2">
            <div v-if="!isParkingDateRangeValid" class="text-red-500 text-sm mr-2">
                期間は31日以内に設定してください
            </div>
            <div class="flex items-center">
                <span v-if="isParkingLoading" class="mr-2 text-sm text-gray-500">処理中...</span>
                <Button :label="isParkingLoading ? '処理中...' : '駐車場予約をエクスポート'"
                    :icon="isParkingLoading ? 'pi pi-spin pi-spinner' : 'pi pi-upload'" class="p-button-primary"
                    :disabled="!isParkingExportFormValid" :loading="isParkingLoading" @click="handleExportParkingToGoogleSheets" />
            </div>
        </div>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6">
        <h2 class="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6">Google スプレッドシートの新規作成</h2>
        <div class="grid grid-cols-1 gap-4">
            <div>
                <label for="newSheetTitle"
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">シートのタイトル</label>
                <div class="flex gap-2">
                    <InputText id="newSheetTitle" v-model="newSheetTitle" type="text" class="flex-1"
                        placeholder="新しいスプレッドシートのタイトルを入力" />
                    <Button label="新規作成" icon="pi pi-plus" class="p-button-primary"
                        :disabled="!newSheetTitle || isCreating" :loading="isCreating" @click="handleCreateNewSheet" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
// Vue
import { ref, computed, onMounted, watch } from 'vue';

// Store
import { useHotelStore } from '@/composables/useHotelStore';
const { hotels, fetchHotels } = useHotelStore();

// Primevue
import { useToast } from 'primevue/usetoast';
const toast = useToast();
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';

const selectedHotel = ref(null);
const sheetId = ref('');
const startDate = ref('');
const endDate = ref('');
const isLoading = ref(false);
const newSheetTitle = ref('');
const isCreating = ref(false);

const selectedParkingHotel = ref(null);
const parkingSheetId = ref('');
const parkingStartDate = ref('');
const parkingEndDate = ref('');
const isParkingLoading = ref(false);

// Calculate days between two dates
const getDaysDifference = (date1, date2) => {
    const diffTime = Math.abs(date2 - date1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const isDateRangeValid = computed(() => {
    if (!startDate.value || !endDate.value) return false;
    const days = getDaysDifference(new Date(startDate.value), new Date(endDate.value));
    return days <= 31;
});

const isParkingDateRangeValid = computed(() => {
    if (!parkingStartDate.value || !parkingEndDate.value) return false;
    const days = getDaysDifference(new Date(parkingStartDate.value), new Date(parkingEndDate.value));
    return days <= 31;
});

const isExportFormValid = computed(() => {
    return selectedHotel.value &&
        sheetId.value &&
        startDate.value &&
        endDate.value &&
        isDateRangeValid.value &&
        !isLoading.value;
});

const isParkingExportFormValid = computed(() => {
    return selectedParkingHotel.value &&
        parkingSheetId.value &&
        parkingStartDate.value &&
        parkingEndDate.value &&
        isParkingDateRangeValid.value &&
        !isParkingLoading.value;
});

const formatDate = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const handleExportToGoogleSheets = async () => {
    if (!isExportFormValid.value) return;

    isLoading.value = true;

    try {
        const formattedStartDate = formatDate(startDate.value);
        const formattedEndDate = formatDate(endDate.value);

        const response = await fetch(`/api/report/res/google/${sheetId.value}/${selectedHotel.value}/${formattedStartDate}/${formattedEndDate}`);

        if (!response.ok) {
            throw new Error('エクスポートに失敗しました');
        }

        toast.add({
            severity: 'success',
            summary: '成功',
            detail: 'データをGoogleスプレッドシートにエクスポートしました',
            life: 3000
        });
    } catch (error) {
        console.error('Export error:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: 'エクスポート中にエラーが発生しました: ' + (error.message || '不明なエラー'),
            life: 5000
        });
    } finally {
        isLoading.value = false;
    }
};

const handleExportParkingToGoogleSheets = async () => {
    if (!isParkingExportFormValid.value) return;

    isParkingLoading.value = true;

    try {
        const formattedStartDate = formatDate(parkingStartDate.value);
        const formattedEndDate = formatDate(parkingEndDate.value);

        const response = await fetch(`/api/report/res/google-parking/${parkingSheetId.value}/${selectedParkingHotel.value}/${formattedStartDate}/${formattedEndDate}`);

        if (!response.ok) {
            throw new Error('駐車場予約のエクスポートに失敗しました');
        }

        toast.add({
            severity: 'success',
            summary: '成功',
            detail: '駐車場予約データをGoogleスプレッドシートにエクスポートしました',
            life: 3000
        });
    } catch (error) {
        console.error('Parking export error:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: '駐車場予約のエクスポート中にエラーが発生しました: ' + (error.message || '不明なエラー'),
            life: 5000
        });
    } finally {
        isParkingLoading.value = false;
    }
};

const handleCreateNewSheet = async () => {
    if (!newSheetTitle.value) return;
    
    isCreating.value = true;
    
    try {
        const authToken = localStorage.getItem('authToken'); 
        const response = await fetch(`/api/report/res/google/sheets/create?title=${encodeURIComponent(newSheetTitle.value)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error('シートの作成に失敗しました');
        }

        const data = await response.json();
        
        if (data.success) {
            toast.add({
                severity: 'success',
                summary: '成功',
                detail: '新しいGoogleスプレッドシートを作成しました',
                life: 3000
            });
            
            // Open the new sheet in a new tab
            if (data.data?.spreadsheetUrl) {
                window.open(data.data.spreadsheetUrl, '_blank');
            }
        } else {
            throw new Error(data.message || 'シートの作成に失敗しました');
        }
    } catch (error) {
        console.error('Create sheet error:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: 'スプレッドシートの作成中にエラーが発生しました: ' + (error.message || '不明なエラー'),
            life: 5000
        });
    } finally {
        isCreating.value = false;
    }
};

watch(startDate, (newDate) => {
    if (!newDate) return;
    
    const date = new Date(newDate);
    // Check if it's the first day of the month
    if (date.getDate() === 1) {
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        endDate.value = formatDate(lastDay);
    }
});

watch(parkingStartDate, (newDate) => {
    if (!newDate) return;
    
    const date = new Date(newDate);
    // Check if it's the first day of the month
    if (date.getDate() === 1) {
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        parkingEndDate.value = formatDate(lastDay);
    }
});

onMounted(async () => {
    await fetchHotels();

    // Set default date range to current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    startDate.value = formatDate(firstDay);
    endDate.value = formatDate(lastDay);
    parkingStartDate.value = formatDate(firstDay);
    parkingEndDate.value = formatDate(lastDay);
});
</script>
