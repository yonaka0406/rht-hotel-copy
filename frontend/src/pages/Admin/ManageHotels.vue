<template>
  <div class="p-4 max-w-7xl mx-auto">
    <Stepper value="1">
      <StepList>
          <Step value="1">Hotel Info</Step>
          <Step value="2">Room Type</Step>
          <Step value="3">Rooms</Step>
      </StepList>
      <StepPanels>
        <StepPanel v-slot="{ activateCallback }" value="1">
          <div class="flex flex-col">
              <div class="border-2 border-dashed border-surface-200 dark:border-surface-700 rounded bg-surface-50 dark:bg-surface-950 flex-auto flex justify-center items-center font-medium">
                <Card class="m-2">
                  <template #title>Basic Hotel Information</template>
                  <template #content>
                    
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div class="flex flex-col">
                          <label class="mb-2 font-medium">Formal Name *</label>
                          <InputText 
                            v-model="hotel.formal_name"
                            class="p-inputtext-sm" 
                            required
                          />
                        </div>
                        <div class="flex flex-col">
                          <label class="mb-2 font-medium">Display Name *</label>
                          <InputText 
                            v-model="hotel.name"
                            class="p-inputtext-sm"
                            required
                          />
                        </div>
                        <div class="flex flex-col">
                          <label class="mb-2 font-medium">Facility Type *</label>
                          <Select
                            v-model="hotel.facility_type"
                            :options="facilityTypes"
                            optionLabel="name"
                            class="w-full"
                            required
                          />
                        </div>
                        <div class="flex flex-col">
                          <label class="mb-2 font-medium">Opening Date *</label>
                          <DatePicker 
                            v-model="hotel.open_date"
                            dateFormat="yy-mm-dd"
                            class="w-full"                            
                            required
                          />
                        </div>
                        <div class="flex flex-col">
                          <label class="mb-2 font-medium">Email *</label>
                          <InputText 
                            v-model="hotel.email"
                            type="email"
                            class="p-inputtext-sm"
                            required
                          />
                        </div>
                        <div class="flex flex-col">
                          <label class="mb-2 font-medium">Phone Number *</label>
                          <InputMask
                            v-model="hotel.phone_number"
                            mask="(999) 999-9999"
                            class="p-inputtext-sm"
                            required
                          />
                        </div>
                        <div class="flex flex-col">
                          <label class="mb-2 font-medium">Postal Code *</label>
                          <InputMask
                            v-model="hotel.postal_code"
                            mask="999-9999"
                            class="p-inputtext-sm"
                            required
                          />
                        </div>
                        <div class="flex flex-col">
                          <label class="mb-2 font-medium">Address *</label>
                          <InputText 
                            v-model="hotel.address"
                            class="p-inputtext-sm"
                            required
                            fluid
                          />
                        </div>
                      </div>
                  </template>
                </Card>
              </div>
          </div>
          <div class="flex p-3 justify-end">
              <Button label="Next" icon="pi pi-arrow-right" iconPos="right" @click="activateCallback('2')" />
          </div>
        </StepPanel>

        <StepPanel v-slot="{ activateCallback }" value="2">
          <div class="flex flex-col">
              <div class="border-2 border-dashed border-surface-200 dark:border-surface-700 rounded bg-surface-50 dark:bg-surface-950 flex-auto flex justify-center items-center font-medium">
                <Card class="m-2">
                  <template #title>
                    <div class="flex justify-between items-center">
                      <span>Room Types</span>
                      <Button 
                        label="Add Room Type"
                        icon="pi pi-plus"
                        @click="openRoomTypeDialog"
                        class="p-button-sm m-2"
                      />
                    </div>
                  </template>
                  <template #content>
                    <DataTable 
                      :value="roomTypes"
                      responsiveLayout="scroll"
                      class="p-datatable-sm"
                    >
                      <Column field="name" header="Name"></Column>

                      <Column header="Actions">
                        <template #body="slotProps">
                          <Button 
                            icon="pi pi-pencil"
                            class="p-button-text p-button-sm"
                            @click="editRoomType(slotProps.data)"
                          />
                          <ConfirmDialog></ConfirmDialog>
                          <Button 
                            icon="pi pi-trash"
                            class="p-button-text p-button-danger p-button-sm"
                            @click="deleteRoomType(slotProps.data)"
                          />
                        </template>
                      </Column>

                    </DataTable>
                  </template>
                </Card>
              </div>
              <div class="flex p-3 justify-between">
                  <Button label="Back" severity="secondary" icon="pi pi-arrow-left" @click="activateCallback('1')" />
                  <Button label="Next" icon="pi pi-arrow-right" iconPos="right" @click="activateCallback('3')" />
              </div>
          </div>
        </StepPanel>

        <StepPanel v-slot="{ activateCallback }" value="3">
          <div class="flex flex-col">
              <div class="border-2 border-dashed border-surface-200 dark:border-surface-700 rounded bg-surface-50 dark:bg-surface-950 flex-auto flex justify-center items-center font-medium">
                
                <div class="flex flex-col">
                  <Card class="m-2">
                    <template #title>Rooms</template>
                    <template #content>
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div class="flex flex-col">
                            <label class="mb-2 font-medium">Floor Number</label>
                            <InputNumber v-model="roomGenerator.floor" :min="1" />
                          </div>
                          <div class="flex flex-col">
                            <label class="mb-2 font-medium">Rooms per Floor</label>
                            <InputNumber v-model="roomGenerator.roomsPerFloor" :min="1" />
                          </div>
                          <div class="flex flex-col">
                            <label class="mb-2 font-medium">Start Room Number</label>
                            <InputNumber v-model="roomGenerator.startNumber" :min="1" />
                          </div>
                          <div class="flex flex-col">
                            <label class="mb-2 font-medium">Room Number Step</label>
                            <InputNumber v-model="roomGenerator.step" :min="1" />
                          </div>
                          <div class="flex flex-col">
                            <label for="roomTypeSelect">Select Room Type:</label>
                            <Select 
                              id="roomTypeSelect" 
                              v-model="roomGenerator.room_type" 
                              :options="roomTypes" 
                              optionLabel="name" 
                              placeholder="Select a Room Type"
                            />
                          </div>
                          <div class="flex flex-col">
                            <label class="mb-2 font-medium">Capacity</label>
                            <InputNumber v-model="roomGenerator.capacity" :min="1" />
                          </div>
                          <div class="flex flex-col">
                            <label class="mb-2 font-medium">Smoking</label>
                            <div class="flex items-center justify-center">
                              <Checkbox v-model="roomGenerator.smoking" binary />
                            </div>                            
                          </div>
                          <div class="flex flex-col">
                            <label class="mb-2 font-medium">For Sale</label>
                            <div class="flex items-center justify-center">
                              <Checkbox v-model="roomGenerator.for_sale" binary />
                            </div>                            
                          </div>
                      </div>
                      <div class="flex justify-end mt-4">
                        <Button label="Add Rooms" @click="generateRoomPreview" />
                      </div>
                    </template>
                  </Card>

                  <Card v-if="generatedRooms.length">
                    <template #title>
                      <div class="flex justify-between items-center">
                        <span>Generated Rooms Preview</span>
                        <Button label="Clear Preview" icon="pi pi-times" @click="clearRoomPreview" class="p-button-danger" />
                      </div>
                    </template>
                    <template #content>
                      <div class="generated-rooms-preview">
                        <Accordion :activeIndex="0">
                          <AccordionPanel 
                            v-for="(rooms, floor) in groupedRoomsByFloor" 
                            :key="floor" 
                            :value="floor"
                          >
                            <AccordionHeader> 
                              Floor {{ floor }} 
                              <Badge                                  
                                  class="ml-2"
                                  :value="rooms.length"
                                  severity="info"
                              />
                            </AccordionHeader>
                            <AccordionContent>
                              <DataTable 
                                :value="rooms" 
                                editMode="cell" 
                                class="p-datatable-sm"
                                @cell-edit-complete="onCellEditComplete"
                              >
                                <Column field="room_number" header="Room Number">
                                  <template #editor="slotProps">
                                    <InputText v-model="slotProps.data.room_number" />
                                  </template>
                                </Column>
                                <Column field="room_type" header="Room Type">
                                  <template #editor="slotProps">
                                    <Select 
                                      id="roomTypeSelect" 
                                      v-model="slotProps.data.room_type" 
                                      :options="roomTypes" 
                                      optionLabel="name" 
                                      optionValue="name"
                                      placeholder="Select a Room Type"
                                    />
                                  </template>
                                </Column>
                                <Column field="capacity" header="Capacity">
                                  <template #editor="slotProps">
                                    <InputNumber v-model="slotProps.data.capacity" :min="1" />
                                  </template>
                                </Column>
                                <Column field="smoking" header="Smoking">
                                  <template #body="slotProps">
                                    <div class="flex items-center justify-center">
                                      <Checkbox v-model="slotProps.data.smoking" binary />
                                    </div>
                                  </template>
                                  <template #editor="slotProps">
                                    <div class="flex items-center justify-center">
                                      <Checkbox v-model="slotProps.data.smoking" binary />
                                    </div>                                    
                                  </template>
                                </Column>
                                <Column field="for_sale" header="For Sale">
                                  <template #body="slotProps">
                                    <div class="flex items-center justify-center">
                                      <Checkbox v-model="slotProps.data.for_sale" binary />
                                    </div>                                    
                                  </template>
                                  <template #editor="slotProps">
                                    <div class="flex items-center justify-center">
                                      <Checkbox v-model="slotProps.data.for_sale" binary />
                                    </div>
                                  </template>
                                </Column>
                                <Column header="Actions">
                                  <template #body="slotProps">
                                    <Button                                       
                                      icon="pi pi-trash"
                                      class="p-button-text p-button-danger p-button-sm"
                                      @click="deleteRoom(slotProps.data)" 
                                    />
                                  </template>
                                </Column>
                              </DataTable>
                            </AccordionContent>
                            
                          </AccordionPanel>
                        </Accordion>
                      </div>
                    </template>
                  </Card>
                </div>
              </div>
          </div>

          <div class="p-3 flex justify-between">
            <Button label="Back" severity="secondary" icon="pi pi-arrow-left" @click="activateCallback('2')" />
            <Button label="Create Hotel" severity="primary" icon="pi pi-check" @click="saveHotelData" />
          </div>
        </StepPanel>

      </StepPanels>
    </Stepper>
  </div>
  
  <Dialog 
    v-model:visible="roomTypeDialog" 
    :modal="true"
    header="Add Room Type"
    :style="{ width: '450px' }"
    class="p-fluid"
    @hide="closeRoomTypeDialog"
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-col">
        <label for="name" class="font-medium mb-2 block">Room Type Name *</label>
        <InputText 
          id="name"
          v-model="newRoomType.name" 
          required
          autofocus
          fluid
        />
      </div>

      <div class="flex flex-col">
        <label for="description" class="font-medium mb-2 block">Description</label>
        <Textarea 
          id="description"
          v-model="newRoomType.description" 
          rows="3"
          autoResize
          fluid
        />
      </div>
      
    </div>

    <template #footer>
      <Button 
        label="Cancel" 
        icon="pi pi-times" 
        @click="closeRoomTypeDialog"
        text 
      />
      <Button 
        label="Save" 
        icon="pi pi-check" 
        @click="saveRoomType" 
        :loading="saving"
      />
    </template>
  </Dialog>
    
</template>

<script setup>
  import { ref, reactive, computed, watch } from 'vue';
  import { useRouter } from 'vue-router';
  // Primevue  
    import { useToast } from 'primevue/usetoast';
    import { useConfirm } from "primevue/useconfirm";
    import Card from 'primevue/card';
    import Button from 'primevue/button';
    import InputText from 'primevue/inputtext';
    import Select from 'primevue/select';
    import InputMask from 'primevue/inputmask';
    import DataTable from 'primevue/datatable';
    import Column from 'primevue/column';
    import DatePicker from 'primevue/datepicker';
    import Dialog from 'primevue/dialog';
    import Textarea from 'primevue/textarea';
    import InputNumber from 'primevue/inputnumber';
    import ConfirmDialog from 'primevue/confirmdialog';
    import Stepper from 'primevue/stepper';
    import StepList from 'primevue/steplist';
    import StepPanels from 'primevue/steppanels';
    import StepItem from 'primevue/stepitem';
    import Step from 'primevue/step';
    import StepPanel from 'primevue/steppanel';
    import Accordion from 'primevue/accordion';
    import AccordionPanel from 'primevue/accordionpanel';
    import AccordionHeader from 'primevue/accordionheader';
    import AccordionContent from 'primevue/accordioncontent';
    import Badge from 'primevue/badge';
    import Checkbox from 'primevue/checkbox';

  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const frontendUrl = import.meta.env.VITE_FRONTEND_URL;  
  const currentStep = ref('1');
  const loading = ref(false);
  const roomTypeDialog = ref(false);
  const saving = ref(false);
  const editingRoomType = ref(null);

  const hotel = reactive({
    formal_name: '',
    name: '',
    facility_type: null,
    open_date: new Date().toISOString().split('T')[0],
    total_rooms: 0,
    postal_code: '',
    address: '',
    email: '',
    phone_number: ''    
  });
  const facilityTypes = [
    { name: 'New Building', code: 'New' },
    { name: 'Used Building', code: 'Used' }
  ];

  const roomTypes = ref([]);
  const newRoomType = reactive({
    name: '',
    description: ''
  });

  const roomGenerator = ref({
    floor: 1,
    roomsPerFloor: 1,
    startNumber: 1,
    step: 1,
    room_type: null,
    capacity: 1,
    smoking: false,
    for_sale: true
  });
  const generatedRooms = ref([]);

  // Room Types

  const openRoomTypeDialog = () => {
    Object.assign(newRoomType, {
      name: '',
      description: ''
    });
    roomTypeDialog.value = true;
  };

  const closeRoomTypeDialog = () => {
    roomTypeDialog.value = false;
  };

  const saveRoomType = async () => {
    // Validation
    if (!newRoomType.name) {
      toast.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Name is required',
        life: 3000
      });
      return;
    }

    try {
      saving.value = true;
      if (editingRoomType.value) {
        // Update existing
        const index = roomTypes.value.findIndex(rt => rt === editingRoomType.value);
        if (index !== -1) {
          roomTypes.value[index] = {
            ...editingRoomType.value,
            ...newRoomType,
            updated_at: new Date().toISOString()
          };
        }
      } else {
        // Add new
        roomTypes.value.push({
          ...newRoomType,
          created_at: new Date().toISOString()
        });
      }
      
      roomTypeDialog.value = false;
      editingRoomType.value = null;

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Room type added successfully',
        life: 3000
      });
    } catch (error) {
      let errorMessage = 'Failed to add room type';
      if (error.code === '23505') { // PostgreSQL unique violation
        errorMessage = 'Room type name already exists';
      }
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
        life: 3000
      });
    } finally {
      saving.value = false;
    }
  };

  const editRoomType = (roomType) => {
    editingRoomType.value = roomType;
    Object.assign(newRoomType, {
      name: roomType.name,
      description: roomType.description
    });
    roomTypeDialog.value = true;
  };

  const deleteRoomType = async (roomType) => {
    confirm.require({
      message: 'Are you sure you want to delete this room type?',
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          const index = roomTypes.value.findIndex(rt => rt.name === roomType.name);
          if (index !== -1) {
            roomTypes.value.splice(index, 1);
            toast.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Room type deleted successfully',
              life: 3000
            });
          }
        } catch (error) {
          toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to delete room type',
            life: 3000
          });
        }
      }
    });
  };

  // Rooms

  const generateRoomPreview = () => {    
    // Loop through the room generator values
    const floor = roomGenerator.value.floor;
    if (!roomGenerator.value.room_type) {
      toast.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please select a room type before generating the preview.',
        life: 3000
      });
      return;
    }
        
    for (let i = 0; i < roomGenerator.value.roomsPerFloor; i++) {
      const roomNumber = parseInt(roomGenerator.value.startNumber) + i * roomGenerator.value.step;

      const newRoomNumber = `${floor}${roomNumber.toString().padStart(2, '0')}`;
      // Check if the room number already exists
      const roomExists = generatedRooms.value.some(room => room.room_number === newRoomNumber);

      if (!roomExists) {
        generatedRooms.value.push({
          floor,
          room_number: newRoomNumber,
          room_type: roomGenerator.value.room_type.name,
          room_type_id: 0,
          capacity: roomGenerator.value.capacity,
          smoking: roomGenerator.value.smoking,
          for_sale: roomGenerator.value.for_sale
        });
      }else {        
        toast.add({
          severity: 'error',
          summary: 'Validation Error',
          detail: 'Room number ' + newRoomNumber + ' already exists and will not be added again.',
          life: 3000
        });        
      }
    }   

  };

  const clearRoomPreview = () => {
    generatedRooms.value = [];
  };

  const deleteRoom = (room) => {
    const index = generatedRooms.value.indexOf(room);
    if (index !== -1) {
      generatedRooms.value.splice(index, 1);
    }
  };

  // Validation

  const validateStep = () => {
    
    const hotelFieldsFilled = Object.values(hotel).every(value => value !== null && value !== '');    

    if (!hotelFieldsFilled) {
      toast.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please fill in all hotel fields.',
        life: 3000
      });
      return false;
    }
    
    const roomTypesFilled = roomTypes.value.length > 0;

    if (!roomTypesFilled) {
      toast.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please add at least one room type.',
        life: 3000
      });
      return false;
    }

    const generatedRoomsFilled = generatedRooms.value.length > 0;

    if (!generatedRoomsFilled) {
      toast.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please generate at least one room.',
        life: 3000
      });
      return false;
    }

    return true;
  };

  const showError = (message) => {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
      life: 3000
    });
  };

  const activateCallback = async (newStep) => {
    currentStep.value = newStep;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Save Data

  const saveHotelData = async () => {
    if (!validateStep()) {
      return;
    }

    const authToken = localStorage.getItem('authToken');

    // Conversion from Datetime to Date
    let selectedDate = hotel.open_date;    
    if (selectedDate instanceof Date) {      
      selectedDate = selectedDate.toLocaleDateString('ja-JP');
    }
    hotel.open_date = selectedDate;

    try {
      const hotelResponse = await fetch('/api/hotels', {
        method: 'POST',        
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(hotel)
      });

      if (!hotelResponse.ok) throw new Error('Failed to create hotel');
      
      const hotelData = await hotelResponse.json();      
      
      for (const roomType of roomTypes.value) {
        await fetch('/api/room-types', {
          method: 'POST',
          headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...roomType,
            hotel_id: hotelData.id
          })
        });
      }
      
      for (const room of generatedRooms.value) {
        await fetch('/api/rooms', {
          method: 'POST',
          headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...room,
            hotel_id: hotelData.id
          })
        });
      }
      
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Hotel created successfully',
        life: 3000
      });

      // Redirect to the hotel edit page      
      router.push('/admin/hotel-edit');
      
      return hotelData;
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'An error occured.',
        life: 3000
      });
      throw new Error('Error saving hotel: ' + error.message);      
    }
  };

// Functions
  function onCellEditComplete(event) {
    const { data, newValue, field } = event;
    if (field) {
      data[field] = newValue; // Update the specific field with the new value
    }
  }

// Computed property to group rooms by floor
  const groupedRoomsByFloor = computed(() => {
    return generatedRooms.value.reduce((acc, room) => {
      const floor = room.floor || 'Unknown';
      if (!acc[floor]) {
        acc[floor] = [];
      }
      acc[floor].push(room);
      return acc;
    }, {});
  });

  watch(
    () => hotel.open_date,
    (newVal, oldVal) => {
      console.log('hotel changed from', oldVal, 'to', newVal);

      // If the date is already a Date object, format it to YYYY-MM-DD
      if (newVal instanceof Date) {
        let selectedDate = newVal.toLocaleDateString('ja-JP'); 
        hotel.open_date = selectedDate;
      }

      console.log('Formatted hotel.open_date:', hotel.open_date); // Verify the correct format
    }
  );
// Watchers
/*
  

  watch(roomTypes, (newVal, oldVal) => {
    console.log('roomTypes changed from', oldVal, 'to', newVal);
  });

  watch(generatedRooms, (newVal, oldVal) => {
    console.log('generatedRooms changed from', oldVal, 'to', newVal);
  });
*/
</script>

<style scoped>
.fade-in {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>