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
                    <div class="flex grid xs:grid-cols-1 grid-cols-2 xl:grid-cols-3 gap-2 gap-y-6 pt-6">
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
                            <small v-if="!isValidPhone" class="p-error">有効な電話番号を入力してください。</small>
                            </FloatLabel>
                        </div>                            
                    </div>
                    <!-- Save button -->                
                    <div class="flex justify-center items-center mt-3">
                        <Button label="保存" severity="info" type="submit" />
                    </div>
                </form>
            </div>
            <div v-else>
                <p>Loading...</p>
            </div>
        </template>
    </Card>
</template>
<script setup>
    import { ref, onMounted, watch } from 'vue';
    import { useRoute } from 'vue-router';
    import { useClientStore } from '@/composables/useClientStore';
    import { useToast } from 'primevue/usetoast';
    import { Card, FloatLabel, InputText, DatePicker, SelectButton, RadioButton, Button } from 'primevue';  

    const route = useRoute();
    const toast = useToast();
    const { selectedClient, fetchClient, updateClientInfoCRM } = useClientStore();
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

        
        
        console.log("Client to save:", client.value);

        await updateClientInfoCRM(client.value.id, client.value);
        
        toast.add({ severity: 'success', summary: 'Success', detail: '顧客情報が編集されました。', life: 3000 });    
    };

    onMounted(async () => {        
        try {            
            loadingBasicInfo.value = true;
            await fetchClient(clientId.value);
            client.value = selectedClient.value.client;
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