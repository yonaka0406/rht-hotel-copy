<template>
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 animate-fade-in shadow-sm">
        <div class="mb-10">
            <h3 class="text-2xl font-black text-slate-900 dark:text-white mb-2">ステップ 1: フィルタを選択</h3>
            <p class="text-lg text-slate-600 dark:text-slate-400">
                出力する期間、ホテルを選択してください。
            </p>
        </div>

        <div v-if="loading" class="py-20 flex flex-col items-center justify-center gap-4">
            <i class="pi pi-spin pi-spinner text-4xl text-violet-600"></i>
            <span class="text-slate-500 font-medium">オプションを読み込み中...</span>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-10">
            <!-- Date Range Selection -->
            <div class="flex flex-col gap-4">
                <label class="text-base font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <i class="pi pi-calendar text-violet-600 text-lg"></i>
                    対象月
                </label>
                <div class="flex flex-col gap-6 bg-slate-50 dark:bg-slate-900/50 p-8 rounded-xl border border-slate-200 dark:border-slate-700 h-full">
                    <div class="flex flex-col gap-3">
                        <label class="text-base text-slate-500 font-bold">期間を選択</label>
                        <DatePicker 
                            v-model="filters.selectedMonth" 
                            view="month" 
                            dateFormat="yy/mm" 
                            showIcon 
                            fluid 
                            class="accounting-datepicker" 
                            :pt="{
                                input: { class: 'dark:bg-slate-900 dark:text-slate-50 dark:border-slate-700' }
                            }"
                        />
                    </div>
                    <div class="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <p class="text-sm text-slate-400 font-medium leading-relaxed">
                            ※ 月単位でのデータ出力となります。選択した月の1日から末日までのデータが書き出されます。
                        </p>
                    </div>
                </div>
            </div>

            <!-- Hotel Selection -->
            <div class="flex flex-col gap-4 h-full">
                <div class="flex items-center justify-between">
                    <label class="text-base font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <i class="pi pi-building text-violet-600 text-lg"></i>
                        対象ホテル ({{ filters.hotelIds.length }}件選択中)
                    </label>
                    <button @click="toggleAllHotels" class="text-sm font-bold text-violet-600 hover:underline bg-transparent p-0 border-0 cursor-pointer">
                        {{ allHotelsSelected ? 'すべて解除' : 'すべて選択' }}
                    </button>
                </div>
                <Listbox 
                    v-model="filters.hotelIds" 
                    :options="hotels" 
                    optionLabel="name" 
                    optionValue="id" 
                    multiple 
                    class="w-full flex-1 accounting-listbox" 
                    :pt="{
                        root: { class: 'h-full flex flex-col border-none' },
                        list: { class: 'custom-scrollbar h-full p-0' },
                        content: { class: 'p-0' },
                        item: ({ context }) => ({
                            class: [
                                'transition-colors duration-200 p-3',
                                context.selected 
                                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-600 dark:text-white font-bold' 
                                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                            ]
                        })
                    }"
                />
            </div>
        </div>

        <div class="flex justify-end pt-8 border-t border-slate-100 dark:border-slate-700 mt-10">
            <button @click="handleNext" 
                :disabled="!isFormValid"
                class="flex items-center justify-center gap-4 rounded-xl h-14 px-10 bg-violet-600 text-white text-base font-bold hover:bg-violet-700 transition-all shadow-lg shadow-violet-200 dark:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none hover:scale-105 active:scale-95">
                <span>次へ：データ確認</span>
                <i class="pi pi-arrow-right text-lg"></i>
            </button>
        </div>
    </div>
</template>

<script setup>
import { reactive, onMounted, computed, watch, ref } from 'vue';
import { useHotelStore } from '@/composables/useHotelStore';
import { useToast } from 'primevue/usetoast';
import DatePicker from 'primevue/datepicker';
import Listbox from 'primevue/listbox';

const emit = defineEmits(['next']);
const { hotels, fetchHotels, isLoadingHotelList: loading } = useHotelStore();
const toast = useToast();

const filters = reactive({
    selectedMonth: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), // Previous month
    hotelIds: []
});

const isInitialized = ref(false);

// Watch for hotels data to be available to set default selection
watch(hotels, (newHotels) => {
    if (!isInitialized.value && newHotels && newHotels.length > 0) {
        filters.hotelIds = newHotels.map(h => h.id);
        isInitialized.value = true;
    }
}, { immediate: true });

onMounted(async () => {
    try {
        if (hotels.value.length === 0) {
            await fetchHotels();
        }
    } catch (err) {
        console.error('Failed to load options', err);
        toast.add({ 
            severity: 'error', 
            summary: '読み込みエラー', 
            detail: 'ホテル情報の取得に失敗しました。', 
            life: 3000 
        });
    }
});

const allHotelsSelected = computed(() => {
    return hotels.value.length > 0 && filters.hotelIds.length === hotels.value.length;
});

const toggleAllHotels = () => {
    if (allHotelsSelected.value) {
        filters.hotelIds = [];
    } else {
        filters.hotelIds = hotels.value.map(h => h.id);
    }
};

const isFormValid = computed(() => {
    return filters.selectedMonth && 
           filters.hotelIds.length > 0;
});

const handleNext = () => {
    const formattedFilters = {
        hotelIds: filters.hotelIds,
        selectedMonth: `${filters.selectedMonth.getFullYear()}-${String(filters.selectedMonth.getMonth() + 1).padStart(2, '0')}`
    };
    emit('next', formattedFilters);
};
</script>

<style scoped>
@keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
    animation: fade-in 0.3s ease-out forwards;
}

.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 10px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #334155;
}

:deep(.accounting-datepicker .p-inputtext) {
    background: white;
    color: #1e293b;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    padding: 0.75rem 1rem;
}

/* Aggressive Dark Mode Overrides */
.dark :deep(.accounting-datepicker .p-inputtext),
.dark :deep(.accounting-datepicker input),
.dark :deep(.p-datepicker.accounting-datepicker .p-inputtext) {
    background-color: #0f172a !important;
    border-color: #334155 !important;
    color: #f8fafc !important;
}

.dark :deep(.accounting-datepicker .p-datepicker-dropdown) {
    background-color: #1e293b !important;
    color: #f8fafc !important;
}

:deep(.accounting-listbox) {
    border-radius: 12px;
    overflow: hidden;
    background: #f8fafc; /* slate-50 */
    border-color: #e2e8f0; /* slate-200 */
}

/* Aggressive Dark Mode Overrides for Listbox */
.dark :deep(.accounting-listbox),
.dark :deep(.accounting-listbox .p-listbox-list),
.dark :deep(.accounting-listbox .p-listbox-list-container) {
    background-color: #0f172a !important;
    border-color: #334155 !important;
    color: #f8fafc !important;
}

.dark :deep(.accounting-listbox .p-listbox-header) {
    background-color: #1e293b !important;
    border-color: #334155 !important;
    color: #f8fafc !important;
}

:deep(.accounting-listbox .p-listbox-item) {
    padding: 1rem 1.25rem;
    font-size: 15px;
    font-weight: 500;
    transition: all 0.2s;
}
</style>