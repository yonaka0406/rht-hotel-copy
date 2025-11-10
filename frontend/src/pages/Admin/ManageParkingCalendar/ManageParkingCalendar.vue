<template>
    <div class="p-4">
        <Panel header="駐車場カレンダー設定">
            <ParkingBlockForm 
                :hotels="hotels"
                :parking-lots="storeParkingLots"
                v-model:selected-hotel-id="selectedHotelId"
                :form-data="formData"
                :parking-lot-capacity="parkingLotCapacity"
                :max-blockable-spots="maxBlockableSpots"
                @apply-block="confirmApplyBlock"
                @parking-lot-changed="handleParkingLotChange"
                @dates-changed="handleDatesChange"
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
const { 
    parkingLots: storeParkingLots, 
    parkingSpots, 
    parkingBlocks: storeParkingBlocks,
    fetchParkingLots, 
    fetchParkingSpots,
    fetchParkingBlocks,
    createParkingBlock,
    deleteParkingBlock
} = useParkingStore();

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
    selectedParkingLot: null,
    spotSize: null,
    blockedCapacity: 1,
    startDate: new Date(),
    endDate: new Date(),
    comment: ''
});

const formattedMessage = ref('');

// Data
const parkingBlocks = ref([]);
const parkingLotCapacity = ref(null);
const maxBlockableSpots = ref(null);

// Race condition protection for async operations
let currentFetchId = 0;

// Fetch initial data on mount
onMounted(async () => {
    console.log('[ManageParkingCalendar] onMounted - Starting initialization');
    await fetchHotels();
    await fetchHotel();
    
    console.log('[ManageParkingCalendar] onMounted - selectedHotelId:', selectedHotelId.value);
    console.log('[ManageParkingCalendar] onMounted - formData.startDate:', formData.startDate);
    console.log('[ManageParkingCalendar] onMounted - formData.endDate:', formData.endDate);
    
    // If a hotel is already selected (from cache), fetch parking lots and blocks
    if (selectedHotelId.value) {
        console.log('[ManageParkingCalendar] onMounted - Fetching parking lots for hotel:', selectedHotelId.value);
        await fetchParkingLots();
        
        // Fetch parking blocks for the initial date range
        if (formData.startDate && formData.endDate) {
            const startDateStr = formatDate(formData.startDate);
            const endDateStr = formatDate(formData.endDate);
            console.log('[ManageParkingCalendar] onMounted - Fetching parking blocks:', startDateStr, 'to', endDateStr);
            await fetchParkingBlocks(selectedHotelId.value, startDateStr, endDateStr);
            parkingBlocks.value = storeParkingBlocks.value;
            console.log('[ManageParkingCalendar] onMounted - Parking blocks loaded:', parkingBlocks.value.length, 'blocks');
        } else {
            console.log('[ManageParkingCalendar] onMounted - Dates not set, skipping block fetch');
        }
    } else {
        console.log('[ManageParkingCalendar] onMounted - No hotel selected, skipping block fetch');
    }
});

// Watch hotel selection to fetch parking lots and blocks
watch(selectedHotelId, async (newHotelId) => {
    console.log('[ManageParkingCalendar] watch selectedHotelId - New hotel ID:', newHotelId);
    if (newHotelId) {
        await fetchParkingLots();
        // Reset parking lot selection and capacity when hotel changes
        formData.selectedParkingLot = null;
        parkingLotCapacity.value = null;
        formData.spotSize = null;
        maxBlockableSpots.value = null;
        
        // Fetch parking blocks for the selected hotel
        if (formData.startDate && formData.endDate) {
            const startDateStr = formatDate(formData.startDate);
            const endDateStr = formatDate(formData.endDate);
            console.log('[ManageParkingCalendar] watch - Fetching parking blocks:', startDateStr, 'to', endDateStr);
            await fetchParkingBlocks(newHotelId, startDateStr, endDateStr);
            parkingBlocks.value = storeParkingBlocks.value;
            console.log('[ManageParkingCalendar] watch - Parking blocks loaded:', parkingBlocks.value.length, 'blocks');
        }
    }
}, { deep: true });

// Handle parking lot change to fetch capacity information
const handleParkingLotChange = async (parkingLotId) => {
    // Increment fetch ID to invalidate any in-flight requests
    currentFetchId++;
    const thisFetchId = currentFetchId;
    
    // Update formData with the new parking lot selection
    formData.selectedParkingLot = parkingLotId;
    
    if (!parkingLotId) {
        parkingLotCapacity.value = null;
        maxBlockableSpots.value = null;
        formData.spotSize = null;
        return;
    }
    
    try {
        await fetchParkingSpots(parkingLotId);
        
        // Check if this fetch is still current (not superseded by a newer request)
        if (thisFetchId !== currentFetchId) {
            console.log('Parking lot fetch cancelled - newer request in progress');
            return;
        }
        
        // Ensure parkingSpots.value is an array
        if (!Array.isArray(parkingSpots.value)) {
            console.error('Parking spots is not an array:', parkingSpots.value);
            parkingLotCapacity.value = null;
            maxBlockableSpots.value = null;
            return;
        }
        
        // Group spots by capacity_units (size) and count them
        const capacityMap = {};
        parkingSpots.value.forEach(spot => {
            const size = spot.capacity_units || 1;
            capacityMap[size] = (capacityMap[size] || 0) + 1;
        });
        
        // Convert to array and sort by size
        parkingLotCapacity.value = Object.entries(capacityMap)
            .map(([size, count]) => ({ size: parseInt(size), count }))
            .sort((a, b) => a.size - b.size);
        
        // Reset spot size when parking lot changes
        formData.spotSize = null;
        
        // Calculate max blockable spots if dates are selected
        if (formData.startDate && formData.endDate) {
            await calculateMaxBlockableSpots();
        }
    } catch (error) {
        // Only update state if this fetch is still current
        if (thisFetchId === currentFetchId) {
            console.error('Failed to fetch parking lot capacity:', error);
            parkingLotCapacity.value = null;
            maxBlockableSpots.value = null;
        }
    }
};

// Handle date changes to recalculate max blockable spots
const handleDatesChange = async () => {
    if (formData.selectedParkingLot && formData.startDate && formData.endDate) {
        await calculateMaxBlockableSpots();
    } else {
        maxBlockableSpots.value = null;
    }
};

// Watch for spot size changes to recalculate max blockable spots
watch(() => formData.spotSize, async () => {
    if (formData.selectedParkingLot && formData.startDate && formData.endDate) {
        await calculateMaxBlockableSpots();
    }
});

// Calculate maximum blockable spots for the selected date range
const calculateMaxBlockableSpots = async () => {
    if (!formData.selectedParkingLot || !formData.startDate || !formData.endDate) {
        maxBlockableSpots.value = null;
        return;
    }
    
    try {
        const authToken = localStorage.getItem('authToken');
        const startDateStr = formatDate(formData.startDate);
        const endDateStr = formatDate(formData.endDate);
        
        // Fetch reserved spots for the date range
        const response = await fetch(
            `/api/parking/reservations?hotel_id=${selectedHotelId.value}&startDate=${startDateStr}&endDate=${endDateStr}`,
            {
                headers: { 'Authorization': `Bearer ${authToken}` }
            }
        );
        
        if (!response.ok) {
            throw new Error('Failed to fetch reservations');
        }
        
        const reservations = await response.json();
        
        // Filter spots by size if specified (parkingSpots already fetched in handleParkingLotChange)
        let filteredSpots = Array.isArray(parkingSpots.value) ? parkingSpots.value : [];
        if (formData.spotSize !== null && formData.spotSize !== undefined) {
            filteredSpots = filteredSpots.filter(spot => spot.capacity_units === formData.spotSize);
        }
        const totalSpots = filteredSpots.length;
        
        // Get the parking lot name to filter by
        const selectedLot = storeParkingLots.value.find(lot => lot.id === formData.selectedParkingLot);
        const parkingLotName = selectedLot?.name;
        
        if (!parkingLotName) {
            maxBlockableSpots.value = totalSpots;
            return;
        }
        
        // Get spot IDs for the filtered spots (by size if specified)
        const filteredSpotIds = new Set(filteredSpots.map(spot => spot.id));
        
        // Filter reservations for the selected parking lot by parking_lot_name
        // and by spot size if specified
        const parkingLotReservations = reservations.filter(res => {
            if (res.parking_lot_name !== parkingLotName) return false;
            // If spot size is specified, only count reservations for spots of that size
            if (formData.spotSize !== null && formData.spotSize !== undefined) {
                return filteredSpotIds.has(res.parking_spot_id);
            }
            return true;
        });
        
        // Debug: Log basic info
        console.log('=== Max Blockable Spots Calculation ===');
        console.log('Parking Lot:', parkingLotName);
        console.log('Spot Size Filter:', formData.spotSize || 'All sizes');
        console.log('Total Spots (filtered):', totalSpots);
        console.log('Date Range:', startDateStr, 'to', endDateStr);
        console.log('Total Reservations Found:', parkingLotReservations.length);
        
        // Fetch existing parking blocks for the date range
        await fetchParkingBlocks(selectedHotelId.value, startDateStr, endDateStr);
        const existingBlocks = storeParkingBlocks.value || [];
        
        // Filter blocks for the selected parking lot and spot size
        const relevantBlocks = existingBlocks.filter(block => {
            // If parking lot is specified in the block, it must match
            if (block.parking_lot_id && block.parking_lot_id !== formData.selectedParkingLot) {
                return false;
            }
            // If spot size is specified in both the form and the block, they must match
            if (formData.spotSize !== null && formData.spotSize !== undefined && 
                block.spot_size !== null && block.spot_size !== undefined && 
                block.spot_size !== formData.spotSize) {
                return false;
            }
            return true;
        });
        
        console.log('Relevant Blocks Found:', relevantBlocks.length);
        
        // Count reservations per date
        const dateMap = new Map();
        parkingLotReservations.forEach(res => {
            const dateKey = formatDate(new Date(res.date));
            dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
        });
        
        // Count blocked capacity per date
        const blockedMap = new Map();
        relevantBlocks.forEach(block => {
            const blockStart = new Date(block.start_date);
            const blockEnd = new Date(block.end_date);
            blockStart.setHours(0, 0, 0, 0);
            blockEnd.setHours(23, 59, 59, 999);
            
            const currentBlockDate = new Date(blockStart);
            while (currentBlockDate <= blockEnd) {
                const dateKey = formatDate(currentBlockDate);
                blockedMap.set(dateKey, (blockedMap.get(dateKey) || 0) + (block.number_of_spots || 0));
                currentBlockDate.setDate(currentBlockDate.getDate() + 1);
            }
        });
        
        // Debug: Log occupied spots by date
        console.log('\nOccupied Spots by Date:');
        const currentDate = new Date(formData.startDate);
        const endDate = new Date(formData.endDate);
        
        // Normalize dates to avoid timezone issues
        currentDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        
        console.log('Start Date:', formatDate(currentDate));
        console.log('End Date:', formatDate(endDate));
        
        let maxOccupiedOnAnyDay = 0;
        while (currentDate <= endDate) {
            const dateKey = formatDate(currentDate);
            const reservedCount = dateMap.get(dateKey) || 0;
            const blockedCount = blockedMap.get(dateKey) || 0;
            const totalOccupied = reservedCount + blockedCount;
            const available = totalSpots - totalOccupied;
            console.log(`  ${dateKey}: ${reservedCount} reserved + ${blockedCount} blocked = ${totalOccupied} occupied, ${available} available`);
            maxOccupiedOnAnyDay = Math.max(maxOccupiedOnAnyDay, totalOccupied);
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        console.log('\nMax Occupied (Reserved + Blocked):', maxOccupiedOnAnyDay);
        console.log('Max Blockable Spots:', Math.max(0, totalSpots - maxOccupiedOnAnyDay));
        console.log('=====================================\n');
        
        // Max blockable = total spots - max concurrent (reservations + blocks)
        maxBlockableSpots.value = Math.max(0, totalSpots - maxOccupiedOnAnyDay);
        
    } catch (error) {
        console.error('Failed to calculate max blockable spots:', error);
        maxBlockableSpots.value = null;
    }
};

// Confirmation and action methods
const confirmApplyBlock = () => {
    if (!selectedHotelId.value) {
        toast.add({ severity: 'warn', summary: '警告', detail: 'ホテルを選択してください。', life: 3000 });
        return;
    }
    
    if (!formData.selectedParkingLot) {
        toast.add({ severity: 'warn', summary: '警告', detail: '駐車場を選択してください。', life: 3000 });
        return;
    }
    
    const parkingLotName = storeParkingLots.value.find(lot => lot.id === formData.selectedParkingLot)?.name || '駐車場';
    const sizeText = formData.spotSize ? `<b>サイズ ${formData.spotSize}</b>の` : '';
    const startDateStr = formatDate(formData.startDate);
    const endDateStr = formatDate(formData.endDate);
    
    const message = `
        <b>選択されたホテル</b>の<b>${parkingLotName}</b>の${sizeText}スポットに対して、<br/>
        <b>${startDateStr}</b>～<b>${endDateStr}</b>の期間で<b>${formData.blockedCapacity}台</b>の駐車場利用不可設定を行います。<br/>
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
        const blockData = {
            hotel_id: selectedHotelId.value,
            parking_lot_id: formData.selectedParkingLot,
            spot_size: formData.spotSize || null,
            start_date: formatDate(formData.startDate),
            end_date: formatDate(formData.endDate),
            number_of_spots: formData.blockedCapacity,
            comment: formData.comment || ''
        };
        
        const response = await createParkingBlock(blockData);
        
        if (response) {
            // Refresh the parking blocks list
            await fetchParkingBlocks(selectedHotelId.value, formatDate(formData.startDate), formatDate(formData.endDate));
            parkingBlocks.value = storeParkingBlocks.value;
            
            // Recalculate max blockable spots to reflect the new block
            await calculateMaxBlockableSpots();
            
            toast.add({ severity: 'success', summary: '成功', detail: 'ブロック設定を適用しました。', life: 3000 });
            
            // Reset form
            formData.blockedCapacity = 1;
            formData.comment = '';
        }
    } catch (error) {
        console.error('Failed to create parking block:', error);
        toast.add({ severity: 'error', summary: 'エラー', detail: '適用に失敗しました: ' + error.message, life: 3000 });
    }
};

const confirmDelete = (data) => {
    const message = `
        <b>${data.parking_lot_name || '全駐車場'}</b>、<br/>
        <b>${formatDate(new Date(data.start_date))}</b>～<b>${formatDate(new Date(data.end_date))}</b>、<br/>
        <b>${data.number_of_spots}台</b>のブロック設定を削除してもよろしいですか？<br/>
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
        await deleteParkingBlock(blockId);
        toast.add({ severity: 'success', summary: '成功', detail: 'ブロック設定を削除しました。', life: 3000 });
        
        // Refresh the parking blocks list
        if (formData.startDate && formData.endDate) {
            await fetchParkingBlocks(selectedHotelId.value, formatDate(formData.startDate), formatDate(formData.endDate));
            parkingBlocks.value = storeParkingBlocks.value;
            
            // Recalculate max blockable spots to reflect the deletion
            await calculateMaxBlockableSpots();
        }
    } catch (error) {
        console.error('Failed to delete parking block:', error);
        toast.add({ severity: 'error', summary: 'エラー', detail: '削除に失敗しました: ' + error.message, life: 3000 });
    }
};
</script>
