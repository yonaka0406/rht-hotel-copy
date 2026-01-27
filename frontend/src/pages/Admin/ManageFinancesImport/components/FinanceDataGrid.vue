<template>
    <div class="finance-data-grid">
        <div class="flex justify-between items-center mb-4">
            <div class="flex items-center gap-3">
                <Select v-model="selectedHotel" :options="hotels" optionLabel="name" placeholder="ホテルを選択" class="w-64" />
                <DatePicker v-model="selectedMonth" view="month" dateFormat="yy/mm" placeholder="開始月を選択" />
                <Button label="読み込み" icon="pi pi-refresh" @click="loadData" :loading="loading" />
                <IconField iconPosition="left">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="filters['global'].value" placeholder="科目を検索..." />
                </IconField>
            </div>
            <div class="flex gap-2">
                <Button label="PMS同期" icon="pi pi-bolt" class="p-button-help" @click="onSyncPMS" :disabled="!selectedHotel || !selectedMonth" v-if="type === 'accounting'" />
                <Button label="Yayoi同期" icon="pi pi-sync" class="p-button-secondary" @click="onSyncYayoi" :disabled="!selectedHotel || !selectedMonth" v-if="type === 'accounting'" />
                <Button label="保存" icon="pi pi-save" class="p-button-success" @click="saveData" :loading="saving" :disabled="!hasChanges" />
            </div>
        </div>

        <Message v-if="pasteInfo" severity="info" class="mb-4" closable @close="pasteInfo = null">
            {{ pasteInfo }}
        </Message>

        <Dialog v-model:visible="showMappingDialog" header="未一致科目のマッピング" :style="{ width: '50vw' }" modal>
            <p class="mb-4 text-sm text-gray-600">
                以下の項目はシステム内の勘定科目と一致しませんでした。手動でマッピング先を選択してください。
            </p>
            <div class="space-y-4 max-h-96 overflow-y-auto p-1">
                <div v-for="(item, index) in unmappedRows" :key="index" class="flex items-center gap-4 p-3 border rounded bg-gray-50">
                    <div class="flex-1">
                        <small class="block text-gray-500 mb-1">Excel内の名称</small>
                        <span class="font-bold">{{ item.excelName }}</span>
                    </div>
                    <i class="pi pi-arrow-right text-gray-400"></i>
                    <div class="flex-1">
                        <small class="block text-gray-500 mb-1">システム科目にマッピング</small>
                        <Select 
                            v-model="item.selectedAccount" 
                            :options="availableAccounts" 
                            optionLabel="name" 
                            placeholder="科目を選択..." 
                            class="w-full"
                            filter
                        />
                    </div>
                </div>
            </div>
            <template #footer>
                <Button label="キャンセル" icon="pi pi-times" class="p-button-text" @click="showMappingDialog = false" />
                <Button label="マッピングを適用" icon="pi pi-check" class="p-button-primary" @click="applyManualMapping" :disabled="!canApplyMapping" />
            </template>
        </Dialog>

        <DataTable 
            :value="gridData" 
            v-model:filters="filters"
            editMode="cell" 
            @cell-edit-complete="onCellEditComplete"
            class="p-datatable-sm border rounded-lg overflow-hidden shadow-sm"
            scrollable 
            scrollHeight="600px"
            rowGroupMode="subheader" 
            groupRowsBy="management_group_name"
            :globalFilterFields="['account_name', 'account_code']"
        >
            <template #groupheader="slotProps">
                <td :colspan="months.length + 1" class="bg-gray-100 py-2 px-3 font-bold">
                    <span class="text-primary">{{ slotProps.data.management_group_name }}</span>
                </td>
            </template>

            <Column field="account_name" header="勘定科目" style="min-width: 200px"></Column>
            
            <Column v-for="col in months" :key="col.value" :field="col.value" :header="col.label" class="text-right">
                <template #body="{ data, field }">
                    {{ formatNumber(data[field]) }}
                </template>
                <template #editor="{ data, field }">
                    <InputNumber v-model="data[field]" mode="decimal" class="w-full" :min="0" autofocus />
                </template>
            </Column>
        </DataTable>

        <div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
            <i class="pi pi-info-circle mr-2"></i>
            Excelからデータをコピーして、この画面で <strong>Ctrl + V</strong> を押すと、勘定科目名に基づいて自動的にデータが貼り付けられます。
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { DataTable, Column, Select, DatePicker, Button, InputNumber, Message, InputText, IconField, InputIcon, Dialog } from 'primevue';
import { FilterMatchMode } from '@primevue/core/api';
import { useHotelStore } from '@/composables/useHotelStore';
import { useImportStore } from '@/composables/useImportStore';
import { useToast } from 'primevue/usetoast';

const props = defineProps({
    type: {
        type: String,
        default: 'forecast' // 'forecast' or 'accounting'
    }
});

const toast = useToast();
const { hotels, fetchHotels } = useHotelStore();
const { getFinancesData, upsertFinancesData, syncYayoi, syncPMS } = useImportStore();

const selectedHotel = ref(null);
const selectedMonth = ref(new Date());
const loading = ref(false);
const saving = ref(false);
const gridData = ref([]);
const accountCodes = ref([]);
const hasChanges = ref(false);
const pasteInfo = ref(null);

// Mapping Dialog State
const showMappingDialog = ref(false);
const unmappedRows = ref([]); // { excelName, values: [], selectedAccount: null }
const availableAccounts = computed(() => {
    if (!accountCodes.value || accountCodes.value.length === 0) return [];
    return accountCodes.value
        .filter(ac => ac.management_group_id)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
});
const canApplyMapping = computed(() => unmappedRows.value.some(r => r.selectedAccount));

const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
});

// Generate 12 months starting from selected month
const months = computed(() => {
    if (!selectedMonth.value) return [];
    const result = [];
    const date = new Date(selectedMonth.value);
    
    for (let i = 0; i < 12; i++) {
        const d = new Date(date.getFullYear(), date.getMonth() + i, 1);
        const value = d.toISOString().slice(0, 10);
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
        const response = await getFinancesData(selectedHotel.value.id, start, end);
        
        accountCodes.value = response.accountCodes;
        const entries = props.type === 'forecast' ? response.forecast : response.actuals;
        const tableRecords = props.type === 'forecast' ? response.forecastTable : response.actualsTable;
        const { typeCategories, packageCategories } = response;
        
        const dataMap = {};
        
        // 1. Global Operational Metrics (Hotel-wide)
        const globalMetrics = [
            { name: '営業日数', key: 'operating_days', group: '運用指標' },
            { name: '客室数', key: 'available_room_nights', group: '運用指標' },
        ];

        globalMetrics.forEach(m => {
            const rowKey = `global_${m.key}`;
            dataMap[rowKey] = {
                account_name: m.name,
                management_group_name: m.group,
                is_operational: true,
                is_global: true,
                metric_key: m.key,
                ...months.value.reduce((acc, mo) => ({ ...acc, [mo.value]: 0 }), {})
            };
        });

        // 2. Categorized Operational Metrics (Detailed by Plan)
        // Only include combinations that actually have data in tableRecords
        const categorizedMetrics = [
            { name: '販売客室数', key: 'rooms_sold_nights', group: '運用指標' },
            { name: '宿泊外販売客室数', key: 'non_accommodation_sold_rooms', group: '運用指標' },
            { name: '宿泊売上', key: 'accommodation_revenue', group: '売上高' },
            { name: '宿泊外売上', key: 'non_accommodation_revenue', group: '売上高' },
        ];

        // First, identify which category combinations exist in the data
        const combinations = new Set();
        tableRecords.forEach(tr => {
            if (tr.plan_type_category_id !== null || tr.plan_package_category_id !== null) {
                combinations.add(`${tr.plan_type_category_id || 'null'}_${tr.plan_package_category_id || 'null'}`);
            }
        });

        combinations.forEach(combo => {
            const [typeId, pkgId] = combo.split('_');
            const typeName = typeCategories.find(c => c.id === parseInt(typeId))?.name || 'その他';
            const pkgName = packageCategories.find(c => c.id === parseInt(pkgId))?.name || 'その他';
            const comboLabel = `[${typeName}] [${pkgName}]`;

            categorizedMetrics.forEach(m => {
                const rowKey = `categorized_${combo}_${m.key}`;
                dataMap[rowKey] = {
                    account_name: `${comboLabel} ${m.name}`,
                    management_group_name: m.group,
                    is_operational: true,
                    is_global: false,
                    metric_key: m.key,
                    plan_type_category_id: typeId === 'null' ? null : parseInt(typeId),
                    plan_package_category_id: pkgId === 'null' ? null : parseInt(pkgId),
                    ...months.value.reduce((acc, mo) => ({ ...acc, [mo.value]: 0 }), {})
                };
            });
        });

        // 3. Financial Accounts (Forecast only)
        if (props.type === 'forecast') {
            accountCodes.value.forEach(ac => {
                if (ac.management_group_id) {
                    dataMap[ac.name] = {
                        account_name: ac.name,
                        account_code: ac.code,
                        management_group_name: ac.category1 || 'その他',
                        is_operational: false,
                        ...months.value.reduce((acc, mo) => ({ ...acc, [mo.value]: 0 }), {})
                    };
                }
            });
        }

        // Map entries (financial)
        entries.forEach(e => {
            const mKey = new Date(e.month).toISOString().slice(0, 10);
            if (dataMap[e.account_name]) {
                dataMap[e.account_name][mKey] = parseFloat(e.amount);
            }
        });

        // Map table records (operational)
        tableRecords.forEach(tr => {
            const mDate = tr.forecast_month || tr.accounting_month;
            const mKey = new Date(mDate).toISOString().slice(0, 10);
            
            if (tr.plan_type_category_id === null && tr.plan_package_category_id === null) {
                // Global metrics
                globalMetrics.forEach(m => {
                    const rowKey = `global_${m.key}`;
                    if (dataMap[rowKey]) dataMap[rowKey][mKey] = parseFloat(tr[m.key] || 0);
                });
            } else {
                // Categorized metrics
                const combo = `${tr.plan_type_category_id || 'null'}_${tr.plan_package_category_id || 'null'}`;
                categorizedMetrics.forEach(m => {
                    const rowKey = `categorized_${combo}_${m.key}`;
                    if (dataMap[rowKey]) dataMap[rowKey][mKey] = parseFloat(tr[m.key] || 0);
                });
            }
        });

        gridData.value = Object.values(dataMap);
        hasChanges.value = false;
    } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'エラー', detail: 'データの読み込みに失敗しました。' });
    } finally {
        loading.value = false;
    }
};

const onCellEditComplete = (event) => {
    const { data, newValue, field } = event;
    data[field] = newValue;
    hasChanges.value = true;
};

const saveData = async () => {
    if (!selectedHotel.value) return;
    
    saving.value = true;
    try {
        const entries = [];
        const tableDataMap = {}; // { monthStr_combo: { ...metrics } }

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
                        account_name: row.account_name,
                        amount
                    });
                }
            });
        });

        const tableData = Object.values(tableDataMap);

        await upsertFinancesData(props.type, entries, tableData);
        toast.add({ severity: 'success', summary: '成功', detail: 'データを保存しました。' });
        hasChanges.value = false;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'エラー', detail: '保存に失敗しました。' });
    } finally {
        saving.value = false;
    }
};


const onSyncYayoi = async () => {
    if (!selectedHotel.value || !selectedMonth.value) return;
    
    try {
        const monthStr = selectedMonth.value.toISOString().slice(0, 10);
        const result = await syncYayoi(selectedHotel.value.id, monthStr);
        
        if (result.entries && result.entries.length > 0) {
            result.entries.forEach(e => {
                const row = gridData.value.find(r => r.account_name === e.account_name);
                if (row) {
                    row[monthStr] = parseFloat(e.amount);
                }
            });
            hasChanges.value = true;
            toast.add({ severity: 'info', summary: '同期完了', detail: `${result.entries.length}件の科目を更新しました。` });
        } else {
            toast.add({ severity: 'warn', summary: '警告', detail: '同期できるデータが見つかりませんでした。' });
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'エラー', detail: 'Yayoi同期に失敗しました。' });
    }
};

const onSyncPMS = async () => {
    if (!selectedHotel.value || !selectedMonth.value) return;
    
    try {
        const monthStr = selectedMonth.value.toISOString().slice(0, 10);
        const result = await syncPMS(selectedHotel.value.id, monthStr);
        
        if (result.entries && result.entries.length > 0) {
            result.entries.forEach(e => {
                const row = gridData.value.find(r => r.account_name === e.account_name);
                if (row) {
                    row[monthStr] = parseFloat(e.amount);
                }
            });
            hasChanges.value = true;
            toast.add({ severity: 'info', summary: 'PMS同期完了', detail: `${result.entries.length}件の科目を更新しました。` });
        } else {
            toast.add({ severity: 'warn', summary: '警告', detail: '同期できるデータが見つかりませんでした。マッピングを確認してください。' });
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'エラー', detail: 'PMS同期に失敗しました。' });
    }
};

const applyManualMapping = () => {
    let appliedCount = 0;
    unmappedRows.value.forEach(item => {
        if (item.selectedAccount) {
            const row = gridData.value.find(r => r.account_name === item.selectedAccount.name);
            if (row) {
                item.values.forEach((val, idx) => {
                    if (months.value[idx]) {
                        row[months.value[idx].value] = val;
                    }
                });
                appliedCount++;
            }
        }
    });

    if (appliedCount > 0) {
        hasChanges.value = true;
        toast.add({ severity: 'success', summary: 'マッピング適用', detail: `${appliedCount}件の手動マッピングを適用しました。` });
    }
    showMappingDialog.value = false;
    unmappedRows.value = [];
};

// Clipboard handling for Smart Paste
const handlePaste = (event) => {
    const clipboardData = event.clipboardData || window.clipboardData;
    const pastedText = clipboardData.getData('text');
    
    if (!pastedText) return;

    if (!gridData.value || gridData.value.length === 0) {
        toast.add({ severity: 'warn', summary: '注意', detail: '先に「読み込み」ボタンを押して、グリッドにデータを表示させてください。' });
        return;
    }

    const lines = pastedText.split(/\r?\n/);
    let matchedCount = 0;
    let dataUpdated = false;
    const currentUnmapped = [];

    lines.forEach(line => {
        if (!line.trim()) return;
        
        // Excel uses tabs for columns
        const cells = line.split('\t').map(c => c.trim());
        if (cells.length < 2) return;

        const excelName = cells[0];
        // Identify values (skipping names and ratios)
        let startCol = 1;
        if (cells[1] && (cells[1].includes('%') || (cells[1].includes('.') && parseFloat(cells[1]) < 100))) {
            startCol = 2;
        }

        const values = cells.slice(startCol).map(v => {
            const num = parseFloat(v.replace(/,/g, '').replace(/ /g, ''));
            return isNaN(num) ? 0 : num;
        });

        // Try to match by name or code (case-insensitive and trimmed)
        const normalizedExcelName = excelName.toLowerCase();
        const row = gridData.value.find(r => 
            (r.account_name || '').toLowerCase() === normalizedExcelName || 
            (r.account_code || '').toLowerCase() === normalizedExcelName
        );
        
        if (row) {
            matchedCount++;
            values.forEach((val, idx) => {
                if (months.value[idx]) {
                    row[months.value[idx].value] = val;
                    dataUpdated = true;
                }
            });
        } else {
            // Check if this is a subtotal line (usually has "計" or "合計")
            if (excelName.includes('計') || excelName.includes('合計')) return;
            
            // Collect unmapped row for the dialog
            currentUnmapped.push({
                excelName,
                values,
                selectedAccount: null
            });
        }
    });

    if (dataUpdated) {
        hasChanges.value = true;
        pasteInfo.value = `Excelから ${matchedCount} 件の科目を正常に読み込みました。`;
        toast.add({ severity: 'success', summary: '貼り付け成功', detail: `${matchedCount}件のデータを貼り付けました。` });
    }

    if (currentUnmapped.length > 0) {
        unmappedRows.value = currentUnmapped;
        showMappingDialog.value = true;
    } else if (!dataUpdated && matchedCount === 0) {
        toast.add({ severity: 'warn', summary: '不一致', detail: 'システム内の科目に一致する項目が見つかりませんでした。' });
    }
};

onMounted(async () => {
    await fetchHotels();
    try {
        const settings = await getAccountingSettings();
        if (settings && settings.codes) {
            accountCodes.value = settings.codes;
        }
    } catch (e) {
        console.error('Failed to load initial account codes:', e);
    }
    window.addEventListener('paste', handlePaste);
});

onUnmounted(() => {
    window.removeEventListener('paste', handlePaste);
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