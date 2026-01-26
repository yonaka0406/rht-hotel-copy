<template>
    <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden mb-8">
        <div class="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Top N Filter -->
                <div class="flex flex-col gap-2">
                    <label class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        表示する上位経費数
                    </label>
                    <InputNumber 
                        v-model="topN" 
                        :min="1" 
                        :max="20" 
                        showButtons 
                        buttonLayout="horizontal"
                        class="w-full" 
                        incrementButtonIcon="pi pi-plus" 
                        decrementButtonIcon="pi pi-minus"
                        @update:modelValue="$emit('update:topN', $event)" 
                    />
                </div>

                <!-- Reference Month Filter -->
                <div class="flex flex-col gap-2">
                    <label class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center justify-between">
                        <span>基準月 (12ヶ月累計)</span>
                        <span v-if="latestMonth" class="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                            最終更新: {{ latestMonthLabel }}
                        </span>
                    </label>
                    <Select 
                        v-model="selectedMonth" 
                        :options="monthOptions" 
                        optionLabel="label"
                        optionValue="value" 
                        placeholder="基準月を選択" 
                        fluid 
                        @update:modelValue="$emit('update:selectedMonth', $event)"
                    />
                </div>

                <!-- Hotel Filter -->
                <div class="flex flex-col gap-2">
                    <label class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        対象施設 (マッピング済み)
                    </label>
                    <Select 
                        v-model="selectedHotelId" 
                        :options="hotelOptions" 
                        optionLabel="label"
                        optionValue="value" 
                        placeholder="施設を選択" 
                        fluid 
                        @update:modelValue="$emit('update:selectedHotelId', $event)"
                    />
                </div>

                <!-- Refresh Button -->
                <div class="flex items-end">
                    <button 
                        @click="$emit('refresh')" 
                        :disabled="loading"
                        class="w-full bg-violet-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-violet-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <i v-if="loading" class="pi pi-spin pi-spinner"></i>
                        <i v-else class="pi pi-refresh"></i>
                        <span>{{ loading ? '読み込み中...' : 'データを更新' }}</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';

const props = defineProps({
    topN: {
        type: Number,
        required: true
    },
    selectedMonth: {
        type: String,
        default: null
    },
    selectedHotelId: {
        type: Number,
        required: true
    },
    monthOptions: {
        type: Array,
        required: true
    },
    hotelOptions: {
        type: Array,
        required: true
    },
    latestMonth: {
        type: String,
        default: null
    },
    latestMonthLabel: {
        type: String,
        default: ''
    },
    loading: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['update:topN', 'update:selectedMonth', 'update:selectedHotelId', 'refresh']);
</script>