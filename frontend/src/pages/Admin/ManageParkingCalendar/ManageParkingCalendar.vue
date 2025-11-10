<template>
    <div class="p-4">
        <Panel header="駐車場カレンダー設定">
            <ParkingBlockForm 
                :hotels="hotels"
                :parking-lots="parkingLots"
                :vehicle-categories="vehicleCategories"
                v-model:selected-hotel-id="selectedHotelId"
                :form-data="formData"
                @apply-block="confirmApplyBlock"
            />
            
            <ParkingBlocksTable 
                :parking-blocks="parkingBlocks"
                @delete-block="confirmDelete"
            />
        </Panel>
    </div>
    
    <ConfirmDialog group="templating">
        <template #message="slotProps">
            <div class="flex flex-col items-center w-full gap-4 border-b border-surface-200 dark:border-surface-700">
                <i :class="slotProps.message.icon" class="!text-6xl text-primary-500"></i>
                <div v-html="formattedMessage"></div>
            </div>
        </template>
    </ConfirmDialog>
</template>

<script setup>
// Vue
import { ref, reactive, onMounted, watch } from 'vue';

// Stores
import { useHotelStore } from '@/composables/useHotelStore';
import { useParkingStore } from '@/composables/useParkingStore';

const { hotels, selectedHotelId, fetchHotels, fetchHotel } = useHotelStore();
const parkingStore = useParkingStore();

// Primevue
import { useToast } from 'primevue/usetoast';
const toast = useToast();
import { useConfirm } from "primevue/useconfirm";
const confirm = useConfirm();
import Panel from 'primevue/panel';
import ConfirmDialog from 'primevue/confirmdialog';

// Components
import ParkingBlockForm from './components/ParkingBlockForm.vue';
import ParkingBlocksTable from './components/ParkingBlocksTable.vue';

// Helper
const formatDate = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        console.error("Invalid Date object:", date);
        return ''; // Return empty string instead of throwing to prevent template crashes
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// Form state
const formData = reactive({
    selectedParkingLots: [],
    selectedVehicleCategories: [],
    blockedCapacity: 1,
    startDate: new Date(),
    endDate: new Date(),
    comment: ''
});

const formattedMessage = ref('');

// Data
const parkingLots = ref([]);
const vehicleCategories = ref([]);
const parkingBlocks = ref([]);

// Fetch initial data on mount
onMounted(async () => {
    await fetchHotels();
    await fetchHotel();
    await parkingStore.fetchVehicleCategories();
    vehicleCategories.value = parkingStore.vehicleCategories;
});

// Watch hotel selection to fetch parking lots and blocks
watch(selectedHotelId, async (newHotelId) => {
    if (newHotelId) {
        await parkingStore.fetchParkingLots();
        parkingLots.value = parkingStore.parkingLots;
        
        // TODO: Implement fetchParkingBlocks in parkingStore
        // await parkingStore.fetchParkingBlocks(newHotelId);
        // parkingBlocks.value = parkingStore.parkingBlocks;
    }
}, { deep: true });

// Confirmation and action methods
const confirmApplyBlock = () => {
    if (!selectedHotelId.value) {
        toast.add({ severity: 'warn', summary: '警告', detail: 'ホテルを選択してください。', life: 3000 });
        return;
    }
    
    const parkingLotText = formData.selectedParkingLots && formData.selectedParkingLots.length > 0 
        ? '<b>選択された駐車場</b>' 
        : '<b>全駐車場</b>';
    
    const vehicleCategoryText = formData.selectedVehicleCategories && formData.selectedVehicleCategories.length > 0
        ? '<b>選択された車両タイプ</b>'
        : '<b>全車両タイプ</b>';
    
    const message = `
        <b>選択されたホテル</b>、${parkingLotText}、${vehicleCategoryText}に対して、<br/>
        選択された日付範囲で<b>${formData.blockedCapacity}台</b>の駐車場利用不可設定を行います。<br/>
        よろしいですか？<br/>
    `;
    formattedMessage.value = message;

    confirm.require({
        group: 'templating',
        header: '確認',
        icon: 'pi pi-exclamation-triangle',
        acceptProps: {
            label: 'はい'
        },
        accept: () => {
            applyBlock();
            confirm.close('templating');
        },
        rejectProps: {
            label: 'キャンセル',
            severity: 'secondary',
            outlined: true
        },
        reject: () => {
            confirm.close('templating');
        },
    });
};

const applyBlock = async () => {
    if (!selectedHotelId.value) {
        toast.add({ severity: 'warn', summary: '警告', detail: 'ホテルを選択してください。', life: 3000 });
        return;
    }
    if (!formData.startDate || !formData.endDate) {
        toast.add({ severity: 'warn', summary: '警告', detail: '開始日と終了日を選択してください。', life: 3000 });
        return;
    }
    if (formData.startDate > formData.endDate) {
        toast.add({ severity: 'warn', summary: '警告', detail: '終了日を開始日以降にしてください。', life: 3000 });
        return;
    }
    if (!formData.blockedCapacity || formData.blockedCapacity < 1) {
        toast.add({ severity: 'warn', summary: '警告', detail: 'ブロック台数を入力してください。', life: 3000 });
        return;
    }
    
    try {
        // TODO: Implement createParkingBlock in parkingStore
        // const parkingLotIds = formData.selectedParkingLots && formData.selectedParkingLots.length > 0 
        //     ? formData.selectedParkingLots 
        //     : null;
        // const vehicleCategoryIds = formData.selectedVehicleCategories && formData.selectedVehicleCategories.length > 0
        //     ? formData.selectedVehicleCategories
        //     : null;
        
        // const response = await parkingStore.createParkingBlock({
        //     hotelId: selectedHotelId.value,
        //     parkingLotIds,
        //     vehicleCategoryIds,
        //     startDate: formatDate(formData.startDate),
        //     endDate: formatDate(formData.endDate),
        //     blockedCapacity: formData.blockedCapacity,
        //     comment: formData.comment
        // });
        
        // if (response.success) {
        //     await parkingStore.fetchParkingBlocks(selectedHotelId.value);
        //     parkingBlocks.value = parkingStore.parkingBlocks;
        //     toast.add({ severity: 'success', summary: '成功', detail: 'ブロック設定を適用しました。', life: 3000 });
        // } else {
        //     toast.add({ severity: 'error', summary: 'エラー', detail: '適用に失敗しました: ' + response.message, life: 3000 });
        // }
        
        toast.add({ severity: 'info', summary: '開発中', detail: 'この機能は開発中です。', life: 3000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'エラー', detail: '適用に失敗しました: ' + error.message, life: 3000 });
    }
};

const confirmDelete = (data) => {
    const message = `
        <b>${data.parking_lot_name || '全駐車場'}</b>、<b>${data.vehicle_category_name || '全車両タイプ'}</b>、<br/>
        <b>${formatDate(new Date(data.start_date))}</b>～<b>${formatDate(new Date(data.end_date))}</b>、<br/>
        <b>${data.blocked_capacity}台</b>のブロック設定を削除してもよろしいですか？<br/>
    `;

    formattedMessage.value = message;

    confirm.require({
        group: 'templating',
        header: '確認',
        icon: 'pi pi-exclamation-triangle',
        acceptProps: { label: 'はい' },
        accept: () => { 
            deleteBlockAction(data.id); 
            confirm.close('templating'); 
        },
        rejectProps: { 
            label: 'キャンセル', 
            severity: 'secondary', 
            outlined: true 
        },
        reject: () => { 
            confirm.close('templating'); 
        },
    });
};

const deleteBlockAction = async (blockId) => {
    try {
        // TODO: Implement deleteParkingBlock in parkingStore
        // await parkingStore.deleteParkingBlock(blockId);
        // toast.add({ severity: 'success', summary: '成功', detail: 'ブロック設定を削除しました。', life: 3000 });
        // await parkingStore.fetchParkingBlocks(selectedHotelId.value);
        // parkingBlocks.value = parkingStore.parkingBlocks;
        
        toast.add({ severity: 'info', summary: '開発中', detail: 'この機能は開発中です。', life: 3000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'エラー', detail: '削除に失敗しました: ' + error.message, life: 3000 });
    }
};
</script>
