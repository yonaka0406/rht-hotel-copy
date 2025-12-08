<template>
  <div class="p-4">
    <Panel header="アドオン">
      <Tabs 
        :value="activeTab"
        @update:value="onTabChange"
      >
        <TabList>
          <Tab :value="0">
            <i class="pi pi-globe"></i> グローバル
          </Tab>
          <Tab :value="1">
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
          <TabPanel :value="0">
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
                  <span class="font-bold items-center">単価（税込）</span>
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
          <TabPanel :value="1">
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
                label="アドオン追加"
                class="p-button-right"
              ></Button>
            </div>  
            <DataTable :value="filteredHotelAddons">
              <Column field="name" header="名称"></Column>
              <Column field="price">
                <template #header>
                  <span class="font-bold items-center">単価（税込）</span>
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
                      v-tooltip="'アドオン編集'"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>        
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Panel>

    <Dialog header="新規グローバルアドン" v-model:visible="showGlobalDialog" :modal="true" :style="{ width: '60vw' }" class="p-fluid" :closable="true">
      <div class="grid grid-cols-2 gap-2 pt-6">
        <div class="col-span-1 mb-6">
          <FloatLabel>
            <InputText v-model="newGlobalAddon.name" fluid />
            <label>名称</label>
          </FloatLabel>
        </div>
        <div class="col-span-1 mb-6">
          <FloatLabel>
            <Select
              v-model="newGlobalAddon.addon_type"
              :options="addonTypes"
              optionLabel="name"
              optionValue="id"
              fluid
            />
            <label>アドオン区分</label>
          </FloatLabel>
        </div>
        <div class="col-span-1 mb-6">
          <FloatLabel>
            <InputNumber
              v-model="newGlobalAddon.price"
              mode="currency"
              currency="JPY"
              locale="ja-JP"
              fluid
            />
            <label>単価（税込）</label>
          </FloatLabel>
          <small class="text-gray-500">
            税抜価格: {{ formatCurrency(globalNetPrice) }}
          </small>
        </div>
        <div class="col-span-1 mb-6">
          <FloatLabel>
            <Select
              v-model="newGlobalAddon.tax_type_id"
              :options="taxTypes"
              optionLabel="name"
              optionValue="id"
              fluid
            />
            <label>税区分</label>
          </FloatLabel>
        </div>
        <div class="col-span-2 mb-2">
          <FloatLabel>
            <Textarea v-model="newGlobalAddon.description" fluid />
            <label>詳細</label>
          </FloatLabel>
        </div>
      </div>
      <template #footer>
        <Button label="保存" icon="pi pi-check" @click="saveGlobalAddon" class="p-button-success p-button-text p-button-sm" />
        <Button label="閉じる" icon="pi pi-times" @click="showGlobalDialog = false" class="p-button-danger p-button-text p-button-sm" text />
      </template>
    </Dialog>

    <Dialog header="グローバルアドン編集" v-model:visible="showEditGlobalDialog" :modal="true" :style="{ width: '60vw' }" class="p-fluid" :closable="true">
      <div class="grid grid-cols-2 gap-2 pt-6">
        <div class="col-span-1 mb-6">
          <FloatLabel>
            <InputText v-model="editGlobalAddon.name" fluid />
            <label>名称</label>
          </FloatLabel>
        </div>
        <div class="col-span-1 mb-6">
          <FloatLabel>
            <Select
              v-model="editGlobalAddon.addon_type"
              :options="addonTypes"
              optionLabel="name"
              optionValue="id"
              fluid
            />
            <label>アドオン区分</label>
          </FloatLabel>
        </div>
        <div class="col-span-1 mb-6">
          <FloatLabel>
            <InputNumber
              v-model="editGlobalAddon.price"
              mode="currency"
              currency="JPY"
              locale="ja-JP"
              fluid
            />
            <label>単価（税込）</label>
          </FloatLabel>
          <small class="text-gray-500">
            税抜価格: {{ formatCurrency(globalNetPrice) }}
          </small>
        </div>
        <div class="col-span-1 mb-6">
          <FloatLabel>
            <Select
              v-model="editGlobalAddon.tax_type_id"
              :options="taxTypes"
              optionLabel="name"
              optionValue="id"
              fluid
            />
            <label>税区分</label>
          </FloatLabel>
        </div>
        <div class="col-span-2 mb-2">
          <FloatLabel>
            <Textarea v-model="editGlobalAddon.description" fluid />
            <label>詳細</label>
          </FloatLabel>
        </div>
        <div class="col-span-2 pt-2 flex items-center justify-center">
          <ToggleButton
            id="visibleToggleEditGlobal"
            v-model="editGlobalAddon.visible"
            onLabel="表示"
            offLabel="非表示"
            onIcon="pi pi-eye"
            offIcon="pi pi-eye-slash"
            aria-label="ステータス切り替え"
          />
        </div>
      </div>
      <template #footer>
        <Button label="保存" icon="pi pi-check" @click="updateGlobalAddon" class="p-button-success p-button-text p-button-sm" />
        <Button label="閉じる" icon="pi pi-times" @click="showEditGlobalDialog = false" class="p-button-danger p-button-text p-button-sm" />
      </template>
    </Dialog>

    <Dialog header="新規ホテルアドオン" v-model:visible="showHotelDialog" :modal="true" :style="{ width: '60vw' }" class="p-fluid" :closable="true">
      <div class="grid grid-cols-2 gap-2 pt-6">
        <div class="col-span-1 mb-6">
          <FloatLabel>
            <InputText v-model="newHotelAddon.name" fluid />
            <label>名称</label>
          </FloatLabel>
        </div>
        <div class="col-span-1 mb-6">
          <FloatLabel>
            <Select
              v-model="newHotelAddon.addon_type"
              :options="addonTypes"
              optionLabel="name"
              optionValue="id"
              fluid
            />
            <label>アドオン区分</label>
          </FloatLabel>
        </div>
        <div class="col-span-1 mb-6">
          <FloatLabel>
            <InputNumber
              v-model="newHotelAddon.price"
              mode="currency"
              currency="JPY"
              locale="ja-JP"
              fluid
            />
            <label>単価（税込）</label>
          </FloatLabel>
          <small class="text-gray-500">
            税抜価格: {{ formatCurrency(hotelNetPrice) }}
          </small>
        </div>
        <div class="col-span-1 mb-6">
          <FloatLabel>
            <Select
              v-model="newHotelAddon.tax_type_id"
              :options="taxTypes"
              optionLabel="name"
              optionValue="id"
              fluid
            />
            <label>税区分</label>
          </FloatLabel>
        </div>
        <div class="col-span-2 mb-2">
          <FloatLabel>
            <Textarea v-model="newHotelAddon.description" fluid />
            <label>詳細</label>
          </FloatLabel>
        </div>
        <div class="col-span-2 pt-2">
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
      </div>
      <template #footer>
        <Button label="保存" icon="pi pi-check" @click="saveHotelAddon" class="p-button-success p-button-text p-button-sm" />
        <Button label="閉じる" icon="pi pi-times" @click="showHotelDialog = false" class="p-button-danger p-button-text p-button-sm" text />
      </template>
    </Dialog>

    <Dialog header="ホテルアドオン編集" v-model:visible="showEditHotelDialog" :modal="true" :style="{ width: '60vw' }" class="p-fluid" :closable="true">
      <div class="grid grid-cols-2 gap-2 pt-6">
        <div class="col-span-1 mb-6">
          <FloatLabel>
            <InputText v-model="editHotelAddon.name" fluid/>
            <label>名称</label>
          </FloatLabel>
        </div>
        <div class="col-span-1 mb-6">
          <FloatLabel>
            <Select
              v-model="editHotelAddon.addon_type"
              :options="addonTypes"
              optionLabel="name"
              optionValue="id"
              fluid
            />
            <label>アドオン区分</label>
          </FloatLabel>
        </div>
        <div class="col-span-1 mb-6">
          <FloatLabel>
            <InputNumber
              v-model="editHotelAddon.price"
              mode="currency"
              currency="JPY"
              locale="ja-JP"
              fluid
            />
            <label>単価（税込）</label>
          </FloatLabel>
          <small class="text-gray-500">
            税抜価格: {{ formatCurrency(hotelNetPrice) }}
          </small>
        </div>
        <div class="col-span-1 mb-6">
          <FloatLabel>
            <Select
              v-model="editHotelAddon.tax_type_id"
              :options="taxTypes"
              optionLabel="name"
              optionValue="id"
              fluid
            />
            <label>税区分</label>
          </FloatLabel>
        </div>
        <div class="col-span-2 mb-2">
          <FloatLabel>
            <Textarea v-model="editHotelAddon.description" fluid />
            <label>詳細</label>
          </FloatLabel>
        </div>
        <div class="col-span-2 pt-2">
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
        <div class="col-span-2 pt-2 flex items-center justify-center">
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
      </div>
      <template #footer>
        <Button label="保存" icon="pi pi-check" @click="updateHotelAddon" class="p-button-success p-button-text p-button-sm" />
        <Button label="閉じる" icon="pi pi-times" @click="showEditHotelDialog = false" class="p-button-danger p-button-text p-button-sm" />
      </template>
    </Dialog>
  </div>
  
</template>
  
<script setup>
  // Vue
  import { ref, computed, onMounted } from 'vue';

  // Primevue
  import { useToast } from 'primevue/usetoast';
  const toast = useToast();
  import { Panel, Badge, Tabs, TabList, Tab, TabPanels, TabPanel, DataTable, Column, FloatLabel, InputText, InputNumber, Textarea, Select, ToggleButton, Button, Dialog } from 'primevue';

  // Stores
  import { useHotelStore } from '@/composables/useHotelStore';
  const { hotels, fetchHotels } = useHotelStore();
  import { useSettingsStore } from '@/composables/useSettingsStore';
  const { taxTypes, fetchTaxTypes } = useSettingsStore();

  const defaultTaxTypeId = computed(() => {
    // Attempt to find '標準税率' (Standard Tax Rate)
    const standardTaxType = taxTypes.value.find(type => type.name === '標準税率');
    if (standardTaxType) {
      return standardTaxType.id;
    }
    // Fallback to the first available tax type if '標準税率' is not found
    if (taxTypes.value.length > 0) {
      return taxTypes.value[0].id;
    }
    // Final fallback to the hardcoded value if no tax types are available
    return 3; 
  });

  // Helper
  const formatCurrency = (value) => {
    if (value == null) return '';
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
  };

  // Tabs
  const activeTab = ref(0);
  const loading = ref(false);
  const error = ref(null);
  const addonTypes = ([
    {name: '朝食', id: 'breakfast'},
    {name: '昼食', id: 'lunch'},
    {name: '夕食', id: 'dinner'},
    {name: 'その他', id: 'other'}
  ]);
  const getAddonsCount = (hotelId) => {
    return hotelAddons.value.filter(addon => addon.hotel_id === hotelId).length;
  };
  const onTabChange = (newTabValue) => {
    activeTab.value = newTabValue;
  };
  const selectHotel = (hotel) => {      
    selectedHotel.value = hotel; 
    activeTab.value = 2;        
  };  

  // Global
  const globalAddons = ref([]);
  const showGlobalDialog = ref(false);
  const showEditGlobalDialog = ref(false);
  const newGlobalAddon = ref(null);
  const editGlobalAddon = ref(null);
  const globalTaxRate = computed(() => {
    const targetAddon = showEditGlobalDialog.value ? editGlobalAddon.value : newGlobalAddon.value;    
    const taxType = taxTypes.value.find(t => t.id === targetAddon.tax_type_id);
    return taxType ? taxType.percentage : 0;
  });
  const globalNetPrice = computed(() => {
    const targetAddon = showEditGlobalDialog.value ? editGlobalAddon.value : newGlobalAddon.value;

    if (targetAddon.price === null || targetAddon.price === undefined || targetAddon.price === '') {
      return 0;
    }
    const price = Number(targetAddon.price);
    const taxRate = Number(globalTaxRate.value);

    if (isNaN(price)) {
      return 0;
    }

    if (taxRate === 0) {
      return price;
    } else {
      return Math.floor(price / (1 + taxRate));
    }
  });
  const newGlobalAddonReset = () => {
    newGlobalAddon.value = { 
      name: '', 
      description: '',
      addon_type: 'other',
      tax_type_id: defaultTaxTypeId.value,    
      price: 0 
    };
  };
  const editGlobalAddonReset = () => {
    editGlobalAddon.value = { 
      id: null, 
      name: '', 
      description: '',
      addon_type: 'other',
      tax_type_id: defaultTaxTypeId.value,            
      price: 0,
      visible: true
    };
  };
  const openEditGlobalAddon = async (data) => {
    editGlobalAddon.value = { ...data};
    showEditGlobalDialog.value = true;
  };
  const updateGlobalAddon = async () => {
    // Add the globalTaxRate
    editGlobalAddon.value.tax_rate = globalTaxRate.value;
            
    // Filter out the current id from globalAddons
    const filteredAddons = globalAddons.value.filter(addon => addon.id !== editGlobalAddon.value.id);

    // Check for duplicate keys
    const AddonSet = new Set();
    for (const addon of filteredAddons) {
      AddonSet.add(addon.name);
      if (AddonSet.has(editGlobalAddon.value.name)) {
        toast.add({ 
          severity: 'error', 
          summary: 'エラー',
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
      editGlobalAddonReset();
      toast.add({ severity: 'success', summary: '成功', detail: 'グローバルアドオン追加されました。', life: 3000 });
    } catch (err) {
      console.error('グローバルアドオンの更新エラー:', err);
      toast.add({ severity: 'error', summary: 'エラー', detail: 'グローバルアドオンの更新に失敗しました', life: 3000 });
    }
  };  
  const saveGlobalAddon = async () => {
    // Add the globalTaxRate
    newGlobalAddon.value.tax_rate = globalTaxRate.value;

    // Check for duplicate keys
    const AddonSet = new Set();
    for (const addon of globalAddons.value) {
      AddonSet.add(addon.name);
      if (AddonSet.has(newGlobalAddon.value.name)) {
        toast.add({ 
          severity: 'error', 
          summary: 'エラー',
          detail: '唯一アドオン名はを使ってください。', life: 3000 
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
      newGlobalAddonReset();
      toast.add({ severity: 'success', summary: '成功', detail: 'グローバルアドオン追加されました。', life: 3000 });
    } catch (err) {
      console.error('グローバルアドオンの保存エラー:', err);
      toast.add({ severity: 'error', summary: 'エラー', detail: 'グローバルアドオンの保存に失敗しました', life: 3000 });
    }
  };

  // Hotel
  const selectedHotel = ref(null);
  const hotelAddons = ref([]);    
  const showHotelDialog = ref(false);
  const showEditHotelDialog = ref(false);
  const newHotelAddon = ref(null);
  const editHotelAddon = ref(null);
  const filteredHotelAddons = computed(() => {
    if (selectedHotel.value) {
      const filtered = hotelAddons.value.filter(addon => addon.hotel_id === selectedHotel.value.id);
      return filtered;
    }
    return [];
  });
  const hotelTaxRate = computed(() => {
    const targetAddon = showEditHotelDialog.value ? editHotelAddon.value : newHotelAddon.value;    
    const taxType = taxTypes.value.find(t => t.id === targetAddon.tax_type_id);
    return taxType ? taxType.percentage : 0;
  });
  const hotelNetPrice = computed(() => {
    const targetAddon = showEditHotelDialog.value ? editHotelAddon.value : newHotelAddon.value;

    if (targetAddon.price === null || targetAddon.price === undefined || targetAddon.price === '') {
      return 0;
    }
    const price = Number(targetAddon.price);
    const taxRate = Number(hotelTaxRate.value);

    if (isNaN(price)) {
      return 0;
    }

    if (taxRate === 0) {
      return price;
    } else {
      return Math.floor(price / (1 + taxRate));
    }
  });
  const newHotelAddonReset = () => {
    newHotelAddon.value = { 
      hotel_id: null,
      name: '', 
      description: '',
      addon_type: 'other',
      tax_type_id: defaultTaxTypeId.value,
      price: 0, 
      addons_global_id: null 
    };
  };
  const editHotelAddonReset = () => {
    editHotelAddon.value = { 
      id: null, 
      hotel_id: null,
      addons_global_id: null,
      name: '', 
      description: '',
      addon_type: 'other',
      tax_type_id: defaultTaxTypeId.value,
      price: 0,
      visible: true
    };
  };
  const openEditHotelDialog = async (data) => {
    editHotelAddon.value = { ...data};
    showEditHotelDialog.value = true;
  };
  const updateHotelAddon = async () => {
    // Add to editHotelAddon
    editHotelAddon.value.tax_rate = hotelTaxRate.value;    
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
          summary: 'エラー',
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
      editHotelAddonReset();
      toast.add({ severity: 'success', summary: '成功', detail: 'ホテルアドオンが更新されました。', life: 3000 });        
    } catch (err) {
      console.error('ホテルアドオンの更新エラー:', err);
      toast.add({ severity: 'error', summary: 'エラー', detail: 'ホテルアドオンの更新に失敗しました', life: 3000 });
    }
  };
  const saveHotelAddon = async () => {
    // Add to newHotelAddon
    newHotelAddon.value.tax_rate = hotelTaxRate.value; 
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
          summary: 'エラー',
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
      newHotelAddonReset();
      toast.add({ severity: 'success', summary: '成功', detail: 'ホテルアドオンが追加されました。', life: 3000 });
    } catch (err) {
      console.error('ホテルアドオンの保存エラー:', err);
      toast.add({ severity: 'error', summary: 'エラー', detail: 'ホテルアドオンの保存に失敗しました', life: 3000 });
    }
  };
          
  // Fetch
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
      console.error('グローバルアドオンの取得エラー:', err)
      error.value = err.message || 'グローバルアドオンの取得に失敗しました'
    } finally {
      loading.value = false
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
      console.error('ホテルアドオンの取得エラー:', err)
      error.value = err.message || 'ホテルアドオンの取得に失敗しました'
    } finally {
      loading.value = false
    }
  };
                    
  onMounted( async () => {
      await fetchHotels(); 
      await fetchTaxTypes();
      fetchGlobalAddons();
      newGlobalAddonReset();
      editGlobalAddonReset();
      fetchHotelsAddons();
      newHotelAddonReset();
      editHotelAddonReset();
  });
          
</script>