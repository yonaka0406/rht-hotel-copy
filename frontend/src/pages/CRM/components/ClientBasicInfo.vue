<template>
    <Card>
        <template #title>
            <span>顧客情報</span>
        </template>
        <template #subtitle>
            <span></span>
        </template>
        <template #content>    
            <div v-if="client">
                
                <form @submit.prevent="saveClient">
                    <div class="flex grid sm:grid-cols-1 grid-cols-2 xl:grid-cols-3 gap-2 gap-y-6 pt-6">
                        <!-- Name of the client -->
                        <div class="field col-6">
                            <FloatLabel>
                                <InputText id="name" v-model="client.name" fluid required />
                                <label for="name">氏名・名称</label>
                            </FloatLabel>
                        </div>
                        <div class="field col-6">
                            <FloatLabel>
                                <label for="name_kana">カナ</label>
                                <InputText id="name_kana" v-model="client.name_kana" fluid />
                            </FloatLabel>                        
                        </div>
                        <div class="field col-6">
                            <FloatLabel>
                                <label for="name_kanji">漢字</label>
                                <InputText id="name_kanji" v-model="client.name_kanji" fluid />
                            </FloatLabel>                        
                        </div>
                        <div class="field col-6">                        
                            <FloatLabel>                            
                                <label for="date_of_birth">生年月日・設立日</label>
                                <DatePicker v-model="client.date_of_birth"
                                    :showIcon="true" 
                                    iconDisplay="input"                      
                                    dateFormat="yy-mm-dd" 
                                    :selectOtherMonths="true"                 
                                    fluid
                                />
                            </FloatLabel>                        
                        </div>
                        <!-- Type of person (Legal or Natural) -->
                        <div class="field col-4">
                            <SelectButton 
                                v-model="client.legal_or_natural_person" 
                                :options="personTypeOptions" 
                                option-label="label" 
                                option-value="value"
                                fluid                        
                            />
                        </div>
                        <!-- Gender input if person is natural -->
                        <div class="field col-4">          
                            <div v-if="client.legal_or_natural_person === 'natural'" class="flex gap-3">
                                <RadioButton
                                    v-model="client.gender"
                                    :inputId="'male'"
                                    :value="'male'"                            
                                />
                                <label for="male">男性</label>
                                <RadioButton
                                    v-model="client.gender"
                                    :inputId="'female'"
                                    :value="'female'"                            
                                />
                                <label for="female">女性</label>
                                <RadioButton
                                    v-model="client.gender"
                                    :inputId="'other'"
                                    :value="'other'"                            
                                />
                                <label for="other">その他</label>
                            </div>
                        </div>
                        <!-- Email input -->
                        <div class="field col-4">
                            <FloatLabel>
                                <InputText 
                                    v-model="client.email"
                                    :pattern="emailPattern"
                                    :class="{'p-invalid': !isValidEmail}"
                                    @input="validateEmail(client.email)"
                                    fluid                         
                                />
                                <label>メールアドレス</label>
                                <small v-if="!isValidEmail" class="p-error">有効なメールアドレスを入力してください。</small>
                            </FloatLabel>
                        </div>
                        <!-- Phone number input -->
                        <div class="field col-4">
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
                        <div class="field col-4">
                            <FloatLabel>
                            <InputText
                                v-model="client.fax"
                                :pattern="phonePattern"
                                :class="{'p-invalid': !isValidFAX}"
                                @input="validateFAX(client.fax)"
                                fluid
                            />
                            <label>FAX</label>
                            <small v-if="!isValidFAX" class="p-error">有効な電話番号を入力してください。</small>
                            </FloatLabel>
                        </div>
                        <!-- Website URL -->
                        <div class="field col-4">
                            <FloatLabel>
                                <InputText v-model="client.website" fluid />
                                <label>ウェブサイト</label>
                            </FloatLabel>
                        </div>
                        <!-- Billing preference -->
                        <div class="field col-4">                            
                            <SelectButton 
                                v-model="client.billing_preference" 
                                :options="billingOptions" 
                                option-label="label" 
                                option-value="value"
                                fluid                        
                            />                            
                        </div>
                        <!-- Customer ID -->
                        <div class="field col-4">
                            <FloatLabel>
                                <InputNumber v-model="client.customer_id" :min="0" fluid />
                                <label>顧客ID</label>
                            </FloatLabel>
                        </div>
                        <!-- Comment -->
                        <div class="field col-span-3">
                            <FloatLabel>
                                <Textarea v-model="client.comment" fluid />                                
                                <label>備考</label>
                            </FloatLabel>
                        </div>
                    </div>
                    <!-- Save button -->                
                    <div class="flex justify-center items-center mt-3">
                        <Button label="保存" severity="info" type="submit" />
                    </div>
                </form>

                <Card class="mt-4">
                    <template #title>
                        <small>所属グループ</small>
                    </template>
                    <template #content>
                        <div v-if="client.client_group_id">
                            
                            
                        </div>
                        <div v-else>
                            <form @submit.prevent="saveGroup">
                                <div class="flex grid grid-cols-12 gap-4">                                    
                                    <div class="col-span-1"></div>
                                    <Select
                                        v-model="selectedGroupId"
                                        :options="groups"
                                        optionLabel="name" 
                                        optionValue="id"
                                        :virtualScrollerOptions="{ itemSize: 38 }"
                                        fluid
                                        placeholder="所属グループ選択"
                                        class="col-span-6"
                                        filter
                                    />
                                    <Button 
                                        label="グループに追加" 
                                        class="col-span-2" 
                                        severity="info"
                                        type="submit"
                                    />
                                    <Button 
                                        label="新規グループ" 
                                        class="col-span-2"
                                        @click="openNewGroup"
                                    />
                                </div>
                            </form>
                        </div>
                        
                    </template>
                </Card>
                
            </div>
            <div v-else>
                <p>Loading...</p>
            </div>
        </template>
    </Card>
    
    <Dialog v-model:visible="newGroupDialog" header="新規グループ作成" :modal="true" :style="{ width: '50vw' }">
        
            <div>
                <div class="mt-6">
                    <FloatLabel>
                        <label for="groupName" class="font-bold">グループ名</label>
                        <InputText id="groupName" v-model="newGroupName" class="w-full" required />
                    </FloatLabel>
                </div>
                <div class="mt-6">
                    <FloatLabel>
                        <label for="groupComment" class="font-bold">コメント</label>
                        <Textarea id="groupComment" v-model="newGroupComment" rows="2" fluid />
                    </FloatLabel>
                </div>                
            </div>
            <template #footer>
                <Button label="キャンセル" icon="pi pi-times" class="p-button-danger p-button-text p-button-sm" @click="newGroupDialog = false" />
                <Button label="作成" icon="pi pi-check" class="p-button-success p-button-text p-button-sm" @click="createNewGroup" />
            </template>    
        
    </Dialog>
    
</template>
<script setup>
    // Vue
    import { ref, onMounted, watch } from 'vue';
    import { useRoute } from 'vue-router';
    const route = useRoute();

    // Stores
    import { useClientStore } from '@/composables/useClientStore';
    const { groups, selectedClient, fetchClient, fetchCustomerID, updateClientInfoCRM, fetchClientGroups } = useClientStore();

    // Primevue
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();
    import { Card, Dialog, FloatLabel, InputText, InputNumber, DatePicker, Select, SelectButton, RadioButton, Textarea, Button } from 'primevue';
    
    // Client
    const clientId = ref(route.params.clientId);
    const client = ref({
        legal_or_natural_person: 'natural',
    });
    const loadingBasicInfo = ref(false);
    const personTypeOptions = [
        { label: '法人', value: 'legal' },
        { label: '個人', value: 'natural' },
    ];
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const isValidEmail = ref(true);
    const phonePattern = /^[+]?[0-9]{1,4}[ ]?[-]?[0-9]{1,4}[ ]?[-]?[0-9]{1,9}$/;
    const isValidPhone = ref(true);
    const isValidFAX = ref(true);
    const billingOptions = [
        { label: '紙請求', value: 'paper' },
        { label: '電子請求', value: 'digital' },
    ];

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
    const validateFAX = (phone) => {
        isValidFAX.value = phonePattern.test(phone);
    };
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };
    
    const saveClient = async () => {

        if(client.value.date_of_birth) { 
            client.value.date_of_birth = formatDate(client.value.date_of_birth);
        }else{
            client.value.date_of_birth = null;
        }
        if(!client.value.email && !client.value.phone) {
            toast.add({ severity: 'error', summary: 'Error', detail: 'メールアドレス又は電話番号を入力してください。', life: 3000 });
            return;
        }
        if(client.value.email && !isValidEmail.value) {
            toast.add({ severity: 'error', summary: 'Error', detail: '有効なメールアドレスを入力してください。', life: 3000 });
            return;
        }
        if(client.value.phone && !isValidPhone.value) {
            toast.add({ severity: 'error', summary: 'Error', detail: '有効な電話番号を入力してください。', life: 3000 });
            return;
        }        
        const validateCustomerId = await fetchCustomerID(client.value.id, client.value.customer_id);

        if(validateCustomerId.client.length > 0) {
            toast.add({ severity: 'error', summary: 'Error', detail: '顧客IDはすでに利用中です。', life: 3000 });
            return;
        }

        await updateClientInfoCRM(client.value.id, client.value);
        
        toast.add({ severity: 'success', summary: 'Success', detail: '顧客情報が編集されました。', life: 3000 });    
    };

    // Group
    const selectedGroupId = ref(null);
    const newGroupDialog = ref(false);
    const newGroupName = ref('');
    const newGroupComment = ref('');
    const saveGroup = async () => {
        console.log('selectedGroupId', selectedGroupId.value);
        console.log('clientId', clientId.value);
    };
    const openNewGroup = () => {
        newGroupDialog.value = true;
    };
    const createNewGroup = () => {
  
        const data = {
            name: newGroupName.value, 
            comment: newGroupComment.value,
            clientId: clientId.value
        }
        console.log('createNewGroup', data);
  
        newGroupDialog.value = false;
  
    };

    onMounted(async () => {        
        try {            
            loadingBasicInfo.value = true;
            
            await fetchClient(clientId.value);
            await fetchClientGroups();
            
            client.value = selectedClient.value.client;
            selectedGroupId.value = client.value.client_group_id;

            loadingBasicInfo.value = false;            
        } catch (error) {
            console.error("Error fetching client data:", error);      
        }
    });

    // Watchers        
    watch(
        () => client.value.legal_or_natural_person, // Access with.value
        (newValue, oldValue) => {            
            if (newValue === 'legal') {           
                client.value.gender = 'other';
            }            
        }
    );
</script>