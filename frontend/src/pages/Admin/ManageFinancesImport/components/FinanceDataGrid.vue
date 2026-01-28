<template>
    <div class="finance-data-grid">
        <div class="flex flex-col gap-4 mb-6">
            <!-- Row 1: Selection -->
            <div class="flex flex-wrap items-center gap-3">
                <Select v-model="selectedHotel" :options="hotels" optionLabel="name" placeholder="ホテルを選択"
                    class="w-64" />
                <DatePicker v-model="selectedMonth" view="month" dateFormat="yy/mm" placeholder="開始月を選択" />
                <Button label="読み込み" icon="pi pi-refresh" @click="loadData" :loading="loading" />
            </div>

            <!-- Row 2: View Mode, Filters and Import Actions -->
            <div class="flex flex-wrap justify-between items-center gap-2 border-t pt-3">
                <div class="flex items-center gap-3">
                    <SelectButton v-model="viewFilter" :options="viewOptions" optionLabel="label" optionValue="value" />
                    <Button :label="hideZeroRows ? '全項目を表示' : '0以外の項目を表示'"
                        :icon="hideZeroRows ? 'pi pi-eye' : 'pi pi-eye-slash'"
                        class="p-button-outlined p-button-secondary" @click="hideZeroRows = !hideZeroRows"
                        :disabled="!gridData.length" />
                    <Button label="貼り付け" icon="pi pi-clipboard" class="p-button-outlined" @click="openPasteDialog"
                        :disabled="!gridData.length || (viewFilter === 'account' && type !== 'forecast')" />
                </div>

                <div class="flex gap-2 pl-2 border-l ml-2">
                    <Button label="PMS同期" icon="pi pi-bolt" class="p-button-help" @click="onSyncPMS"
                        :disabled="!selectedHotel || !selectedMonth" v-if="type === 'accounting'" />
                    <Button label="Yayoi同期" icon="pi pi-sync" class="p-button-secondary" @click="onSyncYayoi"
                        :disabled="!selectedHotel || !selectedMonth" v-if="type === 'accounting'" />
                    <Button label="保存" icon="pi pi-save" class="p-button-success" @click="saveData" :loading="saving"
                        :disabled="!hasChanges" />
                </div>
            </div>
        </div>

        <!-- Paste Dialog -->
        <Dialog v-model:visible="showPasteDialog" :header="pasteDialogHeader" :style="{ width: '60vw' }" modal>
            <div class="mb-4 text-sm text-gray-600 space-y-2">
                <p>Excelからコピーしたデータを下のテキストエリアに貼り付けてください。</p>
                <ul class="list-disc ml-5 bg-gray-50 p-3 rounded border">
                    <li>各行は<strong>合計13列</strong>である必要があります。</li>
                    <li><strong>1列目:</strong> 名称（勘定科目名または運用指標名）</li>
                    <li><strong>2〜13列目:</strong> グリッドに表示されている順序の各月の数値</li>
                </ul>
                <p><strong>ターゲット:</strong> <span class="text-primary font-bold">{{ pasteContextLabel }}</span></p>
            </div>
            <Textarea v-model="pasteRawText" class="w-full font-mono text-xs" rows="15" placeholder="ここに貼り付け..." />
            <template #footer>
                <Button label="キャンセル" icon="pi pi-times" class="p-button-text" @click="showPasteDialog = false" />
                <Button label="適用" icon="pi pi-check" @click="processPaste" :disabled="!pasteRawText" />
            </template>
        </Dialog>

        <Message v-if="pasteInfo" severity="info" class="mb-4" closable @close="pasteInfo = null">
            {{ pasteInfo }}
        </Message>

        <Dialog v-model:visible="showMappingDialog" header="未一致項目のマッピング" :style="{ width: '50vw' }" modal>
            <p class="mb-4 text-sm text-gray-600">
                以下の項目はシステム内の名称と一致しませんでした。手動でマッピング先を選択してください。
            </p>
            <div class="space-y-4 max-h-96 overflow-y-auto p-1">
                <div v-for="(item, index) in unmappedRows" :key="index" class="p-3 border rounded bg-gray-50">
                    <div class="flex items-center justify-between mb-3 border-b pb-2">
                        <div class="flex-1">
                            <small class="block text-gray-500 mb-1">Excel内の名称</small>
                            <span class="font-bold">{{ item.excelName }}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-gray-600">補助科目を使用</span>
                            <ToggleSwitch v-model="item.useSubAccount" size="small" />
                        </div>
                    </div>

                    <div class="flex items-center gap-4">
                        <i class="pi pi-arrow-right text-gray-400"></i>
                        <div class="flex-1 grid grid-cols-2 gap-2">
                            <div>
                                <small class="block text-gray-500 mb-1">勘定科目</small>
                                <Select v-model="item.selectedAccount" :options="availableAccounts" optionLabel="name"
                                    placeholder="勘定科目を選択..." class="w-full" filter />
                            </div>
                            <div v-if="item.useSubAccount">
                                <small class="block text-gray-500 mb-1">補助科目</small>
                                <Select v-model="item.selectedSubAccount"
                                    :options="getSubAccountsForAccount(item.selectedAccount?.id)" optionLabel="name"
                                    placeholder="補助科目を選択..." class="w-full" filter :disabled="!item.selectedAccount" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <template #footer>
                <div v-if="duplicateWarning" class="text-red-600 text-sm mb-3 text-left font-bold">
                    <i class="pi pi-exclamation-triangle mr-1"></i> {{ duplicateWarning }}
                </div>
                <Button label="キャンセル" icon="pi pi-times" class="p-button-text" @click="showMappingDialog = false" />
                <Button label="マッピングを適用" icon="pi pi-check" class="p-button-primary" @click="applyManualMapping"
                    :disabled="!canApplyMapping" />
            </template>
        </Dialog>

        <DataTable :value="filteredGridData" editMode="cell" @cell-edit-complete="onCellEditComplete"
            class="p-datatable-sm border rounded-lg overflow-hidden shadow-sm" scrollable scrollHeight="600px"
            rowGroupMode="subheader" groupRowsBy="management_group_name" dataKey="row_key">
            <template #groupheader="slotProps">
                <td :colspan="months.length + 1" class="bg-gray-100 py-2 px-3 font-bold">
                    <span class="text-primary">{{ slotProps.data.management_group_name }}</span>
                </td>
            </template>

            <Column field="account_name" header="名称" style="min-width: 250px"></Column>

            <Column v-for="col in months" :key="col.value" :field="col.value" :header="col.label" class="text-right">
                <template #body="{ data, field }">
                    {{ formatNumber(data[field]) }}
                </template>
                <template #editor="{ data, field }">
                    <InputNumber v-model="data[field]" mode="decimal" class="w-full" :min="0" autofocus />
                </template>
            </Column>
        </DataTable>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { DataTable, Column, Select, DatePicker, Button, InputNumber, Message, Dialog, Textarea, SelectButton, ToggleSwitch } from 'primevue';
import { useHotelStore } from '@/composables/useHotelStore';
import { useImportStore } from '@/composables/useImportStore';
import { useToast } from 'primevue/usetoast';
import { formatDate } from '@/utils/dateUtils';

const props = defineProps({
    type: {
        type: String,
        default: 'forecast' // 'forecast' or 'accounting'
    }
});

const toast = useToast();
const hotelStore = useHotelStore();
const importStore = useImportStore();

const hotels = computed(() => hotelStore.hotels.value);

const selectedHotel = ref(null);
const selectedMonth = ref(new Date());
const loading = ref(false);
const saving = ref(false);
const gridData = ref([]);
const accountCodes = ref([]);
const subAccounts = ref([]);
const hasChanges = ref(false);
const pasteInfo = ref(null);
const hideZeroRows = ref(false);

// View Filter State
const viewFilter = ref('operational'); // 'operational' or 'account'
const viewOptions = computed(() => {
    const options = [{ label: '運用指標を表示', value: 'operational' }];
    if (props.type === 'forecast') {
        options.push({ label: '勘定科目を表示', value: 'account' });
    }
    return options;
});

const filteredGridData = computed(() => {
    let data = [];
    if (viewFilter.value === 'operational') {
        data = gridData.value.filter(r => r.is_operational);
    } else {
        data = gridData.value.filter(r => !r.is_operational);
    }

    if (hideZeroRows.value) {
        return data.filter(row => {
            const total = months.value.reduce((sum, m) => sum + (parseFloat(row[m.value]) || 0), 0);
            return total !== 0;
        });
    }
    return data;
});

// Paste Dialog State
const showPasteDialog = ref(false);
const pasteRawText = ref('');
const pasteDialogHeader = computed(() => viewFilter.value === 'operational' ? '運用指標の貼り付け' : '勘定科目の貼り付け');
const pasteContextLabel = computed(() => viewFilter.value === 'operational' ? '運用指標 (売上・稼働など)' : '勘定科目 (費用・予算など)');

// Mapping Dialog State
const showMappingDialog = ref(false);
const unmappedRows = ref([]); // { excelName, values: [], selectedAccount: null, useSubAccount: false, selectedSubAccount: null }

// Debug Watcher for Subaccounts
watch(() => unmappedRows.value, (newRows) => {
    newRows.forEach((row) => {
        if (row.selectedAccount) {
            const subs = getSubAccountsForAccount(row.selectedAccount.name);
            console.log(`[Mapping Debug] Excel: "${row.excelName}" -> Account: "${row.selectedAccount.name}" available subaccounts:`, subs);
        }
    });
}, { deep: true });

const getSubAccountsForAccount = (accountName) => {
    if (!accountName || !subAccounts.value) return [];
    return subAccounts.value
        .filter(sa => sa.account_name === accountName)
        .map(sa => ({ id: sa.id, name: sa.name }));
};
const availableAccounts = computed(() => {
    if (viewFilter.value === 'account') {
        if (!accountCodes.value || accountCodes.value.length === 0) return [];
        return accountCodes.value
            .filter(ac => ac.name)
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
            .map(ac => ({ id: ac.name, name: ac.name }));
    } else {
        // Return operational rows with context (Group Name) to distinguish duplicates
        return gridData.value
            .filter(r => r.is_operational)
            .map(r => ({
                id: r.row_key,
                name: r.is_global ? r.account_name : `${r.account_name} (${r.management_group_name})`
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }
});

const canApplyMapping = computed(() => {
    const selected = unmappedRows.value.filter(r => r.selectedAccount);
    if (selected.length === 0) return false;

    // Check if each item that uses subaccount has one selected
    const missingSubAccount = unmappedRows.value.some(r => r.useSubAccount && r.selectedAccount && !r.selectedSubAccount);
    if (missingSubAccount) return false;

    // Check for duplicates (Account + Subaccount combo)
    const mappingKeys = unmappedRows.value
        .filter(r => r.selectedAccount)
        .map(r => {
            const acc = r.selectedAccount.name;
            const sub = r.useSubAccount && r.selectedSubAccount ? r.selectedSubAccount.name : '';
            return `${acc}:${sub}`;
        });
    const hasDuplicates = new Set(mappingKeys).size !== mappingKeys.length;

    return !hasDuplicates;
});

const duplicateWarning = computed(() => {
    const selected = unmappedRows.value.filter(r => r.selectedAccount);
    const mappingKeys = selected.map(r => {
        const acc = r.selectedAccount.name;
        const sub = r.useSubAccount && r.selectedSubAccount ? r.selectedSubAccount.name : '';
        return sub ? `${acc} (${sub})` : acc;
    });

    const duplicates = mappingKeys.filter((key, index) => mappingKeys.indexOf(key) !== index);

    if (duplicates.length > 0) {
        return `警告: 「${duplicates[0]}」が重複して選択されています。1つのマッピング先に複数の行を割り当てることはできません。`;
    }
    return null;
});

// Event Handlers
const onCellEditComplete = (event) => {
    const { data, newValue, field } = event;
    data[field] = newValue;
    hasChanges.value = true;
};

// Generate 12 months starting from selected month
const months = computed(() => {
    if (!selectedMonth.value) return [];
    const result = [];
    const date = new Date(selectedMonth.value);

    for (let i = 0; i < 12; i++) {
        const d = new Date(date.getFullYear(), date.getMonth() + i, 1);
        const value = formatDate(d);
        result.push({
            value,
            label: `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`,
            date: d
        });
    }
    return result;
});

const loadData = async () => {
    if (!selectedHotel.value || !selectedMonth.value) return;

    loading.value = true;
    try {
        const start = months.value[0].value;
        const end = months.value[11].value;
        const response = await importStore.getFinancesData(selectedHotel.value.id, start, end);

        accountCodes.value = response.accountCodes;
        const entries = props.type === 'forecast' ? response.forecast : [];
        const tableRecords = props.type === 'forecast' ? response.forecastTable : response.actualsTable;
        const { typeCategories, packageCategories } = response;

        const dataMap = {};

        // 1. Global Operational Metrics
        const globalMetrics = [
            { name: '営業日数', key: 'operating_days', group: '運用指標 (全体)' },
            { name: '客室数', key: 'available_room_nights', group: '運用指標 (全体)' },
            { name: '宿泊外販売客室数', key: 'non_accommodation_sold_rooms', group: '運用指標 (全体)' },
            { name: '宿泊外売上', key: 'non_accommodation_revenue', group: '運用指標 (全体)' },
        ];

        globalMetrics.forEach(m => {
            const rowKey = `global_${m.key}`;
            dataMap[rowKey] = {
                row_key: rowKey,
                account_name: m.name,
                management_group_name: m.group,
                group_sort_order: 10,
                is_operational: true,
                is_global: true,
                metric_key: m.key,
                ...months.value.reduce((acc, mo) => ({ ...acc, [mo.value]: 0 }), {})
            };
        });

        // 2. Categorized Operational Metrics
        const categorizedMetrics = [
            { name: '販売客室数', key: 'rooms_sold_nights' },
            { name: '宿泊売上', key: 'accommodation_revenue' },
        ];

        const combinations = new Set();
        // Use all combinations for both forecast and accounting to keep grid structure consistent
        typeCategories.forEach(tc => {
            packageCategories.forEach(pc => {
                combinations.add(`${tc.id}_${pc.id}`);
            });
        });

        combinations.forEach(combo => {
            const [typeId, pkgId] = combo.split('_');
            if (typeId === 'null') return;

            const typeName = typeCategories.find(c => c.id === parseInt(typeId))?.name || '未設定';
            const pkgName = packageCategories.find(c => c.id === parseInt(pkgId))?.name || '未設定';

            categorizedMetrics.forEach(m => {
                const rowKey = `categorized_${combo}_${m.key}`;
                dataMap[rowKey] = {
                    row_key: rowKey,
                    account_name: `[${pkgName}] ${m.name}`,
                    management_group_name: typeName, // Plan Type is the Group Header
                    group_sort_order: 20,
                    is_operational: true,
                    is_global: false,
                    metric_key: m.key,
                    plan_type_category_id: parseInt(typeId),
                    plan_package_category_id: pkgId === 'null' ? null : parseInt(pkgId),
                    ...months.value.reduce((acc, mo) => ({ ...acc, [mo.value]: 0 }), {})
                };
            });
        });

        // 3. Financial Accounts
        if (props.type === 'forecast') {
            accountCodes.value.forEach(ac => {
                if (ac.management_group_id) {
                    // Create main account row
                    const mainRowKey = ac.name;
                    dataMap[mainRowKey] = {
                        row_key: mainRowKey,
                        account_name: ac.name,
                        base_account_name: ac.name,
                        account_code: ac.code,
                        management_group_name: ac.management_group_name || 'その他',
                        group_sort_order: 100 + (parseInt(ac.group_display_order) || 0),
                        is_operational: false,
                        sub_account_name: null,
                        ...months.value.reduce((acc, mo) => ({ ...acc, [mo.value]: 0 }), {})
                    };

                    // Create rows for each associated sub-account
                    const accountSubs = subAccounts.value.filter(sa => sa.account_name === ac.name);
                    accountSubs.forEach(sa => {
                        const subRowKey = `${ac.name}:${sa.name}`;
                        dataMap[subRowKey] = {
                            row_key: subRowKey,
                            account_name: `${ac.name} [${sa.name}]`,
                            base_account_name: ac.name,
                            account_code: ac.code,
                            management_group_name: ac.management_group_name || 'その他',
                            group_sort_order: 100 + (parseInt(ac.group_display_order) || 0),
                            is_operational: false,
                            sub_account_name: sa.name,
                            ...months.value.reduce((acc, mo) => ({ ...acc, [mo.value]: 0 }), {})
                        };
                    });
                }
            });
        }

        // Map data
        entries.forEach(e => {
            const rowKey = e.sub_account_name ? `${e.account_name}:${e.sub_account_name}` : e.account_name;
            if (dataMap[rowKey]) {
                const mKey = formatDate(e.month);
                dataMap[rowKey][mKey] = parseFloat(e.amount);
            }
        });

        tableRecords.forEach(tr => {
            const mDate = tr.forecast_month || tr.accounting_month;
            const mKey = formatDate(mDate);

            if (tr.plan_type_category_id === null && tr.plan_package_category_id === null) {
                globalMetrics.forEach(m => {
                    const rowKey = `global_${m.key}`;
                    if (dataMap[rowKey]) dataMap[rowKey][mKey] = parseFloat(tr[m.key] || 0);
                });
            } else if (tr.plan_type_category_id !== null) {
                const combo = `${tr.plan_type_category_id}_${tr.plan_package_category_id || 'null'}`;
                categorizedMetrics.forEach(m => {
                    const rowKey = `categorized_${combo}_${m.key}`;
                    if (dataMap[rowKey]) dataMap[rowKey][mKey] = parseFloat(tr[m.key] || 0);
                });
            }
        });

        gridData.value = Object.values(dataMap).sort((a, b) => {
            if (a.group_sort_order !== b.group_sort_order) return a.group_sort_order - b.group_sort_order;
            if (a.management_group_name !== b.management_group_name) return a.management_group_name.localeCompare(b.management_group_name);
            if (a.account_code && b.account_code) return a.account_code.localeCompare(b.account_code, undefined, { numeric: true });
            return a.account_name.localeCompare(b.account_name);
        });
        hasChanges.value = false;
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'エラー', detail: 'データの読み込みに失敗しました。', life: 5000 });
    } finally {
        loading.value = false;
    }
};

const saveData = async () => {
    if (!selectedHotel.value) return;

    saving.value = true;
    try {
        const entries = [];
        const tableDataMap = {};

        gridData.value.forEach(row => {
            months.value.forEach(m => {
                const amount = row[m.value];
                if (row.is_operational) {
                    const combo = row.is_global ? 'global' : `${row.plan_type_category_id || 'null'}_${row.plan_package_category_id || 'null'}`;
                    const mapKey = `${m.value}_${combo}`;

                    if (!tableDataMap[mapKey]) {
                        tableDataMap[mapKey] = {
                            hotel_id: selectedHotel.value.id,
                            [props.type === 'forecast' ? 'forecast_month' : 'accounting_month']: m.value,
                            plan_type_category_id: row.is_global ? null : row.plan_type_category_id,
                            plan_package_category_id: row.is_global ? null : row.plan_package_category_id
                        };
                    }
                    tableDataMap[mapKey][row.metric_key] = amount;
                } else if (amount !== 0) {
                    entries.push({
                        hotel_id: selectedHotel.value.id,
                        month: m.value,
                        account_name: row.base_account_name || row.account_name,
                        sub_account_name: row.sub_account_name || null,
                        amount
                    });
                }
            });
        });

        await importStore.upsertFinancesData(props.type, entries, Object.values(tableDataMap));
        toast.add({ severity: 'success', summary: '成功', detail: 'データを保存しました。', life: 5000 });
        hasChanges.value = false;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'エラー', detail: '保存に失敗しました。', life: 5000 });
    } finally {
        saving.value = false;
    }
};

const onSyncYayoi = async () => {
    if (!selectedHotel.value || !selectedMonth.value) return;
    try {
        const monthStr = formatDate(selectedMonth.value);
        const result = await importStore.syncYayoi(selectedHotel.value.id, monthStr);
        if (result.entries && result.entries.length > 0) {
            result.entries.forEach(e => {
                const row = gridData.value.find(r => r.account_name === e.account_name);
                if (row) row[monthStr] = parseFloat(e.amount);
            });
            hasChanges.value = true;
            toast.add({ severity: 'info', summary: '同期完了', detail: `${result.entries.length}件の科目を更新しました。`, life: 5000 });
        } else {
            toast.add({ severity: 'warn', summary: '警告', detail: '同期できるデータが見つかりませんでした。', life: 5000 });
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'エラー', detail: 'Yayoi同期に失敗しました。', life: 5000 });
    }
};

const onSyncPMS = async () => {
    if (!selectedHotel.value || !selectedMonth.value) return;
    try {
        const monthStr = formatDate(selectedMonth.value);
        const result = await importStore.syncPMS(selectedHotel.value.id, monthStr);
        if (result.entries && result.entries.length > 0) {
            result.entries.forEach(e => {
                const row = gridData.value.find(r => r.account_name === e.account_name);
                if (row) row[monthStr] = parseFloat(e.amount);
            });
            hasChanges.value = true;
            toast.add({ severity: 'info', summary: 'PMS同期完了', detail: `${result.entries.length}件の科目を更新しました。`, life: 5000 });
        } else {
            toast.add({ severity: 'warn', summary: '警告', detail: '同期できるデータが見つかりませんでした。マッピングを確認してください。', life: 5000 });
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'エラー', detail: 'PMS同期に失敗しました。', life: 5000 });
    }
};

const applyManualMapping = () => {
    let appliedCount = 0;
    unmappedRows.value.forEach(item => {
        if (item.selectedAccount) {
            let targetRowKey = item.selectedAccount.id;
            if (item.useSubAccount && item.selectedSubAccount) {
                targetRowKey = `${item.selectedAccount.name}:${item.selectedSubAccount.name}`;
            }

            const row = gridData.value.find(r => r.row_key === targetRowKey);
            console.log(`[Mapping Apply] Excel: "${item.excelName}" -> Target Key: "${targetRowKey}" (${row ? 'Found' : 'NOT FOUND!'})`);

            if (row) {
                item.values.forEach((val, idx) => {
                    if (months.value[idx]) {
                        // Sum the values in case multiple Excel rows are mapped to the same account
                        row[months.value[idx].value] = (row[months.value[idx].value] || 0) + val;
                    }
                });
                appliedCount++;
            }
        }
    });
    if (appliedCount > 0) {
        hasChanges.value = true;
        // Re-trigger reactivity for computed properties
        gridData.value = [...gridData.value];
        toast.add({ severity: 'success', summary: 'マッピング適用', detail: `${appliedCount}件の手動マッピングを適用しました。`, life: 5000 });
    }
    showMappingDialog.value = false;
    unmappedRows.value = [];
};

const openPasteDialog = () => {
    pasteRawText.value = '';
    showPasteDialog.value = true;
};

const processPaste = () => {
    const pastedText = pasteRawText.value;
    if (!pastedText) return;

    const lines = pastedText.split(/\r?\n/);
    let matchedCount = 0;
    let dataUpdated = false;
    const currentUnmapped = [];

    lines.forEach(line => {
        if (!line.trim()) return;

        const cells = line.split('\t').map(c => c.trim());
        if (cells.length < 2) return;

        const excelName = cells[0];
        let startCol = 1;
        if (cells[1] && (cells[1].includes('%') || (cells[1].includes('.') && parseFloat(cells[1]) < 100))) {
            startCol = 2;
        }

        const values = cells.slice(startCol).map(v => {
            const num = parseFloat(v.replace(/,/g, '').replace(/ /g, ''));
            return isNaN(num) ? 0 : num;
        });

        const normalizedExcelName = excelName.toLowerCase().replace(/[　]/g, '');

        const row = filteredGridData.value.find(r => {
            const gridName = (r.account_name || '').toLowerCase().replace(/[　]/g, '');
            const gridCode = (r.account_code || '').toLowerCase().replace(/[　]/g, '');
            // Check for direct match or subaccount match if naming convention allows
            // Currently we stick to direct grid name match for simplicity in auto-matching
            return gridName === normalizedExcelName || gridCode === normalizedExcelName;
        });

        if (row) {
            matchedCount++;
            values.forEach((val, idx) => {
                if (months.value[idx]) {
                    row[months.value[idx].value] = (row[months.value[idx].value] || 0) + val;
                    dataUpdated = true;
                }
            });
        } else {
            if (excelName.includes('計') || excelName.includes('合計')) return;
            currentUnmapped.push({
                excelName,
                values,
                selectedAccount: null,
                useSubAccount: false,
                selectedSubAccount: null
            });
        }
    });

    if (dataUpdated) {
        hasChanges.value = true;
        pasteInfo.value = `${matchedCount} 件の項目を正常に読み込みました。`;
        toast.add({ severity: 'success', summary: '貼り付け成功', detail: `${matchedCount}件のデータを適用しました。`, life: 5000 });
    }

    showPasteDialog.value = false;

    if (currentUnmapped.length > 0) {
        unmappedRows.value = currentUnmapped;
        showMappingDialog.value = true;
    } else if (!dataUpdated && matchedCount === 0) {
        toast.add({ severity: 'warn', summary: '不一致', detail: '現在表示されている項目に一致するデータが見つかりませんでした。貼り付け先が正しいか確認してください。', life: 5000 });
    }
};

onMounted(async () => {
    await hotelStore.fetchHotels();
    try {
        const settings = await importStore.getAccountingSettings();
        if (settings) {
            if (settings.codes) accountCodes.value = settings.codes;
            if (settings.subAccounts) subAccounts.value = settings.subAccounts;
        }
    } catch (e) {
        console.error('Failed to load initial account codes:', e);
    }
});

const formatNumber = (val) => {
    if (val === undefined || val === null) return '0';
    return new Intl.NumberFormat('ja-JP').format(val);
};
</script>

<style scoped>
:deep(.p-datatable-subheader) {
    background-color: #f8fafc !important;
}
</style>