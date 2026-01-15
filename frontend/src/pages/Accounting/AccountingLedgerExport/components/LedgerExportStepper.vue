<template>
    <div class="flex items-center justify-between mb-8 max-w-4xl mx-auto">
        <!-- Step 1 Indicator -->
        <div class="flex items-center flex-1">
            <div class="relative flex flex-col items-center flex-1">
                <div :class="[
                    'w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ring-2 transition-all duration-300',
                    currentStep >= 1 ? 'bg-violet-600 text-white ring-violet-200' : 'bg-white dark:bg-slate-800 text-slate-500 ring-slate-200 dark:ring-slate-700'
                ]">
                    <i v-if="currentStep > 1" class="pi pi-check text-sm"></i>
                    <span v-else>1</span>
                </div>
                <p :class="['text-xs font-bold mt-2 whitespace-nowrap', currentStep >= 1 ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500']">
                    フィルタ選択
                </p>
            </div>
            <div class="flex-1 h-1 mx-4 rounded-full" :class="currentStep > 1 ? 'bg-violet-600' : 'bg-slate-200 dark:bg-slate-700'"></div>
        </div>

        <!-- Step 2 Indicator -->
        <div class="flex items-center flex-1">
            <div class="relative flex flex-col items-center flex-1">
                <div :class="[
                    'w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ring-2 transition-all duration-300',
                    currentStep >= 2 ? 'bg-violet-600 text-white ring-violet-200' : 'bg-white dark:bg-slate-800 text-slate-500 ring-slate-200 dark:ring-slate-700'
                ]">
                    <i v-if="currentStep > 2" class="pi pi-check text-sm"></i>
                    <span v-else>2</span>
                </div>
                <p :class="['text-xs font-bold mt-2 whitespace-nowrap', currentStep >= 2 ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500']">
                    データ確認
                </p>
            </div>
            <div class="flex-1 h-1 mx-4 rounded-full" :class="currentStep > 2 ? 'bg-violet-600' : 'bg-slate-200 dark:bg-slate-700'"></div>
        </div>

        <!-- Step 3 Indicator -->
        <div class="flex items-center flex-1">
            <div class="relative flex flex-col items-center flex-1">
                <div :class="[
                    'w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ring-2 transition-all duration-300',
                    currentStep >= 3 ? 'bg-violet-600 text-white ring-violet-200' : 'bg-white dark:bg-slate-800 text-slate-500 ring-slate-200 dark:ring-slate-700'
                ]">
                    <i v-if="currentStep > 3" class="pi pi-check text-sm"></i>
                    <span v-else>3</span>
                </div>
                <p :class="['text-xs font-bold mt-2 whitespace-nowrap', currentStep >= 3 ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500']">
                    出力確認
                </p>
            </div>
        </div>
    </div>
</template>

<script setup>
defineProps({
    currentStep: {
        type: Number,
        required: true
    }
});
</script>