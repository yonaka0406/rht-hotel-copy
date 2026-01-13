<template>
    <div class="flex flex-col items-center justify-center flex-1 px-4 animate-fade-in">
        <div class="w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
            <div class="bg-violet-50 dark:bg-violet-900/20 p-8 text-center border-b border-slate-200 dark:border-slate-700">
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 mb-4">
                    <i class="pi pi-check-circle text-3xl font-bold"></i>
                </div>
                <h3 class="text-2xl font-black text-slate-900 dark:text-white mb-2">出力準備完了</h3>
                <p class="text-slate-600 dark:text-slate-400">売上データの最終確認が完了しました。</p>
            </div>

            <div class="p-8 space-y-8">
                <div class="grid grid-cols-2 gap-4">
                    <div class="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">総レコード数</span>
                        <span class="text-2xl font-black tabular-nums text-slate-900 dark:text-white">{{ previewData.length }}</span>
                    </div>
                    <div class="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">総金額</span>
                        <span class="text-2xl font-black tabular-nums text-violet-600 dark:text-violet-400">¥{{ totalAmount.toLocaleString() }}</span>
                    </div>
                </div>

                <div class="space-y-4">
                    <button @click="handleDownload" :disabled="loading" 
                        class="w-full flex cursor-pointer items-center justify-center gap-3 rounded-xl h-14 px-8 bg-violet-600 text-white text-lg font-bold hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-200 dark:hover:shadow-none transition-all disabled:opacity-50">
                        <i v-if="loading" class="pi pi-spin pi-spinner text-xl"></i>
                        <i v-else class="pi pi-download text-xl"></i>
                        <span>帳票をダウンロード (CSV)</span>
                    </button>
                    
                    <button @click="$emit('back')" :disabled="loading"
                        class="w-full flex cursor-pointer items-center justify-center gap-2 rounded-xl h-12 px-8 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-900 transition-all disabled:opacity-50">
                        <i class="pi pi-arrow-left text-sm"></i>
                        <span>データ確認に戻る</span>
                    </button>

                    <p class="text-center text-[10px] text-slate-400 pt-2 uppercase tracking-widest font-bold">
                        安全なERP接続: AES-256 暗号化済み
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAccounting } from '@/composables/useAccounting';

const props = defineProps({
    filters: {
        type: Object,
        required: true
    },
    previewData: {
        type: Array,
        required: true
    }
});

defineEmits(['back']);
const { downloadLedger, loading } = useAccounting();

const selectedFormat = ref('csv');
const emailCopy = ref(false);

const totalAmount = computed(() => {
    return props.previewData.reduce((sum, row) => sum + parseInt(row.total_amount || 0), 0);
});

const handleDownload = async () => {
    try {
        await downloadLedger({
            ...props.filters,
            format: selectedFormat.value,
            emailCopy: emailCopy.value
        });
    } catch (err) {
        console.error('Download failed', err);
    }
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