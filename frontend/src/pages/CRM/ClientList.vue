<template>
    <div class="min-h-screen">
        <div class="grid grid-cols-12 gap-4">            
            <Card class="flex col-span-12">
                <template #title>
                    顧客一覧
                </template>                
                <template #content>                    
                    <div class="flex justify-end mb-6">
                        <Button                             
                            label="新規顧客" 
                            icon="pi pi-plus"                            
                            @click="dialogOpenClose(true)"
                            class="mr-6"
                        />
                        <SelectButton v-model="tableSize" :options="tableSizeOptions" 
                        optionLabel="label" dataKey="label" />
                    </div>
                    <DataTable
                        v-model:filters="filters"
                        :value="clients"
                        dataKey="id"
                        filterDisplay="row"
                        :loading="clientsIsLoading"
                        :size="tableSize.value"
                        tableStyle="min-width: 50rem"
                        stripedRows 
                        paginator 
                        :rows="10"
                        :rowsPerPageOptions="[5, 10, 25, 50]"
                        removableSort 
                    >
                    <template #empty> 顧客見つかりません </template>
                    <template v-if="clientsIsLoading">                            
                        <Skeleton class="mb-3" width="100%" height="3rem" />                                
                        <div class="grid grid-cols-6 gap-3 mb-3" v-for="i in 10":key="i"> 
                            <Skeleton width="100%" height="1.5rem" v-for="j in 6":key="j" /> 
                        </div>                            
                    </template>
                    <template v-else>
                        <Column field="id" header="操作">
                            <template #body="slotProps">
                                <Button 
                                    @click="goToEditClientPage(slotProps.data.id)"
                                    severity="info"
                                    class="p-button-rounded p-button-text p-button-sm"
                                >
                                    <i class="pi pi-pencil"></i>
                                </Button>
                            </template>
                        </Column>
                        <Column header="氏名・名称" filterField="name" sortable>
                            <template #body="{ data }">
                                {{ data.name }}
                            </template>
                            <template #filter="{ filterModel, filterCallback }">
                                <InputText v-model="filterModel.value" type="text" @input="filterCallback()" placeholder="氏名・名称検索" />
                            </template>
                        </Column>
                        <Column header="氏名・名称（漢字）" filterField="name_kanji" sortable>
                            <template #body="{ data }">
                                {{ data.name_kanji }}
                            </template>
                            <template #filter="{ filterModel, filterCallback }">
                                <InputText v-model="filterModel.value" type="text" @input="filterCallback()" placeholder="氏名・名称（漢字）検索" />
                            </template>
                        </Column>
                        <Column header="氏名・名称（カナ）" filterField="name_kana" sortable>
                            <template #body="{ data }">
                                {{ data.name_kana }}
                            </template>
                            <template #filter="{ filterModel, filterCallback }">
                                <InputText v-model="filterModel.value" type="text" @input="filterCallback()" placeholder="氏名・名称（カナ）検索" />
                            </template>
                        </Column>
                        <Column field="legal_or_natural_person" header="法人 / 個人">
                            <template #body="slotProps">
                                <span v-if="slotProps.data.is_legal_person">                                    
                                    <Tag icon="pi pi-building" severity="secondary" value="法人"></Tag>
                                </span>
                                <span v-else>
                                    <Tag icon="pi pi-user" severity="info" value="個人"></Tag>
                                </span>                                
                            </template>                                                       
                        </Column>
                        <Column header="電話番号" filterField="phone">
                            <template #body="{ data }">
                                {{ data.phone }}
                            </template>
                            <template #filter="{ filterModel, filterCallback }">
                                <InputText v-model="filterModel.value" type="text" @input="filterCallback()" placeholder="電話番号検索" />
                            </template>
                        </Column>                        
                        <Column header="メールアドレス" filterField="email" sortable>
                            <template #body="{ data }">
                                {{ data.email }}
                            </template>
                            <template #filter="{ filterModel, filterCallback }">
                                <InputText v-model="filterModel.value" type="text" @input="filterCallback()" placeholder="メールアドレス検索" />
                            </template>
                        </Column>
                    </template>                         
                        
                    </DataTable>                    
                </template>
            </Card>            
        </div>
    </div>

    <Dialog 
        v-model:visible="dialogVisible" 
        :header="'新規顧客登録'" 
        :closable="true"
        :modal="true"
        :style="{ width: '600px' }"
    >
        <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 gap-y-6 pt-6">
            <!-- Name of the person -->
            <div class="col-span-2 mb-6">
                <FloatLabel>
                    <InputText
                        v-model="newClient.name" 
                        fluid
                    />
                    <label>個人氏名　||　法人名称　【漢字又はローマ字】</label>
                </FloatLabel>
            </div>
            <div class="col-span-2 mb-6">
                <FloatLabel>
                    <InputText
                        v-model="newClient.name_kana" 
                        fluid
                    />
                    <label>カナ</label>
                </FloatLabel>
            </div>            
            <!-- Type of person (Legal or Natural) -->
            <div class="col-6">
                <SelectButton 
                    v-model="newClient.legal_or_natural_person" 
                    :options="personTypeOptions" 
                    option-label="label" 
                    option-value="value"
                    fluid
                />
            </div>
            <!-- Gender input if person is natural -->
            <div class="field col-6">
                <div v-if="newClient.legal_or_natural_person === 'natural'" class="flex gap-3">
                    <div v-for="option in genderOptions" :key="option.value" class="flex items-center gap-2">
                        <RadioButton
                            v-model="newClient.gender"
                            :inputId="option.value"
                            :value="option.value"                            
                        />
                        <label :for="option.value">{{ option.label }}</label>
                    </div>
                </div>
            </div>
            <!-- Email input -->
            <div class="col-6">
                <FloatLabel>
                <InputText 
                    v-model="newClient.email"
                    :pattern="emailPattern"
                    :class="{'p-invalid': !isValidEmail}"
                    @input="validateEmail(newClient.email)"
                    fluid                    
                />
                <label>メールアドレス</label>
                <small v-if="!isValidEmail" class="p-error">有効なメールアドレスを入力してください。</small>
                </FloatLabel>
            </div>
            <!-- Phone number input -->
            <div class="col-6">
                <FloatLabel>
                <InputText
                    v-model="newClient.phone"
                    :pattern="phonePattern"
                    :class="{'p-invalid': !isValidPhone}"
                    @input="validatePhone(newClient.phone)"
                    fluid
                />
                <label>電話番号</label>
                <small v-if="!isValidPhone" class="p-error">有効な電話番号を入力してください。</small>
                </FloatLabel>
            </div>
            
        </div>
        <template #footer>
            <Button label="閉じる" icon="pi pi-times" @click="dialogOpenClose(false)" class="p-button-danger p-button-text p-button-sm" />
            <Button label="保存" icon="pi pi-check" @click="submitClient" class="p-button-success p-button-text p-button-sm" />
        </template> 
    </Dialog>
</template>
  
<script setup>
    import { ref, onMounted } from "vue";
    import { useRouter } from 'vue-router';
    import { useClientStore } from '@/composables/useClientStore';
    import { Card, Skeleton, DataTable, Column, Dialog, FloatLabel, SelectButton, RadioButton,  InputText, Button, Tag } from 'primevue';
    import { FilterMatchMode } from '@primevue/core/api';

    const router = useRouter();
    const { clients, clientsIsLoading, createBasicClient } = useClientStore();

    // Data table            
    const tableSize = ref({ label: '中', value: 'null' });
    const tableSizeOptions = ref([
        { label: '小', value: 'small' },
        { label: '中', value: 'null' }
    ]);
    const person_type = ref([
        { name: 'legal', value: 'legal' },
        { name: 'natural', value: 'natural' },
    ]);    
    const filters = ref({        
        name: { value: null, matchMode: FilterMatchMode.CONTAINS },
        name_kanji: { value: null, matchMode: FilterMatchMode.CONTAINS },
        name_kana: { value: null, matchMode: FilterMatchMode.CONTAINS },        
        phone: { value: null, matchMode: FilterMatchMode.CONTAINS },
        email: { value: null, matchMode: FilterMatchMode.CONTAINS }
    });

    const goToEditClientPage = (clientId) => {        
        router.push({ name: 'ClientEdit', params: { clientId: clientId } });
    };

    // Dialog
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
    const dialogVisible = ref(false);
    const dialogOpenClose = (bool) => {
        dialogVisible.value = bool;        
    };
    const newClient = ref({});
    const newClientReset = () => {
        newClient.value = {
            name: null,            
            name_kana: null,
            legal_or_natural_person: null,
            gender: 'other',
            phone: null,
            email: null,
        }
    };
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
    const submitClient = async () => {
        // Validate email and phone
        validateEmail(newClient.value.email);
        validatePhone(newClient.value.phone);        

        // Check if either email or phone is filled
        if (!newClient.value.name && !newClient.value.name_kana) {
            toast.add({
                severity: 'warn',
                summary: '注意',
                detail: '氏名・名称またはカナの少なくとも 1 つを入力する必要があります。',
                life: 3000,
            });
            return;
        }
        // Check if either email or phone is filled
        if (!newClient.value.email && !newClient.value.phone) {
            toast.add({
                severity: 'warn',
                summary: '注意',
                detail: 'メールアドレスまたは電話番号の少なくとも 1 つを入力する必要があります。',
                life: 3000,
            });
            return;
        }
        // Check for valid email format
        if (newClient.value.email && !isValidEmail.value) {
            toast.add({
                severity: 'warn',
                summary: '注意',
                detail: '有効なメールアドレスを入力してください。',
                life: 3000,
            });
            return;
        }
        // Check for valid phone format
        if (newClient.value.phone && !isValidPhone.value) {
            toast.add({
                severity: 'warn',
                summary: '注意',
                detail: '有効な電話番号を入力してください。',
                life: 3000,
            });
            return;
        }      
        
        const newBasicClient = await createBasicClient(newClient.value.name, newClient.value.name_kana, newClient.value.legal_or_natural_person, newClient.value.gender, newClient.value.email, newClient.value.phone);

        goToEditClientPage(newBasicClient.id);
    };

    onMounted( async () => {  
        // console.log(clients);
        newClientReset();
    });

</script>
<style scoped>
</style>