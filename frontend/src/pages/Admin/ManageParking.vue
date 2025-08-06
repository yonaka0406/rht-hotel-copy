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
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                        <div class="w-full md:w-1/3">
                            <label for="hotelSelect" class="block text-sm font-medium text-gray-700 mb-1">ホテルを選択</label>
                            <Select 
                                id="hotelSelect"
                                v-model="selectedHotelId"
                                :options="hotels"
                                optionLabel="name"
                                optionValue="id"
                                placeholder="ホテルを選択してください"
                                class="w-full"
                                :loading="isLoadingHotelList"
                                :disabled="isLoadingHotelList"
                            >
                                <template #option="slotProps">
                                    <div class="flex align-items-center">
                                        <div>{{ slotProps.option.name }}</div>
                                    </div>
                                </template>
                            </Select>
                        </div>
                        <div>
                            <Button 
                                label="駐車場追加" 
                                icon="pi pi-plus" 
                                @click="openNewParkingLot" 
                                :disabled="!selectedHotelId" 
                                :loading="loading" 
                                class="w-full md:w-auto"
                            />
                        </div>
                    </div>
                    <DataTable 
                        :value="parkingLots" 
                        :loading="loading" 
                        responsiveLayout="scroll"
                        v-model:selection="selectedParkingLot"
                        selectionMode="single"
                        dataKey="id"
                        :metaKeySelection="false"
                    >
                        <Column field="name" header="駐車場名"></Column>
                        <Column header="操作" style="width: 16rem">
                            <template #body="slotProps">
                                <Button 
                                    icon="pi pi-check" 
                                    :label="selectedParkingLot?.id === slotProps.data.id ? '選択中' : '選択'"
                                    class="p-button-sm p-button-outlined mr-2" 
                                    :class="{ 'p-button-success': selectedParkingLot?.id === slotProps.data.id }"
                                    @click="selectParkingLot(slotProps.data)" 
                                />
                                <Button 
                                    icon="pi pi-pencil" 
                                    class="p-button-text p-button-sm p-button-success" 
                                    @click="editParkingLot(slotProps.data)" 
                                />
                                <Button 
                                    icon="pi pi-trash" 
                                    class="p-button-text p-button-sm p-button-danger" 
                                    @click="confirmDeleteParkingLot(slotProps.data)" 
                                />
                            </template>
                        </Column>
                    </DataTable>
                </AccordionContent>
            </AccordionPanel>
        </Accordion>

        <div v-if="selectedParkingLot" class="mt-4">
            <Card>
                <template #title>
                    <div class="flex justify-between items-center">
                        <div>
                            レイアウトエディタ - {{ selectedParkingLot.name }}
                            <p class="text-sm text-gray-500">グリッド1マス = 1m × 1m</p>
                        </div>
                        <Button 
                            icon="pi pi-times" 
                            label="閉じる" 
                            class="p-button-text p-button-sm" 
                            @click="closeLayoutEditor" 
                        />
                    </div>
                </template>
                <template #content>
                    <ParkingSpotEditor
                        v-if="selectedParkingLot"
                        :parking-lot-id="selectedParkingLot.id"
                        :initial-spots="parkingSpots"
                        @save="saveParkingSpots"
                    />
                </template>
            </Card>
        </div>

        <VehicleCategoryDialog v-model:visible="categoryDialog" :category="category" @save="saveCategory" />
        <ParkingLotDialog 
            v-if="selectedHotelId"
            v-model:visible="parkingLotDialog" 
            :parking-lot="parkingLot" 
            :hotel-id="selectedHotelId"
            :hotel-name="selectedHotelName"
            @save="saveParkingLot" 
            key="parking-lot-dialog"
        />
        <!-- ParkingSpotDialog removed as it's no longer needed -->
    </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
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
import Select from 'primevue/select';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import VehicleCategoryDialog from './components/VehicleCategoryDialog.vue';
import ParkingLotDialog from './components/ParkingLotDialog.vue';
import ParkingSpotEditor from './components/ParkingSpotEditor.vue';

// Initialize stores
const parkingStore = useParkingStore();
const hotelStore = useHotelStore();

// Destructure parking store methods and state
const { 
    vehicleCategories, 
    parkingLots, 
    parkingSpots, 
    fetchVehicleCategories, 
    fetchParkingLots, 
    fetchParkingSpots, 
    createVehicleCategory, 
    updateVehicleCategory, 
    deleteVehicleCategory,
    createParkingLot,
    updateParkingLot,
    deleteParkingLot
} = parkingStore;

// Destructure hotel store methods and state
const { 
    selectedHotelId, 
    hotels, 
    fetchHotels, 
    isLoadingHotelList 
} = hotelStore;

// Get the selected hotel's name
const selectedHotelName = computed(() => {
    if (!selectedHotelId.value) return '';
    const hotel = hotels.value.find(h => h.id === selectedHotelId.value);
    return hotel ? hotel.name : '';
});

// Initialize toast and confirm
const toast = useToast();
const confirm = useConfirm();

// Fetch initial data on component mount
onMounted(async () => {
    try {
        loading.value = true;
        // Load hotels if not already loaded
        if (hotels.value.length === 0) {
            await fetchHotels();
        }
        // Always load vehicle categories (they're global)
        await fetchVehicleCategories();
    } catch (error) {
        console.error('Error initializing data:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: 'データの読み込み中にエラーが発生しました',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
});

// Initialize refs and reactive state
const loading = ref(false);
const categoryDialog = ref(false);
const category = ref({ name: '', capacity_units_required: 100 });
const parkingLotDialog = ref(false);
const parkingLot = ref({ name: '', description: '' });
const selectedParkingLot = ref(null);

// Watchers
watch(selectedHotelId, async (newVal, oldVal) => {
    console.log('Hotel changed from', oldVal, 'to', newVal);
    
    // Clear the selected parking lot when hotel changes
    selectedParkingLot.value = null;
    
    // If we have a new hotel, load its parking lots
    if (newVal) {
        try {
            loading.value = true;
            await fetchParkingLots();
        } catch (error) {
            console.error('Error loading parking lots:', error);
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: '駐車場データの読み込み中にエラーが発生しました',
                life: 3000
            });
        } finally {
            loading.value = false;
        }
    } else {
        // Clear parking lots if no hotel is selected
        parkingLots.value = [];
    }
}, { immediate: true });

// Watch for changes to selectedParkingLot
watch(selectedParkingLot, async (newVal) => {
    console.log('selectedParkingLot changed to:', newVal);
    
    // If we have a selected parking lot, load its spots
    if (newVal) {
        try {
            loading.value = true;
            await fetchParkingSpots(newVal.id);
        } catch (error) {
            console.error('Error loading parking spots:', error);
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: '駐車スペースの読み込み中にエラーが発生しました',
                life: 3000
            });
        } finally {
            loading.value = false;
        }
    } else {
        // Clear spots if no parking lot is selected
        parkingSpots.value = [];
    }
}, { deep: true });

// Methods
const closeLayoutEditor = () => {
    selectedParkingLot.value = null;
    parkingSpots.value = [];
};

const saveParkingSpots = async (spots) => {
    try {
        loading.value = true;
        const authToken = localStorage.getItem('authToken');
        
        // Update parking spots
        const response = await fetch(`/api/parking-lots/${selectedParkingLot.value.id}/spots`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ spots })
        });

        if (!response.ok) {
            throw new Error('Failed to save parking spots');
        }

        // Refresh the spots
        await fetchParkingSpots(selectedParkingLot.value.id);
        
        toast.add({
            severity: 'success',
            summary: '成功',
            detail: '駐車スペースのレイアウトが保存されました',
            life: 3000
        });
    } catch (error) {
        console.error('Error saving parking spots:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: '駐車スペースの保存中にエラーが発生しました',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
};

// Save spot logic is now handled by the ParkingSpotEditor

// Watch for parking lot selection changes
watch(selectedParkingLot, async (newVal) => {
    if (newVal) {
        loading.value = true;
        try {
            await fetchParkingSpots(newVal.id);
        } catch (error) {
            console.error('Error loading parking spots:', error);
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: '駐車スペースの読み込み中にエラーが発生しました',
                life: 3000
            });
        } finally {
            loading.value = false;
        }
    } else {
        parkingSpots.value = [];
    }
});

// Initial data load
onMounted(() => {
    if (selectedHotelId.value) {
        loadData();
    }
});

const openNewCategory = () => {
    category.value = { name: '', capacity_units_required: 100 };
    categoryDialog.value = true;
};

const selectParkingLot = (lot) => {
    console.log('Selecting parking lot:', lot);
    if (selectedParkingLot.value && selectedParkingLot.value.id === lot.id) {
        selectedParkingLot.value = null;
        parkingSpots.value = [];
    } else {
        selectedParkingLot.value = { ...lot };
    }
};

const openNewParkingLot = () => {
    if (!selectedHotelId.value) {
        toast.add({
            severity: 'warn',
            summary: 'ホテルを選択してください',
            detail: '駐車場を追加するには、まずホテルを選択してください。',
            life: 3000
        });
        return;
    }
    parkingLot.value = { name: '', description: '', hotel_id: selectedHotelId.value };
    parkingLotDialog.value = true;
};

const editParkingLot = (lotToEdit) => {
    parkingLot.value = { ...lotToEdit };
    parkingLotDialog.value = true;
};

const confirmDeleteParkingLot = (lot) => {
    confirm.require({
        message: `駐車場「${lot.name}」を削除しますか？`,
        header: '確認',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'はい',
        rejectLabel: 'いいえ',
        rejectClass: 'p-button-secondary',
        accept: async () => {
            try {
                loading.value = true;
                await deleteParkingLot(lot.id);
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
        }
    });
};

const saveParkingLot = async (savedParkingLot) => {
    try {
        loading.value = true;
        if (savedParkingLot.id) {
            await updateParkingLot(savedParkingLot.id, savedParkingLot);
            toast.add({
                severity: 'success',
                summary: '成功',
                detail: '駐車場が更新されました',
                life: 3000
            });
        } else {
            await createParkingLot(savedParkingLot);
            toast.add({
                severity: 'success',
                summary: '成功',
                detail: '駐車場が作成されました',
                life: 3000
            });
        }
        parkingLotDialog.value = false;
        await fetchParkingLots();
    } catch (error) {
        console.error('Error saving parking lot:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: '駐車場の保存中にエラーが発生しました',
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
