<template>
    <div v-if="plan">
        <div>
            <div class="grid xs:grid-cols-1 grid-cols-3 gap-2 mt-6">
                <div class="flex justify-start">
                    <span class="font-bold text-lg">Add-ons</span>
                </div>
                <div class="flex justify-start">
                    <Button @click="openAddonDialog" label="Add New Addon" icon="pi pi-plus" />
                </div>
            </div>
            <Accordion value="0">
                <AccordionPanel value="0">
                    <AccordionHeader>Current Add-ons</AccordionHeader>
                    <AccordionContent>                        
                        <DataTable :value="filteredCurrentConditions">
                            <Column field="date_start" header="Start"></Column>
                            <Column field="date_end" header="End"></Column>    
                            <Column field="name" header="Addon"></Column>
                            <Column field="price" header="Price">
                                <template #body="slotProps">
                                    {{ formatNumber(slotProps.data.price, 'currency') }}
                                </template>                                    
                            </Column>
                            <Column header="Actions">
                                <template #body="slotProps">
                                    <Button 
                                        icon="pi pi-pencil"
                                        class="p-button-text p-button-sm"
                                        @click="openEditAddonDialog(slotProps.data)"
                                    />                                  
                                </template>
                            </Column>
                        </DataTable>
                    </AccordionContent>
                </AccordionPanel>
                <AccordionPanel value="1">
                    <AccordionHeader>Future Add-ons</AccordionHeader>
                    <AccordionContent>
                        <DataTable :value="filteredFutureConditions">
                            <Column field="date_start" header="Start"></Column>
                            <Column field="date_end" header="End"></Column>    
                            <Column field="name" header="Addon"></Column>
                            <Column field="price" header="Price">
                                <template #body="slotProps">
                                    {{ formatNumber(slotProps.data.price, 'currency') }}
                                </template>                                    
                            </Column>
                            <Column header="Actions">
                                <template #body="slotProps">
                                    <Button 
                                        icon="pi pi-pencil"
                                        class="p-button-text p-button-sm"
                                        @click="openEditAddonDialog(slotProps.data)"
                                    />                                  
                                </template>
                            </Column>   
                        </DataTable>
                    </AccordionContent>
                </AccordionPanel>
                <AccordionPanel value="2">
                    <AccordionHeader>Past Add-ons</AccordionHeader>
                    <AccordionContent>                        
                        <DataTable :value="filteredPastConditions">
                            <Column field="date_start" header="Start"></Column>
                            <Column field="date_end" header="End"></Column>    
                            <Column field="name" header="Addon"></Column>
                            <Column field="price" header="Price">
                                <template #body="slotProps">
                                    {{ formatNumber(slotProps.data.price, 'currency') }}
                                </template>                                    
                            </Column>
                            <Column header="Actions">
                                <template #body="slotProps">
                                    <Button 
                                        icon="pi pi-pencil"
                                        class="p-button-text p-button-sm"
                                        @click="openEditAddonDialog(slotProps.data)"
                                    />                                  
                                </template>
                            </Column>                    
                        </DataTable>
                    </AccordionContent>
                </AccordionPanel>
            </Accordion>

            <Dialog header="New Addon" v-model:visible="showAddonDialog" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true">
                <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 gap-y-6 pt-6">
                    <div class="col-6">
                        <FloatLabel>
                            <label for="AddonSelectEdit" class="block mb-2">Addon List</label>
                            <Select v-model="newAddon.addons_id" 
                                id="AddonSelectEdit"                                
                                :options="allAddons"
                                optionLabel="name"
                                optionValue="id"
                                placeholder="Select a Global Addon" 
                                class="w-full"                            
                                filter 
                                required
                                @change="onAddonChange"
                            /> 
                        </FloatLabel>
                    </div>
                    <div class="col-6">
                        <FloatLabel>
                            <InputNumber v-model="newAddon.price"                             
                            mode="currency" 
                            currency="JPY" 
                            locale="ja-JP" 
                            />
                            <label>Price</label>
                        </FloatLabel>
                    </div>
                </div>
                <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 gap-y-6 pt-6">
                        <div class="col-6">
                            <FloatLabel>
                                <label for="dateStart">Start Date</label>                
                                <DatePicker v-model="newAddon.date_start" 
                                    dateFormat="yy-mm-dd"
                                    class="w-full"
                                    required 
                                />
                            </FloatLabel>                
                        </div>
                        <div class="col-6">
                            <FloatLabel>
                                <label for="dateEnd">End Date</label>
                                <DatePicker v-model="newAddon.date_end"
                                    dateFormat="yy-mm-dd"
                                    class="w-full"  
                                />
                            </FloatLabel>                
                        </div>
                    </div>

                <template #footer>                    
                    <Button label="Add" icon="pi pi-plus" @click="addAddon" class="p-button-success p-button-text p-button-sm" />
                    <Button label="Close" icon="pi pi-times" @click="showAddonDialog = false" class="p-button-danger p-button-text p-button-sm" />
                </template>
            </Dialog>

            <Dialog header="Edit Addon" v-model:visible="showEditAddonDialog" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true">
                <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 gap-y-6 pt-6">
                    <div class="col-6">
                        <FloatLabel>
                            <InputText v-model="editAddon.name"
                                disabled
                            />
                            <label>Addon</label>
                        </FloatLabel>
                        
                    </div>
                    <div class="col-6">
                        <FloatLabel>
                            <InputNumber v-model="editAddon.price"                             
                            mode="currency" 
                            currency="JPY" 
                            locale="ja-JP" 
                            />
                            <label>Price</label>
                        </FloatLabel>
                    </div>
                </div>
                <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 gap-y-6 pt-6">
                        <div class="col-6">
                            <FloatLabel>
                                <label for="dateStart">Start Date</label>                
                                <DatePicker v-model="editAddon.date_start" 
                                    dateFormat="yy-mm-dd"
                                    class="w-full"
                                    required 
                                />
                            </FloatLabel>                
                        </div>
                        <div class="col-6">
                            <FloatLabel>
                                <label for="dateEnd">End Date</label>
                                <DatePicker v-model="editAddon.date_end"
                                    dateFormat="yy-mm-dd"
                                    class="w-full"  
                                />
                            </FloatLabel>                
                        </div>
                    </div>

                <template #footer>                    
                    <Button label="Update" icon="pi pi-check" @click="updateAddon" class="p-button-success p-button-text p-button-sm" />
                    <Button label="Close" icon="pi pi-times" @click="showEditAddonDialog = false" class="p-button-danger p-button-text p-button-sm" />
                </template>
            </Dialog>
        </div>
    </div>
    <div v-else>
        <p>Loading... or not!</p>
    </div>
</template>

<script>
    import { ref, watch, computed, onMounted } from 'vue';
    import { useToast } from 'primevue/usetoast';

    import Button from 'primevue/button';
    import Dialog from 'primevue/dialog';
    import FloatLabel from 'primevue/floatlabel';
    import Select from 'primevue/select';
    import InputNumber from 'primevue/inputnumber';
    import InputText from 'primevue/inputtext';
    import DatePicker from 'primevue/datepicker';
    import Accordion from 'primevue/accordion';
    import AccordionPanel from 'primevue/accordionpanel';
    import AccordionHeader from 'primevue/accordionheader';
    import AccordionContent from 'primevue/accordioncontent';
    import DataTable from 'primevue/datatable';
    import Column from 'primevue/column';

    export default {
        name: 'ManagePlanAddon',        
        props: {
            plan:{
                type: Object,
                required: true,
            },                
        },   
        emits: ['update-filtered-conditions'],     
        components: {
            Button,
            Dialog,
            FloatLabel,            
            Select,
            InputNumber,
            InputText,
            DatePicker,
            Accordion,
            AccordionPanel,
            AccordionHeader,
            AccordionContent,
            DataTable,
            Column,
        },
        setup(props, { emit }) {
            const toast = useToast();
            const planInfo = ref({
                plans_global_id: props.plan.plans_global_id,
                plans_hotel_id: props.plan.plans_hotel_id,
                hotel_id: props.plan.hotel_id,
                date: props.plan.date,
            });            
            const newAddon = ref({ 
                hotel_id: null,
                plans_global_id: null,
                plans_hotel_id: null,
                addons_id: null,
                date_start: new Date().toISOString().split('T')[0],
                date_end: null,
                price: 0,                
            });
            const editAddon = ref({ 
                id: null,                
                price: 0,
                date_start: null,
                date_end: null,
            }); 
            const allAddons = ref([]);
            const planAddons = ref([]);
            const showAddonDialog = ref(false);
            const showEditAddonDialog = ref(false);

            const openAddonDialog = () => {

                newAddon.value.plans_global_id = props.plan.plans_global_id;
                newAddon.value.plans_hotel_id = props.plan.plans_hotel_id;
                newAddon.value.hotel_id = props.plan.hotel_id;
                
                fetchAllAddons();
                showAddonDialog.value = true;
            };            
            const openEditAddonDialog = (addonData) => {
                // Populate the editAdjustment with the selected row data
                editAddon.value = { ...addonData };
                showEditAddonDialog.value = true; // Open the dialog
            };
            const fetchAllAddons = async () => {        
                const hotel_id = planInfo.value.hotel_id;
                
                try {
                    const authToken = localStorage.getItem('authToken')
                    const response = await fetch(`/api/addons/all/${hotel_id}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json'
                        }
                    })
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`)
                    }
                    const data = await response.json()
                    allAddons.value = data
                    //console.log('Fetched Global Addons:', allAddons.value);
                } catch (err) {
                    console.error('Error fetching global addons:', err)
                    err.value = err.message || 'Failed to fetch global addons'
                } finally {
                }
            };
            const fetchPlanAddons = async () => {
                const formatDate = (date) => {
                    if (!date) return null; // Handle null values
                    const d = new Date(date);
                    const yy = String(d.getFullYear());
                    const mm = String(d.getMonth() + 1).padStart(2, '0'); // Month (01-12)
                    const dd = String(d.getDate()).padStart(2, '0'); // Day (01-31)
                    return `${yy}-${mm}-${dd}`;
                };

                try {
                    const authToken = localStorage.getItem('authToken');
                    const response = await fetch(`/api/plans/${planInfo.value.plans_global_id}/${planInfo.value.plans_hotel_id}/${planInfo.value.hotel_id}/addons`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json',
                        }
                    });

                    if (!response.ok) {
                        throw new Error('Failed to fetch addons');
                    }

                    const data = await response.json();
                    planAddons.value = data.map(addon => ({
                        ...addon,
                        date_start: formatDate(addon.date_start),
                        date_end: formatDate(addon.date_end)
                    }));
                    sendFilteredConditions();
                } catch (error) {
                    console.error('Error fetching addons:', error);
                }
            };

            const addAddon = async () => {
                // Validation
                    if (newAddon.value.date_end && new Date(newAddon.value.date_end) < new Date(newAddon.value.date_start)) {                    
                        toast.add({ 
                            severity: 'error', 
                            summary: 'Error', 
                            detail: 'End date must be equal to or greater than start date.', life: 3000 
                        });
                        return;
                    }
                // Conversion from Datetime to Date
                    const formatDate = (date) => {
                        if (!date) return null;
                        const d = new Date(date);
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                    };
                    const formattedAdjustment = {
                        ...newAddon.value,
                        date_start: formatDate(newAddon.value.date_start),
                        date_end: formatDate(newAddon.value.date_end),
                    };

                try {
                    const authToken = localStorage.getItem('authToken');
                    const response = await fetch(`/api/plans/addons`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(formattedAdjustment),
                    });
                    if (!response.ok) {
                        throw new Error('Failed to save addon');
                    } 

                    fetchPlanAddons();
                    showAddonDialog.value = false;
                    newAddon.value = {
                        hotel_id: null,
                        plans_global_id: null,
                        plans_hotel_id: null,
                        addons_id: null,
                        date_start: new Date().toISOString().split('T')[0],
                        date_end: null,
                        price: 0,
                    };

                    toast.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Addon created successfully',
                        life: 3000
                    });
                } catch (error) {
                    console.error('Error saving adjustment:', error);
                }

            }
            const updateAddon = async () => {
                // Validation
                if (editAddon.value.date_end && new Date(editAddon.value.date_end) < new Date(editAddon.value.date_start)) {
                    toast.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'End date must be equal to or greater than start date.',
                        life: 3000
                    });
                    return;
                };                

                // Conversion from Datetime to Date
                const formatDate = (date) => {
                    if (!date) return null;
                    const d = new Date(date);
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                };

                const formattedAdjustment = {
                    ...editAddon.value,
                    date_start: formatDate(editAddon.value.date_start),
                    date_end: formatDate(editAddon.value.date_end),
                };

                try {
                    const authToken = localStorage.getItem('authToken');
                    const response = await fetch(`/api/plans/addons/${editAddon.value.id}`, {  
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(formattedAdjustment),
                    });

                    if (!response.ok) {
                        throw new Error('Failed to update adjustment');
                    }

                    fetchPlanAddons(); // Refresh the rates
                    showEditAddonDialog.value = false; // Close the dialog
                    editAddon.value = {
                        id: null,                
                        price: 0,
                        date_start: null,
                        date_end: null,
                    };

                    toast.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Addon updated successfully',
                        life: 3000
                    });
                } catch (error) {
                    console.error('Error updating addon:', error);
                    toast.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'An error occurred while updating the addon.',
                        life: 3000
                    });
                }
            };

            onMounted(fetchPlanAddons);            

            // Computed 
            const selectAddons = computed({
                get() {
                    return newAddon.value.addons_hotel_id ? null : newAddon.value.addons_global_id;
                },
                set(value) {
                    if (newAddon.value.addons_hotel_id) {
                    newAddon.value.addons_hotel_id = value;
                    } else {
                    newAddon.value.addons_global_id = value;
                    }
                },
            });

            const filteredCurrentConditions = computed(() => {
                const selectedDate = planInfo.value.date;                
                if (!selectedDate) return null;

                // Normalized date
                const selectedDateObj = new Date(selectedDate);
                selectedDateObj.setHours(0, 0, 0, 0);

                return planAddons.value
                    .filter(condition => {                    
                        const startDate = new Date(condition.date_start);
                        startDate.setHours(0, 0, 0, 0);                        
                        const endDate = condition.date_end ? new Date(condition.date_end) : null;
                        if (endDate) endDate.setHours(0, 0, 0, 0);                        
                        return selectedDateObj >= startDate && (endDate ? selectedDateObj <= endDate : true);
                    });
            });
            const filteredFutureConditions = computed(() => {
                const selectedDate = planInfo.value.date;
                if (!selectedDate) return null;
                
                // Normalized date
                const selectedDateObj = new Date(selectedDate);
                selectedDateObj.setHours(0, 0, 0, 0);

                return planAddons.value
                    .filter(condition => {
                        const startDate = new Date(condition.date_start);
                        startDate.setHours(0, 0, 0, 0);                        
                        return startDate > selectedDateObj;
                });

                
            });
            const filteredPastConditions = computed(() => {
                const selectedDate = planInfo.value.date;
                if (!selectedDate) return null;

                // Normalized date
                const selectedDateObj = new Date(selectedDate);
                selectedDateObj.setHours(0, 0, 0, 0);

                return planAddons.value
                    .filter(condition => {
                        const startDate = new Date(condition.date_start);
                        startDate.setHours(0, 0, 0, 0);
                        const endDate = condition.date_end ? new Date(condition.date_end) : null;
                        if (endDate) endDate.setHours(0, 0, 0, 0);
                        return startDate < selectedDateObj && endDate != null;
                    });
            });

            const sendFilteredConditions = () => {
                console.log("Sending filtered conditions:", filteredCurrentConditions.value);
                emit('update-filtered-conditions', filteredCurrentConditions.value);
            };
            
            // Watcher
            /*
            watch(newAddon, (newValue, oldValue) => {
                console.log('newAddon changed:', newValue);            
            }, { deep: true });            
            watch(planAddons, (newValue, oldValue) => {
                console.log('planAddons changed:', newValue);            
            }, { deep: true });            
            watch(filteredCurrentConditions, (newValue, oldValue) => {
                console.log('filteredCurrentConditions changed:', newValue);            
            }, { deep: true });
            */
            return {
                planInfo,
                newAddon,
                editAddon,
                allAddons,
                showAddonDialog, 
                showEditAddonDialog,               
                openAddonDialog,
                openEditAddonDialog,
                addAddon,
                updateAddon,
                selectAddons,
                filteredCurrentConditions,
                filteredFutureConditions,
                filteredPastConditions,
                sendFilteredConditions,
            };
        },
        methods: {
            onAddonChange() {                
                const selectedAddon = this.allAddons.find(addon => addon.id === this.newAddon.addons_id);
                if (selectedAddon) {
                    this.newAddon.price = selectedAddon.price;  // Update the price field
                }
            },
            formatNumber(value, style) {
                if(style === 'currency'){
                    return new Intl.NumberFormat('ja-JP', {
                        style: 'currency',
                        currency: 'JPY',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }).format(value);
                }
                if(style === 'decimal'){
                    return new Intl.NumberFormat('ja-JP', {
                        style: 'decimal',
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2
                    }).format(value);
                }                
            },
        },
    }
        
</script>
