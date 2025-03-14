<template>
    <div class="p-4">
        <Panel header="カレンダー設定">
            <Card class="mb-4">
                <template #header><span class="text-lg font-bold">販売不可日付登録</span></template>
                <template #content>   
                    <div class="grid grid-cols-2 gap-4 mb-2">
                        <div>
                            <label for="hotel" class="block text-sm font-medium text-gray-700">ホテル選択</label>
                            <Select
                                name="hotel"
                                v-model="selectedHotelId"
                                :options="hotels"
                                optionLabel="name" 
                                optionValue="id"
                                :virtualScrollerOptions="{ itemSize: 38 }"
                                class="w-48"
                                placeholder="ホテル選択"
                                filter
                            />
                        </div>
                        <div>
                            <label for="rooms" class="block text-sm font-medium text-gray-700">部屋選択</label>
                            <MultiSelect
                                name="rooms"
                                v-model="selectedRooms"
                                :options="formattedHotelRooms"
                                optionLabel="formattedRoom" 
                                optionValue="room_id"
                                :virtualScrollerOptions="{ itemSize: 38 }"
                                class="w-48"
                                placeholder="部屋選択"
                                filter
                            />
                        </div>
                    </div>                 
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="startDate" class="block text-sm font-medium text-gray-700">開始日</label>
                            <DatePicker id="startDate" v-model="startDate" dateFormat="yy-mm-dd" class="w-full" />
                        </div>
                        <div>
                            <label for="endDate" class="block text-sm font-medium text-gray-700">終了日</label>
                            <DatePicker id="endDate" v-model="endDate" dateFormat="yy-mm-dd" class="w-full" />
                        </div>
                        <div class="col-span-2">
                            <label for="comment" class="block text-sm font-medium text-gray-700">備考</label>
                            <InputText id="comment" v-model="comment" type="text" fluid />
                        </div>
                        
                    </div>                    
                    <div class="mt-4 flex justify-center gap-2">
                        <Button label="全ホテルに適用" @click="confirmApplyToAllHotels" class="p-button-secondary" />
                        <Button label="選択ホテルに適用" @click="confirmApplyToSelectedHotel" class="p-button-primary" />
                    </div>
                </template>
                
                
            </Card>
            <Card>
                <template #content>
                    <DataTable>
                        <Column></Column>
                    </DataTable>
                </template>
            </Card>            
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
    import { ref, computed, onMounted, watch } from 'vue';

    // Store
    import { useHotelStore } from '@/composables/useHotelStore';
    const { hotels, selectedHotelId, fetchHotels, selectedHotelRooms, fetchHotel, applyCalendarSettings } = useHotelStore();

    // Primevue
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();
    import { useConfirm } from "primevue/useconfirm";
    const confirm = useConfirm();
    import { Panel, Card, Select, MultiSelect, DatePicker, InputText, Button, DataTable, Column, ConfirmDialog } from 'primevue';

    // Helper
    const formatDate = (date) => {
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            console.error("Invalid Date object:", date);
            throw new Error("The provided input is not a valid Date object:");
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };
    // Form
    const formattedHotelRooms = computed(() => {
        if (!selectedHotelRooms.value) {
            return [];
        }
        return selectedHotelRooms.value.map(room => {
            return {
            ...room,
            formattedRoom: `${room.room_number}号室：${room.room_type_name}`
            };
        });
    });
    const selectedRooms = ref(null);    
    const startDate = ref(new Date());
    const endDate = ref(new Date());
    const comment = ref('');
    const formattedMessage = ref('');

    const confirmApplyToAllHotels = () => {
        const message = `
            <b>全ホテル</b>、<b>全部屋</b>に対して、<br/>
            選択された日付範囲で販売不可設定を行います。<br/>
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
                applyToAllHotels();
            },
            rejectProps: {
                label: 'キャンセル',
                severity: 'secondary',
                outlined: true
            },
            reject: () => {                
            },
        });
    };
    const applyToAllHotels = async () => {
        if (!startDate.value || !endDate.value) {
            toast.add({ severity: 'warn', summary: '警告', detail: '開始日と終了日を選択してください。', life: 3000 });
            return;
        }
        try {
            const results = await applyCalendarSettings(null, formatDate(startDate.value), formatDate(endDate.value), null);            
            toast.add({ severity: 'success', summary: '成功', detail: '全ホテルに適用しました。', life: 3000 });
        } catch (error) {
            toast.add({ severity: 'error', summary: 'エラー', detail: '適用に失敗しました: ' + error.message, life: 3000 });
        }
    };    
    const confirmApplyToSelectedHotel = () => {
        let message = '';
        if (selectedRooms.value && selectedRooms.value.length > 0) {
            message = `
                <b>選択されたホテル</b>、<b>選択された部屋</b>に対して、<br/>
                選択された日付範囲で販売不可設定を行います。<br/>
                よろしいですか？<br/>
            `;            
        } else {            
            message = `
                <b>選択されたホテル</b>、<b>全部屋</b>に対して、<br/>
                選択された日付範囲で販売不可設定を行います。<br/>
                よろしいですか？<br/>
            `; 
        }
        formattedMessage.value = message;

        confirm.require({
            group: 'templating',
            message: message,
            header: '確認',
            icon: 'pi pi-exclamation-triangle',
            acceptProps: {
                label: 'はい'
            },
            accept: () => {
                applyToSelectedHotel();
            },            
            rejectProps: {
                label: 'キャンセル',
                severity: 'secondary',
                outlined: true
            },
            reject: () => {                
            },
        });
    };
    const applyToSelectedHotel = async () => {
        if (!selectedHotelId.value) {
            toast.add({ severity: 'warn', summary: '警告', detail: 'ホテルを選択してください。', life: 3000 });
            return;
        }
        if (!startDate.value || !endDate.value) {
            toast.add({ severity: 'warn', summary: '警告', detail: '開始日と終了日を選択してください。', life: 3000 });
            return;
        }
        try {
            const roomIds = selectedRooms.value ? selectedRooms.value : null;
            const results = await applyCalendarSettings(selectedHotelId.value, formatDate(startDate.value), formatDate(endDate.value), roomIds);
            toast.add({ severity: 'success', summary: '成功', detail: '選択ホテルに適用しました。', life: 3000 });
        } catch (error) {
            toast.add({ severity: 'error', summary: 'エラー', detail: '適用に失敗しました: ' + error.message, life: 3000 });
        }
    };

    onMounted( async () => {
        await fetchHotels();
        await fetchHotel();
    });

    watch(selectedHotelId, async (newValue, oldValue) => {                 
        await fetchHotel();
    }, { deep: true }); 

</script>