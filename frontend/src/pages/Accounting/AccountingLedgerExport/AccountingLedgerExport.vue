<script setup>
import { ref, reactive, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAccountingStore } from '@/composables/useAccountingStore';
import LedgerExportStepper from './components/LedgerExportStepper.vue';
import LedgerExportFilterStep from './components/LedgerExportFilterStep.vue';
import LedgerExportReviewStep from './components/LedgerExportReviewStep.vue';
import LedgerExportConfirmationStep from './components/LedgerExportConfirmationStep.vue';

const router = useRouter();
const { clearPreviewData } = useAccountingStore();

const currentStep = ref(1);
const exportFilters = reactive({
    startDate: null,
    endDate: null,
    hotelIds: [],
    planTypeCategoryIds: []
});

const handleFilterStepNext = (filters) => {
    Object.assign(exportFilters, filters);
    currentStep.value = 2;
};

const handleReviewStepNext = () => {
    currentStep.value = 3;
};

// Cleanup store on unmount to avoid stale data between sessions
onUnmounted(() => {
    clearPreviewData();
});
</script>

<template>
    <div class="bg-slate-50 dark:bg-slate-900 p-6 font-sans transition-colors duration-300">

        <div class="max-w-7xl mx-auto flex flex-col items-center">
            <!-- Header -->
            <div class="mb-12 text-center w-full relative">
                <div class="flex justify-start md:absolute md:left-0 md:top-1 mb-6 md:mb-0">
                    <button @click="router.push({ name: 'AccountingDashboard' })" class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:text-violet-600 hover:border-violet-200 transition-all cursor-pointer shadow-sm">
                        <i class="pi pi-arrow-left text-sm"></i>
                        <span>戻る</span>
                    </button>
                </div>
                <h1 class="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-3">
                    帳票出力：プラン別売上
                </h1>
                <p class="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    ホテルおよびプランごとの売上データを監査・照合用に出力します。
                </p>
            </div>

            <!-- Stepper Indicators -->
            <div class="w-full max-w-4xl">
                <LedgerExportStepper :current-step="currentStep" />
            </div>

            <!-- Step Containers -->
            <div class="w-full flex flex-col items-center">
                <!-- Step 1: Filter Selection -->
                <div v-if="currentStep === 1" class="w-full max-w-4xl">
                    <LedgerExportFilterStep 
                        @next="handleFilterStepNext" 
                    />
                </div>

                <!-- Step 2: Review & Preview -->
                <div v-if="currentStep === 2" class="w-full">
                    <LedgerExportReviewStep 
                        :filters="exportFilters"
                        @back="currentStep = 1" 
                        @next="handleReviewStepNext" 
                    />
                </div>

                <!-- Step 3: Export Confirmation -->
                <div v-if="currentStep === 3" class="w-full">
                    <LedgerExportConfirmationStep 
                        :filters="exportFilters"
                        @back="currentStep = 2" 
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Scoped styles moved to components */
</style>