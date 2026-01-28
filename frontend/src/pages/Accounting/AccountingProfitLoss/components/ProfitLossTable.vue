<template>
  <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <!-- Month view: Account Name + Month Columns -->
          <template v-if="groupBy === 'month'">
            <th
              class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest sticky left-0 bg-slate-50 dark:bg-slate-900/50 z-10 min-w-[200px] max-w-[200px] w-[200px]">
              勘定科目</th>
            <th v-for="month in uniqueMonths" :key="month"
              class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest text-right min-w-[120px]">
              {{ formatMonth(month) }}
            </th>
            <th v-if="showTotalColumn"
              class="py-4 px-4 font-black text-violet-600 dark:text-violet-400 text-xs uppercase tracking-widest text-right min-w-[120px] bg-violet-50 dark:bg-violet-900/20">
              合計
            </th>
          </template>

          <!-- Hotel view: Account Name + Hotel Columns -->
          <template v-else-if="groupBy === 'hotel'">
            <th
              class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest sticky left-0 bg-slate-50 dark:bg-slate-900/50 z-10 min-w-[200px] max-w-[200px] w-[200px]">
              勘定科目</th>
            <th v-for="hotel in uniqueHotels" :key="hotel.hotel_id"
              class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest text-right min-w-[120px]">
              {{ hotel.hotel_name }}
            </th>
          </template>

          <!-- Department view: Account Name + Department Columns -->
          <template v-else-if="groupBy === 'department'">
            <th
              class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest sticky left-0 bg-slate-50 dark:bg-slate-900/50 z-10 min-w-[200px] max-w-[200px] w-[200px]">
              勘定科目</th>
            <th v-for="dept in uniqueDepartments" :key="dept"
              class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest text-right min-w-[120px]">
              {{ dept }}
            </th>
          </template>

          <!-- Hotel_Month or Department_Month view: Account Name + Month Columns -->
          <template v-else-if="groupBy === 'hotel_month' || groupBy === 'department_month'">
            <th
              class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest sticky left-0 bg-slate-50 dark:bg-slate-900/50 z-10 min-w-[200px] max-w-[200px] w-[200px]">
              勘定科目</th>
            <th v-for="month in uniqueMonths" :key="month"
              class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest text-right min-w-[120px]">
              {{ formatMonth(month) }}
            </th>
            <th v-if="showTotalColumn"
              class="py-4 px-4 font-black text-violet-600 dark:text-violet-400 text-xs uppercase tracking-widest text-right min-w-[120px] bg-violet-50 dark:bg-violet-900/20">
              合計
            </th>
          </template>
        </tr>
      </thead>
      <tbody>
        <!-- Month View -->
        <template v-if="groupBy === 'month'">
          <template v-for="(group, groupIndex) in groupedData" :key="groupIndex">
            <tr class="bg-violet-50 dark:bg-violet-900/20 border-b border-violet-100 dark:border-violet-900/50">
              <td
                class="py-3 px-4 font-black text-violet-700 dark:text-violet-300 text-sm sticky left-0 bg-violet-50 dark:bg-violet-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-violet-100 dark:border-violet-900/50">
                {{ group.name }}
              </td>
              <td v-for="month in uniqueMonths" :key="month"
                class="py-3 px-4 bg-violet-50 dark:bg-violet-900/20"></td>
              <td v-if="showTotalColumn" class="py-3 px-4 bg-violet-50 dark:bg-violet-900/20"></td>
            </tr>
            <tr v-for="(account, accountIndex) in group.accounts" :key="`${groupIndex}-${accountIndex}`"
              class="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
              <td
                class="py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-800 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-slate-200 dark:border-slate-700">
                {{ account.account_name }}</td>
              <td v-for="month in uniqueMonths" :key="month"
                class="py-3 px-4 text-sm font-black text-slate-900 dark:text-white text-right tabular-nums min-w-[120px]">
                {{ formatCurrency(account.amountsByMonth[month] || 0) }}
              </td>
              <td v-if="showTotalColumn"
                class="py-3 px-4 text-sm font-black text-violet-900 dark:text-violet-200 text-right tabular-nums min-w-[120px] bg-violet-50 dark:bg-violet-900/20">
                {{ formatCurrency(periodTotals[group.name]?.accounts[account.account_code] || 0) }}
              </td>
            </tr>
            <tr class="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700">
              <td
                class="py-3 px-4 text-sm font-black text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-100 dark:bg-slate-800 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-slate-200 dark:border-slate-700">
                {{ group.name }} 小計</td>
              <td v-for="month in uniqueMonths" :key="month"
                class="py-3 px-4 text-sm font-black text-slate-900 dark:text-white text-right tabular-nums min-w-[120px]">
                {{ formatCurrency(group.subtotalByMonth[month] || 0) }}
              </td>
              <td v-if="showTotalColumn"
                class="py-3 px-4 text-sm font-black text-violet-900 dark:text-violet-200 text-right tabular-nums min-w-[120px] bg-violet-100 dark:bg-violet-900/30">
                {{ formatCurrency(periodTotals[group.name]?.subtotal || 0) }}
              </td>
            </tr>
          </template>
        </template>

        <!-- Hotel View -->
        <template v-else-if="groupBy === 'hotel'">
          <template v-for="(group, groupIndex) in groupedData" :key="groupIndex">
            <tr class="bg-violet-50 dark:bg-violet-900/20 border-b border-violet-100 dark:border-violet-900/50">
              <td
                class="py-3 px-4 font-black text-violet-700 dark:text-violet-300 text-sm sticky left-0 bg-violet-50 dark:bg-violet-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-violet-100 dark:border-violet-900/50">
                {{ group.name }}
              </td>
              <td v-for="hotel in uniqueHotels" :key="hotel.hotel_id"
                class="py-3 px-4 bg-violet-50 dark:bg-violet-900/20"></td>
            </tr>
            <tr v-for="(account, accountIndex) in group.accounts" :key="`${groupIndex}-${accountIndex}`"
              class="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
              <td
                class="py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-800 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-slate-200 dark:border-slate-700">
                {{ account.account_name }}</td>
              <td v-for="hotel in uniqueHotels" :key="hotel.hotel_id"
                class="py-3 px-4 text-sm font-black text-slate-900 dark:text-white text-right tabular-nums min-w-[120px]">
                {{ formatCurrency(account.amountsByHotel[hotel.hotel_id]?.amount || 0) }}
              </td>
            </tr>
            <tr class="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700">
              <td
                class="py-3 px-4 text-sm font-black text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-100 dark:bg-slate-800 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-slate-200 dark:border-slate-700">
                {{ group.name }} 小計</td>
              <td v-for="hotel in uniqueHotels" :key="hotel.hotel_id"
                class="py-3 px-4 text-sm font-black text-slate-900 dark:text-white text-right tabular-nums min-w-[120px]">
                {{ formatCurrency(group.subtotalByHotel[hotel.hotel_id]?.amount || 0) }}
              </td>
            </tr>
          </template>
        </template>

        <!-- Department View -->
        <template v-else-if="groupBy === 'department'">
          <template v-for="(group, groupIndex) in groupedData" :key="groupIndex">
            <tr class="bg-violet-50 dark:bg-violet-900/20 border-b border-violet-100 dark:border-violet-900/50">
              <td
                class="py-3 px-4 font-black text-violet-700 dark:text-violet-300 text-sm sticky left-0 bg-violet-50 dark:bg-violet-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-violet-100 dark:border-violet-900/50">
                {{ group.name }}
              </td>
              <td v-for="dept in uniqueDepartments" :key="dept"
                class="py-3 px-4 bg-violet-50 dark:bg-violet-900/20"></td>
            </tr>
            <tr v-for="(account, accountIndex) in group.accounts" :key="`${groupIndex}-${accountIndex}`"
              class="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
              <td
                class="py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-800 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-slate-200 dark:border-slate-700">
                {{ account.account_name }}</td>
              <td v-for="dept in uniqueDepartments" :key="dept"
                class="py-3 px-4 text-sm font-black text-slate-900 dark:text-white text-right tabular-nums min-w-[120px]">
                {{ formatCurrency(account.amountsByDepartment[dept] || 0) }}
              </td>
            </tr>
            <tr class="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700">
              <td
                class="py-3 px-4 text-sm font-black text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-100 dark:bg-slate-800 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-slate-200 dark:border-slate-700">
                {{ group.name }} 小計</td>
              <td v-for="dept in uniqueDepartments" :key="dept"
                class="py-3 px-4 text-sm font-black text-slate-900 dark:text-white text-right tabular-nums min-w-[120px]">
                {{ formatCurrency(group.subtotalByDepartment[dept] || 0) }}
              </td>
            </tr>
          </template>
        </template>

        <!-- Hotel_Month View: Group by hotel, then management groups -->
        <template v-else-if="groupBy === 'hotel_month'">
          <template v-for="(hotelGroup, hotelIndex) in groupedData" :key="hotelIndex">
            <!-- Hotel Header -->
            <tr class="bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-200 dark:border-blue-800">
              <td
                class="py-4 px-4 font-black text-blue-800 dark:text-blue-300 text-base sticky left-0 bg-blue-50 dark:bg-blue-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-blue-200 dark:border-blue-800">
                {{ hotelGroup.hotel_name }}
              </td>
              <td v-for="month in uniqueMonths" :key="month" class="py-4 px-4 bg-blue-50 dark:bg-blue-900/20">
              </td>
              <td v-if="showTotalColumn" class="py-4 px-4 bg-blue-50 dark:bg-blue-900/20"></td>
            </tr>

            <!-- Management Groups for this hotel -->
            <template v-for="(group, groupIndex) in hotelGroup.managementGroups" :key="`${hotelIndex}-${groupIndex}`">
              <tr class="bg-violet-50 dark:bg-violet-900/20 border-b border-violet-100 dark:border-violet-900/50">
                <td
                  class="py-3 px-4 font-black text-violet-700 dark:text-violet-300 text-sm sticky left-0 bg-violet-50 dark:bg-violet-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-violet-100 dark:border-violet-900/50">
                  {{ group.name }}
                </td>
                <td v-for="month in uniqueMonths" :key="month" class="py-3 px-4 bg-violet-50 dark:bg-violet-900/20">
                </td>
                <td v-if="showTotalColumn" class="py-3 px-4 bg-violet-50 dark:bg-violet-900/20"></td>
              </tr>
              <tr v-for="(account, accountIndex) in group.accounts" :key="`${hotelIndex}-${groupIndex}-${accountIndex}`"
                class="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                <td
                  class="py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-800 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-slate-200 dark:border-slate-700">
                  {{ account.account_name }}</td>
                <td v-for="month in uniqueMonths" :key="month"
                  class="py-3 px-4 text-sm font-black text-slate-900 dark:text-white text-right tabular-nums min-w-[120px]">
                  {{ formatCurrency(account.amountsByMonth[month] || 0) }}
                </td>
                <td v-if="showTotalColumn"
                  class="py-3 px-4 text-sm font-black text-violet-900 dark:text-violet-200 text-right tabular-nums min-w-[120px] bg-violet-50 dark:bg-violet-900/20">
                  {{ formatCurrency(Object.values(account.amountsByMonth).reduce((sum, val) => sum + (parseFloat(val) ||
                    0), 0)) }}
                </td>
              </tr>
              <tr class="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700">
                <td
                  class="py-3 px-4 text-sm font-black text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-100 dark:bg-slate-800 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-slate-200 dark:border-slate-700">
                  {{ group.name }} 小計</td>
                <td v-for="month in uniqueMonths" :key="month"
                  class="py-3 px-4 text-sm font-black text-slate-900 dark:text-white text-right tabular-nums min-w-[120px]">
                  {{ formatCurrency(group.subtotalByMonth[month] || 0) }}
                </td>
                <td v-if="showTotalColumn"
                  class="py-3 px-4 text-sm font-black text-violet-900 dark:text-violet-200 text-right tabular-nums min-w-[120px] bg-violet-100 dark:bg-violet-900/30">
                  {{ formatCurrency(Object.values(group.subtotalByMonth).reduce((sum, val) => sum + (parseFloat(val) ||
                    0), 0)) }}
                </td>
              </tr>
            </template>

            <!-- Profit Totals for this hotel -->
            <tr class="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/50">
              <td
                class="py-4 px-4 text-sm font-black text-amber-800 dark:text-amber-300 sticky left-0 bg-amber-50 dark:bg-amber-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-amber-100 dark:border-amber-900/50">
                売上総利益</td>
              <td v-for="month in uniqueMonths" :key="month"
                class="py-4 px-4 text-sm font-black text-amber-900 dark:text-amber-200 text-right tabular-nums min-w-[120px]">
                {{ formatCurrency(totals[hotelGroup.hotel_id]?.[month]?.grossProfit || 0) }}
              </td>
              <td v-if="showTotalColumn"
                class="py-4 px-4 text-sm font-black text-violet-900 dark:text-violet-200 text-right tabular-nums min-w-[120px] bg-violet-100 dark:bg-violet-900/30">
                {{ formatCurrency(uniqueMonths.reduce((sum, m) => sum + (totals[hotelGroup.hotel_id]?.[m]?.grossProfit
                  || 0), 0)) }}
              </td>
            </tr>
            <tr class="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/50">
              <td
                class="py-4 px-4 text-sm font-black text-amber-800 dark:text-amber-300 sticky left-0 bg-amber-50 dark:bg-amber-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-amber-100 dark:border-amber-900/50">
                営業利益</td>
              <td v-for="month in uniqueMonths" :key="month"
                class="py-4 px-4 text-sm font-black text-right tabular-nums min-w-[120px]"
                :class="(totals[hotelGroup.hotel_id]?.[month]?.operatingProfit || 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-900 dark:text-amber-200'">
                {{ formatCurrency(totals[hotelGroup.hotel_id]?.[month]?.operatingProfit || 0) }}
              </td>
              <td v-if="showTotalColumn"
                class="py-4 px-4 text-sm font-black text-right tabular-nums min-w-[120px] bg-violet-100 dark:bg-violet-900/30"
                :class="uniqueMonths.reduce((sum, m) => sum + (totals[hotelGroup.hotel_id]?.[m]?.operatingProfit || 0), 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-violet-900 dark:text-violet-200'">
                {{ formatCurrency(uniqueMonths.reduce((sum, m) => sum +
                  (totals[hotelGroup.hotel_id]?.[m]?.operatingProfit || 0), 0)) }}
              </td>
            </tr>
            <tr class="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/50">
              <td
                class="py-4 px-4 text-sm font-black text-amber-800 dark:text-amber-300 sticky left-0 bg-amber-50 dark:bg-amber-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-amber-100 dark:border-amber-900/50">
                経常利益</td>
              <td v-for="month in uniqueMonths" :key="month"
                class="py-4 px-4 text-sm font-black text-right tabular-nums min-w-[120px]"
                :class="(totals[hotelGroup.hotel_id]?.[month]?.ordinaryProfit || 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-900 dark:text-amber-200'">
                {{ formatCurrency(totals[hotelGroup.hotel_id]?.[month]?.ordinaryProfit || 0) }}
              </td>
              <td v-if="showTotalColumn"
                class="py-4 px-4 text-sm font-black text-right tabular-nums min-w-[120px] bg-violet-100 dark:bg-violet-900/30"
                :class="uniqueMonths.reduce((sum, m) => sum + (totals[hotelGroup.hotel_id]?.[m]?.ordinaryProfit || 0), 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-violet-900 dark:text-violet-200'">
                {{ formatCurrency(uniqueMonths.reduce((sum, m) => sum +
                  (totals[hotelGroup.hotel_id]?.[m]?.ordinaryProfit || 0), 0)) }}
              </td>
            </tr>
            <tr class="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/50">
              <td
                class="py-4 px-4 text-sm font-black text-amber-800 dark:text-amber-300 sticky left-0 bg-amber-50 dark:bg-amber-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-amber-100 dark:border-amber-900/50">
                税引前当期純利益</td>
              <td v-for="month in uniqueMonths" :key="month"
                class="py-4 px-4 text-sm font-black text-right tabular-nums min-w-[120px]"
                :class="(totals[hotelGroup.hotel_id]?.[month]?.profitBeforeTax || 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-900 dark:text-amber-200'">
                {{ formatCurrency(totals[hotelGroup.hotel_id]?.[month]?.profitBeforeTax || 0) }}
              </td>
              <td v-if="showTotalColumn"
                class="py-4 px-4 text-sm font-black text-right tabular-nums min-w-[120px] bg-violet-100 dark:bg-violet-900/30"
                :class="uniqueMonths.reduce((sum, m) => sum + (totals[hotelGroup.hotel_id]?.[m]?.profitBeforeTax || 0), 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-violet-900 dark:text-violet-200'">
                {{ formatCurrency(uniqueMonths.reduce((sum, m) => sum +
                  (totals[hotelGroup.hotel_id]?.[m]?.profitBeforeTax || 0), 0)) }}
              </td>
            </tr>
            <tr class="bg-blue-50 dark:bg-blue-900/20 border-t-2 border-b-2 border-blue-200 dark:border-blue-800">
              <td
                class="py-4 px-4 text-sm font-black text-blue-800 dark:text-blue-300 sticky left-0 bg-blue-50 dark:bg-blue-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-blue-200 dark:border-blue-800">
                当期純利益</td>
              <td v-for="month in uniqueMonths" :key="month"
                class="py-4 px-4 text-sm font-black text-right tabular-nums min-w-[120px] whitespace-nowrap"
                :class="(totals[hotelGroup.hotel_id]?.[month]?.netProfit || 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-900 dark:text-blue-200'">
                {{ formatCurrency(totals[hotelGroup.hotel_id]?.[month]?.netProfit || 0) }}
              </td>
              <td v-if="showTotalColumn"
                class="py-4 px-4 text-sm font-black text-right tabular-nums min-w-[120px] whitespace-nowrap bg-violet-100 dark:bg-violet-900/30"
                :class="uniqueMonths.reduce((sum, m) => sum + (totals[hotelGroup.hotel_id]?.[m]?.netProfit || 0), 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-violet-900 dark:text-violet-200'">
                {{ formatCurrency(uniqueMonths.reduce((sum, m) => sum + (totals[hotelGroup.hotel_id]?.[m]?.netProfit
                  || 0), 0)) }}
              </td>
            </tr>
          </template>
        </template>

        <!-- Department_Month View: Group by department, then management groups -->
        <template v-else-if="groupBy === 'department_month'">
          <template v-for="(deptGroup, deptIndex) in groupedData" :key="deptIndex">
            <!-- Department Header -->
            <tr class="bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-200 dark:border-blue-800">
              <td
                class="py-4 px-4 font-black text-blue-800 dark:text-blue-300 text-base sticky left-0 bg-blue-50 dark:bg-blue-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-blue-200 dark:border-blue-800">
                {{ deptGroup.department }} <span v-if="deptGroup.hotel_name" class="text-sm font-medium">({{
                  deptGroup.hotel_name }})</span>
              </td>
              <td v-for="month in uniqueMonths" :key="month" class="py-4 px-4 bg-blue-50 dark:bg-blue-900/20">
              </td>
              <td v-if="showTotalColumn" class="py-4 px-4 bg-blue-50 dark:bg-blue-900/20"></td>
            </tr>

            <!-- Management Groups for this department -->
            <template v-for="(group, groupIndex) in deptGroup.managementGroups" :key="`${deptIndex}-${groupIndex}`">
              <tr class="bg-violet-50 dark:bg-violet-900/20 border-b border-violet-100 dark:border-violet-900/50">
                <td
                  class="py-3 px-4 font-black text-violet-700 dark:text-violet-300 text-sm sticky left-0 bg-violet-50 dark:bg-violet-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-violet-100 dark:border-violet-900/50">
                  {{ group.name }}
                </td>
                <td v-for="month in uniqueMonths" :key="month" class="py-3 px-4 bg-violet-50 dark:bg-violet-900/20">
                </td>
                <td v-if="showTotalColumn" class="py-3 px-4 bg-violet-50 dark:bg-violet-900/20"></td>
              </tr>
              <tr v-for="(account, accountIndex) in group.accounts" :key="`${deptIndex}-${groupIndex}-${accountIndex}`"
                class="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                <td
                  class="py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-800 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-slate-200 dark:border-slate-700">
                  {{ account.account_name }}</td>
                <td v-for="month in uniqueMonths" :key="month"
                  class="py-3 px-4 text-sm font-black text-slate-900 dark:text-white text-right tabular-nums min-w-[120px]">
                  {{ formatCurrency(account.amountsByMonth[month] || 0) }}
                </td>
                <td v-if="showTotalColumn"
                  class="py-3 px-4 text-sm font-black text-violet-900 dark:text-violet-200 text-right tabular-nums min-w-[120px] bg-violet-50 dark:bg-violet-900/20">
                  {{ formatCurrency(Object.values(account.amountsByMonth).reduce((sum, val) => sum + (parseFloat(val) ||
                    0), 0)) }}
                </td>
              </tr>
              <tr class="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700">
                <td
                  class="py-3 px-4 text-sm font-black text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-100 dark:bg-slate-800 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-slate-200 dark:border-slate-700">
                  {{ group.name }} 小計</td>
                <td v-for="month in uniqueMonths" :key="month"
                  class="py-3 px-4 text-sm font-black text-slate-900 dark:text-white text-right tabular-nums min-w-[120px]">
                  {{ formatCurrency(group.subtotalByMonth[month] || 0) }}
                </td>
                <td v-if="showTotalColumn"
                  class="py-3 px-4 text-sm font-black text-violet-900 dark:text-violet-200 text-right tabular-nums min-w-[120px] bg-violet-100 dark:bg-violet-900/30">
                  {{ formatCurrency(Object.values(group.subtotalByMonth).reduce((sum, val) => sum + (parseFloat(val) ||
                    0), 0)) }}
                </td>
              </tr>
            </template>

            <!-- Profit Totals for this department -->
            <tr class="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/50">
              <td
                class="py-4 px-4 text-sm font-black text-amber-800 dark:text-amber-300 sticky left-0 bg-amber-50 dark:bg-amber-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-amber-100 dark:border-amber-900/50">
                売上総利益</td>
              <td v-for="month in uniqueMonths" :key="month"
                class="py-4 px-4 text-sm font-black text-amber-900 dark:text-amber-200 text-right tabular-nums min-w-[120px]">
                {{ formatCurrency(totals[deptGroup.department]?.[month]?.grossProfit || 0) }}
              </td>
              <td v-if="showTotalColumn"
                class="py-4 px-4 text-sm font-black text-violet-900 dark:text-violet-200 text-right tabular-nums min-w-[120px] bg-violet-100 dark:bg-violet-900/30">
                {{ formatCurrency(uniqueMonths.reduce((sum, m) => sum +
                  (totals[deptGroup.department]?.[m]?.grossProfit || 0), 0)) }}
              </td>
            </tr>
            <tr class="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/50">
              <td
                class="py-4 px-4 text-sm font-black text-amber-800 dark:text-amber-300 sticky left-0 bg-amber-50 dark:bg-amber-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-amber-100 dark:border-amber-900/50">
                営業利益</td>
              <td v-for="month in uniqueMonths" :key="month"
                class="py-4 px-4 text-sm font-black text-right tabular-nums min-w-[120px]"
                :class="(totals[deptGroup.department]?.[month]?.operatingProfit || 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-900 dark:text-amber-200'">
                {{ formatCurrency(totals[deptGroup.department]?.[month]?.operatingProfit || 0) }}
              </td>
              <td v-if="showTotalColumn"
                class="py-4 px-4 text-sm font-black text-right tabular-nums min-w-[120px] bg-violet-100 dark:bg-violet-900/30"
                :class="uniqueMonths.reduce((sum, m) => sum + (totals[deptGroup.department]?.[m]?.operatingProfit || 0), 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-violet-900 dark:text-violet-200'">
                {{ formatCurrency(uniqueMonths.reduce((sum, m) => sum +
                  (totals[deptGroup.department]?.[m]?.operatingProfit || 0), 0)) }}
              </td>
            </tr>
            <tr class="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/50">
              <td
                class="py-4 px-4 text-sm font-black text-amber-800 dark:text-amber-300 sticky left-0 bg-amber-50 dark:bg-amber-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-amber-100 dark:border-amber-900/50">
                経常利益</td>
              <td v-for="month in uniqueMonths" :key="month"
                class="py-4 px-4 text-sm font-black text-right tabular-nums min-w-[120px]"
                :class="(totals[deptGroup.department]?.[month]?.ordinaryProfit || 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-900 dark:text-amber-200'">
                {{ formatCurrency(totals[deptGroup.department]?.[month]?.ordinaryProfit || 0) }}
              </td>
              <td v-if="showTotalColumn"
                class="py-4 px-4 text-sm font-black text-right tabular-nums min-w-[120px] bg-violet-100 dark:bg-violet-900/30"
                :class="uniqueMonths.reduce((sum, m) => sum + (totals[deptGroup.department]?.[m]?.ordinaryProfit || 0), 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-violet-900 dark:text-violet-200'">
                {{ formatCurrency(uniqueMonths.reduce((sum, m) => sum +
                  (totals[deptGroup.department]?.[m]?.ordinaryProfit || 0), 0)) }}
              </td>
            </tr>
            <tr class="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/50">
              <td
                class="py-4 px-4 text-sm font-black text-amber-800 dark:text-amber-300 sticky left-0 bg-amber-50 dark:bg-amber-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-amber-100 dark:border-amber-900/50">
                税引前当期純利益</td>
              <td v-for="month in uniqueMonths" :key="month"
                class="py-4 px-4 text-sm font-black text-right tabular-nums min-w-[120px]"
                :class="(totals[deptGroup.department]?.[month]?.profitBeforeTax || 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-900 dark:text-amber-200'">
                {{ formatCurrency(totals[deptGroup.department]?.[month]?.profitBeforeTax || 0) }}
              </td>
              <td v-if="showTotalColumn"
                class="py-4 px-4 text-sm font-black text-right tabular-nums min-w-[120px] bg-violet-100 dark:bg-violet-900/30"
                :class="uniqueMonths.reduce((sum, m) => sum + (totals[deptGroup.department]?.[m]?.profitBeforeTax || 0), 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-violet-900 dark:text-violet-200'">
                {{ formatCurrency(uniqueMonths.reduce((sum, m) => sum +
                  (totals[deptGroup.department]?.[m]?.profitBeforeTax || 0), 0)) }}
              </td>
            </tr>
            <tr class="bg-blue-50 dark:bg-blue-900/20 border-t-2 border-b-2 border-blue-200 dark:border-blue-800">
              <td
                class="py-4 px-4 text-sm font-black text-blue-800 dark:text-blue-300 sticky left-0 bg-blue-50 dark:bg-blue-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-blue-200 dark:border-blue-800">
                当期純利益</td>
              <td v-for="month in uniqueMonths" :key="month"
                class="py-4 px-4 text-sm font-black text-right tabular-nums min-w-[120px] whitespace-nowrap"
                :class="(totals[deptGroup.department]?.[month]?.netProfit || 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-900 dark:text-blue-200'">
                {{ formatCurrency(totals[deptGroup.department]?.[month]?.netProfit || 0) }}
              </td>
              <td v-if="showTotalColumn"
                class="py-4 px-4 text-sm font-black text-right tabular-nums min-w-[120px] whitespace-nowrap bg-violet-100 dark:bg-violet-900/30"
                :class="uniqueMonths.reduce((sum, m) => sum + (totals[deptGroup.department]?.[m]?.netProfit || 0), 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-violet-900 dark:text-violet-200'">
                {{ formatCurrency(uniqueMonths.reduce((sum, m) => sum + (totals[deptGroup.department]?.[m]?.netProfit ||
                  0), 0)) }}
              </td>
            </tr>
          </template>
        </template>

        <!-- Grand Totals (only for month view) -->
        <template v-if="groupBy === 'month'">
          <tr class="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/50">
            <td
              class="py-4 px-4 text-sm font-black text-amber-800 dark:text-amber-300 sticky left-0 bg-amber-50 dark:bg-amber-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-amber-100 dark:border-amber-900/50">
              売上総利益</td>
            <td v-for="month in uniqueMonths" :key="month"
              class="py-4 px-4 text-sm font-black text-amber-900 dark:text-amber-200 text-right tabular-nums min-w-[120px]">
              {{ formatCurrency(totals[month]?.grossProfit || 0) }}
            </td>
            <td v-if="showTotalColumn"
              class="py-4 px-4 text-sm font-black text-violet-900 dark:text-violet-200 text-right tabular-nums min-w-[120px] bg-violet-100 dark:bg-violet-900/30">
              {{ formatCurrency(grandPeriodTotals.grossProfit || 0) }}
            </td>
          </tr>
          <tr class="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/50">
            <td
              class="py-4 px-4 text-sm font-black text-amber-800 dark:text-amber-300 sticky left-0 bg-amber-50 dark:bg-amber-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-amber-100 dark:border-amber-900/50">
              営業利益</td>
            <td v-for="month in uniqueMonths" :key="month"
              class="py-4 px-4 text-sm font-black text-right tabular-nums min-w-[120px]"
              :class="(totals[month]?.operatingProfit || 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-900 dark:text-amber-200'">
              {{ formatCurrency(totals[month]?.operatingProfit || 0) }}
            </td>
            <td v-if="showTotalColumn"
              class="py-4 px-4 text-sm font-black text-right tabular-nums min-w-[120px] bg-violet-100 dark:bg-violet-900/30"
              :class="(grandPeriodTotals.operatingProfit || 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-violet-900 dark:text-violet-200'">
              {{ formatCurrency(grandPeriodTotals.operatingProfit || 0) }}
            </td>
          </tr>
          <tr class="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/50">
            <td
              class="py-4 px-4 text-sm font-black text-amber-800 dark:text-amber-300 sticky left-0 bg-amber-50 dark:bg-amber-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-amber-100 dark:border-amber-900/50">
              経常利益</td>
            <td v-for="month in uniqueMonths" :key="month"
              class="py-4 px-4 text-sm font-black text-right tabular-nums min-w-[120px]"
              :class="(totals[month]?.ordinaryProfit || 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-900 dark:text-amber-200'">
              {{ formatCurrency(totals[month]?.ordinaryProfit || 0) }}
            </td>
            <td v-if="showTotalColumn"
              class="py-4 px-4 text-sm font-black text-right tabular-nums min-w-[120px] bg-violet-100 dark:bg-violet-900/30"
              :class="(grandPeriodTotals.ordinaryProfit || 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-violet-900 dark:text-violet-200'">
              {{ formatCurrency(grandPeriodTotals.ordinaryProfit || 0) }}
            </td>
          </tr>
          <tr class="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/50">
            <td
              class="py-4 px-4 text-sm font-black text-amber-800 dark:text-amber-300 sticky left-0 bg-amber-50 dark:bg-amber-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-amber-100 dark:border-amber-900/50">
              税引前当期純利益</td>
            <td v-for="month in uniqueMonths" :key="month"
              class="py-4 px-4 text-sm font-black text-right tabular-nums min-w-[120px]"
              :class="(totals[month]?.profitBeforeTax || 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-900 dark:text-amber-200'">
              {{ formatCurrency(totals[month]?.profitBeforeTax || 0) }}
            </td>
            <td v-if="showTotalColumn"
              class="py-4 px-4 text-sm font-black text-right tabular-nums min-w-[120px] bg-violet-100 dark:bg-violet-900/30"
              :class="(grandPeriodTotals.profitBeforeTax || 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-violet-900 dark:text-violet-200'">
              {{ formatCurrency(grandPeriodTotals.profitBeforeTax || 0) }}
            </td>
          </tr>
          <tr class="bg-blue-50 dark:bg-blue-900/20 border-t-2 border-blue-200 dark:border-blue-800">
            <td
              class="py-4 px-4 text-sm font-black text-blue-800 dark:text-blue-300 sticky left-0 bg-blue-50 dark:bg-blue-900/20 z-10 min-w-[200px] max-w-[200px] w-[200px] border-r border-blue-200 dark:border-blue-800">
              当期純利益</td>
            <td v-for="month in uniqueMonths" :key="month"
              class="py-4 px-4 text-sm font-black text-right tabular-nums min-w-[120px] whitespace-nowrap"
              :class="(totals[month]?.netProfit || 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-900 dark:text-blue-200'">
              {{ formatCurrency(totals[month]?.netProfit || 0) }}
            </td>
            <td v-if="showTotalColumn"
              class="py-4 px-4 text-sm font-black text-right tabular-nums min-w-[120px] whitespace-nowrap bg-violet-100 dark:bg-violet-900/30"
              :class="(grandPeriodTotals.netProfit || 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-violet-900 dark:text-violet-200'">
              {{ formatCurrency(grandPeriodTotals.netProfit || 0) }}
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({
  groupBy: {
    type: String,
    required: true
  },
  showTotalColumn: {
    type: Boolean,
    default: true
  },
  uniqueMonths: {
    type: Array,
    default: () => []
  },
  uniqueHotels: {
    type: Array,
    default: () => []
  },
  uniqueDepartments: {
    type: Array,
    default: () => []
  },
  groupedData: {
    type: Array,
    default: () => []
  },
  totals: {
    type: Object,
    default: () => ({})
  },
  periodTotals: {
    type: Object,
    default: () => ({})
  },
  grandPeriodTotals: {
    type: Object,
    default: () => ({})
  },
  formatMonth: {
    type: Function,
    required: true
  },
  formatCurrency: {
    type: Function,
    required: true
  }
});
</script>

<style scoped>
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
</style>
