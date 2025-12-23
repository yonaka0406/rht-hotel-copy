<template>
    <Dialog v-model:visible="showDialog" header="予約結合" modal :style="{ width: '65vw' }">
        <div class="p-fluid">
            <p class="mb-2">
                現在の予約（{{ formatReservationDate(currentReservation) }}）と結合する予約を選択してください。
            </p>
            <div class="text-sm text-gray-600 mb-4 p-3 bg-gray-100 rounded">
                <p class="font-semibold mb-1">結合時の動作:</p>
                <ul class="list-disc pl-5 space-y-1">
                    <li><strong>現在の予約から維持:</strong> 基本情報（備考、ステータス、等）</li>
                    <li><strong>選択した予約から移動:</strong> 宿泊明細（プラン、アドオン、駐車場予約、支払い）</li>
                </ul>
                <p class="mt-2 text-xs text-gray-500">※選択した予約は結合後に削除されます。</p>
            </div>


            <div v-if="loading" class="flex justify-center p-4">
                <i class="pi pi-spin pi-spinner text-2xl"></i>
            </div>

            <div v-else-if="candidateReservations.length === 0" class="text-center p-4">
                <p>結合可能な予約が見つかりませんでした。</p>
            </div>

            <div v-else class="field">
                <DataTable :value="candidateReservations" v-model:selection="selectedReservation" selectionMode="single"
                    dataKey="id" :metaKeySelection="false">
                    <Column field="id" header="選択" style="width: 3rem">
                        <template #body="slotProps">
                            <RadioButton :value="slotProps.data" v-model="selectedReservation" />
                        </template>
                    </Column>
                    <Column header="期間">
                        <template #body="slotProps">
                            {{ formatReservationDate(slotProps.data) }}
                        </template>
                    </Column>
                    <Column field="room_numbers" header="部屋"></Column>
                    <Column field="number_of_people" header="人数"></Column>
                    <Column field="status" header="ステータス">
                        <template #body="slotProps">
                            <Badge :severity="getBadgeSeverity(slotProps.data.status)"
                                :value="translateStatus(slotProps.data.status)" />
                        </template>
                    </Column>
                    <Column header="結合タイプ">
                        <template #body="slotProps">
                            <Badge :severity="slotProps.data.mergeType === 'same' ? 'info' : 'success'"
                                :value="slotProps.data.mergeType === 'same' ? '同一期間' : '連泊'" />
                        </template>
                    </Column>
                </DataTable>
            </div>

        </div>
        <template #footer>
            <Button label="キャンセル" icon="pi pi-times" @click="showDialog = false" class="p-button-text"
                severity="danger" />
            <Button label="結合" icon="pi pi-check" @click="handleMerge" :loading="isSubmitting"
                :disabled="!selectedReservation" />
        </template>
    </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import RadioButton from 'primevue/radiobutton';
import Badge from 'primevue/badge';
import { useReservationStore } from '@/composables/useReservationStore';
import { useToast } from 'primevue/usetoast';
import { formatDate } from '@/utils/dateUtils';
import { translateReservationStatus } from '@/utils/reservationUtils';

const props = defineProps({
    visible: {
        type: Boolean,
        required: true,
    },
    reservation: {
        type: Object,
        required: true,
    },
});

const emit = defineEmits(['update:visible', 'merged']);

const { fetchReservationsByClient, mergeReservations } = useReservationStore();
const toast = useToast();
const router = useRouter();

const isSubmitting = ref(false);
const loading = ref(false);
const candidateReservations = ref([]);
const selectedReservation = ref(null);

const showDialog = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

const currentReservation = computed(() => props.reservation);

const formatReservationDate = (res) => {
    if (!res) return '';
    return `${formatDate(new Date(res.check_in))} ～ ${formatDate(new Date(res.check_out))}`;
};

const getBadgeSeverity = (status) => {
    switch (status) {
        case 'confirmed': return 'success';
        case 'checked_in': return 'info';
        case 'checked_out': return 'secondary';
        case 'cancelled': return 'danger';
        default: return 'warning';
    }
};

const translateStatus = (status) => {
    return translateReservationStatus(status);
};

const loadCandidates = async () => {
    if (!props.reservation || !props.reservation.client_id) return;

    loading.value = true;
    selectedReservation.value = null;
    try {
        const allReservations = await fetchReservationsByClient(props.reservation.hotel_id, props.reservation.client_id);

        // Filter out current reservation
        const others = allReservations.filter(r => r.id !== props.reservation.reservation_id);

        // Filter valid candidates
        candidateReservations.value = others.map(r => {
            const mergeType = checkMergeValidity(props.reservation, r);
            return {
                ...r,
                mergeType
            };
        }).filter(r => r.mergeType !== null);

    } catch (error) {
        console.error('Failed to load candidates', error);
        toast.add({ severity: 'error', summary: 'エラー', detail: '候補予約の取得に失敗しました。', life: 3000 });
    } finally {
        loading.value = false;
    }
};

const checkMergeValidity = (target, source) => {
    // We now use min_date and max_date provided by the backend, 
    // which represent the full range of details including cancelled ones.
    const normalizeDate = (dateStr) => {
        if (!dateStr) return 0;
        const d = new Date(dateStr);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    };

    // Use min_date/max_date if available (from our refined backend), otherwise fallback to check_in/check_out
    const tStart = normalizeDate(target.min_date || target.check_in);
    const tEnd = normalizeDate(target.max_date || target.check_out);
    const sStart = normalizeDate(source.min_date || source.check_in);
    const sEnd = normalizeDate(source.max_date || source.check_out);

    // 1. Same Dates (Full Range)
    if (tStart === sStart && tEnd === sEnd) {
        return 'same';
    }

    // 2. Contiguous
    // Target End == Source Start OR Source End == Target Start
    // AND active number of people must match
    const tPeople = Number(target.reservation_number_of_people || target.number_of_people);
    const sPeople = Number(source.number_of_people);

    if (tPeople !== sPeople) {
        return null;
    }

    if (tEnd === sStart || sEnd === tStart) {
        return 'contiguous'; // Or 'serial'
    }

    return null;
};



const handleMerge = async () => {
    if (!selectedReservation.value) return;

    isSubmitting.value = true;
    try {
        // Merge SELECTED (Source) INTO CURRENT (Target)
        const keptId = await mergeReservations(props.reservation.reservation_id, selectedReservation.value.id, props.reservation.hotel_id);

        toast.add({ severity: 'success', summary: '成功', detail: '予約が結合されました。', life: 3000 });
        showDialog.value = false;
        emit('merged', keptId);

        // Reload page or redirect to ensure data refresh
        // If ID changed (unlikely here as we keep target), router push might be needed.
        // Since we Merge INTO current, we are likely fine, but a refresh is good.
        location.reload();

    } catch (error) {
        console.error('Merge failed', error);
        toast.add({ severity: 'error', summary: 'エラー', detail: error.response?.data?.error || '予約の結合に失敗しました。', life: 3000 });
    } finally {
        isSubmitting.value = false;
    }
};

watch(() => props.visible, (newValue) => {
    if (newValue) {
        loadCandidates();
    }
});
</script>
