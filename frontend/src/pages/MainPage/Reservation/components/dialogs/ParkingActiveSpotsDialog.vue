<template>
    <Dialog :visible="modelValue" @update:visible="$emit('update:modelValue', $event)" :header="`駐車場割り当て - ${roomName}`"
        :closable="true" :modal="true" :style="{ width: '90vw', maxWidth: '1400px', height: '85vh' }"
        @hide="onDialogHide">
        <div class="parking-spots-dialog">
            <!-- Overall Summary -->
            <div class="overall-summary">
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label">総日数:</span>
                        <span class="stat-value">{{ filteredGroupedByDate.length }} / {{ groupedByDate.length }}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">総駐車台数:</span>
                        <span class="stat-value">{{ localSpots.length }}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">総売上:</span>
                        <span class="stat-value">{{ formatCurrency(totalRevenue) }}</span>
                    </div>
                </div>
                <div class="summary-actions">
                    <Button label="選択編集" icon="pi pi-pencil" size="small" :disabled="!hasAnySelection"
                        @click="openBulkEditDialog" severity="info" />
                    <Button label="全選択削除" icon="pi pi-trash" size="small" :disabled="!hasAnySelection"
                        @click="confirmDeleteAllSelected" severity="danger" />
                    <Button label="全データ削除" icon="pi pi-trash" size="small" outlined
                        :disabled="!localSpots || localSpots.length === 0" @click="confirmDeleteAll"
                        severity="danger" />
                </div>
            </div>

            <!-- Date Filter -->
            <div class="date-filter">
                <div class="filter-field">
                    <label for="dateRangeFilter" class="font-semibold">日付フィルター</label>
                    <DatePicker id="dateRangeFilter" v-model="dateRangeFilter" selectionMode="range" 
                                :manualInput="false" showIcon dateFormat="yy/mm/dd" 
                                placeholder="日付範囲を選択" class="w-full" />
                </div>
                <Button v-if="dateRangeFilter" label="クリア" icon="pi pi-times" 
                        size="small" text @click="clearDateFilter" />
            </div>

            <!-- Date-based view -->
            <div class="tabs-container">
                <div v-if="filteredGroupedByDate.length > 0" class="date-based-view">
                    <DataTable :value="filteredGroupedByDate" :scrollable="true" scrollHeight="500px"
                        v-model:selection="selectedDateGroups" dataKey="date"
                        selectionMode="multiple" :paginator="true" :rows="10"
                        :rowsPerPageOptions="[10, 15, 30, 50]"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                        currentPageReportTemplate="{first} から {last} 件目 / 全{totalRecords}件"
                        emptyMessage="駐車場の予約はありません">
                        <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>

                        <Column field="date" header="日付" :sortable="true" :style="{ minWidth: '180px' }">
                            <template #body="{ data }">
                                <div class="flex align-items-center gap-2">
                                    <i class="pi pi-calendar text-primary"></i>
                                    <span class="font-semibold">{{ formatDate(data.date) }}</span>
                                </div>
                            </template>
                        </Column>

                        <Column field="spotCount" header="駐車台数" :sortable="true" :style="{ minWidth: '120px' }">
                            <template #body="{ data }">
                                <Badge :value="data.spotCount" :severity="getSpotSeverity(data.spotCount)" size="large" />
                            </template>
                        </Column>

                        <Column field="vehicleType" header="車両タイプ" :sortable="false" :style="{ minWidth: '180px' }">
                            <template #body="{ data }">
                                <div class="vehicle-types">
                                    <Tag v-for="vType in data.vehicleTypesArray" :key="vType" 
                                         :value="vType" :severity="getSeverityByType(vType)" 
                                         class="mr-1 mb-1" />
                                </div>
                            </template>
                        </Column>

                        <Column field="spots" header="使用スポット" :style="{ minWidth: '300px' }">
                            <template #body="{ data }">
                                <div class="spot-by-lot">
                                    <div v-for="lotGroup in data.spotsByLotFormatted" :key="lotGroup.lotName" class="lot-group mb-2">
                                        <span class="lot-name">{{ lotGroup.lotName }}:</span>
                                        <div class="spot-tags">
                                            <Tag v-for="spot in lotGroup.spots" :key="`${lotGroup.lotName}-${spot}`" 
                                                 :value="spot" severity="secondary" class="mr-1" />
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </Column>

                        <Column headerStyle="width: 10rem; text-align: center"
                            bodyStyle="text-align: center; overflow: visible">
                            <template #body="{ data }">
                                <div class="flex gap-1 justify-content-center">
                                    <Button icon="pi pi-pencil" text rounded severity="info" size="small"
                                        @click="openEditDialog(data)" v-tooltip.top="'台数を変更'" />
                                    <Button icon="pi pi-trash" text rounded severity="danger" size="small"
                                        @click="confirmDeleteDate(data)" v-tooltip.top="'この日付の全予約を削除'" />
                                </div>
                            </template>
                        </Column>
                    </DataTable>
                </div>

                <!-- Empty state -->
                <div v-else class="empty-state">
                    <i class="pi pi-car text-6xl text-400 mb-3"></i>
                    <h3>駐車場の予約がありません</h3>
                    <p class="text-500">この部屋には駐車場の割り当てがありません。</p>
                </div>
            </div>
        </div>

        <template #footer>
            <Button label="閉じる" icon="pi pi-times" @click="closeDialog" :disabled="processing" severity="danger" text size="small" />
        </template>
    </Dialog>

    <ConfirmDialog group="parkingDialogConfirm" />

    <!-- Edit Spots Dialog -->
    <Dialog v-model:visible="showEditDialog" :header="editDialogTitle" :modal="true" 
            :style="{ width: '500px' }" @hide="onEditDialogHide">
        <div class="edit-dialog-content">
            <!-- Warning for mixed vehicle types in bulk edit -->
            <div v-if="hasMixedVehicleTypes" class="mixed-types-warning mb-3 p-3">
                <div class="flex align-items-start gap-2">
                    <i class="pi pi-exclamation-triangle text-orange-500 mt-1"></i>
                    <span class="text-sm">選択された日付には異なる車両タイプが含まれています。正確な制御のため、個別に編集してください。</span>
                </div>
            </div>

            <!-- Show breakdown by vehicle type if multiple types exist -->
            <div v-if="vehicleTypeBreakdown.length > 1" class="vehicle-type-breakdown">
                <label class="font-semibold mb-2 block">車両タイプ別台数</label>
                <div v-for="typeInfo in vehicleTypeBreakdown" :key="typeInfo.vehicleType" 
                     class="type-field mb-3">
                    <div class="flex align-items-center gap-2 mb-2">
                        <Tag :value="typeInfo.vehicleType" :severity="getSeverityByType(typeInfo.vehicleType)" />
                        <span class="text-500">(現在: {{ typeInfo.currentCount }}台 / 最大: {{ getDynamicMaxForType(typeInfo) }}台)</span>
                    </div>
                    <InputNumber v-model="typeInfo.newCount" :min="0" :max="getDynamicMaxForType(typeInfo)" 
                                 showButtons buttonLayout="horizontal" class="w-full"
                                 :disabled="editProcessing || loadingAvailability">
                        <template #incrementbuttonicon>
                            <span class="pi pi-plus" />
                        </template>
                        <template #decrementbuttonicon>
                            <span class="pi pi-minus" />
                        </template>
                    </InputNumber>
                </div>
                <div class="total-summary mt-3 p-3">
                    <div class="flex justify-content-between align-items-center">
                        <span class="font-semibold">合計:</span>
                        <span class="text-xl font-bold text-primary">
                            {{ currentSpotCount }}台 → {{ totalNewCount }}台 
                            ({{ totalDifference > 0 ? '+' : '' }}{{ totalDifference }}台)
                        </span>
                    </div>
                </div>
            </div>

            <!-- Simple count editor for single vehicle type -->
            <div v-else class="field">
                <label for="newSpotCount" class="font-semibold">新しい台数</label>
                <InputNumber id="newSpotCount" v-model="newSpotCount" :min="0" :max="maxAvailableSpots" 
                             showButtons buttonLayout="horizontal" class="w-full mt-2"
                             :disabled="editProcessing || loadingAvailability">
                    <template #incrementbuttonicon>
                        <span class="pi pi-plus" />
                    </template>
                    <template #decrementbuttonicon>
                        <span class="pi pi-minus" />
                    </template>
                </InputNumber>
                <small class="text-500 mt-2 block">
                    現在: {{ currentSpotCount }}台 → 新規: {{ newSpotCount }}台
                    ({{ spotCountDifference > 0 ? '+' : '' }}{{ spotCountDifference }}台)
                </small>
            </div>

            <small v-if="!loadingAvailability" class="text-primary mt-2 block">
                最大: {{ maxAvailableSpots }}台まで予約可能
            </small>
            <small v-else class="text-500 mt-2 block">
                <i class="pi pi-spin pi-spinner"></i> 空き状況を確認中...
            </small>

            <div v-if="editingDates.length > 1" class="affected-dates mt-3">
                <label class="font-semibold">対象日付 ({{ editingDates.length }}日)</label>
                <div class="date-chips mt-2">
                    <Tag v-for="date in editingDates" :key="date" :value="formatDate(date)" 
                         severity="info" class="mr-1 mb-1" />
                </div>
            </div>
        </div>

        <template #footer>
            <Button label="キャンセル" icon="pi pi-times" text @click="showEditDialog = false" 
                    :disabled="editProcessing" severity="secondary" />
            <Button label="更新" icon="pi pi-check" @click="saveSpotCountChange" 
                    :disabled="editProcessing || !hasChanges" 
                    :loading="editProcessing" />
        </template>
    </Dialog>
</template>

<script setup>
// Vue
import { ref, computed, watch, reactive } from 'vue';

// Primvue
import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();
import { useToast } from 'primevue/usetoast';
const toast = useToast();
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Badge from 'primevue/badge';
import InputNumber from 'primevue/inputnumber';
import DatePicker from 'primevue/datepicker';
import ConfirmDialog from 'primevue/confirmdialog';

// Store
import { useParkingStore } from '@/composables/useParkingStore';
const parkingStore = useParkingStore();

// Helper function to safely add days to a date and format as YYYY-MM-DD
const addDaysAndFormat = (dateString, days) => {
    const date = new Date(dateString);
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    roomId: {
        type: [String, Number],
        required: false,
        default: null
    },
    roomName: {
        type: String,
        default: '未設定'
    },
    parkingSpots: {
        type: Array,
        required: true
    },
    processing: {
        type: Boolean,
        default: false
    },
    reservationDetails: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits([
    'update:modelValue',
    'update:parkingSpots',
    'hide'
]);

const localSpots = ref([...props.parkingSpots]);
const selectedDateGroups = ref([]);
const showEditDialog = ref(false);
const editingDates = ref([]);
const currentSpotCount = ref(0);
const newSpotCount = ref(0);
const editProcessing = ref(false);
const maxAvailableSpots = ref(20);
const loadingAvailability = ref(false);
const dateRangeFilter = ref(null);
const vehicleTypeBreakdown = ref([]);
const hasMixedVehicleTypes = ref(false);

// Watch for external changes to parkingSpots
watch(() => props.parkingSpots, (newSpots) => {
    localSpots.value = [...newSpots];
}, { deep: true });

// Get unique parking spot numbers, sorted
const uniqueParkingSpots = computed(() => {
    const spots = [...new Set(localSpots.value.map(spot => spot.spotNumber))];
    return spots.sort((a, b) => {
        const aNum = parseInt(a.replace(/\D/g, ''));
        const bNum = parseInt(b.replace(/\D/g, ''));
        if (!isNaN(aNum) && !isNaN(bNum)) {
            return aNum - bNum;
        }
        return a.localeCompare(b);
    });
});

// Date filter computed
const filteredGroupedByDate = computed(() => {
    if (!dateRangeFilter.value || !Array.isArray(dateRangeFilter.value) || dateRangeFilter.value.length === 0) {
        return groupedByDate.value;
    }

    const [startDate, endDate] = dateRangeFilter.value;
    if (!startDate) {
        return groupedByDate.value;
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : new Date(startDate);
    end.setHours(23, 59, 59, 999);

    return groupedByDate.value.filter(group => {
        const groupDate = new Date(group.date);
        groupDate.setHours(0, 0, 0, 0);
        return groupDate >= start && groupDate <= end;
    });
});

// Group reservations by date
const groupedByDate = computed(() => {
    const groups = {};
    
    localSpots.value.forEach(spot => {
        const dateKey = spot.date;
        if (!groups[dateKey]) {
            groups[dateKey] = {
                date: dateKey,
                spotCount: 0,
                revenue: 0,
                vehicleTypes: new Set(),
                spotsByLot: {},
                reservations: []
            };
        }
        groups[dateKey].spotCount++;
        groups[dateKey].revenue += parseFloat(spot.price) || 0;
        groups[dateKey].vehicleTypes.add(spot.vehicleCategoryName || '未設定');
        
        // Group spots by parking lot
        const lotName = spot.parkingLotName || '未設定';
        if (!groups[dateKey].spotsByLot[lotName]) {
            groups[dateKey].spotsByLot[lotName] = [];
        }
        groups[dateKey].spotsByLot[lotName].push(spot.spotNumber);
        
        groups[dateKey].reservations.push(spot);
    });

    // Format spots by lot and vehicle types for display
    Object.values(groups).forEach(group => {
        // Convert vehicle types Set to Array
        group.vehicleTypesArray = Array.from(group.vehicleTypes);
        
        group.spotsByLotFormatted = Object.entries(group.spotsByLot)
            .map(([lotName, spotNumbers]) => {
                // Sort spot numbers
                const sortedSpots = spotNumbers.sort((a, b) => {
                    const aNum = parseInt(a.replace(/\D/g, ''));
                    const bNum = parseInt(b.replace(/\D/g, ''));
                    if (!isNaN(aNum) && !isNaN(bNum)) {
                        return aNum - bNum;
                    }
                    return a.localeCompare(b);
                });
                return {
                    lotName,
                    spots: sortedSpots,
                    displayText: `${lotName}: ${sortedSpots.join(', ')}`
                };
            })
            .sort((a, b) => a.lotName.localeCompare(b.lotName));
    });

    // Return sorted array by date
    return Object.values(groups).sort((a, b) => new Date(a.date) - new Date(b.date));
});

const totalRevenue = computed(() => {
    return localSpots.value.reduce((sum, spot) => sum + (parseFloat(spot.price) || 0), 0);
});

const hasAnySelection = computed(() => {
    return selectedDateGroups.value && selectedDateGroups.value.length > 0;
});

// Get data for a specific date
const getDateData = (date) => {
    const group = groupedByDate.value.find(g => g.date === date);
    return group ? group.reservations : [];
};

// Edit dialog computed properties
const editDialogTitle = computed(() => {
    if (editingDates.value.length === 1) {
        return `駐車台数変更 - ${formatDate(editingDates.value[0])}`;
    }
    return `駐車台数変更 - ${editingDates.value.length}日分`;
});

const spotCountDifference = computed(() => {
    return newSpotCount.value - currentSpotCount.value;
});

const totalNewCount = computed(() => {
    return vehicleTypeBreakdown.value.reduce((sum, type) => sum + (type.newCount || 0), 0);
});

const totalDifference = computed(() => {
    return totalNewCount.value - currentSpotCount.value;
});

const hasChanges = computed(() => {
    if (vehicleTypeBreakdown.value.length > 1) {
        // For vehicle type breakdown, check if any type count changed
        return vehicleTypeBreakdown.value.some(type => type.newCount !== type.currentCount);
    } else {
        // For simple edit, check if total count changed
        return newSpotCount.value !== currentSpotCount.value;
    }
});

// Calculate dynamic max available for each vehicle type
// This accounts for spots freed up or consumed by other vehicle types
const getDynamicMaxForType = (targetType) => {
    if (vehicleTypeBreakdown.value.length <= 1) {
        return targetType.maxAvailable;
    }
    
    // Calculate net change in spots from other types
    // Positive = freed up (other types reduced), Negative = consumed (other types increased)
    const netChangeFromOthers = vehicleTypeBreakdown.value
        .filter(type => type.vehicleType !== targetType.vehicleType)
        .reduce((sum, type) => {
            const change = type.currentCount - (type.newCount || 0);
            return sum + change;
        }, 0);
    
    // Base max + net change from other types
    // If others freed spots (positive), this type can use more
    // If others consumed spots (negative), this type has less available
    return targetType.maxAvailable + netChangeFromOthers;
};

// Get severity for spot badge based on reservation count
const getSpotSeverity = (count) => {
    if (count === 0) return 'secondary';
    if (count < 3) return 'success';
    if (count < 6) return 'warning';
    return 'danger';
};

const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short'
    });
};

const formatCurrency = (value) => {
    if (value === null || value === undefined) return '¥0';
    return `¥${parseFloat(value).toLocaleString('ja-JP')}`;
};

const getSeverityByType = (vehicleType) => {
    switch (vehicleType) {
        case '普通車': return 'info';
        case '大型車': return 'warning';
        case 'オートバイ': return 'success';
        default: return 'secondary';
    }
};

const closeDialog = () => {
    emit('update:modelValue', false);
};

const clearDateFilter = () => {
    dateRangeFilter.value = null;
};

const onDialogHide = () => {
    // Clear all selections
    selectedDateGroups.value = [];
    emit('hide');
};

const deleteSpots = async (spotsToDelete) => {
    try {
        // First delete from the backend
        if (spotsToDelete.length === 1 && spotsToDelete[0].id) {
            // Single spot deletion
            await parkingStore.removeParkingAddonWithSpot(spotsToDelete[0].id);
        } else if (spotsToDelete.length > 1) {
            // Bulk deletion
            const spotIds = spotsToDelete.map(spot => spot.id).filter(Boolean);
            if (spotIds.length > 0) {
                await parkingStore.removeBulkParkingAddonWithSpot(spotIds);
            }
        }

        // Then update the local state
        const spotIds = new Set(spotsToDelete.map(spot => spot.id));
        localSpots.value = localSpots.value.filter(spot => !spotIds.has(spot.id));

        // Clear selections
        selectedDateGroups.value = selectedDateGroups.value.filter(group => {
            return !group.reservations.some(spot => spotIds.has(spot.id));
        });

        // Emit the updated spots
        emit('update:parkingSpots', [...localSpots.value]);

        // Show success message
        const count = spotsToDelete.length;
        toast.add({
            severity: 'success',
            summary: '成功',
            detail: `${count}件のスポットを削除しました`,
            life: 3000
        });
    } catch (error) {
        console.error('Error deleting spots:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: '駐車スポットの削除に失敗しました',
            life: 3000
        });
    }
};

const confirmDeleteDate = (dateGroup) => {
    if (!dateGroup || !dateGroup.reservations || dateGroup.reservations.length === 0) return;

    confirm.require({
        group: 'parkingDialogConfirm',
        message: `${formatDate(dateGroup.date)}の全駐車予約(${dateGroup.spotCount}台)を削除しますか？`,
        header: '確認',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: {
            label: 'キャンセル',
            severity: 'secondary',
            outlined: true
        },
        acceptProps: {
            label: '削除'
        },
        accept: () => deleteSpots([...dateGroup.reservations])
    });
};

const confirmDeleteAllSelected = () => {
    if (!selectedDateGroups.value || selectedDateGroups.value.length === 0) return;
    
    const allSelected = selectedDateGroups.value.flatMap(group => group.reservations);
    const totalSpots = allSelected.length;

    confirm.require({
        group: 'parkingDialogConfirm',
        message: `選択された${selectedDateGroups.value.length}日分の駐車予約(${totalSpots}台)を削除しますか？`,
        header: '確認',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: {
            label: 'キャンセル',
            severity: 'secondary',
            outlined: true
        },
        acceptProps: {
            label: '削除'
        },
        accept: () => deleteSpots([...allSelected])
    });
};

const confirmDeleteAll = () => {
    if (!localSpots.value || localSpots.value.length === 0) return;

    confirm.require({
        group: 'parkingDialogConfirm',
        message: 'この部屋のすべての駐車場の割り当てを削除しますか？',
        header: '確認',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: {
            label: 'キャンセル',
            severity: 'secondary',
            outlined: true
        },
        acceptProps: {
            label: 'すべて削除'
        },
        accept: () => deleteSpots([...localSpots.value])
    });
};

// Edit dialog methods
const openEditDialog = async (dateGroup) => {
    editingDates.value = [dateGroup.date];
    currentSpotCount.value = dateGroup.spotCount;
    newSpotCount.value = dateGroup.spotCount;
    
    // Build vehicle type breakdown
    const typeMap = {};
    dateGroup.reservations.forEach(spot => {
        const vType = spot.vehicleCategoryName || '未設定';
        if (!typeMap[vType]) {
            typeMap[vType] = {
                vehicleType: vType,
                vehicleCategoryId: spot.vehicleCategoryId,
                currentCount: 0,
                newCount: 0,
                maxAvailable: 20,
                reservations: []
            };
        }
        typeMap[vType].currentCount++;
        typeMap[vType].reservations.push(spot);
    });
    
    vehicleTypeBreakdown.value = Object.values(typeMap).map(type => ({
        ...type,
        newCount: type.currentCount
    }));
    
    showEditDialog.value = true;
    
    // Check availability for each vehicle type
    await checkAvailabilityForTypes(dateGroup);
};

const openBulkEditDialog = async () => {
    if (!selectedDateGroups.value || selectedDateGroups.value.length === 0) return;
    
    // Check if selected dates have different vehicle type compositions or multiple types
    const allVehicleTypes = new Set();
    const vehicleTypesByDate = {};
    
    selectedDateGroups.value.forEach(group => {
        const typesForDate = new Set(group.vehicleTypesArray);
        vehicleTypesByDate[group.date] = typesForDate;
        typesForDate.forEach(type => allVehicleTypes.add(type));
    });
    
    // Check if dates have different vehicle type compositions
    const hasDifferentTypes = selectedDateGroups.value.some(group => {
        const typesForDate = vehicleTypesByDate[group.date];
        return typesForDate.size !== allVehicleTypes.size || 
               ![...allVehicleTypes].every(type => typesForDate.has(type));
    });
    
    // Show warning only if dates have different types
    hasMixedVehicleTypes.value = hasDifferentTypes;
    
    editingDates.value = selectedDateGroups.value.map(g => g.date);
    currentSpotCount.value = selectedDateGroups.value[0].spotCount;
    newSpotCount.value = selectedDateGroups.value[0].spotCount;
    
    // If all dates have the same vehicle types and there are multiple types,
    // build vehicle type breakdown for bulk editing
    if (!hasDifferentTypes && allVehicleTypes.size > 1) {
        // Build breakdown from first date as template
        const typeMap = {};
        selectedDateGroups.value[0].reservations.forEach(spot => {
            const vType = spot.vehicleCategoryName || '未設定';
            if (!typeMap[vType]) {
                typeMap[vType] = {
                    vehicleType: vType,
                    vehicleCategoryId: spot.vehicleCategoryId,
                    currentCount: 0,
                    newCount: 0,
                    maxAvailable: 20,
                    reservations: []
                };
            }
        });
        
        // Aggregate counts and reservations from all selected dates
        selectedDateGroups.value.forEach(group => {
            group.reservations.forEach(spot => {
                const vType = spot.vehicleCategoryName || '未設定';
                if (typeMap[vType]) {
                    typeMap[vType].currentCount++;
                    typeMap[vType].reservations.push(spot);
                }
            });
        });
        
        vehicleTypeBreakdown.value = Object.values(typeMap).map(type => ({
            ...type,
            newCount: type.currentCount
        }));
        
        // Check availability for each vehicle type across all dates
        await checkBulkAvailabilityForTypes();
    } else {
        vehicleTypeBreakdown.value = [];
        // Check availability for all selected dates (use the most restrictive)
        await checkBulkAvailability();
    }
    
    showEditDialog.value = true;
};

const checkAvailabilityForTypes = async (dateGroup) => {
    loadingAvailability.value = true;
    try {
        if (!props.reservationDetails?.[0]) {
            vehicleTypeBreakdown.value.forEach(type => {
                type.maxAvailable = 20;
            });
            maxAvailableSpots.value = 20;
            return;
        }

        const hotelId = props.reservationDetails[0].hotel_id;
        
        // Check availability for each vehicle type
        for (const typeInfo of vehicleTypeBreakdown.value) {
            if (!typeInfo.vehicleCategoryId) {
                typeInfo.maxAvailable = 20;
                continue;
            }

            try {
                const response = await parkingStore.checkRealTimeAvailability(
                    hotelId,
                    typeInfo.vehicleCategoryId,
                    [dateGroup.date],
                    null
                );

                const dateAvailability = response.dateAvailability?.[dateGroup.date];
                if (dateAvailability) {
                    // Max = current spots for this type + available spots
                    typeInfo.maxAvailable = typeInfo.currentCount + dateAvailability.availableSpots;
                } else {
                    typeInfo.maxAvailable = typeInfo.currentCount;
                }
            } catch (error) {
                console.error(`Error checking availability for ${typeInfo.vehicleType}:`, error);
                typeInfo.maxAvailable = typeInfo.currentCount;
            }
        }
        
        // Set overall max as sum of all type maxes
        maxAvailableSpots.value = vehicleTypeBreakdown.value.reduce((sum, type) => sum + type.maxAvailable, 0);
    } catch (error) {
        console.error('Error checking availability:', error);
        maxAvailableSpots.value = 20;
    } finally {
        loadingAvailability.value = false;
    }
};

const checkBulkAvailabilityForTypes = async () => {
    loadingAvailability.value = true;
    try {
        if (!props.reservationDetails?.[0]) {
            vehicleTypeBreakdown.value.forEach(type => {
                type.maxAvailable = 20;
            });
            maxAvailableSpots.value = 20;
            return;
        }

        const hotelId = props.reservationDetails[0].hotel_id;
        
        // Check availability for each vehicle type across all dates
        for (const typeInfo of vehicleTypeBreakdown.value) {
            if (!typeInfo.vehicleCategoryId) {
                typeInfo.maxAvailable = 20;
                continue;
            }

            try {
                const response = await parkingStore.checkRealTimeAvailability(
                    hotelId,
                    typeInfo.vehicleCategoryId,
                    editingDates.value,
                    null
                );

                // Find the minimum available spots across all dates for this type (bottleneck)
                let minAvailableForType = Infinity;
                
                editingDates.value.forEach(date => {
                    const dateAvailability = response.dateAvailability?.[date];
                    const dateGroup = selectedDateGroups.value.find(g => g.date === date);
                    
                    // Count current spots for this type on this date
                    const currentForTypeOnDate = dateGroup?.reservations.filter(
                        spot => (spot.vehicleCategoryName || '未設定') === typeInfo.vehicleType
                    ).length || 0;
                    
                    if (dateAvailability) {
                        const maxForTypeOnDate = currentForTypeOnDate + dateAvailability.availableSpots;
                        minAvailableForType = Math.min(minAvailableForType, maxForTypeOnDate);
                    } else {
                        minAvailableForType = Math.min(minAvailableForType, currentForTypeOnDate);
                    }
                });
                
                typeInfo.maxAvailable = minAvailableForType === Infinity ? typeInfo.currentCount : minAvailableForType;
            } catch (error) {
                console.error(`Error checking availability for ${typeInfo.vehicleType}:`, error);
                typeInfo.maxAvailable = typeInfo.currentCount;
            }
        }
        
        // Set overall max as sum of all type maxes
        maxAvailableSpots.value = vehicleTypeBreakdown.value.reduce((sum, type) => sum + type.maxAvailable, 0);
    } catch (error) {
        console.error('Error checking availability:', error);
        maxAvailableSpots.value = 20;
    } finally {
        loadingAvailability.value = false;
    }
};

const checkAvailability = async (dateGroup) => {
    loadingAvailability.value = true;
    try {
        if (!props.reservationDetails?.[0]) {
            maxAvailableSpots.value = 20;
            return;
        }

        const hotelId = props.reservationDetails[0].hotel_id;
        const vehicleCategoryId = dateGroup.reservations[0]?.vehicleCategoryId;
        
        if (!vehicleCategoryId) {
            maxAvailableSpots.value = 20;
            return;
        }

        // Check real-time availability for this date
        const response = await parkingStore.checkRealTimeAvailability(
            hotelId,
            vehicleCategoryId,
            [dateGroup.date],
            null
        );

        const dateAvailability = response.dateAvailability?.[dateGroup.date];
        if (dateAvailability) {
            // Max = current spots + available spots
            maxAvailableSpots.value = currentSpotCount.value + dateAvailability.availableSpots;
        } else {
            maxAvailableSpots.value = currentSpotCount.value;
        }
    } catch (error) {
        console.error('Error checking availability:', error);
        maxAvailableSpots.value = 20;
    } finally {
        loadingAvailability.value = false;
    }
};

const checkBulkAvailability = async () => {
    loadingAvailability.value = true;
    try {
        if (!props.reservationDetails?.[0] || !selectedDateGroups.value.length) {
            maxAvailableSpots.value = 20;
            return;
        }

        const hotelId = props.reservationDetails[0].hotel_id;
        const vehicleCategoryId = selectedDateGroups.value[0].reservations[0]?.vehicleCategoryId;
        
        if (!vehicleCategoryId) {
            maxAvailableSpots.value = 20;
            return;
        }

        // Check real-time availability for all dates
        // Note: We don't exclude the current reservation because we want to know
        // the total capacity including what's currently reserved
        const response = await parkingStore.checkRealTimeAvailability(
            hotelId,
            vehicleCategoryId,
            editingDates.value,
            null
        );

        // Find the minimum available spots across all dates (bottleneck)
        // Each date can have different current counts, so we need to check each individually
        let minAvailable = Infinity;
        const dateDetails = [];
        
        editingDates.value.forEach(date => {
            const dateAvailability = response.dateAvailability?.[date];
            const dateGroup = selectedDateGroups.value.find(g => g.date === date);
            const currentForDate = dateGroup?.spotCount || 0;
            
            if (dateAvailability) {
                const maxForDate = currentForDate + dateAvailability.availableSpots;
                minAvailable = Math.min(minAvailable, maxForDate);
                dateDetails.push({
                    date,
                    current: currentForDate,
                    available: dateAvailability.availableSpots,
                    max: maxForDate
                });
            } else {
                // If no availability data, assume no additional spots available
                minAvailable = Math.min(minAvailable, currentForDate);
                dateDetails.push({
                    date,
                    current: currentForDate,
                    available: 0,
                    max: currentForDate
                });
            }
        });

        console.log('Bulk availability check:', dateDetails);
        maxAvailableSpots.value = minAvailable === Infinity ? currentSpotCount.value : minAvailable;
    } catch (error) {
        console.error('Error checking bulk availability:', error);
        maxAvailableSpots.value = 20;
    } finally {
        loadingAvailability.value = false;
    }
};

const onEditDialogHide = () => {
    editingDates.value = [];
    currentSpotCount.value = 0;
    newSpotCount.value = 0;
    maxAvailableSpots.value = 20;
    loadingAvailability.value = false;
    vehicleTypeBreakdown.value = [];
    hasMixedVehicleTypes.value = false;
};

const saveSpotCountChange = async () => {
    editProcessing.value = true;
    
    try {
        // Get hotel_id and reservation_id from props.reservationDetails
        const hotelId = props.reservationDetails?.[0]?.hotel_id;
        const reservationId = props.reservationDetails?.[0]?.reservation_id;
        
        if (!hotelId || !reservationId) {
            throw new Error('Hotel ID or Reservation ID not found');
        }

        // Get sample reservation data for vehicle category and price
        const firstDate = editingDates.value[0];
        const firstDateData = getDateData(firstDate);
        if (!firstDateData || firstDateData.length === 0) {
            throw new Error('No reservation data found for the selected date');
        }
        
        const assignmentsToAdd = [];
        const spotsToDelete = [];
        
        // Check if we're using vehicle type breakdown
        if (vehicleTypeBreakdown.value.length > 1) {
            // Handle vehicle type breakdown mode
            for (const date of editingDates.value) {
                const dateData = getDateData(date);
                
                // Process each vehicle type
                for (const typeInfo of vehicleTypeBreakdown.value) {
                    const currentSpotsForType = typeInfo.reservations.filter(spot => spot.date === date);
                    const currentCountForType = currentSpotsForType.length;
                    const differenceForType = typeInfo.newCount - currentCountForType;
                    
                    if (differenceForType > 0) {
                        // Add spots for this vehicle type
                        const sampleForType = currentSpotsForType[0];
                        for (let i = 0; i < differenceForType; i++) {
                            assignmentsToAdd.push({
                                id: `temp-${Date.now()}-${date}-${typeInfo.vehicleType}-${i}`,
                                hotel_id: hotelId,
                                reservation_id: reservationId,
                                roomId: props.roomId,
                                check_in: date,
                                check_out: addDaysAndFormat(date, 1),
                                numberOfSpots: 1,
                                vehicle_category_id: sampleForType.vehicleCategoryId,
                                unit_price: sampleForType.price || 0,
                                comment: '',
                                addon: {
                                    addons_hotel_id: null,
                                    addons_global_id: null
                                }
                            });
                        }
                    } else if (differenceForType < 0) {
                        // Remove spots for this vehicle type
                        const spotsToRemoveForType = Math.abs(differenceForType);
                        spotsToDelete.push(...currentSpotsForType.slice(-spotsToRemoveForType));
                    }
                }
            }
        } else {
            // Handle simple count mode
            const targetCount = newSpotCount.value;
            const sampleReservation = firstDateData[0];
            
            // Process each date individually to handle different current counts
            for (const date of editingDates.value) {
                const dateData = getDateData(date);
                const currentCountForDate = dateData.length;
                const differenceForDate = targetCount - currentCountForDate;
                
                if (differenceForDate > 0) {
                    // Add spots for this date
                    for (let i = 0; i < differenceForDate; i++) {
                        assignmentsToAdd.push({
                            id: `temp-${Date.now()}-${date}-${i}`,
                            hotel_id: hotelId,
                            reservation_id: reservationId,
                            roomId: props.roomId,
                            check_in: date,
                            check_out: addDaysAndFormat(date, 1),
                            numberOfSpots: 1,
                            vehicle_category_id: sampleReservation.vehicleCategoryId,
                            unit_price: sampleReservation.price || 0,
                            comment: '',
                            addon: {
                                addons_hotel_id: null,
                                addons_global_id: null
                            }
                        });
                    }
                } else if (differenceForDate < 0) {
                    // Remove spots for this date
                    const spotsToRemoveForDate = Math.abs(differenceForDate);
                    spotsToDelete.push(...dateData.slice(-spotsToRemoveForDate));
                }
                // If differenceForDate === 0, no change needed for this date
            }
        }
        
        // Execute deletions first, then additions
        // This ensures spots are freed up before trying to add new ones
        if (spotsToDelete.length > 0) {
            await deleteSpots(spotsToDelete);
        }
        
        if (assignmentsToAdd.length > 0) {
            await parkingStore.saveParkingAssignments(assignmentsToAdd);
        }

        // Refresh the parking data
        if (props.reservationDetails?.[0]) {
            await parkingStore.fetchParkingReservations(
                props.reservationDetails[0].hotel_id,
                props.reservationDetails[0].reservation_id
            );
        }

        toast.add({
            severity: 'success',
            summary: '成功',
            detail: `${editingDates.value.length}日分の駐車台数を更新しました`,
            life: 3000
        });

        showEditDialog.value = false;
    } catch (error) {
        console.error('Error updating spot count:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: '駐車台数の更新に失敗しました',
            life: 3000
        });
    } finally {
        editProcessing.value = false;
    }
};
</script>

<style scoped>
.parking-spots-dialog {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: 100%;
}

.overall-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: linear-gradient(135deg, var(--primary-50) 0%, var(--primary-100) 100%);
    border-radius: 0.5rem;
    border: 1px solid var(--primary-200);
    flex-shrink: 0;
}

.summary-stats {
    display: flex;
    gap: 2rem;
}

.stat-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.stat-label {
    font-size: 0.875rem;
    color: var(--text-color-secondary);
}

.stat-value {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--primary-color);
}

.summary-actions {
    display: flex;
    gap: 0.5rem;
}

.date-filter {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    padding: 1rem;
    background: var(--surface-50);
    border-radius: 0.5rem;
    border: 1px solid var(--surface-200);
}

.filter-field {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.tabs-container {
    flex: 1;
    min-height: 0;
}

.date-based-view {
    height: 100%;
}

.spot-by-lot {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.lot-group {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.lot-name {
    font-weight: 600;
    color: var(--text-color-secondary);
    font-size: 0.875rem;
    white-space: nowrap;
    min-width: 80px;
}

.spot-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
}

.vehicle-types {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 400px;
    text-align: center;
    color: var(--text-color-secondary);
}

/* Dialog content styling */
:deep(.p-dialog-content) {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
}

/* DataTable styling */
:deep(.p-datatable .p-paginator) {
    padding: 0.5rem 1rem;
}

/* Edit dialog styling */
.edit-dialog-content {
    padding: 1rem 0;
}

.affected-dates {
    padding: 1rem;
    background: var(--surface-50);
    border-radius: 0.5rem;
    border: 1px solid var(--surface-200);
}

.date-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
}

.vehicle-type-breakdown {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.type-field {
    padding: 1rem;
    background: var(--surface-50);
    border-radius: 0.5rem;
    border: 1px solid var(--surface-200);
}

.total-summary {
    background: var(--primary-50);
    border-radius: 0.5rem;
    border: 2px solid var(--primary-200);
}

.mixed-types-warning {
    background: var(--orange-50);
    border: 1px solid var(--orange-200);
    border-radius: 0.5rem;
    color: var(--orange-900);
}

.mixed-types-warning i {
    flex-shrink: 0;
}
</style>
