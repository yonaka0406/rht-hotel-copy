<script setup>
import { ref, reactive, onUnmounted } from 'vue';
import { useAccountingStore } from '@/composables/useAccountingStore';
import LedgerExportStepper from './components/LedgerExportStepper.vue';
import LedgerExportFilterStep from './components/LedgerExportFilterStep.vue';
import LedgerExportReviewStep from './components/LedgerExportReviewStep.vue';
import LedgerExportConfirmationStep from './components/LedgerExportConfirmationStep.vue';

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

        <div class="max-w-7xl mx-auto">
            <!-- Header -->
            <div class="mb-8">
                <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
                    帳票出力：プラン別売上
                </h1>
                <p class="text-slate-600 dark:text-slate-400">
                    ホテルおよびプランごとの売上データを監査・照合用に出力します。
                </p>
            </div>

            <!-- Stepper Indicators -->
            <LedgerExportStepper :current-step="currentStep" />

            <!-- Step 1: Filter Selection -->
            <LedgerExportFilterStep 
                v-if="currentStep === 1" 
                @next="handleFilterStepNext" 
            />

            <!-- Step 2: Review & Preview -->
            <LedgerExportReviewStep 
                v-if="currentStep === 2" 
                :filters="exportFilters"
                @back="currentStep = 1" 
                @next="handleReviewStepNext" 
            />

            <!-- Step 3: Export Confirmation -->
            <LedgerExportConfirmationStep 
                v-if="currentStep === 3" 
                :filters="exportFilters"
                @back="currentStep = 2" 
            />

        </div>
    </div>
</template>

<style scoped>
/* Scoped styles moved to components */
</style>