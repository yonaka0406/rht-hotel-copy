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
                <div class="col-span-2">
                    <FloatLabel>              
                        <AutoComplete
                            v-model="client.display_name"
                            :suggestions="filteredClients"
                            field="id"
                            @complete="filterClients"                                            
                            @option-select="onClientSelect"                
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
                            <InputText id="name" v-model="client.name" required />
                            <label for="name">氏名・名称</label>
                        </FloatLabel>
                    </div>
                    <div class="field">
                        <FloatLabel>
                            <label for="name_kana">カナ</label>
                            <InputText id="name_kana" v-model="client.name_kana" />
                        </FloatLabel>                        
                    </div>
                    <div class="field">
                        <FloatLabel>
                            <label for="name_kanji">漢字</label>
                            <InputText 
                                id="name_kanji" 
                                v-model="client.name_kanji"                             
                            />
                        </FloatLabel>                        
                    </div>
                    <div class="field">
                        
                        <FloatLabel>                            
                            <label for="date_of_birth">生年月日・設立日</label>
                            
                            <DatePicker v-model="client.date_of_birth" 
                                class="w-full"      
                                :showIcon="true" 
                                iconDisplay="input"                      
                                dateFormat="yy-mm-dd" 
                            />
                        </FloatLabel>                        
                    </div>
                <!-- Type of person (Legal or Natural) -->
                <div class="field col-6">
                    <SelectButton 
                        v-model="client.legal_or_natural_person" 
                        :options="personTypeOptions" 
                        option-label="label" 
                        option-value="value"
                        fluid
                        :disabled="isClientSelected"
                    />
                </div>
                <!-- Gender input if person is natural -->
                <div class="field col-6">          
                    <div v-if="client.legal_or_natural_person === 'natural'" class="flex gap-3">
                        <RadioButton
                            v-model="client.gender"
                            :inputId="'male'"
                            :value="'male'"
                            :disabled="isClientSelected"
                        />
                        <label for="male">男性</label>
                        <RadioButton
                            v-model="client.gender"
                            :inputId="'female'"
                            :value="'female'"
                            :disabled="isClientSelected"
                        />
                        <label for="female">女性</label>
                        <RadioButton
                            v-model="client.gender"
                            :inputId="'other'"
                            :value="'other'"
                            :disabled="isClientSelected"
                        />
                        <label for="other">その他</label>
                    </div>
                </div>
                <!-- Email input -->
                <div class="field col-6">
                    <FloatLabel>
                        <InputText 
                            v-model="client.email"
                            :pattern="emailPattern"
                            :class="{'p-invalid': !isValidEmail}"
                            @input="validateEmail"
                            fluid                         
                        />
                        <label>メールアドレス</label>
                        <small v-if="!isValidEmail" class="p-error">有効なメールアドレスを入力してください。</small>
                    </FloatLabel>
                </div>
                <!-- Phone number input -->
                <div class="field col-6">
                    <FloatLabel>
                    <InputText
                        v-model="client.phone"
                        :pattern="phonePattern"
                        :class="{'p-invalid': !isValidPhone}"
                        @input="validatePhone(client.phone)"
                        fluid                        
                    />
                    <label>電話番号</label>
                    <small v-if="!isValidPhone" class="p-error">有効な電話番号を入力してください。</small>
                    </FloatLabel>
                </div>
                <!-- Phone number input -->
                <div class="field col-6">
                    <FloatLabel>
                    <InputText
                        v-model="client.fax"
                        :pattern="phonePattern"
                        :class="{'p-invalid': !isValidPhone}"
                        @input="validatePhone(client.fax)"
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
  
  <script>
  import { ref, watch, computed, onMounted } from 'vue';
  import { useRoute } from 'vue-router';
  import { useToast } from 'primevue/usetoast';
  import { useClientStore } from '@/composables/useClientStore';
  import { useReservationStore } from '@/composables/useReservationStore';
  import { Card } from 'primevue';  
  import { FloatLabel, InputText, InputNumber, DatePicker, Select, SelectButton, MultiSelect, AutoComplete, RadioButton, Button } from 'primevue';  
  
  export default {
    name: 'ClientEdit',
    components: {
      Card,
      FloatLabel,
      InputText,
      InputNumber,
      DatePicker,
      Select,
      SelectButton,
      MultiSelect,
      AutoComplete,
      RadioButton,
      Button,
    },
    props: {
      client_id: {
        type: String,
        default: null,
      },
    },
    setup(props) {
      const toast = useToast();
      const { clients, fetchClients, fetchClientNameConversion, createClient, updateClientInfo } = useClientStore();
      const { setReservationClient } = useReservationStore();

      const client = ref({});
  
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
      const validateEmail = () => {
        isValidEmail.value = emailPattern.test(client.value.email);
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
  
      const filterClients = (event) => {
        const query = event.query.toLowerCase();
        filteredClients.value = clients.value.filter((client) =>
          (client.name && client.name.toLowerCase().includes(query)) ||
          (client.name_kana && normalizeKana(client.name_kana).toLowerCase().includes(normalizeKana(query))) ||
          (client.name_kanji && client.name_kanji.toLowerCase().includes(query))
        );
      };      
      const onClientSelect = (event) => {
        // Get selected client object from the event
        selectedClient.value = event.value;        
        isClientSelected.value = true;
        // console.log('Selected Client:', selectedClient.value);        

        // Update reservationDetails with the selected client's information
        client.value.id = selectedClient.value.id;
        client.value.display_name = selectedClient.value.name_kanji || selectedClient.value.name;
        client.value.name = selectedClient.value.name;
        client.value.name_kana = selectedClient.value.name_kana;
        client.value.name_kanji = selectedClient.value.name_kanji;
        client.value.legal_or_natural_person = selectedClient.value.legal_or_natural_person;
        client.value.gender = selectedClient.value.gender;
        client.value.date_of_birth = selectedClient.value.date_of_birth;        
        client.value.email = selectedClient.value.email;
        client.value.phone = selectedClient.value.phone;
        client.value.fax = selectedClient.value.fax;
        
        console.log('onClientSelect event:',client.value);
      };
  
      const saveClient = async () => {
        if (isClientSelected.value) {
          
          !client.value.date_of_birth ? formatDate(new Date(client.value.date_of_birth)): null;
          console.log('saveClient:',client.value)
          
          await updateClientInfo(client.value.id, client.value);
          await setReservationClient(client.value.id);          
          toast.add({ severity: 'success', summary: 'Success', detail: '予約者が編集されました。', life: 3000 });
        } else {
          const newClient = await createClient(client.value);
          // console.log(newClient);
          // console.log('New client id:', newClient.id);
          await setReservationClient(newClient.id);          
          toast.add({ severity: 'success', summary: 'Success', detail: '新規予約者が登録されました。', life: 3000 });
        }
      };

      const resetClient = () => {
        client.value.id = null;
        client.value.name = '';
        client.value.name_kana = '';
        client.value.name_kanji = '';
        client.value.full_name_key = '';
        client.value.legal_or_natural_person = 'legal';
        client.value.gender = 'other';
        client.value.date_of_birth = null;
        client.value.email = '';
        client.value.phone = '';
        client.value.fax = '';

        isClientSelected.value = false;
      };
  
      onMounted(async () => { 
        // console.log('Client ID:', props.client_id);       
        await fetchClients();
        if (props.client_id) {
          const selectedClient = clients.value.find((client) => client.id === props.client_id);
          if (selectedClient) {
            client.value = { 
                ...selectedClient,
                display_name: selectedClient.name_kanji || selectedClient.name,
            };
          }
        }
        // console.log('Client:', client.value);
        isClientSelected.value = true;
        
      });

      watch(client, async (newValue, oldValue) => {
          // console.log('Client changed:', newValue);                   
      }, { deep: true });
      watch(() => client.value.legal_or_natural_person,
        (newValue) => {
          if (newValue === 'legal') {
            //console.log('Changed to other');
            client.value.gender = 'other';
          } 
          if (newValue === 'natural' && client.value.id == null){
            client.value.gender = 'male';
          }
        },
      );
      watch(() => client.value.display_name,
        async (newValue, oldValue) => {
          //console.log('Changed name:', newValue); 
          //console.log('Selected client:', client.value);
          if(client.value && oldValue !== undefined){   
            const selectedName = client.value.name_kanji || client.value.name;
            //console.log('Selected name:', selectedName); 
            const clientName = await fetchClientNameConversion(client.value.display_name);
            
            if (newValue && newValue !== oldValue && newValue !== selectedName) {            
              // Reset fields if name changes and a client was previously selected
              // console.log('Resetting client details'); 
              resetClient();
              // console.log('clientName:', clientName);
              
              client.value.name = clientName.name;
              // console.log('clientName name:', clientName.name);
              client.value.name_kana = clientName.nameKana;
              // console.log('clientName nameKana:', clientName.nameKana);
              client.value.name_kanji = clientName.nameKanji;
              // console.log('clientName nameKanji:', clientName.nameKanji);
            }
          }
        },
        { immediate: true }
      );
      
  
      return {
        client,
        personTypeOptions,
        emailPattern,
        isValidEmail,
        phonePattern,
        isValidPhone,
        validateEmail,
        validatePhone,
        isClientSelected,
        selectedClient,
        filteredClients,        
        filterClients,
        onClientSelect,
        saveClient,
      };
    },
  };
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