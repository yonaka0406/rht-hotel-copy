<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAccountingStore } from '@/composables/useAccountingStore';
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";

const router = useRouter();
const accountingStore = useAccountingStore();
const confirm = useConfirm();
const toast = useToast();

const currentStep = ref(1); // 1: Upload, 2: Review, 3: Success
const selectedFile = ref(null);
const isProcessing = ref(false);
const importSummary = ref(null);

const onFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
        if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
            toast.add({ severity: 'error', summary: 'エラー', detail: 'CSVまたはTXTファイルを選択してください', life: 3000 });
            return;
        }
        selectedFile.value = file;
        handlePreview();
    }
};

const handlePreview = async () => {
    if (!selectedFile.value) return;
    
    isProcessing.value = true;
    try {
        const data = await accountingStore.previewYayoiImport(selectedFile.value);
        importSummary.value = data;
        currentStep.value = 2;
    } catch (err) {
        console.error(err);
        toast.add({ severity: 'error', summary: 'エラー', detail: 'ファイルの解析に失敗しました', life: 3000 });
    } finally {
        isProcessing.value = false;
    }
};

const confirmImport = () => {
    confirm.require({
        message: `${importSummary.value.minDate} から ${importSummary.value.maxDate} の期間の既存データを削除し、新しくデータをインポートします。よろしいですか？`,
        header: 'インポートの確認',
        icon: 'pi pi-exclamation-triangle',
        acceptProps: {
            label: 'はい、インポートします',
            severity: 'danger'
        },
        rejectProps: {
            label: 'キャンセル',
            severity: 'secondary',
            outlined: true
        },
        accept: () => {
            handleImport();
        }
    });
};

const handleImport = async () => {
    isProcessing.value = true;
    try {
        await accountingStore.executeYayoiImport(selectedFile.value);
        currentStep.value = 3;
        toast.add({ severity: 'success', summary: '完了', detail: 'インポートが正常に終了しました', life: 3000 });
    } catch (err) {
        console.error(err);
        toast.add({ severity: 'error', summary: 'エラー', detail: 'インポートに失敗しました', life: 3000 });
    } finally {
        isProcessing.value = false;
    }
};

const reset = () => {
    selectedFile.value = null;
    importSummary.value = null;
    currentStep.value = 1;
};

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ja-JP');
};
</script>

<template>
    <div class="bg-slate-50 dark:bg-slate-900 min-h-screen p-6 font-sans">
        <div class="max-w-4xl mx-auto">
            <!-- Header -->
            <div class="mb-8 flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <button @click="router.push({ name: 'AccountingDashboard' })" class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:text-violet-600 hover:border-violet-200 transition-all cursor-pointer shadow-sm h-[42px]">
                        <i class="pi pi-arrow-left text-sm"></i>
                        <span>戻る</span>
                    </button>
                    <div>
                        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">弥生会計インポート</h1>
                        <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">会計データの取り込みと自動照合</p>
                    </div>
                </div>

                <!-- Stepper Indicator -->
                <div class="hidden sm:flex items-center gap-3">
                    <div v-for="step in 3" :key="step" class="flex items-center">
                        <div :class="[
                            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
                            currentStep === step ? 'bg-violet-600 text-white ring-4 ring-violet-100 dark:ring-violet-900/30' : 
                            currentStep > step ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                        ]">
                            <i v-if="currentStep > step" class="pi pi-check text-xs"></i>
                            <span v-else>{{ step }}</span>
                        </div>
                        <div v-if="step < 3" :class="[
                            'w-8 h-0.5 mx-1',
                            currentStep > step ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                        ]"></div>
                    </div>
                </div>
            </div>

            <!-- Step 1: Upload -->
            <div v-if="currentStep === 1" class="animate-fade-in">
                <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div class="p-8 sm:p-12 text-center">
                        <div class="w-20 h-20 bg-violet-100 dark:bg-violet-900/30 rounded-3xl flex items-center justify-center mx-auto mb-8 transform rotate-3">
                            <i class="pi pi-upload text-3xl text-violet-600 dark:text-violet-400"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-3">ファイルアップロード</h2>
                        <p class="text-slate-500 dark:text-slate-400 mb-10 max-w-md mx-auto leading-relaxed">
                            弥生会計からエクスポートした仕訳日記帳ファイル（CSVまたはTXT）を選択してください。
                        </p>
                        
                        <label class="relative group cursor-pointer block">
                            <input type="file" class="hidden" @change="onFileSelect" accept=".csv,.txt" :disabled="isProcessing" />
                            <div class="border-3 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-12 group-hover:border-violet-400 group-hover:bg-violet-50/30 dark:group-hover:bg-violet-900/10 transition-all duration-300">
                                <template v-if="isProcessing">
                                    <i class="pi pi-spin pi-spinner text-4xl text-violet-500 mb-4 block"></i>
                                    <span class="text-lg font-bold text-slate-700 dark:text-slate-200">ファイルを解析中...</span>
                                </template>
                                <template v-else>
                                    <div class="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-sm">
                                        <i class="pi pi-file text-3xl text-slate-400 group-hover:text-violet-500 transition-colors"></i>
                                    </div>
                                    <span class="text-lg font-bold text-slate-700 dark:text-slate-200 block mb-1">
                                        クリックしてファイルを選択
                                    </span>
                                    <span class="text-sm text-slate-400">
                                        またはここにドロップしてください
                                    </span>
                                </template>
                            </div>
                        </label>

                        <div class="mt-10 flex items-center justify-center gap-6 text-xs font-medium text-slate-400 uppercase tracking-widest">
                            <span class="flex items-center gap-2"><i class="pi pi-check-circle text-emerald-500"></i> CSV / TXT 形式</span>
                            <span class="flex items-center gap-2"><i class="pi pi-check-circle text-emerald-500"></i> Shift-JIS 対応</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Step 2: Review -->
            <div v-else-if="currentStep === 2" class="animate-fade-in">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div class="lg:col-span-2 space-y-6">
                        <!-- Summary Card -->
                        <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
                            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                <i class="pi pi-info-circle text-violet-500"></i>
                                インポート内容の確認
                            </h3>
                            
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div class="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">ファイル名</span>
                                    <span class="text-sm font-bold text-slate-700 dark:text-slate-200 truncate block">{{ importSummary.fileName }}</span>
                                </div>
                                <div class="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">合計行数</span>
                                    <span class="text-sm font-bold text-slate-700 dark:text-slate-200 block">{{ importSummary.rowCount.toLocaleString() }} 行</span>
                                </div>
                                <div class="p-5 rounded-2xl bg-violet-50/50 dark:bg-violet-900/10 border border-violet-100/50 dark:border-violet-900/30 sm:col-span-2">
                                    <span class="text-[10px] font-bold text-violet-500 uppercase tracking-widest block mb-3">対象期間</span>
                                    <div class="flex items-center justify-between">
                                        <div class="text-center flex-1">
                                            <span class="text-xs text-slate-400 block mb-1">開始日</span>
                                            <span class="text-lg font-bold text-slate-900 dark:text-white">{{ formatDate(importSummary.minDate) }}</span>
                                        </div>
                                        <div class="px-4 text-slate-300">
                                            <i class="pi pi-arrow-right"></i>
                                        </div>
                                        <div class="text-center flex-1">
                                            <span class="text-xs text-slate-400 block mb-1">終了日</span>
                                            <span class="text-lg font-bold text-slate-900 dark:text-white">{{ formatDate(importSummary.maxDate) }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3">
                                <i class="pi pi-exclamation-triangle text-amber-600 dark:text-amber-400 mt-1"></i>
                                <div class="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                                    <strong>注意:</strong> インポートを実行すると、上記期間内の既存データはすべて<strong>削除され、新しいデータに置き換わります。</strong>この操作は取り消せません。
                                </div>
                            </div>
                        </div>

                        <!-- Departments List -->
                        <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
                            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-6">検出された部門</h3>
                            <div class="flex flex-wrap gap-2">
                                <span v-for="dept in importSummary.departments" :key="dept" class="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-600">
                                    {{ dept || '(空)' }}
                                </span>
                            </div>
                            
                            <div v-if="importSummary.unmappedDepartments.length > 0" class="mt-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-3">
                                <i class="pi pi-exclamation-circle text-rose-600 dark:text-rose-400 mt-1"></i>
                                <div>
                                    <p class="text-sm font-bold text-rose-800 dark:text-rose-300">未登録の部門が検出されました</p>
                                    <p class="text-xs text-rose-700 dark:text-rose-400 mt-1 leading-relaxed">
                                        以下の部門名は「部門設定」に登録されていません。インポートは可能ですが、レポートで正しく集計されない可能性があります。
                                    </p>
                                    <div class="mt-3 flex flex-wrap gap-1">
                                        <span v-for="dept in importSummary.unmappedDepartments" :key="dept" class="px-2 py-1 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-[10px] font-bold rounded">
                                            {{ dept }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Unknown Accounts List -->
                        <div v-if="importSummary.unknownAccounts.length > 0" class="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
                            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-6">未登録の勘定科目</h3>
                            <div class="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3">
                                <i class="pi pi-exclamation-triangle text-amber-600 dark:text-amber-400 mt-1"></i>
                                <div>
                                    <p class="text-sm font-bold text-amber-800 dark:text-amber-300">マスタに存在しない科目が検出されました</p>
                                    <p class="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                                        以下の科目は「勘定科目マスタ」に登録されていません。インポート後、レポートに表示されない可能性があります。
                                    </p>
                                    <div class="mt-3 flex flex-wrap gap-1">
                                        <span v-for="acc in importSummary.unknownAccounts" :key="acc" class="px-2 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded">
                                            {{ acc }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="space-y-6">
                        <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 sticky top-6">
                            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-6">アクション</h3>
                            <button @click="confirmImport" :disabled="isProcessing" class="w-full py-4 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white font-bold rounded-2xl shadow-lg shadow-violet-200 dark:shadow-none transition-all mb-4 flex items-center justify-center gap-2">
                                <i v-if="isProcessing" class="pi pi-spin pi-spinner"></i>
                                <i v-else class="pi pi-cloud-upload"></i>
                                インポートを実行
                            </button>
                            <button @click="reset" :disabled="isProcessing" class="w-full py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                                <i class="pi pi-times"></i>
                                ファイルを選び直す
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Step 3: Success -->
            <div v-else-if="currentStep === 3" class="animate-fade-in">
                <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <div class="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-8">
                        <i class="pi pi-check text-5xl text-emerald-500"></i>
                    </div>
                    <h2 class="text-3xl font-bold text-slate-900 dark:text-white mb-4">インポート完了</h2>
                    <p class="text-slate-500 dark:text-slate-400 mb-10 max-w-md mx-auto">
                        弥生会計データのインポートが正常に終了しました。<br>
                        ダッシュボードで最新の状況を確認できます。
                    </p>
                    
                    <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button @click="router.push({ name: 'AccountingDashboard' })" class="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl hover:scale-105 transition-transform">
                            ダッシュボードに戻る
                        </button>
                        <button @click="reset" class="px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                            続けてインポートする
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>