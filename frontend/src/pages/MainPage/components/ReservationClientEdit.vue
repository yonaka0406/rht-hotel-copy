<template>
    <div class="p-2 rounded-sm" :class="{'bg-cyan-400': isClientSelected, 'bg-lime-400': !isClientSelected}">
      <Card>
        <template #title>            
            <div :class="{'text-cyan-700': isClientSelected, 'text-lime-700': !isClientSelected}">
                <div v-if="isClientSelected">顧客情報編集</div>
                <div v-else>新規顧客登録</div>
            </div>
        </template>
        <template #content>                    
          <form @submit.prevent="saveClient">
            <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 gap-y-6 pt-6">
                <!-- Name of the person making the reservation -->
                <div class="col-span-2 mb-6">
                    <FloatLabel>              
                        <AutoComplete
                            v-model="client"
                            :suggestions="filteredClients"
                            optionLabel="display_name"
                            field="id"
                            @complete="filterClients"
                            @option-select="onClientSelect"
                            @change="onClientChange"
                            @clear="resetClient"
                            fluid
                            required
                        >
                            <template #option="slotProps">
                            <div>
                                {{ slotProps.option.name_kanji || slotProps.option.name || '' }}
                                <span v-if="slotProps.option.name_kana"> ({{ slotProps.option.name_kana }})</span>
                            </div>
                            </template>
                        </AutoComplete>
                        <label>個人氏名　||　法人名称</label>
                    </FloatLabel>
                </div>
                <div class="field">
                    <FloatLabel>
                        <InputText id="name" v-model="clientDetails.name" required />
                        <label for="name">氏名・名称</label>
                    </FloatLabel>
                </div>
                <div class="field">
                    <FloatLabel>
                        <label for="name_kana">カナ</label>
                        <InputText id="name_kana" v-model="clientDetails.name_kana" />
                    </FloatLabel>                        
                </div>
                <div class="field">
                    <FloatLabel>
                        <label for="name_kanji">漢字</label>
                        <InputText v-model="clientDetails.name_kanji"
                            id="name_kanji"              
                        />
                    </FloatLabel>                        
                </div>
                <div class="field">                        
                    <FloatLabel>                            
                        <label for="date_of_birth">生年月日・設立日</label>                            
                        <DatePicker v-model="clientDetails.date_of_birth"                               
                            :showIcon="true" 
                            iconDisplay="input"                      
                            dateFormat="yy-mm-dd"
                            :selectOtherMonths="true"                 
                            fluid 
                        />
                    </FloatLabel>                        
                </div>
                <!-- Type of person (Legal or Natural) -->
                <div class="field col-6">
                    <SelectButton v-model="clientDetails.legal_or_natural_person" 
                        :options="personTypeOptions" 
                        option-label="label" 
                        option-value="value"
                        fluid
                        :disabled="isClientSelected"
                    />
                </div>
                <!-- Gender input if person is natural -->                
                <div class="field col-6">
                  <div v-if="clientDetails.legal_or_natural_person === 'natural'" class="flex gap-3">
                      <div v-for="option in genderOptions" :key="option.value" class="flex items-center gap-2">
                          <RadioButton
                              v-model="clientDetails.gender"
                              :inputId="option.value"
                              :value="option.value"
                              :disabled="isClientSelected"
                          />
                          <label :for="option.value">{{ option.label }}</label>
                      </div>
                  </div>
                </div>
                <!-- Email input -->
                <div class="field col-6">
                    <FloatLabel>
                        <InputText v-model="clientDetails.email"
                            :pattern="emailPattern"
                            :class="{'p-invalid': !isValidEmail}"
                            @input="validateEmail(clientDetails.email)"
                            fluid                         
                        />
                        <label>メールアドレス</label>
                        <small v-if="!isValidEmail" class="p-error">有効なメールアドレスを入力してください。</small>
                    </FloatLabel>
                </div>
                <!-- Phone number input -->
                <div class="field col-6">
                    <FloatLabel>
                      <InputText v-model="clientDetails.phone"
                          :pattern="phonePattern"
                          :class="{'p-invalid': !isValidPhone}"
                          @input="validatePhone(clientDetails.phone)"
                          fluid                        
                      />
                      <label>電話番号</label>
                      <small v-if="!isValidPhone" class="p-error">有効な電話番号を入力してください。</small>
                    </FloatLabel>
                </div>
                <!-- Phone number input -->
                <div class="field col-6">
                    <FloatLabel>
                      <InputText v-model="clientDetails.fax"
                          :pattern="phonePattern"
                          :class="{'p-invalid': !isValidPhone}"
                          @input="validatePhone(clientDetails.fax)"
                          fluid
                      />
                      <label>FAX</label>
                      <small v-if="!isValidPhone" class="p-error">有効な電話番号を入力してください。</small>
                    </FloatLabel>
                </div>
                <!-- Save button -->                
                <div v-if="isClientSelected" class="field col-span-2 flex justify-center items-center">
                    <Button label="保存" severity="info" type="submit" />
                </div>
                <div v-else class="field col-span-2 flex justify-center items-center">
                    <Button label="新規" severity="success" type="submit" />
                </div>                
            </div>
          </form>
        </template>
      </Card>
    </div>
  </template>
  
  <script setup>
    // Vue
    import { ref, watch, onMounted } from 'vue';

    const props = defineProps({        
        client_id: {
            type: String,
            default: null,
        },        
    });

    // Primevue
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();    
    import { Card, FloatLabel, InputText, DatePicker, SelectButton, AutoComplete, RadioButton, Button } from 'primevue';

    // Stores
    import { useClientStore } from '@/composables/useClientStore';
    const { clients, fetchClients, setClientsIsLoading, fetchClientNameConversion, createClient, updateClientInfo } = useClientStore();
    import { useReservationStore } from '@/composables/useReservationStore';
    const { setReservationClient } = useReservationStore();

    // Form
    const client = ref({});
    const clientDetails = ref({
      id: null,
      name: '',
      name_kana: '',
      name_kanji: '',
      full_name_key: '',
      legal_or_natural_person: 'legal',
      gender: 'other',
      date_of_birth: null,
      email: '',
      phone: '',
      fax: '',
      display_name: '', 
    });
    const personTypeOptions = [
      { label: '法人', value: 'legal' },
      { label: '個人', value: 'natural' },
    ];
    const genderOptions = [
      { label: '男性', value: 'male' },
      { label: '女性', value: 'female' },
      { label: 'その他', value: 'other' },
    ];
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const isValidEmail = ref(true);
    const phonePattern = /^[+]?[0-9]{1,4}[ ]?[-]?[0-9]{1,4}[ ]?[-]?[0-9]{1,9}$/;
    const isValidPhone = ref(true);
    const isClientSelected = ref(false);
    const selectedClient = ref(null);
    const filteredClients = ref([]);

    // Helper
    const normalizeKana = (str) => {
      if (!str) return '';
      let normalizedStr = str.normalize('NFKC');
      
      // Convert Hiragana to Katakana
      normalizedStr = normalizedStr.replace(/[\u3041-\u3096]/g, (char) => 
        String.fromCharCode(char.charCodeAt(0) + 0x60)  // Convert Hiragana to Katakana
      );
      // Convert half-width Katakana to full-width Katakana
      normalizedStr = normalizedStr.replace(/[\uFF66-\uFF9F]/g, (char) => 
        String.fromCharCode(char.charCodeAt(0) - 0xFEC0)  // Convert half-width to full-width Katakana
      );
      
      return normalizedStr;
    };
    const validateEmail = (email) => {
      isValidEmail.value = emailPattern.test(email);
    };
    const validatePhone = (phone) => {
      isValidPhone.value = phonePattern.test(phone);
    };
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    
    // Autocomplete Filter
    const filterClients = (event) => {
      const query = event.query.toLowerCase();
      filteredClients.value = clients.value.filter((client) =>
        (client.name && client.name.toLowerCase().includes(query)) ||
        (client.name_kana && normalizeKana(client.name_kana).toLowerCase().includes(normalizeKana(query))) ||
        (client.name_kanji && client.name_kanji.toLowerCase().includes(query))
      );
    };      
    const onClientSelect = (event) => {
      if (event.value) {
        // console.log('onClientSelect event:',event.value);
        const selectedClient = event.value;
        isClientSelected.value = true;
        
        clientDetails.value = {
          ...selectedClient,
          display_name: selectedClient.name_kanji || selectedClient.name,
        };

        client.value = { display_name: selectedClient.name_kanji || selectedClient.name };
        
      } else {
        resetClient();
      }
      
      // console.log('onClientSelect client:',client.value);
    };
  
    const saveClient = async () => {
      if (isClientSelected.value) {
        
        !clientDetails.value.date_of_birth ? formatDate(new Date(clientDetails.value.date_of_birth)): null;
        // console.log('saveClient:',clientDetails.value);
        await updateClientInfo(clientDetails.value.id, clientDetails.value);
        await setReservationClient(clientDetails.value.id);          
        toast.add({ severity: 'success', summary: 'Success', detail: '予約者が編集されました。', life: 3000 });
      } else {
        // console.log('newClient:',clientDetails.value);
        const newClient = await createClient(clientDetails.value);
        // console.log(newClient);
        // console.log('New client id:', newClient.id);
        await setReservationClient(newClient.id);          
        toast.add({ severity: 'success', summary: 'Success', detail: '新規予約者が登録されました。', life: 3000 });
      }
    };
    const onClientChange = async (event) => {
      if(!event.value.id){
        // console.log('onClientChange event:',event.value);
        isClientSelected.value = false;
      
        const clientName = await fetchClientNameConversion(event.value);      
                
        clientDetails.value = {
          id: null,  
          name: clientName.name,
          name_kana: clientName.nameKana,
          name_kanji: clientName.nameKanji,      
          full_name_key: '',
          legal_or_natural_person: 'legal',
          gender: 'other',
          date_of_birth: null,
          email: '',
          phone: '',
          fax: '',
          display_name: '',
        };
      }
    };
    const resetClient = () => {
      isClientSelected.value = false;
      clientDetails.value = {
        id: null,  
        name: '',
        name_kana: '',
        name_kanji: '',
        full_name_key: '',
        legal_or_natural_person: 'legal',
        gender: 'other',
        date_of_birth: null,
        email: '',
        phone: '',
        fax: '',
        display_name: '',
      };
    };
  
    onMounted(async () => { 
      
      // Load Clients
      if(clients.value.length === 0) {
          setClientsIsLoading(true);
          const clientsTotalPages = await fetchClients(1);
          // Fetch clients for all pages
          for (let page = 2; page <= clientsTotalPages; page++) {
              await fetchClients(page);
          }
          setClientsIsLoading(false);            
      }

      if (props.client_id) {
        selectedClient.value = clients.value.find((client) => client.id === props.client_id);
        if (selectedClient) {
          clientDetails.value = { 
              ...selectedClient.value,
              display_name: selectedClient.value.name_kanji || selectedClient.value.name,
          };
          client.value = { display_name: selectedClient.value.name_kanji || selectedClient.value.name }

          isClientSelected.value = true;
        }
      }
      // console.log('onMounted ReservationClientEdit:', clientDetails.value);
      // console.log('onMounted ReservationClientEdit client for Autocomplete:', client.value);
      
      
    });
    
    // Watcher    
    watch(() => clientDetails.value.legal_or_natural_person,
      (newValue) => {
        // console.log('watch clientDetails.value.legal_or_natural_person')
        if (newValue === 'legal') {
          // console.log('Changed to other');
          clientDetails.value.gender = 'other';
        } 
        if (newValue === 'natural' && clientDetails.value.id == null){
          clientDetails.value.gender = 'male';
        }
      },
    );          
      
  </script>
  
<style scoped>
  .field {
    margin-bottom: 1rem;
  }
  .bg-edit {
    background-color: lightcyan; /* Change to your desired color for editing */
  }
  .bg-new {
    background-color: honeydew; /* Change to your desired color for new client */
  }
</style>