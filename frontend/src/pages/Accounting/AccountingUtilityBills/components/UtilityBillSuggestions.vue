<template>
    <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div class="p-6 border-b border-slate-100 dark:border-slate-700">
            <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <i class="pi pi-lightbulb text-amber-500"></i>
                弥生データからの提案
                <i class="pi pi-question-circle text-slate-300 text-xs cursor-help" v-tooltip.right="'弥生会計（CSV）からインポートされた仕訳データの中から、水道光熱費に関連する項目を表示しています。'"></i>
            </h2>
            <p class="text-xs text-slate-500 mt-1">未入力の取引と思われる項目を表示しています</p>
        </div>
        <div class="max-h-[600px] overflow-y-auto">
            <div v-if="loading" class="p-6 space-y-4">
                <div v-for="i in 3" :key="i" class="animate-pulse flex flex-col gap-2">
                    <div class="h-4 bg-slate-100 rounded w-1/3"></div>
                    <div class="h-8 bg-slate-100 rounded"></div>
                </div>
            </div>
            <div v-else-if="suggestions.length === 0" class="p-8 text-center text-slate-400">
                <i class="pi pi-check-circle text-3xl mb-2"></i>
                <p>提案はありません</p>
            </div>
            <div v-else class="divide-y divide-slate-50 dark:divide-slate-700/50">
                <div v-for="(s, idx) in suggestions" :key="idx"
                    class="p-4 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500"
                    :class="{
                        'opacity-60 bg-slate-50/50 cursor-default': s.isRegistered,
                        'hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer': !s.isRegistered
                    }"
                    role="button"
                    :tabindex="s.isRegistered ? -1 : 0"
                    :aria-label="`${s.sub_account_name}の提案を選択: ${formatCurrency(Math.abs(s.amount))}`"
                    @click="!s.isRegistered && $emit('select', s)"
                    @keydown.enter="!s.isRegistered && $emit('select', s)"
                    @keydown.space.prevent="!s.isRegistered && $emit('select', s)">
                    <div class="flex justify-between items-start mb-1">
                        <div class="flex gap-1">
                            <Tag :value="formatDate(s.transaction_date)" severity="secondary" class="text-[10px]" />
                            <Tag v-if="s.isRegistered" value="登録済み" severity="success" class="text-[10px]" />
                        </div>
                        <span class="font-mono font-bold text-slate-900 dark:text-white">{{ formatCurrency(Math.abs(s.amount)) }}</span>
                    </div>
                    <div class="font-bold text-sm text-slate-700 dark:text-slate-300">{{ s.sub_account_name }}</div>
                    <div class="text-xs text-slate-400 truncate">{{ s.summary }}</div>
                    <div class="mt-2 text-[10px] text-violet-600 dark:text-violet-400 font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <i class="pi pi-plus"></i> 詳細を入力する
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import Tag from 'primevue/tag';

defineProps({
    suggestions: {
        type: Array,
        required: true
    },
    loading: {
        type: Boolean,
        default: false
    }
});

defineEmits(['select']);

const formatCurrency = (val) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(val);
};

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ja-JP');
};
</script>
