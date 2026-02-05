<script setup>
import { ref, computed } from 'vue';
import { useAccountingStore } from '@/composables/useAccountingStore';
import { useRouter } from 'vue-router';
import { getUtilityUnit } from '@/utils/accountingUtils';

const props = defineProps({
    data: {
        type: Object,
        required: true,
        // Expected format: { actual: Array, budget: Array, occupancy: Object }
    },
    isLoading: {
        type: Boolean,
        default: false
    },
    filters: {
        type: Object,
        default: () => ({})
    }
});

const formatNumber = (val) => {
    if (val === null || val === undefined) return '-';
    const rounded = Math.round(val);
    const absVal = Math.abs(rounded);
    const formatted = new Intl.NumberFormat('ja-JP').format(absVal);
    return rounded < 0 ? `(${formatted})` : formatted;
};

const formatPercent = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return `${val.toFixed(2)}%`;
};

const formatDiffPercent = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    const absVal = Math.abs(val);
    const formatted = absVal.toFixed(2);
    const sign = val > 0 ? '+' : '▲';
    return val === 0 ? '-' : `${sign}${formatted} p.p.`;
};

const accountingStore = useAccountingStore();
const router = useRouter();

const expandedGroups = ref(new Set());
const expandedAccounts = ref(new Set());
const utilityDetails = ref({}); // { 'account_name': Array }
const isUtilityLoading = ref(false);

const toggleGroup = (label) => {
    if (expandedGroups.value.has(label)) {
        expandedGroups.value.delete(label);
    } else {
        expandedGroups.value.add(label);
    }
};

const toggleAccount = async (accountName) => {
    if (expandedAccounts.value.has(accountName)) {
        expandedAccounts.value.delete(accountName);
    } else {
        expandedAccounts.value.add(accountName);
        if (accountName === '水道光熱費' && !utilityDetails.value['水道光熱費']) {
            await fetchUtilityDetails();
        }
    }
};

const fetchUtilityDetails = async () => {
    if (!props.data.occupancy?.actual?.length || !props.filters.selectedMonth) return;

    isUtilityLoading.value = true;
    try {
        const hotelIds = props.data.occupancy.actual.map(o => o.hotel_id);
        const d = props.filters.selectedMonth;
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);

        const formatDate = (date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        const params = {
            startMonth: formatDate(start),
            endMonth: formatDate(end)
        };

        const allDetails = await Promise.all(hotelIds.map(hid =>
            accountingStore.fetchUtilityDetails({ ...params, hotelId: hid })
        ));

        utilityDetails.value['水道光熱費'] = allDetails.flat();
    } catch (e) {
        console.error('Failed to fetch utility details:', e);
    } finally {
        isUtilityLoading.value = false;
    }
};

const totalOccupancy = computed(() => {
    if (!props.data.occupancy?.actual) return 0;
    return props.data.occupancy.actual.reduce((sum, o) => sum + parseInt(o.rooms_sold || 0), 0);
});

const rows = computed(() => {
    if (!props.data || !props.data.actual || !props.data.budget) return [];

    const actual = props.data.actual;
    const budget = props.data.budget;

    const findGroupSum = (list, mgIds) => {
        return list
            .filter(i => mgIds.includes(i.management_group_id))
            .reduce((sum, i) => sum + parseFloat(i.amount), 0);
    };

    const getAccountsInGroups = (mgIds) => {
        const accounts = new Map();

        actual.filter(i => mgIds.includes(i.management_group_id)).forEach(i => {
            if (!accounts.has(i.account_name)) {
                accounts.set(i.account_name, { name: i.account_name, code: i.account_code, actual: 0, budget: 0 });
            }
            accounts.get(i.account_name).actual += parseFloat(i.amount);
        });

        budget.filter(i => mgIds.includes(i.management_group_id)).forEach(i => {
            if (!accounts.has(i.account_name)) {
                accounts.set(i.account_name, { name: i.account_name, code: i.account_code, actual: 0, budget: 0 });
            }
            accounts.get(i.account_name).budget += parseFloat(i.amount);
        });

        return Array.from(accounts.values()).map(acc => {
            const diff = acc.actual - acc.budget;
            return { ...acc, diff };
        }).sort((a, b) => a.code.localeCompare(b.code));
    };

    const createRow = (label, mgIds, isProfit = false, canExpand = true) => {
        const aVal = findGroupSum(actual, mgIds);
        const bVal = findGroupSum(budget, mgIds);
        const diff = aVal - bVal;

        // Determine if positive diff is "good" or "bad"
        // Groups 2, 3, 4, 5, 7 are expenses
        const isExpense = mgIds.length === 1 && [2, 3, 4, 5, 7].includes(mgIds[0]);
        const isGood = isExpense ? diff <= 0 : diff >= 0;

        const aRev = findGroupSum(actual, [1]);
        const bRev = findGroupSum(budget, [1]);

        const aRatio = aRev !== 0 ? Math.abs(aVal / aRev) * 100 : 0;
        const bRatio = bRev !== 0 ? Math.abs(bVal / bRev) * 100 : 0;
        const diffRatio = aRatio - bRatio;

        return {
            label,
            budget: bVal,
            actual: aVal,
            diff,
            budgetRatio: bRatio,
            actualRatio: aRatio,
            diffRatio,
            isProfit,
            isGood,
            isExpense,
            canExpand,
            accounts: canExpand ? getAccountsInGroups(mgIds) : []
        };
    };

    const result = [];
    result.push(createRow('売上高', [1]));
    result.push(createRow('売上原価', [2]));
    result.push(createRow('売上総利益', [1, 2], true, false));
    result.push(createRow('人件費', [3]));
    result.push(createRow('経費', [4]));
    result.push(createRow('減価償却費', [5]));
    result.push(createRow('営業利益', [1, 2, 3, 4, 5], true, false));
    result.push(createRow('営業外収入', [6]));
    result.push(createRow('営業外費用', [7]));
    result.push(createRow('経常利益', [1, 2, 3, 4, 5, 6, 7], true, false));

    return result;
});
</script>

<template>
    <div class="overflow-x-auto">
        <table class="w-full text-sm text-left border-collapse">
            <thead>
                <tr class="border-b border-slate-200 dark:border-slate-700">
                    <th class="py-3 px-4 font-bold text-slate-500 dark:text-slate-400">項目</th>
                    <th class="py-3 px-4 font-bold text-slate-900 dark:text-white text-right">予算</th>
                    <th class="py-3 px-4 font-bold text-slate-900 dark:text-white text-right">実績</th>
                    <th class="py-3 px-4 font-bold text-slate-900 dark:text-white text-right">予実対比</th>
                    <th class="py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-right">予算 (%)</th>
                    <th class="py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-right">実績 (%)</th>
                    <th class="py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-right">予実対比 (p.p.)</th>
                </tr>
            </thead>
            <tbody v-if="isLoading">
                <tr v-for="i in 10" :key="i" class="animate-pulse">
                    <td class="py-3 px-4"><div class="h-4 bg-slate-100 dark:bg-slate-700 rounded w-24"></div></td>
                    <td class="py-3 px-4 text-right"><div class="h-4 bg-slate-100 dark:bg-slate-700 rounded w-16 ml-auto"></div></td>
                    <td class="py-3 px-4 text-right"><div class="h-4 bg-slate-100 dark:bg-slate-700 rounded w-16 ml-auto"></div></td>
                    <td class="py-3 px-4 text-right"><div class="h-4 bg-slate-100 dark:bg-slate-700 rounded w-16 ml-auto"></div></td>
                    <td class="py-3 px-4 text-right"><div class="h-4 bg-slate-100 dark:bg-slate-700 rounded w-12 ml-auto"></div></td>
                    <td class="py-3 px-4 text-right"><div class="h-4 bg-slate-100 dark:bg-slate-700 rounded w-12 ml-auto"></div></td>
                    <td class="py-3 px-4 text-right"><div class="h-4 bg-slate-100 dark:bg-slate-700 rounded w-12 ml-auto"></div></td>
                </tr>
            </tbody>
            <tbody v-else>
                <template v-for="row in rows" :key="row.label">
                    <tr
                        :class="[
                            'border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors',
                            row.isProfit ? 'bg-violet-50/30 dark:bg-violet-900/10 font-bold' : '',
                            row.canExpand ? 'cursor-pointer' : ''
                        ]"
                        @click="row.canExpand && toggleGroup(row.label)">
                        <td class="py-3 px-4 text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <i v-if="row.canExpand" class="pi text-[10px] text-slate-400 transition-transform duration-200"
                                :class="expandedGroups.has(row.label) ? 'pi-chevron-down' : 'pi-chevron-right'"></i>
                            {{ row.label }}
                        </td>
                        <td class="py-3 px-4 text-right text-slate-900 dark:text-white font-mono">{{ formatNumber(row.budget) }}</td>
                        <td class="py-3 px-4 text-right text-slate-900 dark:text-white font-mono">{{ formatNumber(row.actual) }}</td>
                        <td class="py-3 px-4 text-right font-mono"
                            :class="row.isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                            <span v-tooltip.top="row.isExpense ? '予算との差分（マイナスはコスト削減に成功）' : '予算との差分（プラスは目標超過達成）'">
                                {{ row.diff > 0 ? '+' : '' }}{{ formatNumber(row.diff) }}
                            </span>
                        </td>
                        <td class="py-3 px-4 text-right text-slate-500 dark:text-slate-400 font-mono text-xs">{{ formatPercent(row.budgetRatio) }}</td>
                        <td class="py-3 px-4 text-right text-slate-500 dark:text-slate-400 font-mono text-xs">{{ formatPercent(row.actualRatio) }}</td>
                        <td class="py-3 px-4 text-right text-slate-500 dark:text-slate-400 font-mono text-xs">{{ formatDiffPercent(row.diffRatio) }}</td>
                    </tr>

                    <!-- Account Details (Drill-down) -->
                    <template v-if="expandedGroups.has(row.label)">
                        <tr v-for="acc in row.accounts" :key="acc.code"
                            class="bg-slate-50/50 dark:bg-slate-900/20 text-[13px] border-b border-slate-100/50 dark:border-slate-800/30"
                            :class="{ 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50': acc.name === '水道光熱費' }"
                            @click="acc.name === '水道光熱費' && toggleAccount(acc.name)">
                            <td class="py-2 px-10 text-slate-500 dark:text-slate-400 italic flex items-center gap-2">
                                <i v-if="acc.name === '水道光熱費'" class="pi text-[9px] text-slate-400 transition-transform duration-200"
                                    :class="expandedAccounts.has(acc.name) ? 'pi-chevron-down' : 'pi-chevron-right'"></i>
                                {{ acc.name }}
                                <span class="text-[10px] ml-1 opacity-50">{{ acc.code }}</span>
                            </td>
                            <td class="py-2 px-4 text-right text-slate-400 dark:text-slate-500 font-mono">{{ formatNumber(acc.budget) }}</td>
                            <td class="py-2 px-4 text-right text-slate-400 dark:text-slate-500 font-mono">{{ formatNumber(acc.actual) }}</td>
                            <td class="py-2 px-4 text-right font-mono text-xs"
                                :class="acc.diff >= 0 ? 'text-emerald-500/70' : 'text-rose-500/70'">
                                {{ acc.diff > 0 ? '+' : '' }}{{ formatNumber(acc.diff) }}
                            </td>
                            <td colspan="3">
                                <div v-if="acc.name === '水道光熱費'" class="flex justify-end pr-4">
                                    <Button icon="pi pi-bolt" label="詳細入力" size="small" text @click.stop="router.push({ name: 'AccountingUtilityBills' })" />
                                </div>
                            </td>
                        </tr>

                        <!-- Utility Details (Nested under 水道光熱費) -->
                        <template v-if="acc.name === '水道光熱費' && expandedAccounts.has(acc.name) && utilityDetails['水道光熱費']">
                            <tr v-for="util in utilityDetails['水道光熱費']" :key="util.id" class="bg-amber-50/20 dark:bg-amber-900/5 text-[11px] border-b border-slate-100/30">
                                <td class="py-1 px-16 text-slate-400">
                                    • {{ util.sub_account_name }} ({{ util.provider_name || '不明' }})
                                </td>
                                <td class="py-1 px-4 text-right font-mono">{{ formatNumber(util.quantity) }} <span class="text-[9px] opacity-50">{{ getUtilityUnit(util.sub_account_name) }}</span></td>
                                <td class="py-1 px-4 text-right font-mono">{{ formatNumber(util.total_value) }}</td>
                                <td colspan="4" class="py-1 px-4">
                                    <div class="flex items-center gap-4 text-[10px]">
                                        <span class="text-slate-400">単価: <span class="font-bold text-slate-600 dark:text-slate-300">¥{{ formatNumber(util.average_price) }}</span></span>
                                        <span v-if="totalOccupancy > 0" class="text-slate-400">
                                            客室あたり: <span class="font-bold text-violet-600 dark:text-violet-400">
                                                {{ (util.quantity / totalOccupancy).toFixed(2) }}{{ getUtilityUnit(util.sub_account_name) }}
                                            </span>
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        </template>
                    </template>
                </template>
            </tbody>
        </table>
    </div>
</template>
