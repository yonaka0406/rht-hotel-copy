<template>
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 animate-fade-in shadow-sm">
        <div class="mb-6">
            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-1">ステップ 1: フィルタを選択</h3>
            <p class="text-sm text-slate-600 dark:text-slate-400">
                出力する期間、ホテル、勘定プランを選択してください。
            </p>
        </div>

        <div v-if="loading" class="py-20 flex flex-col items-center justify-center gap-4">
            <i class="pi pi-spin pi-spinner text-4xl text-violet-600"></i>
            <span class="text-slate-500 font-medium">オプションを読み込み中...</span>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-12 gap-8">
            <!-- Date Range Selection -->
            <div class="md:col-span-4 flex flex-col gap-4">
                <label class="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <i class="pi pi-calendar text-violet-600"></i>
                    対象期間
                </label>
                <div class="flex flex-col gap-4 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 h-full">
                    <div class="flex flex-col gap-2">
                        <label class="text-xs text-slate-500 font-bold">開始日</label>
                        <DatePicker v-model="filters.startDate" dateFormat="yy/mm/dd" showIcon fluid class="accounting-datepicker" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-xs text-slate-500 font-bold">終了日</label>
                        <DatePicker v-model="filters.endDate" dateFormat="yy/mm/dd" showIcon fluid class="accounting-datepicker" />
                    </div>
                    <div class="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <p class="text-[10px] text-slate-400 font-medium leading-relaxed">
                            ※ 期間は最大31日まで選択可能です。広範囲のデータ出力は時間がかかる場合があります。
                        </p>
                    </div>
                </div>
            </div>

            <!-- Hotel Selection -->
            <div class="md:col-span-4 flex flex-col gap-4">
                <div class="flex items-center justify-between">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <i class="pi pi-building text-violet-600"></i>
                        対象ホテル ({{ filters.hotelIds.length }}件選択中)
                    </label>
                    <button @click="toggleAllHotels" class="text-[10px] font-bold text-violet-600 hover:underline bg-transparent p-0 border-0 cursor-pointer">
                        {{ allHotelsSelected ? 'すべて解除' : 'すべて選択' }}
                    </button>
                </div>
                <div class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 h-80 overflow-y-auto custom-scrollbar">
                    <div class="space-y-1">
                        <label v-for="hotel in options.hotels" :key="hotel.id" 
                            class="flex items-center gap-3 p-3 hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-all group border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm hover:shadow-md"
                            :class="{'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm': filters.hotelIds.includes(hotel.id)}">
                            <Checkbox v-model="filters.hotelIds" :value="hotel.id" />
                            <span class="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-violet-600 transition-colors">
                                {{ hotel.name }}
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            <!-- Account Plan Selection -->
            <div class="md:col-span-4 flex flex-col gap-4">
                <div class="flex items-center justify-between">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <i class="pi pi-tags text-violet-600"></i>
                        勘定プラン ({{ filters.planTypeCategoryIds.length }}件選択中)
                    </label>
                    <button @click="toggleAllPlans" class="text-[10px] font-bold text-violet-600 hover:underline bg-transparent p-0 border-0 cursor-pointer">
                        {{ allPlansSelected ? 'すべて解除' : 'すべて選択' }}
                    </button>
                </div>
                <div class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 h-80 overflow-y-auto custom-scrollbar">
                    <div class="space-y-1">
                        <label v-for="plan in options.planTypes" :key="plan.id" 
                            class="flex items-center gap-3 p-3 hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-all group border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm hover:shadow-md"
                            :class="{'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm': filters.planTypeCategoryIds.includes(plan.id)}">
                            <Checkbox v-model="filters.planTypeCategoryIds" :value="plan.id" />
                            <span class="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-violet-600 transition-colors">
                                {{ plan.name }}
                            </span>
                        </label>
                    </div>
                </div>
            </div>
        </div>

        <div class="flex justify-end pt-8 border-t border-slate-100 dark:border-slate-700 mt-10">
            <button @click="handleNext" 
                :disabled="!isFormValid"
                class="flex items-center justify-center gap-3 rounded-xl h-12 px-8 bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-all shadow-lg shadow-violet-200 dark:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none hover:scale-105 active:scale-95">
                <span>次へ：データ確認</span>
                <i class="pi pi-arrow-right"></i>
            </button>
        </div>
    </div>
</template>

<script setup>
import { reactive, onMounted, computed } from 'vue';
import { useAccounting } from '@/composables/useAccounting';
import DatePicker from 'primevue/datepicker';
import Checkbox from 'primevue/checkbox';

const emit = defineEmits(['next']);
const { getExportOptions, loading } = useAccounting();

const options = reactive({
    hotels: [],
    planTypes: []
});

const filters = reactive({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(),
    hotelIds: [],
    planTypeCategoryIds: []
});

onMounted(async () => {
    try {
        const data = await getExportOptions();
        options.hotels = data.hotels;
        options.planTypes = data.planTypes;
        
        // Default to select all
        filters.hotelIds = options.hotels.map(h => h.id);
        filters.planTypeCategoryIds = options.planTypes.map(p => p.id);
    } catch (err) {
        console.error('Failed to load options', err);
    }
});

const allHotelsSelected = computed(() => {
    return options.hotels.length > 0 && filters.hotelIds.length === options.hotels.length;
});

const allPlansSelected = computed(() => {
    return options.planTypes.length > 0 && filters.planTypeCategoryIds.length === options.planTypes.length;
});

const toggleAllHotels = () => {
    if (allHotelsSelected.value) {
        filters.hotelIds = [];
    } else {
        filters.hotelIds = options.hotels.map(h => h.id);
    }
};

const toggleAllPlans = () => {
    if (allPlansSelected.value) {
        filters.planTypeCategoryIds = [];
    } else {
        filters.planTypeCategoryIds = options.planTypes.map(p => p.id);
    }
};

const isFormValid = computed(() => {
    return filters.startDate && 
           filters.endDate && 
           filters.hotelIds.length > 0 && 
           filters.planTypeCategoryIds.length > 0;
});

const handleNext = () => {
    // Format dates to YYYY-MM-DD
    const formattedFilters = {
        ...filters,
        startDate: filters.startDate.toISOString().split('T')[0],
        endDate: filters.endDate.toISOString().split('T')[0]
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
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
}
.dark :deep(.accounting-datepicker .p-inputtext) {
    background: #0f172a;
    border-color: #334155;
}
</style>

<style scoped>
@keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
    animation: fade-in 0.3s ease-out forwards;
}
</style>