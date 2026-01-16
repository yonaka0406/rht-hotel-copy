<template>
  <div class="bg-slate-50 dark:bg-slate-900 min-h-screen p-6 font-sans transition-colors duration-300">
    <div class="max-w-7xl mx-auto px-4">
      <!-- Hero Row -->
      <div class="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-300">
        <div class="flex items-center gap-6">
          <div class="flex-shrink-0 inline-flex items-center justify-center w-16 h-16 bg-violet-600 rounded-2xl shadow-lg shadow-violet-200 dark:shadow-none">
            <i class="pi pi-chart-bar text-3xl text-white"></i>
          </div>
          <div class="text-left">
            <h1 class="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              損益計算書
            </h1>
            <p class="text-slate-500 dark:text-slate-400 font-medium">
              部門別・ホテル別の損益分析レポート
            </p>
          </div>
        </div>
        
        <button @click="$router.push({ name: 'AccountingDashboard' })" class="flex items-center gap-2 px-6 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-black hover:text-violet-600 hover:border-violet-200 transition-all cursor-pointer">
          <i class="pi pi-arrow-left text-sm"></i>
          <span>ダッシュボードに戻る</span>
        </button>
      </div>

      <!-- Main Content Card -->
      <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
        <!-- Filters Section -->
        <div class="p-8 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <!-- Period Filter - Takes 2 columns on large screens -->
            <div class="flex flex-col gap-2 lg:col-span-2">
              <label class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">期間</label>
              <div class="flex items-center gap-2">
                <Select v-model="filters.startMonth" :options="availableMonths" placeholder="開始月" fluid class="text-sm">
                  <template #value="slotProps">
                    <span v-if="slotProps.value">{{ formatMonth(slotProps.value) }}</span>
                    <span v-else class="text-slate-400">開始月</span>
                  </template>
                  <template #option="slotProps">
                    {{ formatMonth(slotProps.option) }}
                  </template>
                </Select>
                <span class="text-slate-400 font-bold flex-shrink-0">〜</span>
                <Select v-model="filters.endMonth" :options="availableMonths" placeholder="終了月" fluid class="text-sm">
                  <template #value="slotProps">
                    <span v-if="slotProps.value">{{ formatMonth(slotProps.value) }}</span>
                    <span v-else class="text-slate-400">終了月</span>
                  </template>
                  <template #option="slotProps">
                    {{ formatMonth(slotProps.option) }}
                  </template>
                </Select>
              </div>
            </div>

            <!-- View By Filter -->
            <div class="flex flex-col gap-2">
              <label class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">表示単位</label>
              <Select v-model="filters.groupBy" :options="groupByOptions" optionLabel="label" optionValue="value" fluid />
            </div>

            <!-- Hotel/Department Filter -->
            <div class="flex flex-col gap-2">
              <label class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">部門</label>
              <MultiSelect
                v-model="selectedDepartments"
                :options="availableDepartments"
                optionLabel="department"
                placeholder="全部門"
                :maxSelectedLabels="1"
                fluid
              >
                <template #option="slotProps">
                  <div class="flex items-center gap-2">
                    <span>{{ slotProps.option.department }}</span>
                    <span v-if="slotProps.option.hotel_name" class="text-xs text-slate-400">({{ slotProps.option.hotel_name }})</span>
                    <span v-else class="text-xs text-amber-600">(未割当)</span>
                  </div>
                </template>
              </MultiSelect>
            </div>

            <!-- Action Button -->
            <div class="flex flex-col gap-2 justify-end">
              <button @click="loadData" :disabled="loading" class="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-violet-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed">
                <i v-if="loading" class="pi pi-spin pi-spinner"></i>
                <i v-else class="pi pi-search"></i>
                <span>{{ loading ? '読み込み中...' : '表示' }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex flex-col items-center justify-center py-20">
          <i class="pi pi-spin pi-spinner text-4xl text-violet-600 mb-4"></i>
          <p class="text-slate-500 font-bold uppercase tracking-widest text-xs">データ読み込み中...</p>
        </div>

        <!-- P&L Table -->
        <div v-else-if="plData.length > 0" class="p-8">
          <!-- Actions Bar -->
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-black text-slate-900 dark:text-white">損益計算書</h2>
            <button @click="exportToCSV" class="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:text-violet-600 hover:border-violet-200 transition-all cursor-pointer">
              <i class="pi pi-download"></i>
              <span>CSV出力</span>
            </button>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  <!-- For month view: Account Name + Month Columns -->
                  <template v-if="filters.groupBy === 'month'">
                    <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest sticky left-0 bg-slate-50 dark:bg-slate-900/50 z-10 min-w-[200px] max-w-[200px] w-[200px]">勘定科目</th>
                    <th v-for="month in uniqueMonths" :key="month" class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest text-right min-w-[120px]">
                      {{ formatMonth(month) }}
                    </th>
                  </template>
                  
                  <!-- For other views: Standard columns -->
                  <template v-else>
                    <th v-if="showMonthColumn" class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest sticky left-0 bg-slate-50 dark:bg-slate-900/50 z-10">月</th>
                    <th v-if="showHotelColumn" class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">ホテル</th>
                    <th v-if="showDepartmentColumn" class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">部門</th>
                    <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">勘定科目</th>
                    <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest text-right">金額</th>
                  </template>
                </tr>
              </thead>
              <tbody>
                <template v-for="(group, groupIndex) in groupedData" :key="groupIndex">
                  <!-- Management Group Header -->
                  <tr class="bg-violet-50 dark:bg-violet-900/20 border-b border-violet-100 dark:border-violet-900/50">
                    <td :colspan="filters.groupBy === 'month' ? uniqueMonths.length + 1 : columnCount" class="py-3 px-4 font-black text-violet-700 dark:text-violet-300 text-sm sticky left-0 bg-violet-50 dark:bg-violet-900/20 z-10">
                      {{ group.name }}
                    </td>
                  </tr>
                  
                  <!-- Month View: Accounts as rows, months as columns -->
                  <template v-if="filters.groupBy === 'month'">
                    <tr v-for="(account, accountIndex) in group.accounts" :key="`${groupIndex}-${accountIndex}`" class="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <td class="py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-800 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-slate-200 dark:border-slate-700">{{ account.account_name }}</td>
                      <td v-for="month in uniqueMonths" :key="month" class="py-3 px-4 text-sm font-black text-slate-900 dark:text-white text-right tabular-nums min-w-[120px]">
                        {{ formatCurrency(account.amountsByMonth[month] || 0) }}
                      </td>
                    </tr>
                    
                    <!-- Group Subtotal -->
                    <tr class="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700">
                      <td class="py-3 px-4 text-sm font-black text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-100 dark:bg-slate-800 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-slate-200 dark:border-slate-700">{{ group.name }} 小計</td>
                      <td v-for="month in uniqueMonths" :key="month" class="py-3 px-4 text-sm font-black text-slate-900 dark:text-white text-right tabular-nums min-w-[120px]">
                        {{ formatCurrency(group.subtotalByMonth[month] || 0) }}
                      </td>
                    </tr>
                  </template>
                  
                  <!-- Other Views: Standard row layout -->
                  <template v-else>
                    <tr v-for="(row, rowIndex) in group.rows" :key="`${groupIndex}-${rowIndex}`" class="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <td v-if="showMonthColumn" class="py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">{{ formatMonth(row.month) }}</td>
                      <td v-if="showHotelColumn" class="py-3 px-4 text-sm font-bold text-slate-700 dark:text-slate-300">{{ row.hotel_name || '未割当' }}</td>
                      <td v-if="showDepartmentColumn" class="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{{ row.department || '-' }}</td>
                      <td class="py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">{{ row.account_name }}</td>
                      <td class="py-3 px-4 text-sm font-black text-slate-900 dark:text-white text-right tabular-nums">{{ formatCurrency(row.net_amount) }}</td>
                    </tr>
                    
                    <!-- Group Subtotal -->
                    <tr class="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700">
                      <td :colspan="columnCount - 1" class="py-3 px-4 text-sm font-black text-slate-700 dark:text-slate-300 text-right">{{ group.name }} 小計</td>
                      <td class="py-3 px-4 text-sm font-black text-slate-900 dark:text-white text-right tabular-nums">{{ formatCurrency(group.subtotal) }}</td>
                    </tr>
                  </template>
                </template>

                <!-- Grand Totals -->
                <template v-if="filters.groupBy === 'month'">
                  <tr class="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/50">
                    <td class="py-4 px-4 text-sm font-black text-amber-800 dark:text-amber-300 sticky left-0 bg-amber-50 dark:bg-amber-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-amber-100 dark:border-amber-900/50">売上総利益</td>
                    <td v-for="month in uniqueMonths" :key="month" class="py-4 px-4 text-sm font-black text-amber-900 dark:text-amber-200 text-right tabular-nums min-w-[120px]">
                      {{ formatCurrency(totals[month]?.grossProfit || 0) }}
                    </td>
                  </tr>
                  <tr class="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/50">
                    <td class="py-4 px-4 text-sm font-black text-amber-800 dark:text-amber-300 sticky left-0 bg-amber-50 dark:bg-amber-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-amber-100 dark:border-amber-900/50">営業利益</td>
                    <td v-for="month in uniqueMonths" :key="month" class="py-4 px-4 text-sm font-black text-amber-900 dark:text-amber-200 text-right tabular-nums min-w-[120px]">
                      {{ formatCurrency(totals[month]?.operatingProfit || 0) }}
                    </td>
                  </tr>
                  <tr class="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/50">
                    <td class="py-4 px-4 text-sm font-black text-amber-800 dark:text-amber-300 sticky left-0 bg-amber-50 dark:bg-amber-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-amber-100 dark:border-amber-900/50">経常利益</td>
                    <td v-for="month in uniqueMonths" :key="month" class="py-4 px-4 text-sm font-black text-amber-900 dark:text-amber-200 text-right tabular-nums min-w-[120px]">
                      {{ formatCurrency(totals[month]?.ordinaryProfit || 0) }}
                    </td>
                  </tr>
                  <tr class="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/50">
                    <td class="py-4 px-4 text-sm font-black text-amber-800 dark:text-amber-300 sticky left-0 bg-amber-50 dark:bg-amber-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-amber-100 dark:border-amber-900/50">税引前当期純利益</td>
                    <td v-for="month in uniqueMonths" :key="month" class="py-4 px-4 text-sm font-black text-amber-900 dark:text-amber-200 text-right tabular-nums min-w-[120px]">
                      {{ formatCurrency(totals[month]?.profitBeforeTax || 0) }}
                    </td>
                  </tr>
                  <tr class="bg-blue-50 dark:bg-blue-900/20 border-t-2 border-blue-200 dark:border-blue-800">
                    <td class="py-4 px-4 text-base font-black text-blue-800 dark:text-blue-300 sticky left-0 bg-blue-50 dark:bg-blue-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-blue-200 dark:border-blue-800">当期純利益</td>
                    <td v-for="month in uniqueMonths" :key="month" class="py-4 px-4 text-base font-black text-blue-900 dark:text-blue-200 text-right tabular-nums min-w-[120px]">
                      {{ formatCurrency(totals[month]?.netProfit || 0) }}
                    </td>
                  </tr>
                </template>
                
                <template v-else>
                  <tr class="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/50">
                    <td :colspan="columnCount - 1" class="py-4 px-4 text-sm font-black text-amber-800 dark:text-amber-300 text-right">売上総利益</td>
                    <td class="py-4 px-4 text-sm font-black text-amber-900 dark:text-amber-200 text-right tabular-nums">{{ formatCurrency(totals.grossProfit) }}</td>
                  </tr>
                  <tr class="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/50">
                    <td :colspan="columnCount - 1" class="py-4 px-4 text-sm font-black text-amber-800 dark:text-amber-300 text-right">営業利益</td>
                    <td class="py-4 px-4 text-sm font-black text-amber-900 dark:text-amber-200 text-right tabular-nums">{{ formatCurrency(totals.operatingProfit) }}</td>
                  </tr>
                  <tr class="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/50">
                    <td :colspan="columnCount - 1" class="py-4 px-4 text-sm font-black text-amber-800 dark:text-amber-300 text-right">経常利益</td>
                    <td class="py-4 px-4 text-sm font-black text-amber-900 dark:text-amber-200 text-right tabular-nums">{{ formatCurrency(totals.ordinaryProfit) }}</td>
                  </tr>
                  <tr class="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/50">
                    <td :colspan="columnCount - 1" class="py-4 px-4 text-sm font-black text-amber-800 dark:text-amber-300 text-right">税引前当期純利益</td>
                    <td class="py-4 px-4 text-sm font-black text-amber-900 dark:text-amber-200 text-right tabular-nums">{{ formatCurrency(totals.profitBeforeTax) }}</td>
                  </tr>
                  <tr class="bg-blue-50 dark:bg-blue-900/20 border-t-2 border-blue-200 dark:border-blue-800">
                    <td :colspan="columnCount - 1" class="py-4 px-4 text-base font-black text-blue-800 dark:text-blue-300 text-right">当期純利益</td>
                    <td class="py-4 px-4 text-base font-black text-blue-900 dark:text-blue-200 text-right tabular-nums">{{ formatCurrency(totals.netProfit) }}</td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="flex flex-col items-center justify-center py-20">
          <i class="pi pi-info-circle text-6xl text-slate-300 dark:text-slate-600 mb-4"></i>
          <p class="text-slate-500 dark:text-slate-400 font-bold text-lg mb-2">データがありません</p>
          <p class="text-slate-400 dark:text-slate-500 text-sm">期間とホテルを選択して「表示」ボタンをクリックしてください</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useAccountingStore } from '@/composables/useAccountingStore';
import { useHotelStore } from '@/composables/useHotelStore';
import { formatDate } from '@/utils/dateUtils';
import MultiSelect from 'primevue/multiselect';
import Select from 'primevue/select';

export default {
  name: 'AccountingProfitLoss',
  components: {
    MultiSelect,
    Select
  },
  setup() {
    const toast = useToast();
    const accountingStore = useAccountingStore();
    const hotelStore = useHotelStore();
    
    const loading = ref(false);
    const plData = ref([]);
    const availableMonths = ref([]);
    const availableDepartments = ref([]);
    const selectedDepartments = ref([]);

    const filters = ref({
      startMonth: '',
      endMonth: '',
      groupBy: 'month'
    });

    const groupByOptions = [
      { label: '月別', value: 'month' },
      { label: 'ホテル別', value: 'hotel' },
      { label: '部門別', value: 'department' },
      { label: 'ホテル×月', value: 'hotel_month' },
      { label: '部門×月', value: 'department_month' }
    ];

    // Computed
    const showMonthColumn = computed(() => {
      return ['month', 'hotel_month', 'department_month'].includes(filters.value.groupBy);
    });

    const showHotelColumn = computed(() => {
      return ['hotel', 'hotel_month'].includes(filters.value.groupBy);
    });

    const showDepartmentColumn = computed(() => {
      return ['department', 'department_month'].includes(filters.value.groupBy);
    });

    const columnCount = computed(() => {
      let count = 2; // account name + amount
      if (showMonthColumn.value) count++;
      if (showHotelColumn.value) count++;
      if (showDepartmentColumn.value) count++;
      return count;
    });

    // Get unique months for column headers
    const uniqueMonths = computed(() => {
      if (filters.value.groupBy !== 'month') return [];
      
      const months = [...new Set(plData.value.map(row => row.month))];
      return months.sort();
    });

    const groupedData = computed(() => {
      if (!plData.value.length) return [];

      // For month view, pivot data to show months as columns
      if (filters.value.groupBy === 'month') {
        const groups = {};
        
        plData.value.forEach(row => {
          const groupKey = row.management_group_name;
          const accountKey = `${groupKey}|${row.account_code}`;
          
          if (!groups[groupKey]) {
            groups[groupKey] = {
              name: groupKey,
              order: row.management_group_display_order,
              accounts: {},
              subtotalByMonth: {}
            };
          }
          
          if (!groups[groupKey].accounts[accountKey]) {
            groups[groupKey].accounts[accountKey] = {
              account_code: row.account_code,
              account_name: row.account_name,
              amountsByMonth: {}
            };
          }
          
          const month = row.month;
          if (!groups[groupKey].accounts[accountKey].amountsByMonth[month]) {
            groups[groupKey].accounts[accountKey].amountsByMonth[month] = 0;
          }
          
          groups[groupKey].accounts[accountKey].amountsByMonth[month] += parseFloat(row.net_amount || 0);
          
          if (!groups[groupKey].subtotalByMonth[month]) {
            groups[groupKey].subtotalByMonth[month] = 0;
          }
          groups[groupKey].subtotalByMonth[month] += parseFloat(row.net_amount || 0);
        });
        
        // Convert to array format
        return Object.values(groups)
          .map(group => ({
            ...group,
            accounts: Object.values(group.accounts)
          }))
          .sort((a, b) => a.order - b.order);
      }

      // For other views, aggregate data based on groupBy setting
      const aggregated = {};
      
      plData.value.forEach(row => {
        // Create a unique key based on groupBy setting
        let key;
        if (filters.value.groupBy === 'hotel') {
          key = `${row.hotel_id || 'null'}|${row.management_group_name}|${row.account_code}`;
        } else if (filters.value.groupBy === 'department') {
          key = `${row.department}|${row.management_group_name}|${row.account_code}`;
        } else if (filters.value.groupBy === 'hotel_month') {
          key = `${row.month}|${row.hotel_id || 'null'}|${row.management_group_name}|${row.account_code}`;
        } else if (filters.value.groupBy === 'department_month') {
          key = `${row.month}|${row.department}|${row.management_group_name}|${row.account_code}`;
        }
        
        if (!aggregated[key]) {
          aggregated[key] = {
            month: row.month,
            department: row.department,
            hotel_id: row.hotel_id,
            hotel_name: row.hotel_name,
            management_group_name: row.management_group_name,
            management_group_display_order: row.management_group_display_order,
            account_code: row.account_code,
            account_name: row.account_name,
            net_amount: 0
          };
        }
        
        aggregated[key].net_amount += parseFloat(row.net_amount || 0);
      });
      
      // Now group by management group for display
      const groups = {};
      
      Object.values(aggregated).forEach(row => {
        const groupName = row.management_group_name;
        if (!groups[groupName]) {
          groups[groupName] = {
            name: groupName,
            order: row.management_group_display_order,
            rows: [],
            subtotal: 0
          };
        }
        groups[groupName].rows.push(row);
        groups[groupName].subtotal += parseFloat(row.net_amount || 0);
      });

      return Object.values(groups).sort((a, b) => a.order - b.order);
    });

    const totals = computed(() => {
      if (filters.value.groupBy === 'month') {
        // For month view, calculate totals by month
        const totalsByMonth = {};
        
        uniqueMonths.value.forEach(month => {
          const revenue = plData.value
            .filter(r => r.month === month && r.management_group_display_order === 1)
            .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);
          
          const costOfSales = plData.value
            .filter(r => r.month === month && r.management_group_display_order === 2)
            .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);
          
          const operatingExpenses = plData.value
            .filter(r => r.month === month && [3, 4, 5].includes(r.management_group_display_order))
            .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);
          
          const nonOperatingIncome = plData.value
            .filter(r => r.month === month && r.management_group_display_order === 6)
            .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);
          
          const nonOperatingExpenses = plData.value
            .filter(r => r.month === month && r.management_group_display_order === 7)
            .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);
          
          const extraordinaryIncome = plData.value
            .filter(r => r.month === month && r.management_group_display_order === 8)
            .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);
          
          const extraordinaryLosses = plData.value
            .filter(r => r.month === month && r.management_group_display_order === 9)
            .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);
          
          const incomeTax = plData.value
            .filter(r => r.month === month && r.management_group_display_order === 10)
            .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

          totalsByMonth[month] = {
            grossProfit: revenue + costOfSales,
            operatingProfit: revenue + costOfSales + operatingExpenses,
            ordinaryProfit: revenue + costOfSales + operatingExpenses + nonOperatingIncome + nonOperatingExpenses,
            profitBeforeTax: revenue + costOfSales + operatingExpenses + nonOperatingIncome + nonOperatingExpenses + extraordinaryIncome + extraordinaryLosses,
            netProfit: revenue + costOfSales + operatingExpenses + nonOperatingIncome + nonOperatingExpenses + extraordinaryIncome + extraordinaryLosses + incomeTax
          };
        });
        
        return totalsByMonth;
      }
      
      // For other views, calculate single totals
      const revenue = plData.value
        .filter(r => r.management_group_display_order === 1)
        .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);
      
      const costOfSales = plData.value
        .filter(r => r.management_group_display_order === 2)
        .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);
      
      const operatingExpenses = plData.value
        .filter(r => [3, 4, 5].includes(r.management_group_display_order))
        .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);
      
      const nonOperatingIncome = plData.value
        .filter(r => r.management_group_display_order === 6)
        .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);
      
      const nonOperatingExpenses = plData.value
        .filter(r => r.management_group_display_order === 7)
        .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);
      
      const extraordinaryIncome = plData.value
        .filter(r => r.management_group_display_order === 8)
        .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);
      
      const extraordinaryLosses = plData.value
        .filter(r => r.management_group_display_order === 9)
        .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);
      
      const incomeTax = plData.value
        .filter(r => r.management_group_display_order === 10)
        .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

      const grossProfit = revenue + costOfSales;
      const operatingProfit = grossProfit + operatingExpenses;
      const ordinaryProfit = operatingProfit + nonOperatingIncome + nonOperatingExpenses;
      const profitBeforeTax = ordinaryProfit + extraordinaryIncome + extraordinaryLosses;
      const netProfit = profitBeforeTax + incomeTax;

      return {
        revenue,
        costOfSales,
        grossProfit,
        operatingExpenses,
        operatingProfit,
        nonOperatingIncome,
        nonOperatingExpenses,
        ordinaryProfit,
        extraordinaryIncome,
        extraordinaryLosses,
        profitBeforeTax,
        incomeTax,
        netProfit
      };
    });

    // Methods
    const formatMonth = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月`;
    };

    const formatCurrency = (value) => {
      if (value === null || value === undefined) return '¥0';
      const num = parseFloat(value);
      return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
        minimumFractionDigits: 0
      }).format(num);
    };

    const loadInitialData = async () => {
      try {
        const [monthsResponse, departmentsResponse] = await Promise.all([
          accountingStore.fetchProfitLossMonths(),
          accountingStore.fetchProfitLossDepartments()
        ]);

        const monthsData = monthsResponse?.data || monthsResponse;
        const departmentsData = departmentsResponse?.data || departmentsResponse;

        if (monthsData && monthsData.length > 0) {
          availableMonths.value = monthsData.map(dateStr => formatDate(dateStr));
          filters.value.endMonth = availableMonths.value[0];
          filters.value.startMonth = availableMonths.value[Math.min(11, availableMonths.value.length - 1)];
        }
        
        if (departmentsData && departmentsData.length > 0) {
          availableDepartments.value = departmentsData;
        }
      } catch (error) {
        console.error('[P&L] Error loading initial data:', error);
        toast.add({ severity: 'error', summary: 'エラー', detail: '初期データの読み込みに失敗しました', life: 3000 });
      }
    };

    const loadData = async () => {
      if (!filters.value.startMonth || !filters.value.endMonth) {
        toast.add({ severity: 'warn', summary: '警告', detail: '期間を選択してください', life: 3000 });
        return;
      }

      loading.value = true;
      try {
        const params = {
          startMonth: filters.value.startMonth,
          endMonth: filters.value.endMonth,
          groupBy: filters.value.groupBy
        };

        if (selectedDepartments.value.length > 0) {
          params.departmentNames = selectedDepartments.value.map(d => d.department);
        }

        const response = await accountingStore.fetchProfitLoss(params);
        const data = response?.data || response;

        if (data && data.length > 0) {
          plData.value = data;
        } else {
          plData.value = [];
          toast.add({ severity: 'info', summary: '情報', detail: '指定された条件でデータが見つかりませんでした', life: 3000 });
        }
      } catch (error) {
        console.error('[P&L] Error loading data:', error);
        toast.add({ severity: 'error', summary: 'エラー', detail: 'データの読み込み中にエラーが発生しました', life: 3000 });
      } finally {
        loading.value = false;
      }
    };

    const exportToCSV = () => {
      if (!plData.value.length) {
        toast.add({ severity: 'warn', summary: '警告', detail: 'エクスポートするデータがありません', life: 3000 });
        return;
      }

      const headers = [];
      if (showMonthColumn.value) headers.push('月');
      if (showHotelColumn.value) headers.push('ホテル');
      if (showDepartmentColumn.value) headers.push('部門');
      headers.push('管理グループ', '勘定科目コード', '勘定科目名', '金額');

      const rows = [headers];

      groupedData.value.forEach(group => {
        group.rows.forEach(row => {
          const csvRow = [];
          if (showMonthColumn.value) csvRow.push(formatMonth(row.month));
          if (showHotelColumn.value) csvRow.push(row.hotel_name || '未割当');
          if (showDepartmentColumn.value) csvRow.push(row.department || '-');
          csvRow.push(
            group.name,
            row.account_code || '',
            row.account_name,
            row.net_amount
          );
          rows.push(csvRow);
        });
      });

      // Add totals
      rows.push([]);
      rows.push(['売上総利益', '', '', '', totals.value.grossProfit]);
      rows.push(['営業利益', '', '', '', totals.value.operatingProfit]);
      rows.push(['経常利益', '', '', '', totals.value.ordinaryProfit]);
      rows.push(['税引前当期純利益', '', '', '', totals.value.profitBeforeTax]);
      rows.push(['当期純利益', '', '', '', totals.value.netProfit]);

      const csv = rows.map(row => row.join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `PL_${filters.value.startMonth}_${filters.value.endMonth}.csv`;
      link.click();

      toast.add({ severity: 'success', summary: '成功', detail: 'CSVファイルをダウンロードしました', life: 3000 });
    };

    onMounted(() => {
      loadInitialData();
    });

    return {
      loading,
      plData,
      availableMonths,
      availableDepartments,
      selectedDepartments,
      filters,
      groupByOptions,
      uniqueMonths,
      showMonthColumn,
      showHotelColumn,
      showDepartmentColumn,
      columnCount,
      groupedData,
      totals,
      formatMonth,
      formatCurrency,
      loadData,
      exportToCSV
    };
  }
};
</script>

<style scoped>
/* Minimal custom styles - most styling is handled by Tailwind/PrimeVue */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
</style>
