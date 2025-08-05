<template>
    <div class="p-4 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <Card class="mb-4">
                <template #title>
                    <div class="flex justify-between items-center">
                        <span>車両カテゴリー管理</span>
                        <Button label="カテゴリー追加" icon="pi pi-plus" @click="openNewCategory" />
                    </div>
                </template>
                <template #content>
                    <DataTable :value="vehicleCategories" :loading="loading" responsiveLayout="scroll">
                        <Column field="name" header="カテゴリー名"></Column>
                        <Column field="capacity_units_required" header="必要ユニット"></Column>
                        <Column header="操作">
                            <template #body="slotProps">
                                <Button icon="pi pi-pencil" class="p-button-rounded p-button-success mr-2" @click="editCategory(slotProps.data)" />
                                <Button icon="pi pi-trash" class="p-button-rounded p-button-warning" @click="confirmDeleteCategory(slotProps.data)" />
                            </template>
                        </Column>
                    </DataTable>
                </template>
            </Card>
            <Card>
                <template #title>
                    <div class="flex justify-between items-center">
                        <span>駐車場管理</span>
                        <Button label="駐車場追加" icon="pi pi-plus" @click="openNewParkingLot" />
                    </div>
                </template>
                <template #content>
                    <DataTable :value="parkingLots" :loading="loading" responsiveLayout="scroll">
                        <Column field="name" header="駐車場名"></Column>
                        <Column header="操作">
                            <template #body="slotProps">
                                <Button icon="pi pi-pencil" class="p-button-rounded p-button-success mr-2" @click="editParkingLot(slotProps.data)" />
                                <Button icon="pi pi-trash" class="p-button-rounded p-button-warning" @click="confirmDeleteParkingLot(slotProps.data)" />
                            </template>
                        </Column>
                    </DataTable>
                </template>
            </Card>
        </div>
        <div>
            <Card>
                <template #title>
                    レイアウトエディタ
                    <p class="text-sm text-gray-500">100 capacity units = 幅2.5m × 長さ5.0m</p>
                </template>
                <template #content>
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-2">
                            <h3>Spot Types</h3>
                            <draggable v-model="spotTypes" item-key="id" :group="{ name: 'spots', pull: 'clone', put: false }" class="space-y-2">
                                <template #item="{element}">
                                    <div class="p-2 border rounded cursor-move bg-gray-300">
                                        {{ element.name }}
                                    </div>
                                </template>
                            </draggable>
                        </div>
                        <div class="col-span-10">
                            <draggable v-model="parkingSpots" item-key="id" group="spots" class="min-h-96 border-2 border-dashed border-gray-400 p-4 grid grid-cols-10 gap-2">
                                <template #item="{element}">
                                    <div class="p-2 border rounded cursor-move bg-gray-200">
                                        {{ element.spot_number }}
                                    </div>
                                </template>
                            </draggable>
                        </div>
                    </div>
                </template>
            </Card>
        </div>

        <Dialog v-model:visible="categoryDialog" :style="{width: '450px'}" header="車両カテゴリー詳細" :modal="true" class="p-fluid">
            <div class="field">
                <label for="name">カテゴリー名</label>
                <InputText id="name" v-model.trim="category.name" required="true" autofocus />
            </div>
            <div class="field">
                <label for="capacity">必要ユニット</label>
                <InputNumber id="capacity" v-model="category.capacity_units_required" integeronly />
            </div>
            <template #footer>
                <Button label="キャンセル" icon="pi pi-times" class="p-button-text" @click="hideDialog"/>
                <Button label="保存" icon="pi pi-check" class="p-button-text" @click="saveCategory" />
            </template>
        </Dialog>

        <Dialog v-model:visible="spotDialog" :style="{width: '450px'}" header="駐車場スポット詳細" :modal="true" class="p-fluid">
            <div class="field">
                <label for="spot_number">スポット番号</label>
                <InputText id="spot_number" v-model.trim="spot.spot_number" required="true" autofocus />
            </div>
            <div class="field">
                <label for="spot_type">スポットタイプ</label>
                <InputText id="spot_type" v-model.trim="spot.spot_type" />
            </div>
            <div class="field">
                <label for="capacity_units">容量ユニット</label>
                <InputNumber id="capacity_units" v-model="spot.capacity_units" integeronly />
            </div>
            <template #footer>
                <Button label="キャンセル" icon="pi pi-times" class="p-button-text" @click="hideSpotDialog"/>
                <Button label="保存" icon="pi pi-check" class="p-button-text" @click="saveSpot" />
            </template>
        </Dialog>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import draggable from 'vuedraggable';
import { useParkingStore } from '../../composables/useParkingStore';
import { useHotelStore } from '../../composables/useHotelStore';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import { useToast } from 'primevue/usetoast';

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

const hideSpotDialog = () => {
    spotDialog.value = false;
};

const saveSpot = async () => {
    // Save spot logic here
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

const hideDialog = () => {
    categoryDialog.value = false;
};

const saveCategory = async () => {
    if (category.value.id) {
        await updateVehicleCategory(category.value.id, { ...category.value, hotel_id: selectedHotelId.value });
        toast.add({severity:'success', summary: '成功', detail: 'カテゴリーが更新されました', life: 3000});
    } else {
        await createVehicleCategory({ ...category.value, hotel_id: selectedHotelId.value });
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
</script>
