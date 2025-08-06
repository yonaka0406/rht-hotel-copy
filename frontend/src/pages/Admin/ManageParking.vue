<template>
    <div class="p-4 max-w-7xl mx-auto">
        <Accordion :multiple="true" :activeIndex="[0, 1]">
            <AccordionPanel value="0">
                <AccordionHeader>車両カテゴリー管理</AccordionHeader>
                <AccordionContent>
                    <p class="text-sm text-gray-500 mb-4">100 ユニット = 幅2.5m × 長さ5.0m</p>
                    <div class="flex justify-end">
                        <Button label="カテゴリー追加" icon="pi pi-plus" @click="openNewCategory" class="mb-4"/>
                    </div>
                    <DataTable :value="vehicleCategories" :loading="loading" responsiveLayout="scroll">
                        <Column field="name" header="カテゴリー名"></Column>
                        <Column field="capacity_units_required" header="必要ユニット"></Column>
                        <Column header="操作">
                            <template #body="slotProps">
                                <Button icon="pi pi-pencil" class="p-button-text p-button-sm p-button-success mr-2" @click="editCategory(slotProps.data)" />
                                <Button v-if="slotProps.data.id !== 1" icon="pi pi-trash" class="p-button-text p-button-sm p-button-danger" @click="confirmDeleteCategory(slotProps.data)" />
                            </template>
                        </Column>
                    </DataTable>
                </AccordionContent>
            </AccordionPanel>
            <AccordionPanel value="1">
                <AccordionHeader>駐車場管理</AccordionHeader>
                <AccordionContent>
                    <div class="flex justify-end">
                        <Button label="駐車場追加" icon="pi pi-plus" @click="openNewParkingLot" class="mb-4" />
                    </div>
                    <DataTable :value="parkingLots" :loading="loading" responsiveLayout="scroll">
                        <Column field="name" header="駐車場名"></Column>
                        <Column header="操作">
                            <template #body="slotProps">
                                <Button icon="pi pi-pencil" class="p-button-text p-button-sm p-button-success mr-2" @click="editParkingLot(slotProps.data)" />
                                <Button icon="pi pi-trash" class="p-button-text p-button-sm p-button-danger" @click="confirmDeleteParkingLot(slotProps.data)" />
                            </template>
                        </Column>
                    </DataTable>
                </AccordionContent>
            </AccordionPanel>
        </Accordion>

        <div class="mt-4">
            <Card>
                <template #title>
                    レイアウトエディタ
                    <p class="text-sm text-gray-500">100 ユニット = 幅2.5m × 長さ5.0m</p>
                </template>
                <template #content>
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-2">
                            <h3>Spot Types</h3>
                            <Sortable :list="spotTypes" item-key="id" :group="{ name: 'spots', pull: 'clone', put: false }" class="space-y-2" @end="onEnd">
                                <template #item="{element}">
                                    <div class="p-2 border rounded cursor-move bg-gray-300">
                                        {{ element.name }}
                                    </div>
                                </template>
                            </Sortable>
                        </div>
                        <div class="col-span-10">
                            <Sortable :list="parkingSpots" @update:list="parkingSpots = $event" item-key="id" group="spots" class="min-h-96 border-2 border-dashed border-gray-400 p-4 grid grid-cols-10 gap-2" @end="onEnd">
                                <template #item="{element}">
                                    <div class="p-2 border rounded cursor-move bg-gray-200">
                                        {{ element.spot_number }}
                                    </div>
                                </template>
                            </Sortable>
                        </div>
                    </div>
                </template>
            </Card>
        </div>

        <VehicleCategoryDialog v-model:visible="categoryDialog" :category="category" @save="saveCategory" />
        <ParkingSpotDialog v-model:visible="spotDialog" :spot="spot" @save="saveSpot" />
    </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { Sortable } from 'sortablejs-vue3';
import { useParkingStore } from '../../composables/useParkingStore';
import { useHotelStore } from '../../composables/useHotelStore';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';

import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import VehicleCategoryDialog from './components/VehicleCategoryDialog.vue';
import ParkingSpotDialog from './components/ParkingSpotDialog.vue';

const { vehicleCategories, parkingLots, parkingSpots, fetchVehicleCategories, fetchParkingLots, fetchParkingSpots, createVehicleCategory, updateVehicleCategory, deleteVehicleCategory } = useParkingStore();
const { selectedHotelId } = useHotelStore();
const toast = useToast();
const confirm = useConfirm();

const loading = ref(false);
const categoryDialog = ref(false);
const category = ref({ name: '', capacity_units_required: 100 });
const spotDialog = ref(false);
const spot = ref({});
const spotTypes = ref([
    { id: 1, name: 'Standard' },
    { id: 2, name: 'Large' },
    { id: 3, name: 'In-line' },
]);

const onEnd = (event) => {
    console.log('Drag end:', event);
    // Add any additional logic you need when dragging ends
};

const saveSpot = async (spotToSave) => {
    // Save spot logic here
    console.log('Saving spot:', spotToSave);
    spotDialog.value = false;
};

const loadData = async () => {
    if (!selectedHotelId.value) return;
    
    loading.value = true;
    try {
        await Promise.all([
            fetchVehicleCategories(),
            fetchParkingLots(),
        ]);
        
        if (parkingLots.value.length > 0) {
            await fetchParkingSpots(parkingLots.value[0].id);
        }
    } catch (error) {
        console.error('Error loading parking data:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: 'データの読み込み中にエラーが発生しました',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
};

// Watch for hotel ID changes to reload data
watch(selectedHotelId, () => {
    if (selectedHotelId.value) {
        loadData();
    }
});

onMounted(() => {
    if (selectedHotelId.value) {
        loadData();
    }
});

watch(selectedHotelId, () => {
    loading.value = true;
    Promise.all([
        fetchVehicleCategories(),
        fetchParkingLots(),
    ]).finally(() => {
        loading.value = false;
        if (parkingLots.value.length > 0) {
            fetchParkingSpots(parkingLots.value[0].id);
        }
    });
});

const openNewCategory = () => {
    category.value = { name: '', capacity_units_required: 100 };
    categoryDialog.value = true;
};

const openNewParkingLot = () => {
    // Logic to open a dialog for creating a new parking lot
};

const editParkingLot = (lot) => {
    // Logic to edit a parking lot
};

const confirmDeleteParkingLot = (lot) => {
    confirm.require({
        message: `駐車場「${lot.name}」を削除しますか？`,
        header: '確認',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'はい',
        rejectLabel: 'いいえ',
        rejectClass: 'p-button-secondary',
        accept: () => deleteParkingLot(lot)
    });
};

const deleteParkingLot = async (lot) => {
    try {
        loading.value = true;
        // TODO: Implement deleteParkingLot in useParkingStore
        // await deleteParkingLot(lot.id);
        toast.add({
            severity: 'success',
            summary: '成功',
            detail: '駐車場が削除されました',
            life: 3000
        });
        await fetchParkingLots();
    } catch (error) {
        console.error('Error deleting parking lot:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: '駐車場の削除中にエラーが発生しました',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
};

const saveCategory = async (categoryToSave) => {
    try {
        loading.value = true;
        if (categoryToSave.id) {
            await updateVehicleCategory(categoryToSave.id, categoryToSave);
            toast.add({severity:'success', summary: '成功', detail: '車両カテゴリーが更新されました', life: 3000});
        } else {
            await createVehicleCategory(categoryToSave);
            toast.add({severity:'success', summary: '成功', detail: '車両カテゴリーが作成されました', life: 3000});
        }
        await fetchVehicleCategories();
        categoryDialog.value = false;
    } catch (error) {
        console.error('Error saving vehicle category:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: '車両カテゴリーの保存中にエラーが発生しました',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
};

const editCategory = (categoryToEdit) => {
    category.value = { ...categoryToEdit };
    categoryDialog.value = true;
};

const confirmDeleteCategory = (categoryToDelete) => {
    confirm.require({
        message: `「${categoryToDelete.name}」を削除しますか？`,
        header: '確認',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'はい',
        rejectLabel: 'いいえ',
        rejectClass: 'p-button-secondary',
        accept: () => deleteCategory(categoryToDelete)
    });
};

const deleteCategory = async (categoryToDelete) => {
    try {
        loading.value = true;
        await deleteVehicleCategory(categoryToDelete.id);
        toast.add({
            severity: 'success',
            summary: '成功',
            detail: '車両カテゴリーが削除されました',
            life: 3000
        });
        await fetchVehicleCategories();
    } catch (error) {
        console.error('Error deleting vehicle category:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: '車両カテゴリーの削除中にエラーが発生しました',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
};

const capacityGradient = computed(() => {
    if (vehicleCategories.value.length < 2) {
        return 'none';
    }
    const sortedCategories = [...vehicleCategories.value].sort((a, b) => a.capacity_units_required - b.capacity_units_required);
    const min = sortedCategories[0].capacity_units_required;
    const max = sortedCategories[sortedCategories.length - 1].capacity_units_required;
    const stops = sortedCategories.map(cat => {
        const percentage = ((cat.capacity_units_required - min) / (max - min)) * 100;
        const color = `hsl(${120 - percentage * 1.2}, 100%, 50%)`;
        return `${color} ${percentage}%`;
    });
    return `linear-gradient(to right, ${stops.join(', ')})`;
});
</script>
