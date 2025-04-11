<template>
  <div class="p-4">
    <Panel header="OTAやり取り管理">
      <Accordion value="0">
        <AccordionPanel value="0">
          <AccordionHeader>XML手動操作</AccordionHeader>
          <AccordionContent>
            <Card class="mt-4">
              <template #title>
                XMLテンプレート
              </template>
              <template #content>
                <div class="grid grid-cols-4 gap-4">
                  <div class="p-field"></div>
                  <div class="p-field">
                    <FloatLabel>
                      <label for="templateName">テンプレート名</label>
                      <Select id="templateName" v-model="templateName" 
                      :options="sc_serviceLabels"
                      optionLabel="label"
                      optionValue="id"
                        fluid 
                      />
                      <small class="p-error" v-if="templateName">{{ templateName }}</small>
                    </FloatLabel>
                  </div>
                  <div class="p-field">
                    <Button label="テンプレート取得" @click="fetchTemplate" />
                  </div>
                  <div class="p-field"></div>
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
      </Accordion>      
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
  import { ref, reactive, watch, onMounted } from 'vue';

  // Stores
  import { useXMLStore } from '@/composables/useXMLStore';
  const { template, responses, sc_serviceLabels, sc_fieldLabels, fetchServiceName, fetchFieldName, fetchXMLTemplate, fetchXMLRecentResponses, insertXMLResponse } = useXMLStore();
  
  // Primevue
  import { Panel, Accordion, AccordionPanel, AccordionHeader, AccordionContent, Card, FloatLabel, InputText, Textarea, Select, Button, DataTable, Column, Badge, Dialog, Divider } from 'primevue';

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
  const isObject = (value) => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  };
  
  // Template
  const templateName = ref('');
  const editableFields = ref([]);  
  const fetchTemplate = async () => {
    await fetchXMLTemplate(templateName.value);
  };
  const submitTemplate = async () => {
    let modifiedTemplate = template.value;
    editableFields.value.forEach((field) => {
      modifiedTemplate = modifiedTemplate.replace(
        `{{${field.label}}}`,
        field.value
      );
    });

    console.log('Modified Template:', modifiedTemplate);
    await insertXMLResponse(templateName.value, modifiedTemplate);
    await fetchXMLRecentResponses();
  };

  // Dialog
  const displayDialog = ref(false);
  const selectedResponse = ref(null);
  const dialogContent = ref('');
  const flattenObject = (obj, labelPrefix) => {
  const result = [];
  const stack = [{ obj, prefix: labelPrefix }];

  while (stack.length > 0) {
      const { obj: currentObj, prefix: currentPrefix } = stack.pop();

      for (const key in currentObj) {
        if (isObject(currentObj[key])) {
          stack.push({ obj: currentObj[key], prefix: `${currentPrefix}-${key}` });
        } else {
          result.push({
            label: currentPrefix,
            key,
            value: currentObj[key],
          });
        }
      }
    }

    return result;
  };
  const showResponseDetails = (response) => {
    selectedResponse.value = response;
    getDialogContent(selectedResponse.value.response);
    displayDialog.value = true;
  };
  const getDialogContent = (response) => {
      if (!response) dialogContent.value = '';
      
      // Check if the response is an error or success
      if (response.commonResponse?.isSuccess === 'true') {
        const successData = { ...response };
        delete successData.commonResponse;
        dialogContent.value = getSuccessContent(successData);        
      } else {
        dialogContent.value = getErrorContent(response.commonResponse);
      }    
      
      console.log('getDialogContent result:', dialogContent.value);
  };
  const getErrorContent = (response) => {
    const translatedResponse = {};
    for (const key in response) {
      translatedResponse[fetchFieldName(key)] = response[key];
    }
    return translatedResponse;
  };
  const getSuccessContent = (response) => {
  if (!response) {
    return [{ label: 'Success', value: 'Operation successful, but no data to display.' }];
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
    } else {
      editableFields.value = [];
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