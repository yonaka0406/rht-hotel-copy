<template>
  <div class="p-4">
    <Panel header="Edit Hotels">
      <DataTable :value="hotels" class="p-datatable-sm" responsiveLayout="scroll">
        <Column field="formal_name" header="Formal Name"></Column>
        <Column field="name" header="Name"></Column>
        <Column field="email" header="Email"></Column>
        <Column field="phone_number" header="Phone Number"></Column>
        <Column header="Actions">
          <template #body="slotProps">
            <Button 
              icon="pi pi-pencil" 
              class="p-button-text p-button-sm" 
              @click="editHotel(slotProps.data)"
              v-tooltip="'Edit Hotel'"
            />
            <Button 
              icon="pi pi-tag" 
              class="p-button-text p-button-sm" 
              @click="editRoomTypes(slotProps.data)" 
              v-tooltip="'Edit Room Types'"
            />
            <Button 
              icon="pi pi-eye" 
              class="p-button-text p-button-sm" 
              @click="editRooms(slotProps.data)" 
              v-tooltip="'View Rooms'"
            />
          </template>
        </Column>
      </DataTable>
    </Panel>
  </div>
  <div class="p-4 max-w-7xl mx-auto">
    <Dialog v-model:visible="dialogVisible" :modal="true" header="Edit Hotel" :style="{ width: '450px' }" class="p-fluid">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col">
          <label for="email" class="font-medium mb-2 block">Formal Name</label>
          <InputText id="formal_name" v-model="selectedHotel.formal_name" required />
        </div>
        <div class="flex flex-col">
          <label for="email" class="font-medium mb-2 block">Name</label>
          <InputText id="name" v-model="selectedHotel.name" required />
        </div>
        <div class="flex flex-col">
          <label for="email" class="font-medium mb-2 block">Email</label>
          <InputText id="email" v-model="selectedHotel.email" required />
        </div>
        <div class="flex flex-col">
          <label for="phone_number" class="font-medium mb-2 block">Phone Number</label>
          <InputMask id="phone_number" v-model="selectedHotel.phone_number" mask="(999) 999-9999" required />
        </div>
        <div class="flex flex-col">
          <label for="latitude" class="font-medium mb-2 block">Latitude</label>
          <InputNumber id="latitude" v-model="selectedHotel.latitude" :minFractionDigits="6" />
        </div>
        <div class="flex flex-col">
          <label for="longitude" class="font-medium mb-2 block">Longitude</label>
          <InputNumber id="longitude" v-model="selectedHotel.longitude" :minFractionDigits="6" />
        </div>
      </div>
      <template #footer>
        <Button label="Save" icon="pi pi-check" @click="saveHotel" class="p-button-success p-button-text p-button-sm" />
        <Button label="Cancel" icon="pi pi-times" @click="dialogVisible = false" class="p-button-danger p-button-text p-button-sm" text />        
      </template>
    </Dialog>

    <Dialog v-model:visible="roomTypesDialogVisible" :modal="true" header="Edit Room Types" :style="{ width: '600px' }" class="p-fluid">
      <template #header>
        <h2 class="text-lg font-bold ">Edit Room Types</h2>
        <Button 
          label="Add Room Type"
          icon="pi pi-plus"
          @click="openRoomTypeDialog"
          class="p-button-sm m-2"
        />
      </template>
      <p>Make sure to press ENTER or TAB to confirm the changes before saving.</p><br/>
      <DataTable 
        ref="roomTypesDataTable"
        :value="roomTypes"
        editable
        editMode="cell"
        class="p-datatable-sm"
        responsiveLayout="scroll"
        @cell-edit-complete="onCellEditComplete"
      >
        <Column field="name" header="Name">
          <template #editor="slotProps">
            <InputText v-model="slotProps.data.name" />
          </template>
        </Column>
        <Column field="description" header="Description">
          <template #editor="slotProps">
            <Textarea v-model="slotProps.data.description" autoResize />
          </template>
        </Column>
      </DataTable>
      <template #footer>
        <Button label="Save Changes" icon="pi pi-check" @click="saveRoomTypes" class="p-button-success p-button-text p-button-sm" />
        <Button label="Close" icon="pi pi-times" @click="roomTypesDialogVisible = false" class="p-button-danger p-button-text p-button-sm" />
      </template>
    </Dialog>

    <Dialog v-model:visible="roomTypeDialog" :modal="true" header="Add Room Type" :style="{ width: '450px' }" class="p-fluid">
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
        <Button label="Add" icon="pi pi-plus" @click="saveRoomType" class="p-button-success p-button-text p-button-sm" />
        <Button label="Close" icon="pi pi-times" @click="roomTypeDialog = false" class="p-button-danger p-button-text p-button-sm" />
      </template>
    </Dialog>

    <Dialog v-model:visible="roomsDialogVisible" :modal="true" header="Edit Rooms" :style="{ width: '600px' }" class="p-fluid">
      <template #header>
        <h2 class="text-lg font-bold ">Edit Rooms</h2>
        <Button 
          label="Add Room"
          icon="pi pi-plus"
          @click="openRoomDialog"
          class="p-button-sm m-2"
        />
      </template>
      <Accordion :activeIndex="0">
        
        <p>Make sure to press ENTER or TAB to confirm the changes before saving.</p><br/>
        <AccordionPanel
          ref="roomsPanel"
          v-for="roomType in roomTypes"
          :key="roomType.id"          
          :value="roomType.id"
        >          
          <AccordionHeader> 
            Room Type:  {{ roomType.name }}                       
          </AccordionHeader>
          <AccordionContent>
            <DataTable
              :value="rooms.filter(room => room.room_type_id === roomType.id)"
              editMode="cell"
              class="p-datatable-sm"
              responsiveLayout="scroll"
              @cell-edit-complete="onCellEditComplete"
            >
              <Column field="room_number" header="Room Number">
                <template #editor="slotProps">
                  <InputText v-model="slotProps.data.room_number" />
                </template>
              </Column>
              <Column field="room_type_id" header="Room Type">
                <template #body="slotProps">
                  <span>{{ roomTypes.find(rt => rt.id === slotProps.data.room_type_id)?.name }}</span>
                </template>
                <template #editor="slotProps">
                  <Select                      
                    v-model="slotProps.data.room_type_id" 
                    :options="roomTypes" 
                    optionLabel="name" 
                    optionValue="id"
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
            </DataTable>
          </AccordionContent>          
        </AccordionPanel>
      </Accordion>

      <template #footer>
        <Button label="Save Changes" icon="pi pi-check" @click="saveRoomChanges" class="p-button-success p-button-text p-button-sm" />
        <Button label="Close" icon="pi pi-times" @click="roomsDialogVisible = false" class="p-button-danger p-button-text p-button-sm" text />
      </template>      
    </Dialog>
    
    <Dialog v-model:visible="roomDialog" :modal="true" header="Add Room" :style="{ width: '450px' }" class="p-fluid">
      <div class="grid xs:grid-cols-1 grid-cols-2 gap-4">
        <div class="col-6">
          <label for="floor" class="font-medium mb-2 block">Floor *</label>
          <InputNumber id="floor" v-model="newRoom.floor" :min="1" required />
        </div>
        <div class="col-6">
          <label for="room_number" class="font-medium mb-2 block">Room Number *</label>
          <InputText id="room_number" v-model="newRoom.room_number" required />
        </div>
        <div class="col-6">
          <label for="room_type_id" class="font-medium mb-2 block">Room Type *</label>
          <Select id="room_type_id" v-model="newRoom.room_type_id" :options="roomTypes" optionLabel="name" optionValue="id" placeholder="Select a Room Type" required />
        </div>
        <div class="col-6">
          <label for="capacity" class="font-medium mb-2 block">Capacity *</label>
          <InputNumber id="capacity" v-model="newRoom.capacity" :min="1" required />
        </div>
        <div class="col-6">
          <label for="smoking" class="font-medium mb-2 block">Smoking</label>
          <Checkbox id="smoking" v-model="newRoom.smoking" binary />
        </div>
        <div class="col-6">
          <label for="for_sale" class="font-medium mb-2 block">For Sale</label>
          <Checkbox id="for_sale" v-model="newRoom.for_sale" binary />
        </div>
      </div>
      <template #footer>
        <Button label="Add" icon="pi pi-plus" @click="saveRoom" class="p-button-success p-button-text p-button-sm" />
        <Button label="Cancel" icon="pi pi-times" @click="roomDialog = false" class="p-button-danger p-button-text p-button-sm" />
      </template>
    </Dialog>
  </div>
</template>

<script>
  import { ref, reactive, watch, onMounted } from 'vue';
  import { useToast } from 'primevue/usetoast';  
  import DataTable from 'primevue/datatable';
  import Column from 'primevue/column';
  import Button from 'primevue/button';
  import Dialog from 'primevue/dialog';
  import InputText from 'primevue/inputtext';  
  import InputNumber from 'primevue/inputnumber';
  import InputMask from 'primevue/inputmask';
  import Textarea from 'primevue/textarea';
  import Accordion from 'primevue/accordion';
  import AccordionPanel from 'primevue/accordionpanel';
  import AccordionHeader from 'primevue/accordionheader';
  import AccordionContent from 'primevue/accordioncontent';
  import Checkbox from 'primevue/checkbox';
  import Select from 'primevue/select';
  import Panel from 'primevue/panel';
  
  const authToken = localStorage.getItem('authToken');

  export default {
    name: 'ManageHotel',    
    components: {
      DataTable,
      Column,
      Button,
      Dialog,
      InputText,      
      InputNumber,
      InputMask,
      Textarea,
      Accordion,
      AccordionPanel,
      AccordionHeader,
      AccordionContent,
      Checkbox,
      Select,
      Panel,
    },
    setup() {
      const toast = useToast();
      const hotels = ref([]);
      const roomTypes = ref([]);
      const newRoomType = reactive({
        name: '',
        description: ''
      });
      const rooms = ref([]);
      const newRoom = reactive({
        floor: 1,
        room_number: '',
        room_type_id: null,
        capacity: 1,
        smoking: false,
        for_sale: true
      });
      const dialogVisible = ref(false);
      const roomTypesDialogVisible = ref(false);
      const roomTypeDialog = ref(false);
      const roomsDialogVisible = ref(false);
      const roomDialog = ref(false);
      const selectedHotel = ref(null);
      const roomTypesDataTable = ref(null);
      const roomsPanel = ref(null);

      // Functions
      function onCellEditComplete(event) {
        const { data, newValue, field } = event;
        if (field) {
          data[field] = newValue;
          data.changed = true;
        }
      }
      
      const fetchHotels = async () => {
        try {
          const response = await fetch('/api/hotel-list', {
            method: 'GET',            
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
          });
          hotels.value = await response.json();
        } catch (error) {
          toast.add({ 
              severity: 'error', 
              summary: 'Error', 
              detail: 'Failed to fetch hotels', life: 3000 
          });
        }
      };

      const fetchRoomTypes = async () => {
        try {
          const response = await fetch(`/api/hotel-rooms/${selectedHotel.value.id}`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
          });

          if (!response.ok) {
            throw new Error('Failed to fetch room types');
          }

          const data = await response.json();

          // Process the data to extract roomTypes and rooms
          const roomTypesMap = new Map();
          const roomsList = [];

          data.forEach((item) => {
            // Add room type to roomTypesMap if not already added
            if (!roomTypesMap.has(item.room_type_id)) {
              roomTypesMap.set(item.room_type_id, {
                id: item.room_type_id,
                name: item.room_type_name,
                description: item.room_type_description,                
              });
            }

            // Add room to the rooms list
            const room = {
              id: item.room_id,
              room_number: item.room_number,
              floor: item.room_floor,
              capacity: item.room_capacity,
              smoking: item.room_smoking_idc,
              for_sale: item.room_for_sale_idc,
              room_type_id: item.room_type_id,
            };
            roomsList.push(room);
          });

          roomTypes.value = Array.from(roomTypesMap.values());
          rooms.value = roomsList;
        } catch (error) {
          console.error('Error fetching room types:', error);
          toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to fetch room types', life: 3000 });
        }
      };

      const editHotel = (hotel) => {
        selectedHotel.value = { ...hotel };
        dialogVisible.value = true;
      };

      const saveHotel = async () => {
        try {
          const response = await fetch(`/api/hotel/${selectedHotel.value.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(selectedHotel.value),
          });
          if (!response.ok) throw new Error('Failed to save hotel');
          await fetchHotels();
          dialogVisible.value = false;
          toast.add({ severity: 'success', summary: 'Success', detail: 'Hotel updated successfully', life: 3000 });
        } catch (error) {
          toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save hotel', life: 3000 });
        }
      };

      const editRooms = async (hotel) => {
        try {
          selectedHotel.value = { ...hotel };
          await fetchRoomTypes(hotel.id);
          roomsDialogVisible.value = true;
        } catch (error) {
          toast.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: 'Failed to fetch rooms', 
            life: 3000 
          });
        }
      };

      const saveRoomChanges = async () => {
        try {
          // Check for duplicate names
          const roomNumberSet = new Set();
          for (const room of rooms.value) {
            if (roomNumberSet.has(room.room_number)) {
              toast.add({ 
                severity: 'error', 
                summary: 'Error', 
                detail: 'Room numbers must be unique', life: 3000 
              });
              return;
            }
            roomNumberSet.add(room.room_number);
          }

          // Filter out unchanged room types
          const changedRooms = rooms.value.filter(room => room.changed);

          //Loop through changed room types and update them
          for (const room of changedRooms) {              
            const response = await fetch(`/api/room/${room.id}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                room_type_id: room.room_type_id,
                floor: room.floor,
                room_number: room.room_number,
                capacity: room.capacity,
                smoking: room.smoking,
                for_sale: room.for_sale               
              })               
            });
            
            if (response.status === 200) {
              console.log(`Room ${room.room_number} updated successfully`);
            } else {
              console.error(`Failed to update room ${room.room_number}`);
            }            
          }

          toast.add({ 
            severity: 'success', 
            summary: 'Success', 
            detail: 'Rooms updated successfully', 
            life: 3000 
          });
          roomTypesDialogVisible.value = false;
        } catch (error) {
          
        }
        
      };

      const editRoomTypes = async (hotel) => {
        try {
          selectedHotel.value = { ...hotel };
          await fetchRoomTypes(hotel.id);
          roomTypesDialogVisible.value = true;
        } catch (error) {
          toast.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: 'Failed to fetch rooms', 
            life: 3000 
          });
        }        
      };

      const saveRoomTypes = async () => {        
        try {
          // Check for duplicate names
          const nameSet = new Set();
          for (const roomType of roomTypes.value) {
            if (nameSet.has(roomType.name)) {
              toast.add({ severity: 'error', summary: 'Error', detail: 'Room type names must be unique', life: 3000 });
              return;
            }
            nameSet.add(roomType.name);
          }

          // Filter out unchanged room types
          const changedRoomTypes = roomTypes.value.filter(roomType => roomType.changed);

          //Loop through changed room types and update them
          for (const roomType of changedRoomTypes) {
            if (roomType.changed) {
              const response = await fetch(`/api/room-type/${roomType.id}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  name: roomType.name,
                  description: roomType.description
                }),                
              });
              
              if (response.status === 200) {
                console.log(`Room type ${roomType.name} updated successfully`);
              } else {
                console.error(`Failed to update room type ${roomType.name}`);
              }
            }
          }

          toast.add({ 
            severity: 'success', 
            summary: 'Success', 
            detail: 'Room types updated successfully', 
            life: 3000 
          });
          roomTypesDialogVisible.value = false;
        } catch (error) {
          console.error('Error updating room types:', error);
        }
      };

      const openRoomTypeDialog = () => {
        Object.assign(newRoomType, {
          name: '',
          description: ''
        });
        roomTypesDialogVisible.value = false;
        roomTypeDialog.value = true;
      };

      const saveRoomType = async () => {
        // Check for duplicate names
        const nameSet = new Set();
        for (const roomType of roomTypes.value) {
          nameSet.add(roomType.name);
          if (nameSet.has(newRoomType.name)) {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Room type names must be unique', life: 3000 });
            return;
          }
        }
        
        try {
          const response = await fetch('/api/room-types', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: newRoomType.name,
              description: newRoomType.description,              
              hotel_id: selectedHotel.value.id              
            }),
          });

          if (response.ok) {
            const result = await response.json();
            console.log(`Room type ${newRoomType.name} created successfully with ID ${result.roomTypeId}`);
            toast.add({ 
              severity: 'success', 
              summary: 'Success', 
              detail: 'Room type created successfully', 
              life: 3000 
            });
            roomTypeDialog.value = false;
            await fetchRoomTypes();
            roomTypesDialogVisible.value = true;            
          } else {
            console.error(`Failed to create room type ${newRoomType.name}`);
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to create room type', life: 3000 });
          }
        } catch (error) {
          console.error('Error creating room type:', error);
          toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to create room type', life: 3000 });
        }
      };

      const openRoomDialog = () => {
        Object.assign(newRoom, {
          floor: 1,
          room_number: '',
          room_type_id: null,
          capacity: 1,
          smoking: false,
          for_sale: true
        });
        roomsDialogVisible.value = false;
        roomDialog.value = true;
      };

      const saveRoom = async () => {
        // Check for duplicate names
        const roomNumberSet = new Set();
        for (const room of rooms.value) {
          roomNumberSet.add(room.room_number);
          if (roomNumberSet.has(newRoom.room_number)) {
            toast.add({ 
              severity: 'error', 
              summary: 'Error', 
              detail: 'Room numbers must be unique', life: 3000 
            });
            return;
          }          
        }

        try {
          const response = await fetch('/api/rooms', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              floor: newRoom.floor,
              room_number: newRoom.room_number,
              room_type: false,
              room_type_id: newRoom.room_type_id,
              capacity: newRoom.capacity,
              smoking: newRoom.smoking,
              for_sale: newRoom.for_sale,              
              hotel_id: selectedHotel.value.id              
            }),
          });

          if (response.ok) {
            const result = await response.json();
            console.log(`Room ${newRoom.room_number} created successfully`);
            toast.add({ 
              severity: 'success', 
              summary: 'Success', 
              detail: 'Room type created successfully', 
              life: 3000 
            });
            roomDialog.value = false;
            await fetchRoomTypes();
            roomsDialogVisible.value = true;            
          } else {
            console.error(`Failed to create room ${newRoomType.name}`);
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to create room type', life: 3000 });
          }
        } catch (error) {
          console.error('Error creating room:', error);
          toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to create room', life: 3000 });
        }
      };
/*
      watch(roomTypes, (newVal, oldVal) => {
        console.log('room type changed:', newVal);
        // Implement any additional logic needed when roomTypes changes
      });
      watch(rooms, (newVal, oldVal) => {
        console.log('room changed:', newVal);
        // Implement any additional logic needed when roomTypes changes
      });
      watch(newRoom, (newVal, oldVal) => {
        console.log('room changed:', newVal);
        // Implement any additional logic needed when roomTypes changes
      });
*/          
      onMounted(fetchHotels);

      return {
        hotels,
        roomTypes,
        newRoomType,        
        rooms,
        newRoom,
        dialogVisible,
        roomTypesDialogVisible,
        roomTypeDialog,
        roomsDialogVisible,
        roomDialog,
        selectedHotel,
        roomTypesDataTable,
        roomsPanel,
        onCellEditComplete,
        editHotel,
        saveHotel,
        editRooms,
        saveRoomChanges,
        editRoomTypes,
        saveRoomTypes,
        openRoomTypeDialog,
        saveRoomType,
        openRoomDialog,
        saveRoom,
      };
    },
    methods: {
      formatCurrency(value) {
        if (value == null) return '';
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
      }
    }    
  };
</script>

<style scoped>
/* Add any specific styles for the ManageHotel page here */
</style>