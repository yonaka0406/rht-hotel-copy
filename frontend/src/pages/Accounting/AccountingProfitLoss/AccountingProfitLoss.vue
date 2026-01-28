<template>
  <div class="bg-slate-50 dark:bg-slate-900 min-h-screen p-6 font-sans transition-colors duration-300">
    <div class="max-w-7xl mx-auto px-4">
      <!-- Hero Row -->
      <ProfitLossHeader />

      <!-- Main Content Card -->
      <div
        class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
        <!-- Filters Section -->
        <ProfitLossFilters 
          v-model:filters="filters"
          :available-months="availableMonths"
          :loading="loading"
          :format-month="formatMonth"
          @load-data="loadData"
        />

        <!-- Loading State -->
        <div v-if="loading" class="flex flex-col items-center justify-center py-20">
          <i class="pi pi-spin pi-spinner text-4xl text-violet-600 mb-4"></i>
          <p class="text-slate-500 font-bold uppercase tracking-widest text-xs">データ読み込み中...</p>
        </div>

        <!-- P&L Table -->
        <div v-else-if="plData.length > 0" class="p-8">
          <!-- Actions Bar -->
          <ProfitLossActions
            :group-by="filters.groupBy"
            v-model:show-total-column="showTotalColumn"
            v-model:show-department-filter="showDepartmentFilter"
            v-model:show-hotel-filter="showHotelFilter"
            :selected-departments-length="selectedDepartments.length"
            :selected-hotels-length="selectedHotels.length"
            @export-csv="exportToCSV"
            @export-detailed-csv="exportDetailedCSV"
          />

          <!-- Filter Panels -->
          <ProfitLossFilterPanels
            :show-department-filter="showDepartmentFilter"
            :show-hotel-filter="showHotelFilter"
            :departments-in-data="departmentsInData"
            :hotels-in-data="hotelsInData"
            v-model:selected-departments="selectedDepartments"
            v-model:selected-hotels="selectedHotels"
            @select-all-departments="selectedDepartments = [...departmentsInData]"
            @clear-departments="selectedDepartments = []"
            @select-all-hotels="selectedHotels = [...hotelsInData]"
            @clear-hotels="selectedHotels = []"
          />

          <!-- Table -->
          <ProfitLossTable
            :group-by="filters.groupBy"
            :show-total-column="showTotalColumn"
            :unique-months="uniqueMonths"
            :unique-hotels="uniqueHotels"
            :unique-departments="uniqueDepartments"
            :grouped-data="groupedData"
            :totals="totals"
            :period-totals="periodTotals"
            :grand-period-totals="grandPeriodTotals"
            :format-month="formatMonth"
            :format-currency="formatCurrency"
          />
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

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useAccountingStore } from '@/composables/useAccountingStore';
import { useHotelStore } from '@/composables/useHotelStore';
import { formatDate } from '@/utils/dateUtils';

// Import child components
import ProfitLossHeader from './components/ProfitLossHeader.vue';
import ProfitLossFilters from './components/ProfitLossFilters.vue';
import ProfitLossActions from './components/ProfitLossActions.vue';
import ProfitLossFilterPanels from './components/ProfitLossFilterPanels.vue';
import ProfitLossTable from './components/ProfitLossTable.vue';

const toast = useToast();
const accountingStore = useAccountingStore();
const hotelStore = useHotelStore();

const loading = ref(false);
const plData = ref([]);
const availableMonths = ref([]);
const availableDepartments = ref([]);
const selectedDepartments = ref([]);
const selectedHotels = ref([]);
const showTotalColumn = ref(true);
const showDepartmentFilter = ref(false);
const showHotelFilter = ref(false);

const filters = ref({
  startMonth: '',
  endMonth: '',
  groupBy: 'month'
});

// Computed
const departmentsInData = computed(() => {
  if (!plData.value.length) return [];

  const deptMap = new Map();
  plData.value.forEach(row => {
    if (row.department && !deptMap.has(row.department)) {
      deptMap.set(row.department, {
        department: row.department,
        hotel_name: row.hotel_name,
        hotel_id: row.hotel_id
      });
    }
  });

  return Array.from(deptMap.values()).sort((a, b) =>
    a.department.localeCompare(b.department, 'ja')
  );
});

// Get unique hotels from fetched data
const hotelsInData = computed(() => {
  if (!plData.value.length) return [];

  const hotelMap = new Map();
  plData.value.forEach(row => {
    const hotelId = row.hotel_id;
    const key = hotelId === null || hotelId === undefined ? 'null' : hotelId;
    if (!hotelMap.has(key)) {
      hotelMap.set(key, {
        hotel_id: hotelId,
        hotel_name: row.hotel_name || '未割当'
      });
    }
  });

  return Array.from(hotelMap.values()).sort((a, b) =>
    (a.hotel_name || '').localeCompare(b.hotel_name || '', 'ja')
  );
});

// Filter data by selected departments and facilities
const filteredPlData = computed(() => {
  let data = plData.value;

  if (selectedDepartments.value.length > 0) {
    const selectedDeptNames = selectedDepartments.value.map(d => d.department);
    data = data.filter(row => selectedDeptNames.includes(row.department));
  }

  if (selectedHotels.value.length > 0) {
    const selectedHotelIds = selectedHotels.value.map(h => h.hotel_id);
    data = data.filter(row => selectedHotelIds.includes(row.hotel_id));
  }

  return data;
});

// Get unique months for column headers
const uniqueMonths = computed(() => {
  if (!['month', 'hotel_month', 'department_month'].includes(filters.value.groupBy)) return [];

  const months = [...new Set(filteredPlData.value.map(row => row.month))];
  return months.sort();
});

// Get unique hotels for column headers
const uniqueHotels = computed(() => {
  if (filters.value.groupBy !== 'hotel') return [];

  const hotelMap = new Map();
  filteredPlData.value.forEach(row => {
    const hotelKey = row.hotel_id || 'null';
    if (!hotelMap.has(hotelKey)) {
      hotelMap.set(hotelKey, {
        hotel_id: hotelKey,
        hotel_name: row.hotel_name || '未割当'
      });
    }
  });

  return Array.from(hotelMap.values());
});

// Get unique departments for column headers
const uniqueDepartments = computed(() => {
  if (filters.value.groupBy !== 'department') return [];

  const depts = [...new Set(filteredPlData.value.map(row => row.department))];
  return depts.sort((a, b) => a.localeCompare(b, 'ja'));
});

// Calculate period totals for the total column
const periodTotals = computed(() => {
  if (filters.value.groupBy !== 'month' || !showTotalColumn.value) return {};

  const totals = {};

  groupedData.value.forEach(group => {
    let groupTotal = 0;
    group.accounts.forEach(account => {
      let accountTotal = 0;
      uniqueMonths.value.forEach(month => {
        accountTotal += parseFloat(account.amountsByMonth[month] || 0);
      });

      if (!totals[group.name]) {
        totals[group.name] = { accounts: {} };
      }
      totals[group.name].accounts[account.account_code] = accountTotal;
      groupTotal += accountTotal;
    });
    totals[group.name].subtotal = groupTotal;
  });

  return totals;
});

const grandPeriodTotals = computed(() => {
  if (filters.value.groupBy !== 'month' || !showTotalColumn.value) return {};

  const revenue = filteredPlData.value
    .filter(r => r.management_group_display_order === 1)
    .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

  const costOfSales = filteredPlData.value
    .filter(r => r.management_group_display_order === 2)
    .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

  const operatingExpenses = filteredPlData.value
    .filter(r => [3, 4, 5].includes(r.management_group_display_order))
    .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

  const nonOperatingIncome = filteredPlData.value
    .filter(r => r.management_group_display_order === 6)
    .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

  const nonOperatingExpenses = filteredPlData.value
    .filter(r => r.management_group_display_order === 7)
    .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

  const extraordinaryIncome = filteredPlData.value
    .filter(r => r.management_group_display_order === 8)
    .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

  const extraordinaryLosses = filteredPlData.value
    .filter(r => r.management_group_display_order === 9)
    .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

  const incomeTax = filteredPlData.value
    .filter(r => r.management_group_display_order === 10)
    .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

  return {
    grossProfit: revenue + costOfSales,
    operatingProfit: revenue + costOfSales + operatingExpenses,
    ordinaryProfit: revenue + costOfSales + operatingExpenses + nonOperatingIncome + nonOperatingExpenses,
    profitBeforeTax: revenue + costOfSales + operatingExpenses + nonOperatingIncome + nonOperatingExpenses + extraordinaryIncome + extraordinaryLosses,
    netProfit: revenue + costOfSales + operatingExpenses + nonOperatingIncome + nonOperatingExpenses + extraordinaryIncome + extraordinaryLosses + incomeTax
  };
});

const groupedData = computed(() => {
  if (!filteredPlData.value.length) return [];

  // For month view, pivot data to show months as columns
  if (filters.value.groupBy === 'month') {
    const groups = {};

    filteredPlData.value.forEach(row => {
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

  // For hotel view, pivot data to show hotels as columns
  if (filters.value.groupBy === 'hotel') {
    const groups = {};

    filteredPlData.value.forEach(row => {
      const groupKey = row.management_group_name;
      const accountKey = `${groupKey}|${row.account_code}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          name: groupKey,
          order: row.management_group_display_order,
          accounts: {},
          subtotalByHotel: {}
        };
      }

      if (!groups[groupKey].accounts[accountKey]) {
        groups[groupKey].accounts[accountKey] = {
          account_code: row.account_code,
          account_name: row.account_name,
          amountsByHotel: {}
        };
      }

      const hotelKey = row.hotel_id || 'null';
      const hotelName = row.hotel_name || '未割当';

      if (!groups[groupKey].accounts[accountKey].amountsByHotel[hotelKey]) {
        groups[groupKey].accounts[accountKey].amountsByHotel[hotelKey] = {
          amount: 0,
          hotel_name: hotelName
        };
      }

      groups[groupKey].accounts[accountKey].amountsByHotel[hotelKey].amount += parseFloat(row.net_amount || 0);

      if (!groups[groupKey].subtotalByHotel[hotelKey]) {
        groups[groupKey].subtotalByHotel[hotelKey] = {
          amount: 0,
          hotel_name: hotelName
        };
      }
      groups[groupKey].subtotalByHotel[hotelKey].amount += parseFloat(row.net_amount || 0);
    });

    return Object.values(groups)
      .map(group => ({
        ...group,
        accounts: Object.values(group.accounts)
      }))
      .sort((a, b) => a.order - b.order);
  }

  // For department view, pivot data to show departments as columns
  if (filters.value.groupBy === 'department') {
    const groups = {};

    filteredPlData.value.forEach(row => {
      const groupKey = row.management_group_name;
      const accountKey = `${groupKey}|${row.account_code}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          name: groupKey,
          order: row.management_group_display_order,
          accounts: {},
          subtotalByDepartment: {}
        };
      }

      if (!groups[groupKey].accounts[accountKey]) {
        groups[groupKey].accounts[accountKey] = {
          account_code: row.account_code,
          account_name: row.account_name,
          amountsByDepartment: {}
        };
      }

      const dept = row.department;

      if (!groups[groupKey].accounts[accountKey].amountsByDepartment[dept]) {
        groups[groupKey].accounts[accountKey].amountsByDepartment[dept] = 0;
      }

      groups[groupKey].accounts[accountKey].amountsByDepartment[dept] += parseFloat(row.net_amount || 0);

      if (!groups[groupKey].subtotalByDepartment[dept]) {
        groups[groupKey].subtotalByDepartment[dept] = 0;
      }
      groups[groupKey].subtotalByDepartment[dept] += parseFloat(row.net_amount || 0);
    });

    return Object.values(groups)
      .map(group => ({
        ...group,
        accounts: Object.values(group.accounts)
      }))
      .sort((a, b) => a.order - b.order);
  }

  // For hotel_month view: group by hotel, then show months as columns
  if (filters.value.groupBy === 'hotel_month') {
    const hotelGroups = {};

    filteredPlData.value.forEach(row => {
      const hotelKey = row.hotel_id || 'null';
      const hotelName = row.hotel_name || '未割当';

      if (!hotelGroups[hotelKey]) {
        hotelGroups[hotelKey] = {
          hotel_id: hotelKey,
          hotel_name: hotelName,
          managementGroups: {}
        };
      }

      const groupKey = row.management_group_name;
      const accountKey = `${groupKey}|${row.account_code}`;

      if (!hotelGroups[hotelKey].managementGroups[groupKey]) {
        hotelGroups[hotelKey].managementGroups[groupKey] = {
          name: groupKey,
          order: row.management_group_display_order,
          accounts: {},
          subtotalByMonth: {}
        };
      }

      if (!hotelGroups[hotelKey].managementGroups[groupKey].accounts[accountKey]) {
        hotelGroups[hotelKey].managementGroups[groupKey].accounts[accountKey] = {
          account_code: row.account_code,
          account_name: row.account_name,
          amountsByMonth: {}
        };
      }

      const month = row.month;
      if (!hotelGroups[hotelKey].managementGroups[groupKey].accounts[accountKey].amountsByMonth[month]) {
        hotelGroups[hotelKey].managementGroups[groupKey].accounts[accountKey].amountsByMonth[month] = 0;
      }

      hotelGroups[hotelKey].managementGroups[groupKey].accounts[accountKey].amountsByMonth[month] += parseFloat(row.net_amount || 0);

      if (!hotelGroups[hotelKey].managementGroups[groupKey].subtotalByMonth[month]) {
        hotelGroups[hotelKey].managementGroups[groupKey].subtotalByMonth[month] = 0;
      }
      hotelGroups[hotelKey].managementGroups[groupKey].subtotalByMonth[month] += parseFloat(row.net_amount || 0);
    });

    return Object.values(hotelGroups).map(hotel => ({
      ...hotel,
      managementGroups: Object.values(hotel.managementGroups)
        .map(group => ({
          ...group,
          accounts: Object.values(group.accounts)
        }))
        .sort((a, b) => a.order - b.order)
    }));
  }

  // For department_month view: group by department, then show months as columns
  if (filters.value.groupBy === 'department_month') {
    const deptGroups = {};

    filteredPlData.value.forEach(row => {
      const dept = row.department;

      if (!deptGroups[dept]) {
        deptGroups[dept] = {
          department: dept,
          hotel_name: row.hotel_name,
          managementGroups: {}
        };
      }

      const groupKey = row.management_group_name;
      const accountKey = `${groupKey}|${row.account_code}`;

      if (!deptGroups[dept].managementGroups[groupKey]) {
        deptGroups[dept].managementGroups[groupKey] = {
          name: groupKey,
          order: row.management_group_display_order,
          accounts: {},
          subtotalByMonth: {}
        };
      }

      if (!deptGroups[dept].managementGroups[groupKey].accounts[accountKey]) {
        deptGroups[dept].managementGroups[groupKey].accounts[accountKey] = {
          account_code: row.account_code,
          account_name: row.account_name,
          amountsByMonth: {}
        };
      }

      const month = row.month;
      if (!deptGroups[dept].managementGroups[groupKey].accounts[accountKey].amountsByMonth[month]) {
        deptGroups[dept].managementGroups[groupKey].accounts[accountKey].amountsByMonth[month] = 0;
      }

      deptGroups[dept].managementGroups[groupKey].accounts[accountKey].amountsByMonth[month] += parseFloat(row.net_amount || 0);

      if (!deptGroups[dept].managementGroups[groupKey].subtotalByMonth[month]) {
        deptGroups[dept].managementGroups[groupKey].subtotalByMonth[month] = 0;
      }
      deptGroups[dept].managementGroups[groupKey].subtotalByMonth[month] += parseFloat(row.net_amount || 0);
    });

    return Object.values(deptGroups).map(dept => ({
      ...dept,
      managementGroups: Object.values(dept.managementGroups)
        .map(group => ({
          ...group,
          accounts: Object.values(group.accounts)
        }))
        .sort((a, b) => a.order - b.order)
    }));
  }

  // This shouldn't be reached, but return empty array as fallback
  return [];
});

const totals = computed(() => {
  if (filters.value.groupBy === 'month') {
    // For month view, calculate totals by month
    const totalsByMonth = {};

    uniqueMonths.value.forEach(month => {
      const revenue = filteredPlData.value
        .filter(r => r.month === month && r.management_group_display_order === 1)
        .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

      const costOfSales = filteredPlData.value
        .filter(r => r.month === month && r.management_group_display_order === 2)
        .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

      const operatingExpenses = filteredPlData.value
        .filter(r => r.month === month && [3, 4, 5].includes(r.management_group_display_order))
        .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

      const nonOperatingIncome = filteredPlData.value
        .filter(r => r.month === month && r.management_group_display_order === 6)
        .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

      const nonOperatingExpenses = filteredPlData.value
        .filter(r => r.month === month && r.management_group_display_order === 7)
        .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

      const extraordinaryIncome = filteredPlData.value
        .filter(r => r.month === month && r.management_group_display_order === 8)
        .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

      const extraordinaryLosses = filteredPlData.value
        .filter(r => r.month === month && r.management_group_display_order === 9)
        .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

      const incomeTax = filteredPlData.value
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

  if (filters.value.groupBy === 'hotel_month') {
    // For hotel_month view, calculate totals by hotel and month
    const totalsByHotelMonth = {};

    groupedData.value.forEach(hotelGroup => {
      const hotelKey = hotelGroup.hotel_id;
      totalsByHotelMonth[hotelKey] = {};

      uniqueMonths.value.forEach(month => {
        const hotelMonthData = filteredPlData.value.filter(r =>
          (r.hotel_id || 'null') === hotelKey && r.month === month
        );

        const revenue = hotelMonthData
          .filter(r => r.management_group_display_order === 1)
          .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

        const costOfSales = hotelMonthData
          .filter(r => r.management_group_display_order === 2)
          .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

        const operatingExpenses = hotelMonthData
          .filter(r => [3, 4, 5].includes(r.management_group_display_order))
          .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

        const nonOperatingIncome = hotelMonthData
          .filter(r => r.management_group_display_order === 6)
          .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

        const nonOperatingExpenses = hotelMonthData
          .filter(r => r.management_group_display_order === 7)
          .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

        const extraordinaryIncome = hotelMonthData
          .filter(r => r.management_group_display_order === 8)
          .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

        const extraordinaryLosses = hotelMonthData
          .filter(r => r.management_group_display_order === 9)
          .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

        const incomeTax = hotelMonthData
          .filter(r => r.management_group_display_order === 10)
          .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

        totalsByHotelMonth[hotelKey][month] = {
          grossProfit: revenue + costOfSales,
          operatingProfit: revenue + costOfSales + operatingExpenses,
          ordinaryProfit: revenue + costOfSales + operatingExpenses + nonOperatingIncome + nonOperatingExpenses,
          profitBeforeTax: revenue + costOfSales + operatingExpenses + nonOperatingIncome + nonOperatingExpenses + extraordinaryIncome + extraordinaryLosses,
          netProfit: revenue + costOfSales + operatingExpenses + nonOperatingIncome + nonOperatingExpenses + extraordinaryIncome + extraordinaryLosses + incomeTax
        };
      });
    });

    return totalsByHotelMonth;
  }

  if (filters.value.groupBy === 'department_month') {
    // For department_month view, calculate totals by department and month
    const totalsByDeptMonth = {};

    groupedData.value.forEach(deptGroup => {
      const deptKey = deptGroup.department;
      totalsByDeptMonth[deptKey] = {};

      uniqueMonths.value.forEach(month => {
        const deptMonthData = filteredPlData.value.filter(r =>
          r.department === deptKey && r.month === month
        );

        const revenue = deptMonthData
          .filter(r => r.management_group_display_order === 1)
          .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

        const costOfSales = deptMonthData
          .filter(r => r.management_group_display_order === 2)
          .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

        const operatingExpenses = deptMonthData
          .filter(r => [3, 4, 5].includes(r.management_group_display_order))
          .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

        const nonOperatingIncome = deptMonthData
          .filter(r => r.management_group_display_order === 6)
          .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

        const nonOperatingExpenses = deptMonthData
          .filter(r => r.management_group_display_order === 7)
          .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

        const extraordinaryIncome = deptMonthData
          .filter(r => r.management_group_display_order === 8)
          .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

        const extraordinaryLosses = deptMonthData
          .filter(r => r.management_group_display_order === 9)
          .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

        const incomeTax = deptMonthData
          .filter(r => r.management_group_display_order === 10)
          .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

        totalsByDeptMonth[deptKey][month] = {
          grossProfit: revenue + costOfSales,
          operatingProfit: revenue + costOfSales + operatingExpenses,
          ordinaryProfit: revenue + costOfSales + operatingExpenses + nonOperatingIncome + nonOperatingExpenses,
          profitBeforeTax: revenue + costOfSales + operatingExpenses + nonOperatingIncome + nonOperatingExpenses + extraordinaryIncome + extraordinaryLosses,
          netProfit: revenue + costOfSales + operatingExpenses + nonOperatingIncome + nonOperatingExpenses + extraordinaryIncome + extraordinaryLosses + incomeTax
        };
      });
    });

    return totalsByDeptMonth;
  }

  // For other views, calculate single totals
  const revenue = filteredPlData.value
    .filter(r => r.management_group_display_order === 1)
    .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

  const costOfSales = filteredPlData.value
    .filter(r => r.management_group_display_order === 2)
    .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

  const operatingExpenses = filteredPlData.value
    .filter(r => [3, 4, 5].includes(r.management_group_display_order))
    .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

  const nonOperatingIncome = filteredPlData.value
    .filter(r => r.management_group_display_order === 6)
    .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

  const nonOperatingExpenses = filteredPlData.value
    .filter(r => r.management_group_display_order === 7)
    .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

  const extraordinaryIncome = filteredPlData.value
    .filter(r => r.management_group_display_order === 8)
    .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

  const extraordinaryLosses = filteredPlData.value
    .filter(r => r.management_group_display_order === 9)
    .reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);

  const incomeTax = filteredPlData.value
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

    const response = await accountingStore.fetchProfitLoss(params);
    const data = response?.data || response;

    if (data && data.length > 0) {
      plData.value = data;
      // Reset filters when new data is loaded
      selectedDepartments.value = [];
      selectedHotels.value = [];
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
  if (!filteredPlData.value.length) {
    toast.add({ severity: 'warn', summary: '警告', detail: 'エクスポートするデータがありません', life: 3000 });
    return;
  }

  const rows = [];

  // Add filter information header if departments are filtered
  if (selectedDepartments.value.length > 0 && selectedDepartments.value.length < departmentsInData.value.length) {
    rows.push(['部分データ - 選択された部門のみ']);
    rows.push([`選択部門: ${selectedDepartments.value.map(d => d.department).join(', ')}`]);
    rows.push([`${selectedDepartments.value.length} / ${departmentsInData.value.length} 部門`]);
    rows.push([]); // Empty row
  }

  // For month view, export with months as columns
  if (filters.value.groupBy === 'month') {
    // Headers
    const headers = ['勘定科目'];
    uniqueMonths.value.forEach(month => {
      headers.push(formatMonth(month));
    });
    if (showTotalColumn.value) {
      headers.push('合計');
    }
    rows.push(headers);

    // Data rows
    groupedData.value.forEach(group => {
      // Group header
      rows.push([group.name]);

      // Account rows
      group.accounts.forEach(account => {
        const row = [account.account_name];
        uniqueMonths.value.forEach(month => {
          row.push(account.amountsByMonth[month] || 0);
        });
        if (showTotalColumn.value) {
          row.push(periodTotals.value[group.name]?.accounts[account.account_code] || 0);
        }
        rows.push(row);
      });

      // Group subtotal
      const subtotalRow = [`${group.name} 小計`];
      uniqueMonths.value.forEach(month => {
        subtotalRow.push(group.subtotalByMonth[month] || 0);
      });
      if (showTotalColumn.value) {
        subtotalRow.push(periodTotals.value[group.name]?.subtotal || 0);
      }
      rows.push(subtotalRow);
      rows.push([]); // Empty row
    });

    // Grand totals
    const profitRows = [
      { label: '売上総利益', key: 'grossProfit' },
      { label: '営業利益', key: 'operatingProfit' },
      { label: '経常利益', key: 'ordinaryProfit' },
      { label: '税引前当期純利益', key: 'profitBeforeTax' },
      { label: '当期純利益', key: 'netProfit' }
    ];

    profitRows.forEach(profit => {
      const row = [profit.label];
      uniqueMonths.value.forEach(month => {
        row.push(totals.value[month]?.[profit.key] || 0);
      });
      if (showTotalColumn.value) {
        row.push(grandPeriodTotals.value[profit.key] || 0);
      }
      rows.push(row);
    });
  } else if (filters.value.groupBy === 'hotel') {
    // Hotel view: export with hotels as columns
    const headers = ['勘定科目'];
    uniqueHotels.value.forEach(hotel => {
      headers.push(hotel.hotel_name);
    });
    rows.push(headers);

    groupedData.value.forEach(group => {
      rows.push([group.name]);

      group.accounts.forEach(account => {
        const row = [account.account_name];
        uniqueHotels.value.forEach(hotel => {
          row.push(account.amountsByHotel[hotel.hotel_id]?.amount || 0);
        });
        rows.push(row);
      });

      const subtotalRow = [`${group.name} 小計`];
      uniqueHotels.value.forEach(hotel => {
        subtotalRow.push(group.subtotalByHotel[hotel.hotel_id]?.amount || 0);
      });
      rows.push(subtotalRow);
      rows.push([]);
    });
  } else if (filters.value.groupBy === 'department') {
    // Department view: export with departments as columns
    const headers = ['勘定科目'];
    uniqueDepartments.value.forEach(dept => {
      headers.push(dept);
    });
    rows.push(headers);

    groupedData.value.forEach(group => {
      rows.push([group.name]);

      group.accounts.forEach(account => {
        const row = [account.account_name];
        uniqueDepartments.value.forEach(dept => {
          row.push(account.amountsByDepartment[dept] || 0);
        });
        rows.push(row);
      });

      const subtotalRow = [`${group.name} 小計`];
      uniqueDepartments.value.forEach(dept => {
        subtotalRow.push(group.subtotalByDepartment[dept] || 0);
      });
      rows.push(subtotalRow);
      rows.push([]);
    });
  } else if (filters.value.groupBy === 'hotel_month') {
    // Hotel_Month view: export with months as columns, grouped by hotel
    const headers = ['勘定科目'];
    uniqueMonths.value.forEach(month => {
      headers.push(formatMonth(month));
    });
    rows.push(headers);

    groupedData.value.forEach(hotelGroup => {
      // Hotel header
      rows.push([hotelGroup.hotel_name]);
      rows.push([]);

      hotelGroup.managementGroups.forEach(group => {
        rows.push([group.name]);

        group.accounts.forEach(account => {
          const row = [account.account_name];
          uniqueMonths.value.forEach(month => {
            row.push(account.amountsByMonth[month] || 0);
          });
          rows.push(row);
        });

        const subtotalRow = [`${group.name} 小計`];
        uniqueMonths.value.forEach(month => {
          subtotalRow.push(group.subtotalByMonth[month] || 0);
        });
        rows.push(subtotalRow);
        rows.push([]);
      });

      // Profit totals for this hotel
      const profitRows = [
        { label: '売上総利益', key: 'grossProfit' },
        { label: '営業利益', key: 'operatingProfit' },
        { label: '経常利益', key: 'ordinaryProfit' },
        { label: '税引前当期純利益', key: 'profitBeforeTax' },
        { label: '当期純利益', key: 'netProfit' }
      ];

      profitRows.forEach(profit => {
        const row = [profit.label];
        uniqueMonths.value.forEach(month => {
          row.push(totals.value[hotelGroup.hotel_id]?.[month]?.[profit.key] || 0);
        });
        rows.push(row);
      });
      rows.push([]);
      rows.push([]);
    });
  } else if (filters.value.groupBy === 'department_month') {
    // Department_Month view: export with months as columns, grouped by department
    const headers = ['勘定科目'];
    uniqueMonths.value.forEach(month => {
      headers.push(formatMonth(month));
    });
    rows.push(headers);

    groupedData.value.forEach(deptGroup => {
      // Department header
      const deptHeader = deptGroup.hotel_name
        ? `${deptGroup.department} (${deptGroup.hotel_name})`
        : deptGroup.department;
      rows.push([deptHeader]);
      rows.push([]);

      deptGroup.managementGroups.forEach(group => {
        rows.push([group.name]);

        group.accounts.forEach(account => {
          const row = [account.account_name];
          uniqueMonths.value.forEach(month => {
            row.push(account.amountsByMonth[month] || 0);
          });
          rows.push(row);
        });

        const subtotalRow = [`${group.name} 小計`];
        uniqueMonths.value.forEach(month => {
          subtotalRow.push(group.subtotalByMonth[month] || 0);
        });
        rows.push(subtotalRow);
        rows.push([]);
      });

      // Profit totals for this department
      const profitRows = [
        { label: '売上総利益', key: 'grossProfit' },
        { label: '営業利益', key: 'operatingProfit' },
        { label: '経常利益', key: 'ordinaryProfit' },
        { label: '税引前当期純利益', key: 'profitBeforeTax' },
        { label: '当期純利益', key: 'netProfit' }
      ];

      profitRows.forEach(profit => {
        const row = [profit.label];
        uniqueMonths.value.forEach(month => {
          row.push(totals.value[deptGroup.department]?.[month]?.[profit.key] || 0);
        });
        rows.push(row);
      });
      rows.push([]);
      rows.push([]);
    });
  }

  // Helper function to escape CSV cells
  const escapeCSVCell = (cell) => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell);
    // If cell contains comma, newline, or double quote, wrap in quotes and escape quotes
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const csv = rows.map(row => row.map(escapeCSVCell).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;

  // Add filter indicator to filename if filtered
  let filename = `PL_${filters.value.startMonth}_${filters.value.endMonth}`;
  if (selectedDepartments.value.length > 0 && selectedDepartments.value.length < departmentsInData.value.length) {
    filename += '_filtered';
  }
  link.download = `${filename}.csv`;
  link.click();

  // Revoke the blob URL to prevent memory leaks
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);

  toast.add({ severity: 'success', summary: '成功', detail: 'CSVファイルをダウンロードしました', life: 3000 });
};

const exportDetailedCSV = async () => {
  if (!filteredPlData.value.length) {
    toast.add({ severity: 'warn', summary: '警告', detail: 'エクスポートするデータがありません', life: 3000 });
    return;
  }

  try {
    // Fetch detailed data with tax information from the backend
    const { fetchProfitLossDetailed } = useAccountingStore();

    const detailedFilters = {
      startMonth: filters.value.startMonth,
      endMonth: filters.value.endMonth,
      departmentNames: selectedDepartments.value.length > 0 && selectedDepartments.value.length < departmentsInData.value.length
        ? selectedDepartments.value.map(d => d.department)
        : null
    };

    console.log('[CSV Export] Detailed filters:', detailedFilters);
    console.log('[CSV Export] Selected departments:', selectedDepartments.value);
    console.log('[CSV Export] Departments in data:', departmentsInData.value);
    console.log('[CSV Export] Filtered PL data count:', filteredPlData.value.length);

    const response = await fetchProfitLossDetailed(detailedFilters);
    console.log('[CSV Export] API response:', response);

    // Verify response is truthy and has success status
    if (!response || !response.success) {
      console.error('[CSV Export] Invalid or failed response from fetchProfitLossDetailed:', response);
      toast.add({ severity: 'error', summary: 'エラー', detail: '詳細データの取得に失敗しました', life: 3000 });
      return;
    }

    const detailedData = response.data || [];
    console.log('[CSV Export] Detailed data count:', detailedData.length);

    if (!detailedData.length) {
      console.log('[CSV Export] No detailed data found, checking regular PL data structure:');
      console.log('[CSV Export] Sample PL data:', filteredPlData.value.slice(0, 3));
      toast.add({ severity: 'warn', summary: '警告', detail: '詳細データが見つかりませんでした', life: 3000 });
      return;
    }

    const rows = [];

    // CSV Headers - Japanese column names as requested
    const headers = [
      '月分',         // Month (YYYY-MM-01 format)
      '日付',         // Transaction Date
      '勘定科目',     // Account Subject
      '補助科目',     // Sub Account
      '部門',         // Department
      '税区分',       // Tax Classification
      '金額（税込）', // Amount including tax
      '税額',         // Tax Amount
      '相手勘定科目', // Counterpart Account
      '相手補助科目', // Counterpart Sub Account
      '相手部門',     // Counterpart Department
      '摘要',         // Summary/Description
      '区分1',        // Classification 1
      '区分2',        // Classification 2
      '区分3',        // Classification 3
      '区分4',        // Classification 4
      '順番コード',   // Order Code (account code)
      '直接CF（相手）', // Direct CF (Counterpart) - empty
      '経営グループ'  // Management Group
    ];
    rows.push(headers);

    // Process each row of detailed P&L data
    detailedData.forEach(item => {
      // Format transaction date
      const transactionDate = item.transaction_date ? new Date(item.transaction_date) : null;
      const monthDate = transactionDate ?
        `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}-01` : '';
      const formattedTransactionDate = transactionDate ?
        `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}-${String(transactionDate.getDate()).padStart(2, '0')}` : '';

      const row = [
        monthDate,                           // 月分 (YYYY-MM-01)
        formattedTransactionDate,            // 日付 (YYYY-MM-DD)
        item.account_name || '',             // 勘定科目
        item.sub_account || '',              // 補助科目
        item.department || '',               // 部門
        item.tax_class || '',                // 税区分
        item.amount_with_tax || 0,           // 金額（税込）
        item.tax_amount || 0,                // 税額
        item.counterpart_account_code || '', // 相手勘定科目
        item.counterpart_sub_account || '',  // 相手補助科目
        item.counterpart_department || '',   // 相手部門
        item.summary || '',                  // 摘要
        '',                                  // 区分1 (empty)
        '',                                  // 区分2 (empty)
        '',                                  // 区分3 (empty)
        '',                                  // 区分4 (empty)
        item.account_code || '',             // 順番コード (account code)
        '',                                  // 直接CF（相手） (empty)
        item.management_group_formatted || '' // 経営グループ (formatted as order_name)
      ];
      rows.push(row);
    });

    // Helper function to escape CSV cells
    const escapeCSVCell = (cell) => {
      if (cell === null || cell === undefined) return '""';
      const str = String(cell);
      // If cell contains comma, newline, or double quote, wrap in quotes and escape quotes
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    };

    const csv = rows.map(row => row.map(escapeCSVCell).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;

    // Create filename with date range
    let filename = `PL_detailed_${filters.value.startMonth}_${filters.value.endMonth}`;
    if (selectedDepartments.value.length > 0 && selectedDepartments.value.length < departmentsInData.value.length) {
      filename += '_filtered';
    }
    link.download = `${filename}.csv`;
    link.click();

    // Revoke the blob URL to prevent memory leaks
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);

    toast.add({ severity: 'success', summary: '成功', detail: '詳細CSVファイルをダウンロードしました', life: 3000 });
  } catch (error) {
    console.error('Error exporting detailed CSV:', error);
    toast.add({ severity: 'error', summary: 'エラー', detail: '詳細CSV出力中にエラーが発生しました', life: 3000 });
  }
};

onMounted(() => {
  loadInitialData();
});
</script>

<style scoped>
/* Minimal custom styles - most styling is handled by Tailwind/PrimeVue */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
</style>
