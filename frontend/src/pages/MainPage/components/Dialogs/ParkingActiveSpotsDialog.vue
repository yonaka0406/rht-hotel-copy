<template>
    <Dialog :visible="modelValue" @update:visible="$emit('update:modelValue', $event)" :header="`駐車場割り当て - ${roomName}`"
        :closable="true" :modal="true" :style="{ width: '90vw', maxWidth: '1400px', height: '85vh' }"
        @hide="onDialogHide">
        <div class="parking-spots-dialog">
            <!-- Overall Summary -->
            <div class="overall-summary">
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label">総駐車スポット:</span>
                        <span class="stat-value">{{ uniqueParkingSpots.length }}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">総予約数:</span>
                        <span class="stat-value">{{ localSpots.length }}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">総売上:</span>
                        <span class="stat-value">{{ formatCurrency(totalRevenue) }}</span>
                    </div>
                </div>
                <div class="summary-actions">
                    <Button label="全選択削除" icon="pi pi-trash" size="small" :disabled="!hasAnySelection"
                        @click="confirmDeleteAllSelected" severity="danger" />
                    <Button label="全データ削除" icon="pi pi-trash" size="small" outlined
                        :disabled="!localSpots || localSpots.length === 0" @click="confirmDeleteAll"
                        severity="danger" />
                </div>
            </div>

            <!-- Tabs for each parking spot -->
            <div class="tabs-container">
                <Tabs v-if="uniqueParkingSpots.length > 0" v-model:value="activeTab" class="parking-tabs">
                    <TabList>
                        <Tab v-for="spot in groupedSpots" :key="spot.spotNumber" :value="spot.spotNumber"
                            class="tab-header">
                            <div class="flex flex-column">
                                <span>{{ spot.spotNumber }}</span>
                                <small class="text-xs text-500">{{ spot.parkingLotName || '未設定' }}</small>
                            </div>
                            <Badge :value="spot.count" :severity="getSpotSeverity(spot.count)" class="ml-2" />
                        </Tab>
                    </TabList>
                    <TabPanels>
                        <TabPanel v-for="spot in groupedSpots" :key="spot.spotNumber" :value="spot.spotNumber">
                            <div class="tab-content">
                                <!-- Spot Summary -->
                                <div class="spot-summary">
                                    <div class="spot-info">
                                        <Tag :value="spot.vehicleType" :severity="getSeverityByType(spot.vehicleType)"
                                            class="mr-2" />
                                        <span class="font-semibold">
                                            {{ spot.count }}件の予約
                                        </span>
                                        <span class="ml-2">
                                            売上: {{ formatCurrency(spot.revenue) }}
                                        </span>
                                    </div>
                                    <div class="spot-actions">
                                        <Button label="選択削除" icon="pi pi-trash" size="small"
                                            :disabled="!getSpotSelection(spot.spotNumber).length"
                                            @click="confirmDeleteSpotSelected(spot.spotNumber)" severity="danger" />
                                        <Button label="スポット全削除" icon="pi pi-trash" size="small" outlined
                                            :disabled="!spot.reservations.length"
                                            @click="confirmDeleteSpot(spot.spotNumber)" severity="danger" />
                                    </div>
                                </div>

                                <!-- DataTable for this spot -->
                                <div class="spot-table">
                                    <DataTable :value="spot.reservations" :scrollable="true" scrollHeight="300px"
                                        v-model:selection="spotSelections[spot.spotNumber]" dataKey="id"
                                        selectionMode="multiple" :paginator="true" :rows="10"
                                        :rowsPerPageOptions="[10, 15, 30, 50]"
                                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                                        currentPageReportTemplate="{first} から {last} 件目 / 全{totalRecords}件"
                                        :emptyMessage="`${spot.spotNumber} の予約はありません`">
                                        <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>

                                        <Column field="date" header="日付" :sortable="true"
                                            :style="{ minWidth: '150px' }">
                                            <template #body="{ data }">
                                                <div class="flex align-items-center gap-2">
                                                    <i class="pi pi-calendar text-primary"></i>
                                                    {{ formatDate(data.date) }}
                                                </div>
                                            </template>
                                        </Column>

                                        <Column field="price" header="料金" :sortable="true"
                                            :style="{ minWidth: '120px' }">
                                            <template #body="{ data }">
                                                {{ formatCurrency(data.price) }}
                                            </template>
                                        </Column>

                                        <Column field="vehicleCategoryName" header="車両タイプ" :sortable="true"
                                            :style="{ minWidth: '120px' }">
                                            <template #body="{ data }">
                                                <Tag :value="data.vehicleCategoryName"
                                                    :severity="getSeverityByType(data.vehicleCategoryName)" />
                                            </template>
                                        </Column>

                                        <Column headerStyle="width: 4rem; text-align: center"
                                            bodyStyle="text-align: center; overflow: visible">
                                            <template #body="{ data }">
                                                <Button icon="pi pi-trash" text rounded severity="danger" size="small"
                                                    @click="confirmDeleteSingle(data)" v-tooltip.top="'この予約を削除'" />
                                            </template>
                                        </Column>
                                    </DataTable>
                                </div>
                            </div>
                        </TabPanel>
                    </TabPanels>
                </Tabs>

                <!-- Empty state -->
                <div v-else class="empty-state">
                    <i class="pi pi-car text-6xl text-400 mb-3"></i>
                    <h3>駐車場の予約がありません</h3>
                    <p class="text-500">この部屋には駐車場の割り当てがありません。</p>
                </div>
            </div>
        </div>

        <template #footer>
            <Button label="閉じる" icon="pi pi-times" text @click="closeDialog" :disabled="processing" />
        </template>
    </Dialog>

    <ConfirmDialog group="parkingDialogConfirm" />
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
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import ConfirmDialog from 'primevue/confirmdialog';

// Store
import { useParkingStore } from '@/composables/useParkingStore';
const parkingStore = useParkingStore();

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
        required: true,
        default: () => []
    },
    processing: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits([
    'update:modelValue',
    'update:parkingSpots',
    'hide'
]);

const localSpots = ref([...props.parkingSpots]);
const spotSelections = reactive({});
const activeTab = ref(null);

// Watch for external changes to parkingSpots
watch(() => props.parkingSpots, (newSpots) => {
    localSpots.value = [...newSpots];
    initializeSelections();
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

// Group reservations by spot number for efficient access
const groupedSpots = computed(() => {
    const groups = {};
    localSpots.value.forEach(spot => {
        if (!groups[spot.spotNumber]) {
            groups[spot.spotNumber] = {
                spotNumber: spot.spotNumber,
                parkingLotName: spot.parkingLotName || '未設定',
                reservations: [],
                revenue: 0,
                count: 0,
                vehicleType: ''
            };
        }
        groups[spot.spotNumber].reservations.push(spot);
        groups[spot.spotNumber].revenue += parseFloat(spot.price) || 0;
        groups[spot.spotNumber].count++;
    });

    // Set vehicle type for each group (assuming it's consistent)
    Object.values(groups).forEach(group => {
        if (group.reservations.length > 0) {
            group.vehicleType = group.reservations[0].vehicleCategoryName;
        }
    });

    // Return a sorted array based on uniqueParkingSpots order
    return uniqueParkingSpots.value.map(spotNumber => groups[spotNumber]);
});

// Initialize selections for each spot
const initializeSelections = () => {
    uniqueParkingSpots.value.forEach(spotNumber => {
        if (!spotSelections[spotNumber]) {
            spotSelections[spotNumber] = [];
        }
    });
    // Set the active tab to the first spot if not already set
    if (uniqueParkingSpots.value.length > 0) {
        activeTab.value = uniqueParkingSpots.value[0];
    } else {
        activeTab.value = null;
    }
};

// Initialize selections when spots change
watch(uniqueParkingSpots, () => {
    initializeSelections();
}, { immediate: true, deep: true });

const totalRevenue = computed(() => {
    return localSpots.value.reduce((sum, spot) => sum + (parseFloat(spot.price) || 0), 0);
});

const hasAnySelection = computed(() => {
    return Object.values(spotSelections).some(selection => selection && selection.length > 0);
});

// Get data for a specific parking spot
const getSpotData = (spotNumber) => {
    const group = groupedSpots.value.find(g => g.spotNumber === spotNumber);
    return group ? group.reservations : [];
};

// Get selection for a specific spot
const getSpotSelection = (spotNumber) => {
    return spotSelections[spotNumber] || [];
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

const onDialogHide = () => {
    // Clear all selections
    Object.keys(spotSelections).forEach(key => {
        spotSelections[key] = [];
    });
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
        Object.keys(spotSelections).forEach(key => {
            spotSelections[key] = spotSelections[key].filter(spot => !spotIds.has(spot.id));
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

const confirmDeleteSingle = (spot) => {
    confirm.require({
        group: 'parkingDialogConfirm',
        message: 'この予約を削除しますか？',
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
        accept: () => deleteSpots([spot])
    });
};

const confirmDeleteSpotSelected = (spotNumber) => {
    const selected = getSpotSelection(spotNumber);
    if (!selected || selected.length === 0) return;

    confirm.require({
        group: 'parkingDialogConfirm',
        message: `${spotNumber}の選択された${selected.length}件の予約を削除しますか？`,
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
        accept: () => deleteSpots([...selected])
    });
};

const confirmDeleteSpot = (spotNumber) => {
    const spotData = getSpotData(spotNumber);
    if (!spotData || spotData.length === 0) return;

    confirm.require({
        group: 'parkingDialogConfirm',
        message: `${spotNumber}のすべての予約(${spotData.length}件)を削除しますか？`,
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
        accept: () => deleteSpots([...spotData])
    });
};

const confirmDeleteAllSelected = () => {
    const allSelected = Object.values(spotSelections).flat().filter(Boolean);
    if (allSelected.length === 0) return;

    confirm.require({
        group: 'parkingDialogConfirm',
        message: `全スポットから選択された${allSelected.length}件の予約を削除しますか？`,
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

.tabs-container {
    flex: 1;
    min-height: 0;
}

.tab-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem;
    min-width: 80px;
    text-align: center;
    white-space: nowrap;
}

.tab-header>div {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    margin-right: 0.5rem;
}

.tab-header small {
    line-height: 1;
    margin-top: 0.125rem;
    white-space: normal;
    text-align: left;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    line-clamp: 2;  /* Standard property */
    max-height: 2.5em; /* Fallback for non-webkit browsers */
}

.tab-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.spot-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: var(--surface-50);
    border-radius: 0.5rem;
    border: 1px solid var(--surface-200);
}

.spot-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.spot-actions {
    display: flex;
    gap: 0.5rem;
}

.spot-table {
    flex: 1;
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

/* Tab view styling */
:deep(.p-tabs) {
    height: 100%;
    display: flex;
    flex-direction: column;
}

:deep(.p-tabs-list) {
    flex-shrink: 0;
    overflow-x: auto;
    overflow-y: hidden;
    white-space: nowrap;
    flex-wrap: nowrap;
}

:deep(.p-tabs-panels) {
    flex: 1;
    min-height: 0;
    padding: 1rem 0;
}

:deep(.p-tabpanel-content) {
    height: 100%;
    overflow: auto;
}

/* DataTable styling */
:deep(.p-datatable .p-paginator) {
    padding: 0.5rem 1rem;
}
</style>