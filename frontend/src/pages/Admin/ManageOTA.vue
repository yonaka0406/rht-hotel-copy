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
                      <InputText id="templateName" v-model="templateName" fluid />
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
                  <div class="grid grid-cols-4 gap-4 mt-6">
                    <div v-for="(field, index) in editableFields" :key="index" class="p-field">
                      <FloatLabel>
                        <label :for="`field-${index}`">{{ field.label }}</label>
                        <InputText :id="`field-${index}`" v-model="field.value" fluid />
                      </FloatLabel>
                    </div>
                  </div>
                  <div class="mt-4 mb-4">
                    <Button label="リクエスト送信" @click="submitTemplate" />
                  </div>
                  <pre class="xml-display">{{ template }}</pre>
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
          <AccordionContent>
            <DataTable
              :value="responses"
              :paginator="true"
              :rows="15"
              :rowsPerPageOptions="[15, 25, 50]"
              :showGridlines="true"
            >
              <Column field="received_at"></Column>
              
            </DataTable>
          </AccordionContent>
        </AccordionPanel>
      </Accordion>
      
    </Panel>
  </div>
</template>

<script setup>
  // Vue
  import { ref, reactive, watch, onMounted } from 'vue';

  // Stores
  import { useXMLStore } from '@/composables/useXMLStore';
  const { template, responses, fetchXMLTemplate, fetchXMLRecentResponses, insertXMLResponse } = useXMLStore();

  // Primevue
  import { Panel, Accordion, AccordionPanel, AccordionHeader, AccordionContent, Card, FloatLabel, InputText, Button, DataTable, Column } from 'primevue';
      
  const templateName = ref('');
  const editableFields = ref([]);
  const editedTemplate = reactive({
    extractionProcedure: '',
    searchDurationFrom: '',
    searchDurationTo: '',
  });
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
  };

  onMounted(async () => {
    await fetchXMLRecentResponses();    
    console.log('fetchXMLRecentResponses', responses.value);
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