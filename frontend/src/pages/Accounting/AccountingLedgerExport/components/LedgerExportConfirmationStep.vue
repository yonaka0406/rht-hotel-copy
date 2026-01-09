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

                <div class="space-y-6">
                    <div class="flex flex-col gap-2">
                        <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">ファイル形式を選択</label>
                        <div class="grid grid-cols-4 gap-2">
                            <label v-for="fmt in ['excel', 'csv', 'pdf', 'json']" :key="fmt" class="cursor-pointer group">
                                <input type="radio" name="format" :value="fmt" v-model="selectedFormat" class="peer hidden">
                                <div class="flex flex-col items-center justify-center p-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 peer-checked:border-violet-600 peer-checked:bg-violet-50 dark:peer-checked:bg-violet-900/20 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-400 peer-checked:text-violet-700 dark:peer-checked:text-violet-300">
                                    <span class="text-xs font-bold uppercase">{{ fmt }}</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div class="flex items-center gap-3 py-2">
                        <Checkbox v-model="emailCopy" :binary="true" inputId="email-copy" />
                        <label for="email-copy" class="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                            レポートのコピーをメールで送信する
                        </label>
                    </div>

                    <div class="pt-4">
                        <button @click="handleDownload" :disabled="loading" 
                            class="w-full flex cursor-pointer items-center justify-center gap-3 rounded-xl h-14 px-8 bg-violet-600 text-white text-lg font-bold hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-200 dark:hover:shadow-none transition-all disabled:opacity-50">
                            <i v-if="loading" class="pi pi-spin pi-spinner text-xl"></i>
                            <i v-else class="pi pi-download text-xl"></i>
                            <span>帳票をダウンロード</span>
                        </button>
                        <p class="text-center text-[10px] text-slate-400 mt-4 uppercase tracking-widest font-bold">
                            安全なERP接続: AES-256 暗号化済み
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <div class="mt-8 flex justify-center">
            <button @click="$emit('back')" class="flex items-center gap-2 text-slate-500 hover:text-violet-600 transition-colors text-sm font-bold cursor-pointer">
                <i class="pi pi-arrow-left"></i>
                <span>データ確認に戻る</span>
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAccounting } from '@/composables/useAccounting';
import Checkbox from 'primevue/checkbox';

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

const selectedFormat = ref('excel');
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