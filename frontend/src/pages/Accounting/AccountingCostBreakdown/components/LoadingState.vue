<template>
    <div>
        <!-- Empty State -->
        <div v-if="!loading && isEmpty"
            class="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <i class="pi pi-inbox text-6xl text-slate-200 mb-4"></i>
            <p class="text-slate-500 font-bold">データが見つかりません</p>
            <p class="text-slate-400 text-sm mt-1">会計データをインポートしてください</p>
        </div>

        <!-- Skeleton Loading -->
        <div v-if="loading" class="space-y-8">
            <div class="h-64 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-3xl"></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div v-for="i in 4" :key="i" class="h-64 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-3xl">
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    loading: {
        type: Boolean,
        default: false
    },
    isEmpty: {
        type: Boolean,
        default: false
    }
});
</script>