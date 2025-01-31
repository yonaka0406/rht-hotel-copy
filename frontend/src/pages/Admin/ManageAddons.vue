<template>
  <div class="p-4">
    <Panel header="Addons">
      <Tabs 
        :value="activeTab"
        @update:value="onTabChange"
      >
        <TabList>
          <Tab value="0">
            <i class="pi pi-globe"></i> グローバル
          </Tab>
          <Tab value="1">
            <i class="pi pi-building"></i> ホテル
          </Tab>
          <Tab 
            v-if="selectedHotel" 
            :value="2"
          >
            <i class="pi pi-building-columns"></i> {{ selectedHotel.name }}
          </Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="0">
            <div class="flex justify-end mb-2">
              <Button                
                @click="showGlobalDialog = true"
                icon="pi pi-plus"
                label="アドオン追加"
                class="p-button-right"
              ></Button>
            </div>            
            <DataTable :value="globalAddons">
              <Column field="name" header="名称"></Column>              
              <Column field="price">
                <template #header>
                  <span class="font-bold items-center">価格</span>
                </template>
                <template #body="slotProps">
                  <span class="items-end">{{formatCurrency(slotProps.data.price)}}</span>
                </template>
              </Column>
              <Column field="description" header="詳細"></Column>
              <Column field="visible">
                <template #header>
                  <span class="font-bold items-center">ステータス</span>
                </template>
                <template #body="slotProps">
                  <div class="flex items-center justify-center">  
                    <i v-if="slotProps.data.visible" class="pi pi-eye" style="color: green;"></i>
                    <i v-else class="pi pi-eye-slash" style="color: red;"></i>
                  </div>
                </template>
              </Column>
              <Column>
                <template #header>
                  <span class="font-bold items-center">操作</span>
                </template>
                <template #body="slotProps">   
                  <div class="flex items-center justify-center">                 
                    <Button 
                      icon="pi pi-pencil" 
                      class="p-button-text p-button-sm" 
                      @click="openEditGlobalAddon(slotProps.data)"
                      v-tooltip="'アドオン編集'"
                    />
                  </div>
                </template>
              </Column>
            </DataTable> 
          </TabPanel>
          <TabPanel value="1">
            <DataTable :value="hotels">
              <Column field="name" header="名称"></Column>
              <Column>
                <template #header>
                  <span class="font-bold">アドオンカウント</span>                  
                </template>
                <template #body="slotProps">
                  <Badge 
                    :value="getAddonsCount(slotProps.data.id)"
                    severity="secondary"
                  ></Badge>
                </template>
              </Column>
              <Column header="操作">
                <template #body="slotProps">
                  <Button 
                    @click="selectHotel(slotProps.data)"
                    severity="info"
                    rounded 
                  >選択する</Button>
                </template>
              </Column>       
            </DataTable>        
          </TabPanel>
          <TabPanel 
            v-if="selectedHotel" 
            :value="2"
          >
            <div class="flex justify-end mb-2">
              <Button                
                @click="showHotelDialog = true"
                icon="pi pi-plus"
                label="Add Addon"
                class="p-button-right"
              ></Button>
            </div>  
            <DataTable :value="filteredHotelAddons">
              <Column field="name" header="名称"></Column>
              <Column field="price">
                <template #header>
                  <span class="font-bold items-center">価格</span>
                </template>
                <template #body="slotProps">
                  <span class="items-end">{{formatCurrency(slotProps.data.price)}}</span>
                </template>
              </Column>
              <Column field="description" header="詳細"></Column>
              <Column field="visible">
                <template #header>
                  <span class="font-bold items-center">ステータス</span>
                </template>
                <template #body="slotProps">
                  <div class="flex flex-col items-center gap-2 justify-center">  
                    <i v-if="slotProps.data.visible" class="pi pi-eye" style="color: green;"></i>
                    <i v-else class="pi pi-eye-slash" style="color: red;"></i>
                    <i v-if="slotProps.data.addons_global_id" class="pi pi-link" style="color: blue;"></i>
                  </div>
                </template>
              </Column>
              <Column>
                <template #header>
                  <span class="font-bold items-center">操作</span>
                </template>
                <template #body="slotProps">
                  <div class="flex items-center justify-center"> 
                    <Button 
                      icon="pi pi-pencil" 
                      class="p-button-text p-button-sm" 
                      @click="openEditHotelDialog(slotProps.data)"
                      v-tooltip="'Edit Addon'"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>        
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Panel>

    <Dialog header="Add New Global Addon" v-model:visible="showGlobalDialog" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true">
      <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 pt-6">
        <div class="col-6">
          <FloatLabel>
            <InputText v-model="newGlobalAddon.name" fluid />
            <label>名称</label>
          </FloatLabel>
        </div>
        <div class="col-6">
          <FloatLabel>
            <InputNumber 
              v-model="newGlobalAddon.price" 
              mode="currency" 
              currency="JPY" 
              locale="ja-JP" 
              fluid
            />            
            <label>価格</label>
          </FloatLabel>
        </div>
      </div>
      <div class="pt-6">        
        <FloatLabel>
          <Textarea v-model="newGlobalAddon.description" fluid />
          <label>詳細</label>
        </FloatLabel>
      </div>
      
      <template #footer>
        <Button label="保存" icon="pi pi-check" @click="saveGlobalAddon" class="p-button-success p-button-text p-button-sm" />
        <Button label="閉じる" icon="pi pi-times" @click="showGlobalDialog = false" class="p-button-danger p-button-text p-button-sm" text />
      </template>
    </Dialog>

    <Dialog header="グローバルアドン編集" v-model:visible="showEditGlobalDialog" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true">
      <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 pt-6">
        <div class="col-6">
          <FloatLabel>
            <InputText v-model="editGlobalAddon.name" />
            <label>名称</label>
          </FloatLabel>
        </div>
        <div class="col-6">
          <FloatLabel>
            <InputNumber 
              v-model="editGlobalAddon.price" 
              mode="currency" 
              currency="JPY" 
              locale="ja-JP" 
            />
            <label>価格</label>
          </FloatLabel>
        </div>
      </div>
      <div class="pt-6">
        <FloatLabel>
          <Textarea v-model="editGlobalAddon.description" fluid />
          <label>詳細</label>
        </FloatLabel>
      </div>
      <div class="pt-2 flex items-center justify-center">
        <ToggleButton 
          id="visibleToggleEditGlobal"
          v-model="editGlobalAddon.visible" 
          onLabel="表示" 
          offLabel="非表示" 
          onIcon="pi pi-eye"                                 
          offIcon="pi pi-eye-slash" 
          aria-label="Status Toggle"
        />
      </div>
      <template #footer>
        <Button label="保存" icon="pi pi-check" @click="updateGlobalAddon" class="p-button-success p-button-text p-button-sm" />
        <Button label="閉じる" icon="pi pi-times" @click="showEditGlobalDialog = false" class="p-button-danger p-button-text p-button-sm" />
      </template>
    </Dialog>

    <Dialog header="新規ホテルアドオン" v-model:visible="showHotelDialog" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true">
      <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 pt-6">
        <div class="col-6">
          <FloatLabel>
            <InputText v-model="newHotelAddon.name" fluid />
            <label>名称</label>
          </FloatLabel>
        </div>  
        <div class="col-6">
          <FloatLabel>
            <InputNumber 
              v-model="newHotelAddon.price" 
              mode="currency" 
              currency="JPY" 
              locale="ja-JP" 
              fluid
            />
            <label>価格</label>
          </FloatLabel>
        </div> 
      </div>
      <div class="pt-6">        
        <FloatLabel>
          <Textarea v-model="newHotelAddon.description" fluid />
          <label>詳細</label>
        </FloatLabel>
      </div>
      <div class="pt-2">
        <label for="globalAddonSelect" class="block mb-2">グローバルアドオンにリンクする（任意）</label>
        <Select 
          id="globalAddonSelect"
          v-model="newHotelAddon.addons_global_id" 
          :options="globalAddons"
          optionLabel="name" 
          optionValue="id" 
          placeholder="グローバルアドオンを選択する" 
          class="w-full"
          showClear
          filter 
        /> 
      </div>
      <template #footer>
        <Button label="保存" icon="pi pi-check" @click="saveHotelAddon" class="p-button-success p-button-text p-button-sm" />
        <Button label="閉じる" icon="pi pi-times" @click="showHotelDialog = false" class="p-button-danger p-button-text p-button-sm" text />
      </template>
    </Dialog>

    <Dialog header="ホテルアドオン編集" v-model:visible="showEditHotelDialog" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true">
      <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 pt-6">
        <div class="col-6">
          <FloatLabel>
            <InputText v-model="editHotelAddon.name" />
            <label>名称</label>
          </FloatLabel>
        </div>
        <div class="col-6">
          <FloatLabel>
            <InputNumber 
              v-model="editHotelAddon.price" 
              mode="currency" 
              currency="JPY" 
              locale="ja-JP" 
            />
            <label>価格</label>
          </FloatLabel>
        </div>
      </div>
      <div class="pt-6">
        <FloatLabel>
          <Textarea v-model="editHotelAddon.description" fluid />
          <label>詳細</label>
        </FloatLabel>
      </div>      
      <div class="pt-2">
        <label for="globalAddonSelectEdit" class="block mb-2">グローバルアドオンにリンクする（任意）</label>
        <Select 
          id="globalAddonSelectEdit"
          v-model="editHotelAddon.addons_global_id" 
          :options="globalAddons"
          optionLabel="name"
          optionValue="id"
          placeholder="グローバルアドオンを選択する" 
          class="w-full"  
          showClear
          filter    
        /> 
      </div>
      <div class="pt-2 flex items-center justify-center">        
        <ToggleButton 
          id="visibleToggleEditHotel"
          v-model="editHotelAddon.visible" 
          onLabel="表示" 
          offLabel="非表示" 
          onIcon="pi pi-eye"                                 
          offIcon="pi pi-eye-slash" 
          aria-label="ステータス切り替え"
        />
      </div>
      <template #footer>
        <Button label="保存" icon="pi pi-check" @click="updateHotelAddon" class="p-button-success p-button-text p-button-sm" />
        <Button label="閉じる" icon="pi pi-times" @click="showEditHotelDialog = false" class="p-button-danger p-button-text p-button-sm" />
      </template>
    </Dialog>
  </div>
  
</template>
  
  <script>
    import { ref, computed, watch, onMounted } from 'vue';
    import { useToast } from 'primevue/usetoast'; 
    import Panel from 'primevue/panel';
    import Card from 'primevue/card';
    import Tabs from 'primevue/tabs';
    import TabList from 'primevue/tablist';
    import Tab from 'primevue/tab';
    import TabPanels from 'primevue/tabpanels';
    import TabPanel from 'primevue/tabpanel';
    import DataTable from 'primevue/datatable';
    import Column from 'primevue/column';
    import Button from 'primevue/button';
    import Badge from 'primevue/badge';
    import Dialog from 'primevue/dialog';
    import InputText from 'primevue/inputtext';  
    import InputNumber from 'primevue/inputnumber';
    import InputMask from 'primevue/inputmask';
    import Textarea from 'primevue/textarea';
    import Select from 'primevue/select';
    import FloatLabel from 'primevue/floatlabel';
    import ToggleButton from 'primevue/togglebutton' 
  
    export default {
        name: "ManageAddons",
        components: {
          Panel,
          Card,
          Tabs,
          TabList,
          Tab,
          TabPanels,
          TabPanel,
          DataTable,
          Column,
          Button,
          Badge,
          Dialog,
          InputText,      
          InputNumber,
          InputMask,
          Textarea,
          Select,
          FloatLabel,
          ToggleButton,
        },
        setup() {
          const toast = useToast();
          const activeTab = ref(0);
          const hotels = ref([]);
          const globalAddons = ref([]);
          const hotelAddons = ref([]);
          const selectedHotel = ref(null);
          
          const showGlobalDialog = ref(false);
          const showEditGlobalDialog = ref(false);
          const newGlobalAddon = ref({ 
            name: '', 
            description: '', 
            price: 0 
          });
          const editGlobalAddon = ref({ 
            id: null, 
            name: '', 
            description: '', 
            price: 0,
            visible: true
          });    

          const showHotelDialog = ref(false);
          const showEditHotelDialog = ref(false);
          const newHotelAddon = ref({ 
            hotel_id: null,
            name: '', 
            description: '', 
            price: 0, 
            addons_global_id: null 
          });
          const editHotelAddon = ref({ 
            id: null, 
            hotel_id: null,
            addons_global_id: null,
            name: '', 
            description: '', 
            price: 0,
            visible: true
          });
          
          const loading = ref(false);
          const error = ref(null);

          const filteredHotelAddons = computed(() => {
            if (selectedHotel.value) {
              const filtered = hotelAddons.value.filter(addon => addon.hotel_id === selectedHotel.value.id);
              //console.log('Filtered Hotel Addons:', filtered);
              return filtered;
            }
            return [];
          });

          const fetchGlobalAddons = async () => {
            loading.value = true            
            try {
              const authToken = localStorage.getItem('authToken')
              const response = await fetch('/api/addons/global', {
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
              globalAddons.value = data
              //console.log('Fetched Global Addons:', globalAddons.value);
            } catch (err) {
              console.error('Error fetching global addons:', err)
              error.value = err.message || 'Failed to fetch global addons'
            } finally {
              loading.value = false
            }
          };

          const fetchHotels = async () => {
            try {
              const authToken = localStorage.getItem('authToken')
              const response = await fetch('/api/hotel-list', {
                method: 'GET',            
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
              });
              hotels.value = await response.json();
              //console.log('Fetched Hotels:', hotels.value);
            } catch (error) {
              toast.add({ 
                  severity: 'error', 
                  summary: 'Error', 
                  detail: 'Failed to fetch hotels', life: 3000 
              });
            }
          };

          const fetchHotelsAddons = async () => {
            loading.value = true
            try {
              const authToken = localStorage.getItem('authToken')
              const response = await fetch(`/api/addons/hotel`, {
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
              hotelAddons.value = data
              //console.log('Fetched Hotel Addons:', hotelAddons.value);
            } catch (err) {
              console.error('Error fetching hotel addons:', err)
              error.value = err.message || 'Failed to fetch hotel addons'
            } finally {
              loading.value = false
            }
          };

          const saveGlobalAddon = async () => {
            // Check for duplicate keys
            const AddonSet = new Set();
            for (const addon of globalAddons.value) {
              AddonSet.add(addon.name);
              if (AddonSet.has(newGlobalAddon.name)) {
                toast.add({ 
                  severity: 'error', 
                  summary: 'Error', 
                  detail: '雄一アドオン名はを使ってください。', life: 3000 
                });
                return;
              }
            }

            try {
              const authToken = localStorage.getItem('authToken');
              const response = await fetch('/api/addons/global', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(newGlobalAddon.value)
              });
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              const data = await response.json();
              globalAddons.value.push(data);
              showGlobalDialog.value = false;
              newGlobalAddon.value = { 
                name: '', 
                description: '', 
                price: 0 
              };
              toast.add({ severity: 'success', summary: 'Success', detail: 'グローバルアドオン追加されました。', life: 3000 });
            } catch (err) {
              console.error('Error saving global addon:', err);
              toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save global addon', life: 3000 });
            }
          };

          const openEditGlobalAddon = async (data) => {
            editGlobalAddon.value = { ...data};
            showEditGlobalDialog.value = true;
          };

          const updateGlobalAddon = async () => {
            
            // Filter out the current id from globalAddons
            const filteredAddons = globalAddons.value.filter(addon => addon.id !== editGlobalAddon.value.id);

            // Check for duplicate keys
            const AddonSet = new Set();
            for (const addon of filteredAddons) {
              AddonSet.add(addon.name);
              if (AddonSet.has(editGlobalAddon.name)) {
                toast.add({ 
                  severity: 'error', 
                  summary: 'Error', 
                  detail: '唯一アドオン名称が必要', life: 3000 
                });
                return;
              }
            }

            try {
              const authToken = localStorage.getItem('authToken');
              const response = await fetch(`/api/addons/global/${editGlobalAddon.value.id}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(editGlobalAddon.value)
              });
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              const data = await response.json();
              const index = globalAddons.value.findIndex(addon => addon.id === data.id);
              if (index !== -1) {
                globalAddons.value[index] = data;
              }
              showEditGlobalDialog.value = false;
              editGlobalAddon.value = { 
                id: null, 
                name: '', 
                description: '', 
                price: 0,
                visible: true 
              };
              toast.add({ severity: 'success', summary: 'Success', detail: 'グローバルアドオン追加されました。', life: 3000 });
            } catch (err) {
              console.error('Error updating global addon:', err);
              toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update global addon', life: 3000 });
            }
          };

          const saveHotelAddon = async () => {
            newHotelAddon.value.hotel_id = selectedHotel.value.id;            

            // Check for duplicate keys
            const AddonSet = new Set();
            const newAddonKey = `${newHotelAddon.value.name}-${newHotelAddon.value.hotel_id}`;
            for (const addon of hotelAddons.value) {
              const addonKey = `${addon.name}-${addon.hotel_id}`;
              AddonSet.add(addonKey);              
              if (AddonSet.has(newAddonKey)) {
                toast.add({ 
                  severity: 'error', 
                  summary: 'Error', 
                  detail: '唯一アドオン名称が必要', life: 3000 
                });
                return;
              }
            }
            try {
              const authToken = localStorage.getItem('authToken');
              const response = await fetch(`/api/addons/hotel`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ...newHotelAddon.value })
              });
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              const data = await response.json();
              hotelAddons.value.push(data);
              showHotelDialog.value = false;
              newHotelAddon.value = { 
                hotel_id: null, 
                name: '', 
                description: '', 
                price: 0, 
                addons_global_id: null 
              };
              toast.add({ severity: 'success', summary: 'Success', detail: 'ホテルアドオン追加されました。', life: 3000 });
            } catch (err) {
              console.error('Error saving hotel addon:', err);
              toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save hotel addon', life: 3000 });
            }
          };

          const openEditHotelDialog = async (data) => {
            editHotelAddon.value = { ...data};
            showEditHotelDialog.value = true;
          };

          const updateHotelAddon = async () => {
            editHotelAddon.value.hotel_id = selectedHotel.value.id;
            
            // Filter out the current id from hotelAddons
            const filteredAddons = hotelAddons.value.filter(addon => addon.id !== editHotelAddon.value.id);

            // Check for duplicate keys
            const AddonSet = new Set();
            const newAddonKey = `${editHotelAddon.value.name}-${editHotelAddon.value.hotel_id}`;
            for (const addon of filteredAddons) {
              const addonKey = `${addon.name}-${addon.hotel_id}`;
              AddonSet.add(addonKey);              
              if (AddonSet.has(newAddonKey)) {
                toast.add({ 
                  severity: 'error', 
                  summary: 'Error', 
                  detail: '唯一アドオン名称が必要', life: 3000 
                });
                return;
              }
            }

            try {
              const authToken = localStorage.getItem('authToken');
              const response = await fetch(`/api/addons/hotel/${editHotelAddon.value.id}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(editHotelAddon.value)
              });
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              const data = await response.json();
              const index = hotelAddons.value.findIndex(addon => addon.id === data.id);
              if (index !== -1) {
                hotelAddons.value[index] = data;
              }
              showEditHotelDialog.value = false;
              editHotelAddon.value = { 
                id: null, 
                hotel_id: null,
                addons_global_id: null,
                name: '', 
                description: '', 
                price: 0, 
                visible: true
              };
              toast.add({ severity: 'success', summary: 'Success', detail: 'ホテルアドオン追加されました。', life: 3000 });
            } catch (err) {
              console.error('Error updating hotel addon:', err);
              toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update hotel addon', life: 3000 });
            }
          };

          const getAddonsCount = (hotelId) => {
            return hotelAddons.value.filter(addon => addon.hotel_id === hotelId).length;
          };

          const onTabChange = (newTabValue) => {
            activeTab.value = newTabValue; // Update activeTab value when tab changes
          };

          const selectHotel = (hotel) => {
            //console.log('Selected Hotel:', hotel);
            selectedHotel.value = hotel; 
            activeTab.value = 2;        
          };
          
          onMounted(fetchGlobalAddons);
          onMounted(fetchHotels);
          onMounted(fetchHotelsAddons);          
/*
          watch(editHotelAddon, (newVal, oldVal) => {
            console.log('editHotelAddon changed:', newVal);
            // Add your custom logic here
          }, { deep: true });

          watch(activeTab, (newTabValue, oldTabValue) => {
            console.log(`Tab changed from ${oldTabValue} to ${newTabValue}`);
            // You can add more logic here if needed
            // For example, if you want to reset or perform any other action when the tab changes
          });
*/
          return {
            activeTab,
            hotels,
            globalAddons,
            hotelAddons,
            selectedHotel,
            showGlobalDialog,
            showEditGlobalDialog,
            newGlobalAddon,
            editGlobalAddon,
            showHotelDialog,
            showEditHotelDialog,
            newHotelAddon,
            editHotelAddon,
            filteredHotelAddons,
            saveGlobalAddon,
            openEditGlobalAddon,
            updateGlobalAddon,
            saveHotelAddon,
            openEditHotelDialog,
            updateHotelAddon,
            getAddonsCount,
            onTabChange,
            selectHotel
          };
        },
        methods: {
          formatCurrency(value) {
            if (value == null) return '';
            return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
          }
        },
    };
  </script>