<template>
    <Dialog 
      :visible="visible" 
      @update:visible="$emit('update:visible', $event)"
      :header="subAccount?.sub_account + ' のフォローアップ'" 
      modal 
      class="max-w-4xl w-full mx-4"
      :pt="{
        root: { class: 'dark:bg-slate-800 dark:border-slate-700 rounded-3xl border-none shadow-2xl' },
        header: { class: 'dark:bg-slate-800 dark:text-white p-6 border-b border-slate-100 dark:border-slate-700' },
        content: { class: 'p-0 dark:bg-slate-800' }
      }"
    >
      <div class="flex flex-col lg:flex-row h-[600px] overflow-hidden">
        <!-- Sidebar: Client Search / Selected Client Info -->
        <div class="lg:w-1/3 border-r border-slate-100 dark:border-slate-700 flex flex-col bg-slate-50/50 dark:bg-slate-900/20">
            <div class="p-6 overflow-y-auto custom-scrollbar flex-1">
                <!-- Step 1: Search Client -->
                <div v-if="!linkedClient">
                    <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">クライアントを検索</h3>
                    <div class="relative mb-6">
                        <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input 
                            v-model="clientSearchQuery" 
                            @input="debounceSearch"
                            type="text" 
                            placeholder="名前、電話番号..." 
                            class="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-violet-500 outline-none transition-all dark:text-white"
                        />
                    </div>

                    <div v-if="isSearching" class="py-10 text-center">
                        <i class="pi pi-spin pi-spinner text-2xl text-violet-600"></i>
                    </div>

                    <div v-else-if="searchResults.length > 0" class="flex flex-col gap-2">
                        <div 
                            v-for="client in searchResults" 
                            :key="client.id"
                            @click="selectClient(client)"
                            class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-violet-500 dark:hover:border-violet-400 hover:shadow-sm transition-all cursor-pointer group"
                        >
                            <h4 class="font-bold text-slate-900 dark:text-white text-sm group-hover:text-violet-600 truncate">
                                {{ client.name_kanji || client.name }} 
                            </h4>
                            <p v-if="client.name_kana" class="text-[10px] font-medium text-slate-400 truncate">{{ client.name_kana }}</p>
                        </div>
                    </div>

                    <div v-else-if="clientSearchQuery.length >= 2" class="py-10 text-center bg-white dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <p class="text-slate-400 text-xs font-medium">一致するクライアントが<br>見つかりません</p>
                    </div>
                </div>

                <!-- Step 2: Selected Client Info -->
                <div v-else class="animate-fade-in">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest">連携中のクライアント</h3>
                        <button @click="linkedClient = null" class="text-[10px] font-bold text-violet-600 hover:text-red-500 transition-all cursor-pointer bg-transparent border-none">
                            変更
                        </button>
                    </div>
                    
                    <div class="bg-white dark:bg-slate-900 border border-violet-100 dark:border-violet-900/50 p-4 rounded-2xl mb-6 shadow-sm">
                        <div class="flex items-center gap-3">
                            <div class="bg-violet-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold">
                                {{ (linkedClient.name_kanji || linkedClient.name).charAt(0) }}
                            </div>
                            <div class="overflow-hidden">
                                <h4 class="font-bold text-slate-900 dark:text-white truncate">{{ linkedClient.name_kanji || linkedClient.name }}</h4>
                                <p class="text-[10px] text-slate-400 truncate">{{ linkedClient.email || linkedClient.phone || '連絡先未登録' }}</p>
                            </div>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <div class="flex flex-col gap-1.5">
                            <label class="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">売掛金残高</label>
                            <p class="text-lg font-black text-slate-900 dark:text-white">{{ formatCurrency(subAccount?.balance) }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Main Area: History and Form -->
        <div class="flex-1 flex flex-col bg-white dark:bg-slate-800 overflow-hidden">
            <div v-if="!linkedClient" class="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-50">
                <i class="pi pi-user-plus text-5xl text-slate-200 mb-4"></i>
                <h3 class="text-lg font-bold text-slate-400">クライアントを連携してください</h3>
                <p class="text-sm text-slate-400 max-w-xs">フォローアップ履歴の確認と新規アクションの追加を行うには、まずシステム内のクライアントと連携してください。</p>
            </div>

            <template v-else>
                <!-- Tabs: History / New Action -->
                <div class="flex border-b border-slate-100 dark:border-slate-700 px-6">
                    <button 
                        v-for="tab in ['history', 'new']" 
                        :key="tab"
                        @click="activeTab = tab"
                        class="px-6 py-4 text-sm font-bold transition-all relative bg-transparent border-none cursor-pointer"
                        :class="activeTab === tab ? 'text-violet-600' : 'text-slate-400 hover:text-slate-600'"
                    >
                        {{ tab === 'history' ? '過去の履歴' : '新規アクション' }}
                        <div v-if="activeTab === tab" class="absolute bottom-0 left-0 w-full h-0.5 bg-violet-600"></div>
                    </button>
                </div>

                <!-- Tab Content -->
                <div class="flex-1 overflow-hidden">
                    <!-- History Tab -->
                    <div v-if="activeTab === 'history'" class="h-full overflow-y-auto custom-scrollbar p-6">
                        <div v-if="isLoadingActions" class="py-20 text-center">
                            <i class="pi pi-spin pi-spinner text-3xl text-violet-600"></i>
                        </div>
                        <div v-else-if="client_actions.length === 0" class="py-20 text-center text-slate-400 italic">
                            過去のフォローアップ履歴はありません
                        </div>
                        <div v-else class="space-y-4">
                            <div v-for="action in sortedActions" :key="action.id" class="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-2xl relative overflow-hidden group">
                                <div class="absolute top-0 left-0 w-1 h-full" :class="getActionTypeBg(action.action_type)"></div>
                                <div class="flex justify-between items-start mb-2 pl-2">
                                    <div class="flex items-center gap-2">
                                        <span class="text-xs font-black px-2 py-0.5 rounded-md uppercase" :class="getActionTypeBadge(action.action_type)">
                                            {{ translateCrmActionType(action.action_type) }}
                                        </span>
                                        <h5 class="font-bold text-slate-900 dark:text-white text-sm">{{ action.subject }}</h5>
                                    </div>
                                    <span class="text-[10px] font-medium text-slate-400">{{ formatDateTime(action.action_datetime) }}</span>
                                </div>
                                <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap pl-2">{{ action.details }}</p>
                                <div v-if="action.outcome" class="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 pl-2">
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">結果</p>
                                    <p class="text-xs text-emerald-600 dark:text-emerald-400 italic">{{ action.outcome }}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- New Action Tab -->
                    <div v-if="activeTab === 'new'" class="h-full overflow-y-auto custom-scrollbar p-6">
                        <div class="flex flex-col gap-6 max-w-lg mx-auto">
                            <div class="flex flex-col gap-2">
                                <label class="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">アクション内容</label>
                                <textarea 
                                    v-model="crmAction.details"
                                    rows="6"
                                    placeholder="督促の電話、メール送信、状況確認など..."
                                    class="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-violet-500 outline-none transition-all dark:text-white resize-none"
                                ></textarea>
                            </div>

                            <div class="grid grid-cols-2 gap-4">
                                <div class="flex flex-col gap-2">
                                    <label class="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">タイプ</label>
                                    <Select v-model="crmAction.action_type" :options="actionTypeOptions" optionLabel="label" optionValue="value" fluid />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label class="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">期限</label>
                                    <DatePicker v-model="crmAction.due_date" dateFormat="yy/mm/dd" fluid />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-between p-6 border-t border-slate-100 dark:border-slate-700">
          <button @click="close" class="px-6 py-3 bg-transparent text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-all cursor-pointer border-none">
            キャンセル
          </button>
          <div class="flex items-center gap-3">
              <button 
                v-if="linkedClient && activeTab === 'history'"
                @click="activeTab = 'new'"
                class="px-6 py-3 bg-white dark:bg-slate-800 text-violet-600 border border-violet-200 dark:border-violet-700 font-bold rounded-xl hover:bg-violet-50 transition-all cursor-pointer"
              >
                新規アクション
              </button>
              <button 
                v-if="linkedClient && activeTab === 'new'"
                @click="submitCRMAction" 
                :disabled="!isActionValid || isSubmitting"
                class="px-8 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-all shadow-lg shadow-violet-200 dark:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border-none"
              >
                <i v-if="isSubmitting" class="pi pi-spin pi-spinner"></i>
                <span>アクションを登録</span>
              </button>
          </div>
        </div>
      </template>
    </Dialog>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue';
import { useAccountingReceivables } from '@/composables/useAccountingReceivables';
import { useCRMStore } from '@/composables/useCRMStore';
import { useToast } from 'primevue/usetoast';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import { translateCrmActionType } from '@/utils/clientUtils';

const props = defineProps({
    visible: Boolean,
    subAccount: Object
});

const emit = defineEmits(['update:visible', 'success']);

const toast = useToast();
const { searchResults, searchClients } = useAccountingReceivables();
const { client_actions, fetchClientActions, addAction } = useCRMStore();

// UI State
const activeTab = ref('history'); // history, new
const clientSearchQuery = ref('');
const isSearching = ref(false);
const linkedClient = ref(null);
const isSubmitting = ref(false);
const isLoadingActions = ref(false);

const crmAction = reactive({
    details: '',
    action_type: 'call',
    due_date: new Date()
});

const actionTypeOptions = [
    { label: '電話', value: 'call' },
    { label: 'メール', value: 'email' },
    { label: '訪問', value: 'visit' },
    { label: '会議', value: 'meeting' },
    { label: 'タスク', value: 'task' },
    { label: 'メモ', value: 'note' }
];

// Computed
const sortedActions = computed(() => {
    return [...client_actions.value].sort((a, b) => new Date(b.action_datetime) - new Date(a.action_datetime));
});

const isActionValid = computed(() => {
    return crmAction.details.trim().length > 0;
});

// Watchers
watch(() => props.visible, (newVal) => {
    if (newVal) {
        resetDialog();
        if (props.subAccount) {
            clientSearchQuery.value = props.subAccount.sub_account;
            debounceSearch();
        }
    }
});

// Methods
const formatCurrency = (value) => {
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
        minimumFractionDigits: 0
    }).format(value || 0);
};

const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('ja-JP', { 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit' 
    });
};

const resetDialog = () => {
    activeTab.value = 'history';
    clientSearchQuery.value = '';
    linkedClient.value = null;
    crmAction.details = '';
    crmAction.action_type = 'call';
    crmAction.due_date = new Date();
    client_actions.value = [];
};

let searchTimeout = null;
const debounceSearch = () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    
    if (clientSearchQuery.value.trim().length < 2) {
        searchResults.value = [];
        return;
    }

    isSearching.value = true;
    searchTimeout = setTimeout(async () => {
        await searchClients(clientSearchQuery.value);
        isSearching.value = false;
    }, 500);
};

const selectClient = async (client) => {
    linkedClient.value = client;
    crmAction.details = `売掛金フォローアップ: ${formatCurrency(props.subAccount?.balance)} の支払いについて`;
    
    // Load actions
    isLoadingActions.value = true;
    try {
        await fetchClientActions(client.id);
        if (client_actions.value.length === 0) {
            activeTab.value = 'new';
        }
    } catch (e) {
        console.error(e);
    } finally {
        isLoadingActions.value = false;
    }
};

const submitCRMAction = async () => {
    if (!linkedClient.value || isSubmitting.value) return;
    
    isSubmitting.value = true;
    try {
        const payload = {
            client_id: linkedClient.value.id,
            action_type: crmAction.action_type,
            subject: '売掛金フォローアップ',
            details: crmAction.details,
            due_date: crmAction.due_date,
            action_datetime: new Date(), // Set current time as action time
            status: 'pending'
        };
        
        await addAction(payload);
        
        toast.add({
            severity: 'success',
            summary: '成功',
            detail: 'CRMアクションを追加しました。',
            life: 3000
        });
        
        // Refresh actions list and switch back to history
        await fetchClientActions(linkedClient.value.id);
        activeTab.value = 'history';
        crmAction.details = ''; // Clear form
    } catch (error) {
        console.error('Error submitting CRM action:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: 'アクションの追加に失敗しました。',
            life: 3000
        });
    } finally {
        isSubmitting.value = false;
    }
};

const getActionTypeBadge = (type) => {
    const classes = {
        call: 'bg-blue-100 text-blue-700',
        email: 'bg-cyan-100 text-cyan-700',
        visit: 'bg-indigo-100 text-indigo-700',
        meeting: 'bg-violet-100 text-violet-700',
        task: 'bg-amber-100 text-amber-700',
        note: 'bg-slate-100 text-slate-700'
    };
    return classes[type] || 'bg-slate-100 text-slate-700';
};

const getActionTypeBg = (type) => {
    const classes = {
        call: 'bg-blue-500',
        email: 'bg-cyan-500',
        visit: 'bg-indigo-500',
        meeting: 'bg-violet-500',
        task: 'bg-amber-500',
        note: 'bg-slate-500'
    };
    return classes[type] || 'bg-slate-500';
};

const close = () => {
    emit('update:visible', false);
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
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

@keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
    animation: fade-in 0.3s ease-out forwards;
}
</style>
