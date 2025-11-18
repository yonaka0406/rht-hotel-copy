<template>
  <div class="p-4">
    <Panel header="OTAやり取り管理">
      <Accordion value="0" v-if="!isSiteController">
        <AccordionPanel value="0">
          <AccordionHeader>サイトコントローラー</AccordionHeader>
          <AccordionContent>
            <div class="flex items-center grid grid-cols-4 mt-4">
              <div class="p-field">
                ホテルを選択してください。
              </div>
              <div class="p-field">
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
            </div>
            <div v-if="hasSiteController" class="grid grid-cols-4 gap-4 mt-4">
              <Button severity="secondary" raised rounded @click="openSiteControllerDetail('otaRoomMaster', 'ネット室マスター')">ネット室マスター</Button>
              <Button severity="secondary" raised rounded @click="openSiteControllerDetail('otaPlanMaster', 'プランマスター')">プランマスター</Button>
              <Button severity="secondary" raised rounded @click="openSiteControllerDetail('otaInventory', '在庫調整')">在庫調整</Button>
            </div>
          </AccordionContent>
        </AccordionPanel>
        <AccordionPanel value="1">
          <AccordionHeader>最新のサイトコントローラーの応答</AccordionHeader>
          <AccordionContent class="mt-4">
            <DataTable
              :value="responses"
              :paginator="true"
              :rows="15"
              :rowsPerPageOptions="[15, 25, 50]"              
            >              
              <Column field="received_at" header="受信日時">                
                <template #body="slotProps">
                  {{ formatDateTime(slotProps.data.received_at) }}
                  <Badge
                    v-if="slotProps.data.status === '成功'"
                    severity="success"
                    class="ml-2"
                    icon="pi pi-check"
                  >
                    {{ slotProps.data.status }}
                  </Badge>
                  <Badge
                    v-else-if="slotProps.data.status === 'エラー'"
                    severity="danger"
                    class="ml-2"
                    icon="pi pi-times"                    
                  >
                    {{ slotProps.data.status }}
                  </Badge>
                </template>
              </Column>              
              <Column field="name" header="リクエスト名">
                <template #body="slotProps">
                  <p>{{ fetchServiceName(slotProps.data.name) }}</p>
                  <p><small>{{ slotProps.data.name }}</small></p>
                </template>
              </Column>              
              <Column field="hotel_name" header="ホテル名"></Column>
              <Column header="表示">
                  <template #body="slotProps">
                      <Button
                          icon="pi pi-eye"
                          class="p-button-rounded p-button-text"
                          @click="showResponseDetails(slotProps.data)"
                      />
                  </template>
              </Column>
            </DataTable>
          </AccordionContent>
        </AccordionPanel>
        <AccordionPanel value="2">
          <AccordionHeader>OTA予約キュー</AccordionHeader>
          <AccordionContent>
            <OtaQueueTable :hotel-id="selectedHotelId" />
          </AccordionContent>
        </AccordionPanel>
        <AccordionPanel value="3">
          <AccordionHeader>在庫調整依頼ステータス</AccordionHeader>
          <AccordionContent>
            <OtaXmlQueueTable />
          </AccordionContent>
        </AccordionPanel>
        <AccordionPanel value="4">
          <AccordionHeader>XML手動操作</AccordionHeader>
          <AccordionContent>
            <Card class="mt-4">
              <template #title>
                XMLテンプレート
              </template>
              <template #content>
                <div class="grid grid-cols-4 gap-4">
                  <div class="p-field">
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
                  <div class="p-field">
                    <FloatLabel>
                      <label for="templateName">テンプレート名</label>
                      <Select id="templateName" v-model="templateName" 
                      :options="sc_serviceLabels"
                      optionLabel="label"
                      optionValue="id"
                        fluid 
                      />
                      <small v-if="templateName" class="text-gray-500">選択中: {{ templateName }}</small>                    </FloatLabel>
                  </div>
                  <div class="p-field">
                    <Button label="テンプレート取得" @click="fetchTemplate" />
                  </div>
                  <div class="p-field"></div>
                  <div v-if="!hasSiteController" class="col-span-4"><span class="text-red-500">選択中ホテルはサイトコントローラー連携情報がありません。</span></div>
                </div>
              </template>
            </Card>
            <Card v-if="template" class="mt-4">
              <template #title>
                XMLテンプレート設定
              </template>
              <template #content>
                <div v-if="template">            
                  <div class="grid grid-cols-4 gap-4">
                    <div v-for="(field, index) in editableFields" :key="index" class="p-field mt-4">
                      <FloatLabel>
                        <label :for="`field-${index}`">{{ fetchFieldName(field.label) }}</label>
                        <InputText :id="`field-${index}`" v-model="field.value" fluid />
                      </FloatLabel>
                    </div>
                  </div>
                  <div class="mt-4 mb-4">
                    <Button label="リクエスト送信" @click="submitTemplate" />
                  </div>
                  <!--<pre class="xml-display">{{ template }}</pre>-->
                </div>
                <div v-else>
                  <p>テンプレート無し</p>
                </div>
              </template>
            </Card>
          </AccordionContent>
        </AccordionPanel>        
      </Accordion>
      
      <div v-else>        
        <div class="flex justify-center items-center grid grid-cols-4">
          <div class="col-span-3"><span class="font-bold">{{ selectedService }}</span></div>                    
          <div class="flex justify-end mr-4"><Button severity="secondary" @click="openSiteControllerDetail()">戻る</Button></div>
        </div>      

        <component :is="activeComponent" :hotel_id="selectedHotelId" />

      </div>
    </Panel>

    <Dialog
        v-model:visible="displayDialog"
        :header="selectedResponse ? fetchServiceName(selectedResponse.name) : '応答詳細'"
        :modal="true"
        :style="{ width: '50vw' }"
    >      
      <pre>
        {{ dialogContent }}
      </pre>
      <template #footer>
        {{ formatDateTime(selectedResponse.received_at) }}
      </template>
    </Dialog>
  </div>
</template>

<script setup>
  // Vue
  import { ref, shallowRef, watch, onMounted } from 'vue';

  // Stores
  import { useXMLStore } from '@/composables/useXMLStore';
  const { template, responses, sc_serviceLabels, fetchServiceName, fetchFieldName, fetchXMLTemplate, fetchXMLRecentResponses, insertXMLResponse } = useXMLStore();
  import { useHotelStore } from '@/composables/useHotelStore';
  const { hotels, setHotelId, fetchHotels, fetchHotelSiteController } = useHotelStore();
  
  // Primevue
  import { Panel, Accordion, AccordionPanel, AccordionHeader, AccordionContent, Card, FloatLabel, InputText, Select, Button, DataTable, Column, Badge, Dialog } from 'primevue';

  // Components
  import OtaQueueTable from '@/pages/Admin/components/OtaQueueTable.vue';
  import OtaXmlQueueTable from './components/OtaXmlQueueTable.vue';
  
  // Helper
  const formatDateTime = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
      });
  };
  
  // Template
  const selectedHotelId = ref(null);
  const hasSiteController = ref(false);
  const templateName = ref('');
  const editableFields = ref([]);  
  const fetchTemplate = async () => {
    await fetchXMLTemplate(selectedHotelId.value, templateName.value);
  };
  const submitTemplate = async () => {
    let modifiedTemplate = template.value;
    editableFields.value.forEach((field) => {
      modifiedTemplate = modifiedTemplate.replace(
        `{{${field.label}}}`,
        field.value
      );
    });

    console.log('変更されたテンプレート:', modifiedTemplate);
    await insertXMLResponse(selectedHotelId.value, templateName.value, modifiedTemplate);
    await fetchXMLRecentResponses();
  };

  // Site Controller data
  const isSiteController = ref(false);
  const selectedService = ref(null);
  const activeComponent = shallowRef(null);
  const openSiteControllerDetail = async (name, display) => {
    if (!name) {
      isSiteController.value = false;
      activeComponent.value = null;
      return;
    }
    await setHotelId(selectedHotelId.value);
    isSiteController.value = true;
    selectedService.value = display;    

    // Dynamic import
    try {
      activeComponent.value = (await import(`@/pages/Admin/OTA/${name}.vue`)).default;
    } catch (error) {
      console.error(`Failed to load component: ${name}`, error);
      // Reset state and show error to user
      isSiteController.value = false;
      activeComponent.value = null;
      // Consider showing a toast/notification to the user
    }
  };
  // Dialog
  const displayDialog = ref(false);
  const getDialogContent = (response) => {
      if (!response) {
        dialogContent.value = '';
        return;
      }
      
      // Check if the response is an error or success
      if (response.commonResponse?.isSuccess === 'true') {
        const successData = { ...response };
        delete successData.commonResponse;
        dialogContent.value = getSuccessContent(successData);        
      } else {
        dialogContent.value = getErrorContent(response);
      }    
  }; 
    
  const getErrorContent = (response) => {
    const translatedResponse = {};
    for (const key in response) {
      translatedResponse[fetchFieldName(key)] = translateValue(response[key]);
    }
    return translatedResponse;
  };
  const getSuccessContent = (response) => {
    if (!response) {
      return [{ label: '成功', value: '処理は成功しましたが、表示するデータがありません。' }];
    }
    const translatedResponse = {};
    for (const key in response) {
      translatedResponse[fetchFieldName(key)] = translateValue(response[key]);
    }
    return translatedResponse;
  };
  const translateValue = (value) => {
    if (Array.isArray(value)) {
      return value.map(item => translateValue(item));
    }
    if (typeof value === 'object' && value !== null) {
      const translatedObj = {};
      for (const key in value) {
        translatedObj[fetchFieldName(key)] = translateValue(value[key]);
      }
      return translatedObj;
    }
    return value;
  };

  onMounted(async () => {
    await fetchHotels();
    await fetchXMLRecentResponses();
  });
  
  watch(template, (newTemplate) => {
    if (newTemplate) {
      // Extract editable fields from the template using regex for {{ }}
      const matches = [...newTemplate.matchAll(/\{\{(.*?)\}\}/g)];
      editableFields.value = matches.map((match) => {
        const fieldName = match[1];
        const fieldValue = ''; // Initialize with empty string
        return { label: fieldName, value: fieldValue };
  });

  watch(selectedHotelId, async (newHotelId) => {
    if (!newHotelId) return;

    try {
      const result = await fetchHotelSiteController(newHotelId);
      hasSiteController.value = result && result.length > 0;
    } catch (error) {
      console.error('Failed to fetch hotel site controller:', error);
      hasSiteController.value = false;
      // Consider showing error notification to user
    }
  }); 
      
</script>
<style scoped>
  .xml-display {
    text-align: left;
    white-space: pre-wrap; /* Allows text to wrap */
    overflow-x: auto; /* Adds horizontal scrollbar if needed */
    max-width: 100%; /* Ensures it doesn't exceed its container */
    background-color: #f8f8f8; /* Light background for better readability */
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
</style>