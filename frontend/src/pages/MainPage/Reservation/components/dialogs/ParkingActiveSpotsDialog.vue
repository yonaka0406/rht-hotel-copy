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
                        <span class="stat-value">{{ groupedByDate.length }}</span>
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
                    <Button label="全選択削除" icon="pi pi-trash" size="small" :disabled="!hasAnySelection"
                        @click="confirmDeleteAllSelected" severity="danger" />
                    <Button label="全データ削除" icon="pi pi-trash" size="small" outlined
                        :disabled="!localSpots || localSpots.length === 0" @click="confirmDeleteAll"
                        severity="danger" />
                </div>
            </div>

            <!-- Date-based view -->
            <div class="tabs-container">
                <div v-if="groupedByDate.length > 0" class="date-based-view">
                    <DataTable :value="groupedByDate" :scrollable="true" scrollHeight="500px"
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

                        <Column field="vehicleType" header="車両タイプ" :sortable="true" :style="{ minWidth: '150px' }">
                            <template #body="{ data }">
                                <Tag :value="data.vehicleType" :severity="getSeverityByType(data.vehicleType)" />
                            </template>
                        </Column>

                        <Column field="revenue" header="売上" :sortable="true" :style="{ minWidth: '120px' }">
                            <template #body="{ data }">
                                <span class="font-semibold">{{ formatCurrency(data.revenue) }}</span>
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

                        <Column headerStyle="width: 8rem; text-align: center"
                            bodyStyle="text-align: center; overflow: visible">
                            <template #body="{ data }">
                                <div class="flex gap-1 justify-content-center">
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
const selectedDateGroups = ref([]);

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
                vehicleType: spot.vehicleCategoryName || '未設定',
                spotsByLot: {},
                reservations: []
            };
        }
        groups[dateKey].spotCount++;
        groups[dateKey].revenue += parseFloat(spot.price) || 0;
        
        // Group spots by parking lot
        const lotName = spot.parkingLotName || '未設定';
        if (!groups[dateKey].spotsByLot[lotName]) {
            groups[dateKey].spotsByLot[lotName] = [];
        }
        groups[dateKey].spotsByLot[lotName].push(spot.spotNumber);
        
        groups[dateKey].reservations.push(spot);
    });

    // Format spots by lot for display
    Object.values(groups).forEach(group => {
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
</style>