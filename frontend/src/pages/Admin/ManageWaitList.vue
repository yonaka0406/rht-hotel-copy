<template>
    <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold text-gray-800">順番待ち管理</h2>
            <div class="flex gap-2">
                <Button 
                    @click="refreshData" 
                    icon="pi pi-refresh" 
                    :loading="loading"
                    class="p-button-secondary"
                    label="更新"
                />
            </div>
        </div>

        <!-- Filter Bar (moved to top) -->
        <div class="mb-6 p-4 bg-gray-50 rounded-lg">
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">ホテル</label>
                    <Select 
                        v-model="filters.hotelId" 
                        :options="hotelOptions" 
                        optionLabel="name" 
                        optionValue="id"
                        placeholder="ホテルを選択"
                        class="w-full"
                        @change="onHotelChange"
                        clearable
                    />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
                    <Select 
                        v-model="filters.status" 
                        :options="statusOptions" 
                        optionLabel="label" 
                        optionValue="value"
                        placeholder="ステータスを選択"
                        class="w-full"
                        @change="onFilterChange"
                        clearable
                    />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">チェックイン日（開始）</label>
                    <DatePicker 
                        v-model="filters.checkInStartDate" 
                        dateFormat="yy-mm-dd"
                        placeholder="開始日"
                        class="w-full"
                        @update:modelValue="onFilterChange"
                    />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">チェックイン日（終了）</label>
                    <DatePicker 
                        v-model="filters.checkInEndDate" 
                        dateFormat="yy-mm-dd"
                        placeholder="終了日"
                        class="w-full"
                        @update:modelValue="onFilterChange"
                    />
                </div>
            </div>
        </div>

        <Accordion :activeIndex="0">
            <AccordionPanel value="0" v-if="filters.hotelId === 0">
                <AccordionHeader>
                    全ホテル順番待ち状況
                </AccordionHeader>
                <AccordionContent>
                    <div class="mb-8">
                        <DataTable :value="hotelSummary" class="w-full" showGridlines stripedRows>
                            <Column field="hotelName" header="ホテル名" />
                            <Column field="waiting" header="待機中" />
                            <Column field="notified" header="通知済み" />
                            <Column field="confirmed" header="確認済み" />
                            <Column field="expired" header="期限切れ" />
                            <Column field="cancelled" header="キャンセル" />
                        </DataTable>
                    </div>
                </AccordionContent>
            </AccordionPanel>
            <AccordionPanel value="1">
                <AccordionHeader>
                    ホテル別順番待ちリスト
                </AccordionHeader>
                <AccordionContent>
                    <DataTable 
                        :value="waitlistEntries" 
                        :loading="loading"
                        :paginator="true" 
                        :rows="pagination.size"
                        :totalRecords="pagination.total"
                        :lazy="true"
                        @page="onPageChange"
                        :sortField="sortField"
                        :sortOrder="sortOrder"
                        @sort="onSort"
                        class="w-full"
                        stripedRows
                        showGridlines
                        responsiveLayout="scroll"
                    >
                        <Column field="clientName" header="顧客名" sortable>
                            <template #body="{ data }">
                                <span class="font-medium">{{ data.clientName || 'N/A' }}</span>
                            </template>
                        </Column>
                        <Column field="hotelName" header="ホテル" sortable>
                            <template #body="{ data }">
                                <span>
                                    {{ data.hotelName || 'N/A' }}
                                </span>
                            </template>
                        </Column>
                        <Column field="roomTypeName" header="部屋タイプ" sortable>
                            <template #body="{ data }">
                                <span>{{ data.roomTypeName || 'N/A' }}</span>
                            </template>
                        </Column>
                        <Column header="チェックイン/チェックアウト日" sortable>
                            <template #body="{ data }">
                                <span>
                                    {{ formatDate(data.requested_check_in_date) }}<br />
                                    {{ formatDate(data.requested_check_out_date) }}
                                </span>
                            </template>
                        </Column>
                        <Column field="number_of_guests" header="宿泊人数" sortable>
                            <template #body="{ data }">
                                <span>{{ data.number_of_guests }}名</span>
                            </template>
                        </Column>
                        <Column field="number_of_rooms" header="部屋数" sortable>
                            <template #body="{ data }">
                                <span>{{ data.number_of_rooms }}室</span>
                            </template>
                        </Column>
                        <Column field="status" header="ステータス" sortable>
                            <template #body="{ data }">
                                <Tag 
                                    :value="getStatusLabel(data.status)" 
                                    :severity="getStatusSeverity(data.status)"
                                />
                            </template>
                        </Column>
                        <Column field="created_at" header="作成日" sortable>
                            <template #body="{ data }">
                                <span>{{ formatDateTime(data.created_at) }}</span>
                            </template>
                        </Column>
                        <Column header="アクション" :exportable="false" style="min-width:8rem">
                            <template #body="{ data }">
                                <div class="flex gap-2">
                                    <Button 
                                        @click="viewDetails(data)" 
                                        icon="pi pi-eye" 
                                        class="p-button-sm p-button-info"
                                        text
                                        rounded
                                        aria-label="詳細表示"
                                    />
                                </div>
                            </template>
                        </Column>
                    </DataTable>
                </AccordionContent>
            </AccordionPanel>
        </Accordion>

        <!-- Detail Dialog -->
        <Dialog 
            v-model:visible="detailDialogVisible" 
            modal 
            header="順番待ち詳細" 
            :style="{width: '50vw'}"
            :closable="true"
        >
            <div v-if="selectedEntry" class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">顧客名</label>
                        <p class="text-gray-900">{{ selectedEntry.clientName }}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">ホテル</label>
                        <p class="text-gray-900">{{ selectedEntry.hotelName || 'N/A' }}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">部屋タイプ</label>
                        <p class="text-gray-900">{{ selectedEntry.roomTypeName || 'N/A' }}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">ステータス</label>
                        <Tag 
                            :value="getStatusLabel(selectedEntry.status)" 
                            :severity="getStatusSeverity(selectedEntry.status)"
                        />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">チェックイン日</label>
                        <p class="text-gray-900">{{ formatDate(selectedEntry.requested_check_in_date) }}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">チェックアウト日</label>
                        <p class="text-gray-900">{{ formatDate(selectedEntry.requested_check_out_date) }}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">宿泊人数</label>
                        <p class="text-gray-900">{{ selectedEntry.number_of_guests }}名</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">部屋数</label>
                        <p class="text-gray-900">{{ selectedEntry.number_of_rooms }}室</p>
                    </div>
                </div>
                
                <div v-if="selectedEntry.notes">
                    <label class="block text-sm font-medium text-gray-700">備考</label>
                    <p class="text-gray-900">{{ selectedEntry.notes }}</p>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">連絡方法</label>
                        <p class="text-gray-900">{{ getCommunicationLabel(selectedEntry.communication_preference) }}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">連絡先</label>
                        <p class="text-gray-900">
                            {{ selectedEntry.communication_preference === 'email' 
                                ? selectedEntry.contact_email 
                                : selectedEntry.contact_phone }}
                        </p>
                    </div>
                </div>
                
                <div v-if="selectedEntry.preferred_smoking_status">
                    <label class="block text-sm font-medium text-gray-700">喫煙希望</label>
                    <p class="text-gray-900">{{ getSmokingLabel(selectedEntry.preferred_smoking_status) }}</p>
                </div>
            </div>
        </Dialog>

        <!-- Edit Dialog -->
        <Dialog 
            v-model:visible="editDialogVisible" 
            modal 
            header="順番待ち編集" 
            :style="{width: '50vw'}"
            :closable="true"
        >
            <div v-if="editingEntry" class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
                        <Select 
                            v-model="editingEntry.status" 
                            :options="statusOptions" 
                            optionLabel="label" 
                            optionValue="value"
                            class="w-full"
                        />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">宿泊人数</label>
                        <InputNumber 
                            v-model="editingEntry.number_of_guests" 
                            :min="1"
                            class="w-full"
                        />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">部屋数</label>
                        <InputNumber 
                            v-model="editingEntry.number_of_rooms" 
                            :min="1"
                            class="w-full"
                        />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">喫煙希望</label>
                        <Select 
                            v-model="editingEntry.preferred_smoking_status" 
                            :options="smokingOptions" 
                            optionLabel="label" 
                            optionValue="value"
                            class="w-full"
                        />
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">備考</label>
                    <Textarea 
                        v-model="editingEntry.notes" 
                        rows="3"
                        class="w-full"
                    />
                </div>
            </div>
            
            <template #footer>
                <div class="flex justify-end gap-2">
                    <Button 
                        @click="editDialogVisible = false" 
                        label="キャンセル" 
                        class="p-button-secondary"
                    />
                    <Button 
                        @click="saveEdit" 
                        label="保存" 
                        class="p-button-primary"
                        :loading="saving"
                    />
                </div>
            </template>
        </Dialog>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useHotelStore } from '@/composables/useHotelStore';
import { useWaitlistStore } from '@/composables/useWaitlistStore';

// PrimeVue Components
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';

const toast = useToast();
const { hotels, fetchHotels } = useHotelStore();
const { entries: waitlistEntries, pagination, loading, fetchWaitlistEntries } = useWaitlistStore();

// Reactive data
const filters = reactive({
    hotelId: 0,         // Default to '全ホテル'
    status: 'all',      // Default to '全て' (all statuses)
    checkInStartDate: null,
    checkInEndDate: null
});

const sortField = ref('created_at');
const sortOrder = ref(-1);

const detailDialogVisible = ref(false);
const editDialogVisible = ref(false);
const selectedEntry = ref(null);
const editingEntry = ref(null);
const saving = ref(false);

// Options
const statusOptions = [
    { label: '全て', value: 'all' },
    { label: '待機中', value: 'waiting' },
    { label: '通知済み', value: 'notified' },
    { label: '確認済み', value: 'confirmed' },
    { label: '期限切れ', value: 'expired' },
    { label: 'キャンセル', value: 'cancelled' }
];

const smokingOptions = [
    { label: '指定なし', value: 'any' },
    { label: '喫煙', value: 'smoking' },
    { label: '禁煙', value: 'non_smoking' }
];

// Summary state
const hotelSummary = computed(() => {
    if (!hotels.value || hotels.value.length === 0) return [];
    if (filters.hotelId !== 0) return [];
    // Use hotel_id (snake_case) to match backend
    const summary = hotels.value.map(hotel => {
        const statusCounts = { waiting: 0, notified: 0, confirmed: 0, expired: 0, cancelled: 0 };
        (waitlistEntries.value || []).forEach(entry => {
            if (entry.hotel_id === hotel.id && statusCounts[entry.status] !== undefined) {
                statusCounts[entry.status]++;
            }
        });
        return {
            hotelName: hotel.name,
            ...statusCounts
        };
    });
    return summary;
});

const hotelOptions = computed(() => [
    { id: 0, name: '全ホテル' },
    ...hotels.value
]);

// Methods
const onFilterChange = () => {
    pagination.page = 1;
    loadData();
};

const onPageChange = (event) => {
    pagination.page = event.page + 1;
    loadData();
};

const onSort = (event) => {
    sortField.value = event.sortField;
    sortOrder.value = event.sortOrder;
    loadData();
};

const loadData = async () => {
    let filterParams = {};
    if (filters.hotelId && filters.hotelId !== 0) filterParams.hotelId = filters.hotelId;
    if (filters.status && filters.status !== 'all') filterParams.status = filters.status;
    if (filters.checkInStartDate) {
        const start = formatDate(filters.checkInStartDate);
        if (start) filterParams.startDate = start;
    }
    if (filters.checkInEndDate) {
        const end = formatDate(filters.checkInEndDate);
        if (end) filterParams.endDate = end;
    }
    if (filters.hotelId === 0) {
        let allEntries = [];
        for (const hotel of hotels.value) {
            await fetchWaitlistEntries(hotel.id, {
                filters: filterParams,
                page: 1,
                size: 1000
            }, 'detail-all-hotels');
            if (Array.isArray(waitlistEntries.value)) {
                allEntries = allEntries.concat(waitlistEntries.value);
            }
        }
        waitlistEntries.value = allEntries;
    } else if (filters.hotelId) {
        await fetchWaitlistEntries(filters.hotelId, {
            filters: filterParams,
            page: pagination.page,
            size: pagination.size
        }, 'detail-single-hotel');
    }
};

const refreshData = () => {
    loadData();
};

const viewDetails = (entry) => {
    selectedEntry.value = entry;
    detailDialogVisible.value = true;
};
/*
const editEntry = (entry) => {
    editingEntry.value = { ...entry };
    editDialogVisible.value = true;
};
*/
const saveEdit = async () => {
    if (!editingEntry.value) return;
    
    saving.value = true;
    try {
        // TODO: Implement update functionality
        toast.add({
            severity: 'success',
            summary: '成功',
            detail: '順番待ちエントリを更新しました',
            life: 3000
        });
        editDialogVisible.value = false;
        loadData();
    } catch (_error) {
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: '更新に失敗しました',
            life: 3000
        });
    } finally {
        saving.value = false;
    }
};
/*
const deleteEntry = async (entry) => {
    // TODO: Implement delete functionality
    toast.add({
        severity: 'warn',
        summary: '警告',
        detail: '削除機能は準備中です',
        life: 3000
    });
};
*/

/*
const sendNotification = async (entry) => {
    // TODO: Implement notification functionality
    toast.add({
        severity: 'info',
        summary: '情報',
        detail: '通知機能は準備中です',
        life: 3000
    });
};
*/
const onHotelChange = () => {
    pagination.page = 1;
    loadData();
};

// Utility functions
const formatDate = (date) => {
    if (!date) return '';
    const d = (typeof date === 'string') ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper to get first and last day of current month
function getMonthRange(date = new Date()) {
    const first = new Date(date.getFullYear(), date.getMonth(), 1);
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { first, last };
}

const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP');
};

const getStatusLabel = (status) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option ? option.label : status;
};

const getStatusSeverity = (status) => {
    switch (status) {
        case 'waiting': return 'warning';
        case 'notified': return 'info';
        case 'confirmed': return 'success';
        case 'expired': return 'danger';
        case 'cancelled': return 'secondary';
        default: return 'info';
    }
};

const getCommunicationLabel = (preference) => {
    switch (preference) {
        case 'email': return 'メール';
        case 'phone': return '電話';
        default: return preference;
    }
};

const getSmokingLabel = (status) => {
    const option = smokingOptions.find(opt => opt.value === status);
    return option ? option.label : status;
};

// Lifecycle
onMounted(async () => {
    await fetchHotels();
    // Set date defaults before any data load
    const { first, last } = getMonthRange();
    filters.checkInStartDate = first;
    filters.checkInEndDate = last;
    // Do NOT set filters.status or filters.hotelId here, already set in reactive
    await loadData();
});

// Improved watcher: if end is set before or equal to start, set start to one day before end. If start is set after or equal to end, set end to one day after start.
let lastChanged = null;

watch(
  (oldVal) => {
    lastChanged = 'start';
  }
);
watch(
  () => filters.checkInEndDate,
  (oldVal) => {
    lastChanged = 'end';
  }
);

watch([
  () => filters.checkInStartDate,
  () => filters.checkInEndDate
], ([start, end]) => {
  if (start && end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (endDate < startDate) {
      if (lastChanged === 'end') {
        // User changed end, so adjust start
        const newStart = new Date(endDate);
        newStart.setDate(endDate.getDate() - 1);
        filters.checkInStartDate = newStart;
      } else {
        // User changed start, so adjust end
        const newEnd = new Date(startDate);
        newEnd.setDate(startDate.getDate() + 1);
        filters.checkInEndDate = newEnd;
      }
    }
  }
});
</script>

<style scoped>
/* Add any custom styles here */
</style> 