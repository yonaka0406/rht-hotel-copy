<template>
  <div class="bg-slate-50 dark:bg-slate-900 min-h-screen p-6 font-sans transition-colors duration-300">
    <div class="max-w-7xl mx-auto px-4">
      <!-- Hero Row -->
      <div class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <button @click="$router.push({ name: 'AccountingDashboard' })" class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:text-violet-600 hover:border-violet-200 transition-all cursor-pointer shadow-sm h-[46px]">
            <i class="pi pi-arrow-left text-sm"></i>
            <span>戻る</span>
          </button>
          <div>
            <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
              売掛金管理
            </h1>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              アップロードされた会計データ（弥生会計）に基づく売掛金残高の確認
            </p>
          </div>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Left Column: List -->
        <div class="lg:col-span-8">
          <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
            <!-- Summary/Filters -->
            <div class="p-8 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-between items-center gap-6">
              <div class="flex items-center gap-6">
                <div class="bg-violet-100 dark:bg-violet-900/40 p-4 rounded-2xl">
                  <i class="pi pi-wallet text-2xl text-violet-600 dark:text-violet-400"></i>
                </div>
                <div>
                  <p class="text-xs font-black text-slate-400 uppercase tracking-widest">売掛金総額</p>
                  <p class="text-3xl font-black text-slate-900 dark:text-white">{{ formatCurrency(totalReceivables) }}</p>
                </div>
              </div>
              
              <div class="flex items-center gap-4 w-full md:w-auto">
                <div class="flex items-center gap-2 mr-2">
                  <Checkbox id="excludeLatest" v-model="excludeLatestSales" :binary="true" />
                  <label for="excludeLatest" class="text-sm text-slate-600 dark:text-slate-400 font-bold cursor-pointer select-none">当月発生分を除外</label>
                </div>
                <div class="flex-1 md:w-64">
                  <IconField>
                    <InputIcon class="pi pi-search" />
                    <InputText 
                      v-model="tableSearch" 
                      placeholder="サブアカウント名で検索..." 
                      fluid
                    />
                  </IconField>
                </div>
                <button @click="loadBalances" :disabled="loading" class="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:text-violet-600 transition-all cursor-pointer shadow-sm disabled:opacity-50 h-[42px]">
                  <i class="pi pi-refresh" :class="{ 'pi-spin': loading }"></i>
                </button>
              </div>
            </div>

            <!-- Receivables Table -->
            <div class="p-0">
              <DataTable 
                :value="filteredBalances" 
                :loading="loading"
                stripedRows 
                paginator 
                :rows="10"
                class="accounting-datatable"
                responsiveLayout="scroll"
                selectionMode="single"
                v-model:selection="selectedRow"
                @row-select="onRowSelect"
                dataKey="sub_account"
              >
                <template #empty>
                  <div class="py-20 text-center">
                    <i class="pi pi-info-circle text-4xl text-slate-300 mb-3"></i>
                    <p class="text-slate-500 font-medium">売掛金データが見つかりません</p>
                  </div>
                </template>
                
                <Column field="sub_account" header="サブアカウント（顧客名）" sortable class="font-bold text-slate-700 dark:text-slate-300"></Column>
                
                <Column field="balance" header="残高" sortable class="text-right">
                  <template #body="slotProps">
                    <span :class="slotProps.data.balance > 0 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-900 dark:text-white'">
                      {{ formatCurrency(slotProps.data.balance) }}
                    </span>
                  </template>
                </Column>
                
                <Column field="last_activity_month" header="最終アクティビティ" sortable>
                  <template #body="slotProps">
                    <span class="text-sm text-slate-500 dark:text-slate-400">
                      {{ formatMonth(slotProps.data.last_activity_month) }}
                    </span>
                  </template>
                </Column>
                
                <Column header="操作" class="text-center w-24">
                  <template #body="slotProps">
                     <button 
                        @click.stop="openLinkDialog(slotProps.data)"
                        class="p-2 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg transition-all"
                        v-tooltip.top="'CRM連携・フォローアップ'"
                      >
                        <i class="pi pi-user-plus"></i>
                      </button>
                  </template>
                </Column>
              </DataTable>
            </div>
          </div>
        </div>

        <!-- Right Column: Details -->
        <div class="lg:col-span-4">
          <div v-if="selectedSubAccountHistory" class="sticky top-6">
            <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-fade-in">
               <div class="p-6 border-b border-slate-100 dark:border-slate-700 bg-violet-50 dark:bg-violet-900/20">
                  <h3 class="font-bold text-lg text-slate-800 dark:text-white mb-1">{{ selectedSubAccountForHistory }}</h3>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">現在残高:</span>
                    <span class="text-xl font-black text-violet-600 dark:text-violet-400">{{ formatCurrency(selectedHistoryBalance) }}</span>
                  </div>
               </div>

               <div v-if="historyLoading" class="p-10 flex justify-center">
                  <i class="pi pi-spin pi-spinner text-3xl text-violet-500"></i>
               </div>

               <div v-else class="max-h-[600px] overflow-y-auto custom-scrollbar">
                  <div v-if="historyData.length === 0" class="p-8 text-center text-slate-400">
                    履歴データがありません
                  </div>
                  <div v-else class="divide-y divide-slate-100 dark:divide-slate-700">
                    <div v-for="(item, index) in historyData" :key="index" class="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <div class="flex justify-between items-center mb-2">
                        <span class="font-bold text-slate-700 dark:text-slate-300">{{ formatMonth(item.month) }}</span>
                        <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                           純増減: {{ (item.monthly_change > 0 ? '+' : '') + formatCurrency(item.monthly_change) }}
                        </span>
                      </div>

                      <div class="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p class="text-[10px] text-slate-400 uppercase font-bold mb-0.5">加算額（売上等）</p>
                          <p class="text-sm font-bold text-red-600 dark:text-red-400">+{{ formatCurrency(item.total_increase) }}</p>
                        </div>
                        <div class="text-right">
                          <p class="text-[10px] text-slate-400 uppercase font-bold mb-0.5">減少額（入金等）</p>
                          <p class="text-sm font-bold text-emerald-600 dark:text-emerald-400">-{{ formatCurrency(item.total_decrease) }}</p>
                        </div>
                      </div>

                      <div class="flex justify-between items-end">
                        <span class="text-xs text-slate-400">月末残高</span>
                        <span class="font-bold" :class="item.cumulative_balance > 0 ? 'text-slate-800 dark:text-white' : 'text-slate-400'">
                           {{ formatCurrency(item.cumulative_balance) }}
                        </span>
                      </div>
                      <!-- Bar visual -->
                       <div class="mt-2 h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
                          <div 
                            class="h-full bg-violet-500 rounded-full transition-all duration-500" 
                            :style="{ width: Math.min(Math.max((item.cumulative_balance / maxHistoryBalance) * 100, 0), 100) + '%' }"
                          ></div>
                       </div>
                    </div>
                  </div>
               </div>
               
               <div class="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 text-center">
                  <button 
                    @click="openLinkDialog({ sub_account: selectedSubAccountForHistory, balance: selectedHistoryBalance })"
                    class="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-violet-600 dark:text-violet-400 font-bold hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-all shadow-sm"
                  >
                    アクションを追加
                  </button>
               </div>
            </div>
          </div>

          <div v-else class="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-slate-100 dark:bg-slate-800/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
             <div class="bg-white dark:bg-slate-800 p-6 rounded-full shadow-sm mb-4">
                <i class="pi pi-chart-line text-4xl text-slate-300"></i>
             </div>
             <h3 class="text-lg font-bold text-slate-400 mb-2">詳細を選択</h3>
             <p class="text-sm text-slate-400 max-w-[200px]">
               左側のリストからサブアカウントを選択して、月次の残高推移を確認できます。
             </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Client Linking & Action Dialog -->
    <Dialog 
      v-model:visible="linkDialogVisible" 
      :header="selectedSubAccount?.sub_account + ' のフォローアップ'" 
      modal 
      class="max-w-2xl w-full mx-4"
      :pt="{
        root: { class: 'dark:bg-slate-800 dark:border-slate-700 rounded-3xl border-none shadow-2xl' },
        header: { class: 'dark:bg-slate-800 dark:text-white p-6 border-b border-slate-100 dark:border-slate-700' },
        content: { class: 'p-0 dark:bg-slate-800' }
      }"
    >
      <div class="p-6">
        <!-- Step 1: Search Client -->
        <div v-if="!linkedClient">
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-4 font-medium">
            システム内のクライアントを検索して連携してください。
          </p>
          <div class="relative mb-6">
            <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              v-model="clientSearchQuery" 
              @input="debounceSearch"
              type="text" 
              placeholder="名前、電話番号、メールアドレスで検索..." 
              class="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-base focus:ring-2 focus:ring-violet-500 outline-none transition-all dark:text-white"
            />
          </div>

          <div v-if="isSearching" class="py-10 text-center">
            <i class="pi pi-spin pi-spinner text-2xl text-violet-600"></i>
          </div>

          <div v-else-if="searchResults.length > 0" class="flex flex-col gap-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            <div 
              v-for="client in searchResults" 
              :key="client.id"
              @click="selectClient(client)"
              class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-violet-500 dark:hover:border-violet-400 hover:shadow-md transition-all cursor-pointer group"
            >
              <div class="flex justify-between items-center">
                <div>
                  <h4 class="font-bold text-slate-900 dark:text-white group-hover:text-violet-600 transition-colors">
                    {{ client.name_kanji || client.name }} 
                    <span v-if="client.name_kana" class="text-xs font-medium text-slate-400 ml-2">({{ client.name_kana }})</span>
                  </h4>
                  <div class="flex items-center gap-4 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <span v-if="client.phone" class="flex items-center gap-1"><i class="pi pi-phone"></i> {{ client.phone }}</span>
                    <span v-if="client.email" class="flex items-center gap-1"><i class="pi pi-envelope"></i> {{ client.email }}</span>
                  </div>
                </div>
                <i class="pi pi-chevron-right text-slate-300 group-hover:text-violet-400 transition-all"></i>
              </div>
            </div>
          </div>

          <div v-else-if="clientSearchQuery.length >= 2" class="py-10 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <i class="pi pi-user-minus text-3xl text-slate-300 mb-2"></i>
            <p class="text-slate-500 font-medium">一致するクライアントが見つかりません</p>
          </div>
        </div>

        <!-- Step 2: Create CRM Action -->
        <div v-else class="animate-fade-in">
          <div class="bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-900/50 p-4 rounded-2xl mb-8 flex justify-between items-center">
            <div class="flex items-center gap-4">
              <div class="bg-violet-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-lg shadow-violet-200 dark:shadow-none">
                {{ (linkedClient.name_kanji || linkedClient.name).charAt(0) }}
              </div>
              <div>
                <p class="text-xs font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest">連携中のクライアント</p>
                <h4 class="font-bold text-slate-900 dark:text-white">{{ linkedClient.name_kanji || linkedClient.name }}</h4>
              </div>
            </div>
            <button @click="linkedClient = null" class="text-xs font-bold text-slate-400 hover:text-red-500 transition-all cursor-pointer">
              変更する
            </button>
          </div>

          <div class="flex flex-col gap-6">
            <div class="flex flex-col gap-2">
              <label class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">アクション内容</label>
              <textarea 
                v-model="crmAction.details"
                rows="4"
                placeholder="督促の電話、メール送信、状況確認など..."
                class="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-violet-500 outline-none transition-all dark:text-white resize-none"
              ></textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-2">
                <label class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">タイプ</label>
                <Select v-model="crmAction.action_type" :options="actionTypes" optionLabel="label" optionValue="value" fluid />
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">期限</label>
                <DatePicker v-model="crmAction.due_date" dateFormat="yy/mm/dd" fluid />
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-between p-6 border-t border-slate-100 dark:border-slate-700">
          <button @click="closeLinkDialog" class="px-6 py-3 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-all cursor-pointer">
            キャンセル
          </button>
          <button 
            v-if="linkedClient"
            @click="submitCRMAction" 
            :disabled="!isActionValid || isSubmitting"
            class="px-8 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-all shadow-lg shadow-violet-200 dark:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <i v-if="isSubmitting" class="pi pi-spin pi-spinner"></i>
            <span>アクションを追加</span>
          </button>
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue';
import { useAccountingReceivables } from '@/composables/useAccountingReceivables';
import { useToast } from 'primevue/usetoast';
import axios from 'axios';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';

const toast = useToast();
const { balances, searchResults, loading, fetchBalances, searchClients, fetchHistory } = useAccountingReceivables();

const tableSearch = ref('');
const linkDialogVisible = ref(false);
const selectedSubAccount = ref(null); // For Dialog
const selectedRow = ref(null); // For DataTable selection
const excludeLatestSales = ref(false);

// History State
const selectedSubAccountForHistory = ref(null);
const selectedSubAccountHistory = ref(false);
const historyData = ref([]);
const historyLoading = ref(false);
const selectedHistoryBalance = ref(0);

const clientSearchQuery = ref('');
const isSearching = ref(false);
const linkedClient = ref(null);
const isSubmitting = ref(false);

const crmAction = reactive({
    details: '',
    action_type: 'call',
    due_date: new Date()
});

const actionTypes = [
    { label: '電話', value: 'call' },
    { label: 'メール', value: 'email' },
    { label: '訪問', value: 'visit' },
    { label: '会議', value: 'meeting' },
    { label: 'タスク', value: 'task' }
];

// Computed
const totalReceivables = computed(() => {
    return balances.value.reduce((sum, item) => {
        let balance = Number(item.balance || 0);
        if (excludeLatestSales.value) {
            balance -= Number(item.latest_month_sales || 0);
        }
        return sum + balance;
    }, 0);
});

const filteredBalances = computed(() => {
    let result = balances.value;
    
    if (tableSearch.value) {
        const query = tableSearch.value.toLowerCase();
        result = result.filter(item => 
            item.sub_account.toLowerCase().includes(query)
        );
    }

    if (excludeLatestSales.value) {
        // Map to new objects with adjusted balance and filter out those with no remaining balance
        result = result.map(item => ({
            ...item,
            balance: Number(item.balance || 0) - Number(item.latest_month_sales || 0)
        })).filter(item => item.balance > 0);
    }
    
    return result;
});

const isActionValid = computed(() => {
    return crmAction.details.trim().length > 0;
});

const maxHistoryBalance = computed(() => {
    if (!historyData.value.length) return 1;
    return Math.max(...historyData.value.map(d => Number(d.cumulative_balance)));
});

// Methods
const formatCurrency = (value) => {
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
        minimumFractionDigits: 0
    }).format(value || 0);
};

const formatMonth = (dateStr) => {
    if (!dateStr) return '-';
    // Handle both YYYY-MM-DD and YYYY-MM
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月`;
};

const loadBalances = async () => {
    await fetchBalances();
};

const onRowSelect = async (event) => {
    const subAccount = event.data.sub_account;
    const balance = event.data.balance;
    
    selectedSubAccountForHistory.value = subAccount;
    selectedHistoryBalance.value = balance;
    selectedSubAccountHistory.value = true;
    historyLoading.value = true;
    
    try {
        historyData.value = await fetchHistory(subAccount);
    } catch (e) {
        console.error(e);
        toast.add({ severity: 'error', summary: 'エラー', detail: '履歴の取得に失敗しました', life: 3000 });
    } finally {
        historyLoading.value = false;
    }
};

const openLinkDialog = (item) => {
    selectedSubAccount.value = item;
    clientSearchQuery.value = item.sub_account;
    linkedClient.value = null;
    crmAction.details = `売掛金フォローアップ: ${formatCurrency(item.balance)} の支払いについて`;
    linkDialogVisible.value = true;
    
    // Auto trigger initial search
    debounceSearch();
};

const closeLinkDialog = () => {
    linkDialogVisible.value = false;
    selectedSubAccount.value = null;
    linkedClient.value = null;
    clientSearchQuery.value = '';
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

const selectClient = (client) => {
    linkedClient.value = client;
};

const submitCRMAction = async () => {
    if (!linkedClient.value || isSubmitting.value) return;
    
    isSubmitting.value = true;
    try {
        const payload = {
            actionFields: {
                client_id: linkedClient.value.id,
                action_type: crmAction.action_type,
                subject: '売掛金フォローアップ',
                details: crmAction.details,
                due_date: crmAction.due_date,
                status: 'pending'
            }
        };
        
        const response = await axios.post('/crm/action', payload);
        
        if (response.status === 201 || response.status === 200) {
            toast.add({
                severity: 'success',
                summary: '成功',
                detail: 'CRMアクションを追加しました。',
                life: 3000
            });
            closeLinkDialog();
        }
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

onMounted(() => {
    loadBalances();
});
</script>

<style scoped>
.accounting-datatable :deep(.p-datatable-thead > tr > th) {
    background: transparent;
    border-bottom: 2px solid #f1f5f9;
    color: #64748b;
    font-size: 0.75rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 1.25rem 1rem;
}

.dark .accounting-datatable :deep(.p-datatable-thead > tr > th) {
    border-bottom-color: #334155;
    color: #94a3b8;
}

.accounting-datatable :deep(.p-datatable-tbody > tr) {
    transition: all 0.2s;
}

.accounting-datatable :deep(.p-datatable-tbody > tr > td) {
    padding: 1.25rem 1rem;
    border-bottom: 1px solid #f8fafc;
}

.dark .accounting-datatable :deep(.p-datatable-tbody > tr > td) {
    border-bottom-color: #1e293b;
}

.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
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

/* Dark Mode Component Fixes */
.dark :deep(.p-dialog-header),
.dark :deep(.p-dialog-content),
.dark :deep(.p-dialog-footer) {
    background: #1e293b !important;
}

.dark :deep(.p-select) {
    background: #0f172a !important;
    border-color: #334155 !important;
}

.dark :deep(.p-select-label) {
    color: #f8fafc !important;
}

.dark :deep(.p-datepicker-input) {
    background: #0f172a !important;
    border-color: #334155 !important;
    color: #f8fafc !important;
}
</style>
