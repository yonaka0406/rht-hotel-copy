<template>
    <div class="p-4 max-w-7xl mx-auto">
        <Accordion :multiple="true" :activeIndex="[0, 1]">
            <AccordionPanel value="0">
                <AccordionHeader>車両カテゴリー管理</AccordionHeader>
                <AccordionContent>
                    <div class="flex justify-end">
                        <Button label="カテゴリー追加" icon="pi pi-plus" @click="openNewCategory" class="mb-4"/>
                    </div>
                    <DataTable :value="vehicleCategories" :loading="loading" responsiveLayout="scroll">
                        <Column field="name" header="カテゴリー名"></Column>
                        <Column field="capacity_units_required" header="必要ユニット"></Column>
                        <Column header="操作">
                            <template #body="slotProps">
                                <Button icon="pi pi-pencil" class="p-button-rounded p-button-success mr-2" @click="editCategory(slotProps.data)" />
                                <Button v-if="slotProps.data.id !== 1" icon="pi pi-trash" class="p-button-rounded p-button-warning" @click="confirmDeleteCategory(slotProps.data)" />
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
                                <Button icon="pi pi-pencil" class="p-button-rounded p-button-success mr-2" @click="editParkingLot(slotProps.data)" />
                                <Button icon="pi pi-trash" class="p-button-rounded p-button-warning" @click="confirmDeleteParkingLot(slotProps.data)" />
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
                    <p class="text-sm text-gray-500">100 capacity units = 幅2.5m × 長さ5.0m</p>
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
import VehicleCategoryDialog from './components/VehicleCategoryDialog.vue';
import ParkingSpotDialog from './components/ParkingSpotDialog.vue';

const { vehicleCategories, parkingLots, parkingSpots, fetchVehicleCategories, fetchParkingLots, fetchParkingSpots, createVehicleCategory, updateVehicleCategory, deleteVehicleCategory } = useParkingStore();
const { selectedHotelId } = useHotelStore();
const toast = useToast();

const loading = ref(false);
const categoryDialog = ref(false);
const category = ref({});
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

onMounted(() => {
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
    category.value = {};
    categoryDialog.value = true;
};

const openNewParkingLot = () => {
    // Logic to open a dialog for creating a new parking lot
};

const editParkingLot = (lot) => {
    // Logic to edit a parking lot
};

const confirmDeleteParkingLot = (lot) => {
    // Logic to confirm and delete a parking lot
};

const saveCategory = async (categoryToSave) => {
    if (categoryToSave.id) {
        await updateVehicleCategory(categoryToSave.id, { ...categoryToSave, hotel_id: selectedHotelId.value });
        toast.add({severity:'success', summary: '成功', detail: 'カテゴリーが更新されました', life: 3000});
    } else {
        await createVehicleCategory({ ...categoryToSave, hotel_id: selectedHotelId.value });
        toast.add({severity:'success', summary: '成功', detail: 'カテゴリーが作成されました', life: 3000});
    }
    categoryDialog.value = false;
    fetchVehicleCategories();
};

const editCategory = (prod) => {
    category.value = { ...prod };
    categoryDialog.value = true;
};

const confirmDeleteCategory = (prod) => {
    // Confirmation logic here
    deleteCategory(prod);
};

const deleteCategory = async (prod) => {
    await deleteVehicleCategory(prod.id);
    toast.add({severity:'success', summary: '成功', detail: 'カテゴリーが削除されました', life: 3000});
    fetchVehicleCategories();
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
