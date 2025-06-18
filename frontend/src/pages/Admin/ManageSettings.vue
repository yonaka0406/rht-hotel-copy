<template>
    <div class="p-4">
        <Panel header="その他の設定">
            <Card class="mb-2">
                <template #title>
                    <div class="grid grid-cols-4 border-b">
                        <div class="flex col-span-3 justify-center items-center mb-2">
                            <h3 class="text-lg font-semibold text-gray-700">支払方法</h3>
                        </div>                    
                        <div class="flex justify-end mb-2">
                            <Button @click="showPaymentDialog = true"
                                icon="pi pi-plus"
                                label="方法追加"
                                class="p-button-right"
                            ></Button>
                        </div>
                    </div>
                </template>
                <template #content>
                    <DataTable :value="paymentTypes"
                        paginator :rows="5"
                    >
                    <Column header="ホテルID">
                        <template #body="slotProps">
                            <Select v-model="slotProps.data.hotel_id" 
                                :options="hotels" 
                                optionLabel="name"
                                optionValue="id"
                                disabled
                                fluid
                            />
                        </template>
                    </Column>
                    <Column field="name" header="名称"></Column>
                    <Column field="transaction" header="支払い区分">
                        <template #body="{ data }">
                            <Tag :value="getTransactionLabel(data.transaction)" :style="{ backgroundColor: getTransactionColor(data.transaction), color: 'white' }" />
                        </template>
                    </Column>
                    <Column field="description" header="詳細">
                        <template #body="{ data }">
                            <InputText v-model="data.description" @blur="updatePaymentDescription(data)" />
                        </template>
                    </Column>
                    <Column field="visible" header="表示">
                        <template #body="{ data }">
                            <ToggleSwitch v-model="data.visible" @change="togglePaymentVisibility(data)" />
                        </template>
                    </Column>
                    </DataTable>
                </template>
            </Card>
            <Card class="mb-2">
                <template #title>
                    <div class="grid grid-cols-4 border-b">
                        <div class="flex col-span-3 justify-center items-center mb-2">
                            <h3 class="text-lg font-semibold text-gray-700">税区分</h3>
                        </div>
                        <div class="flex justify-end mb-2">
                            <Button @click="showTaxDialog = true"
                                icon="pi pi-plus"
                                label="税区分追加"
                                class="p-button-right"
                            ></Button>
                        </div>
                    </div>
                </template>
                <template #content>
                    <DataTable :value="taxTypes"
                        paginator :rows="5"
                    >                    
                    <Column field="name" header="税区分名"></Column>                    
                    <Column field="percentage" header="税率">
                        <template #body="{ data }">
                            {{ Intl.NumberFormat('ja-JP', { style: 'percent', minimumFractionDigits: 2 }).format(data.percentage) }}
                        </template>                        
                    </Column>   
                    <Column field="description" header="詳細">
                        <template #body="{ data }">
                            <InputText v-model="data.description" @blur="updateTaxDescription(data)" fluid />
                        </template>
                    </Column>
                    <Column field="visible" header="表示">
                        <template #body="{ data }">
                            <ToggleSwitch v-model="data.visible" @change="toggleTaxVisibility(data)" />
                        </template>
                    </Column>
                    </DataTable>
                </template>
            </Card>

            <Card class="mb-2">
                <template #title>
                    <div class="flex justify-center items-center py-3 border-b">
                        <h3 class="text-lg font-semibold text-gray-700">会社印鑑</h3>
                    </div>
                </template>
                <template #content>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="flex flex-col items-center">
                            <p class="font-semibold mb-2">現在の印鑑</p>
                            <Image :src="currentStampImageUrl" alt="会社印鑑" width="150" preview @load="handleStampImageLoad" @error="handleStampImageError" />
                            <small v-if="!currentStampImageUrl" class="mt-2">アップロードされていません</small>
                        </div>
                        <div class="flex flex-col items-center justify-center">
                            <InputText type="file" 
                                @change="handleFileChange"                                
                                accept="image/png"
                                ref="fileInputRef"
                                class="mb-2"
                            />
                            <Button @click="uploadStamp" 
                                label="新しい印鑑をアップロード" 
                                icon="pi pi-upload" 
                                class="p-button-primary"
                                :loading="isLoading"
                                :disabled="!selectedFile || isLoading" />
                            <small class="mt-2">PNG画像は150x150px以上、1MB以内</small>
                        </div>
                    </div>
                </template>
            </Card>

        </Panel> 
    </div>

    <Dialog header="支払い方法追加" v-model:visible="showPaymentDialog" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true">
        <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 pt-6">
            <div class="col-span-1 mb-4">
                <FloatLabel>
                    <InputText v-model="newPaymentData.name" />
                    <label>名称</label>
                </FloatLabel>
            </div>
            <div class="col-span-1 mb-4">
                <FloatLabel>
                    <Select v-model="newPaymentData.transaction" 
                        :options="transactionOptions" 
                        optionLabel="label"
                        optionValue="value"
                        fluid
                    />
                    <label>支払い区分</label>
                </FloatLabel>
            </div>
            <div class="col-span-2 mb-4">
                <FloatLabel>
                    <Textarea v-model="newPaymentData.description" fluid />
                    <label>詳細</label>
                </FloatLabel>                
            </div>
            <div class="col-span-1 mb-4">
                <FloatLabel>
                    <Select v-model="newPaymentData.hotel_id" 
                        :options="hotels" 
                        optionLabel="name"
                        optionValue="id"
                        showClear
                        fluid
                    />
                    <label>ホテル限定</label>
                </FloatLabel>
            </div>  
            <div class="col-span-2 mb-2 flex justify-center">
                <Button @click="addNewPaymentData"
                    icon="pi pi-plus"
                    label="新規作成"
                    class="p-button-right"
                ></Button>
            </div>
        </div>
    </Dialog>

    <Dialog header="税区分追加" v-model:visible="showTaxDialog" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true">
        <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 pt-6">
            <div class="col-span-1 mb-4">
                <FloatLabel>
                    <InputText v-model="newTaxData.name" />
                    <label>税区分名</label>
                </FloatLabel>
            </div>
            <div class="col-span-1 mb-4">
                <FloatLabel>
                    <InputNumber v-model="newTaxData.percentage"
                        suffix="%"
                        :min="0" :max="100"
                        :step="0.01"
                    />
                    <label>税率</label>
                </FloatLabel>
            </div>
            <div class="col-span-2 mb-4">
                <FloatLabel>
                    <Textarea v-model="newTaxData.description" fluid />
                    <label>詳細</label>
                </FloatLabel>                
            </div>             
            <div class="col-span-2 mb-2 flex justify-center">
                <Button @click="addNewTaxData"
                    icon="pi pi-plus"
                    label="新規作成"
                    class="p-button-right"
                ></Button>
            </div>
        </div>
    </Dialog>

</template>

<script setup>
    // Vue
    import { ref, onMounted } from "vue"; 

    // Primevue
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();
    import { Panel, Card, Tag, Button, DataTable, Column, Dialog, FloatLabel, InputText, InputNumber, ToggleSwitch, Select, Textarea, Image, FileUpload } from "primevue";

    // Stores
    import { useSettingsStore } from '@/composables/useSettingsStore';
    const { paymentTypes, fetchPaymentTypes, createPaymentType, alterPaymentTypeVisibility, alterPaymentTypeDescription,
        taxTypes, fetchTaxTypes, createTaxType, alterTaxTypeVisibility, alterTaxTypeDescription,
        getCompanyStampImageUrl, uploadCompanyStamp
     } = useSettingsStore();
    import { useHotelStore } from '@/composables/useHotelStore';
    const { hotels, fetchHotels } = useHotelStore();


    // Stamp Image Upload
    const selectedFile = ref(null);
    const currentStampImageUrl = ref('');
    const isLoading = ref(false);
    const fileInputRef = ref(null);
    const stampImageLoaded = ref(false);
    const stampImageAttempted = ref(false);
    
    const updateStampUrl = async () => { // Make it async
        stampImageLoaded.value = false;
        stampImageAttempted.value = true;
        try {
            const imageUrl = await getCompanyStampImageUrl(); // Call the store function
            if (imageUrl) {
                currentStampImageUrl.value = imageUrl;
                // The @load and @error events on the <Image> component will handle stampImageLoaded
            } else {
                currentStampImageUrl.value = ''; // Or set to a placeholder if image not found
                stampImageLoaded.value = false; // Explicitly set if no URL
            }
        } catch (error) {
            console.error("ストアからの会社印鑑URL取得失敗:", error);
            currentStampImageUrl.value = ''; // Clear or set to placeholder on error
            stampImageLoaded.value = false;
            toast.add({ severity: 'error', summary: '印鑑取得エラー', detail: error.message || '印鑑画像の読み込みに失敗しました。', life: 3000 });
        }
    };

    const handleStampImageLoad = () => {
        stampImageLoaded.value = true;
    };

    const handleStampImageError = () => {
        // This means the image at currentStampImageUrl (likely /api/components/stamp.png)
        // could not be loaded. It might not exist, or there was a server error.
        console.warn('会社印鑑画像の読み込み失敗 元URL:', currentStampImageUrl.value);
        stampImageLoaded.value = false;
        // currentStampImageUrl.value = ''; // Optionally clear the URL if it's known to be invalid
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) {
            selectedFile.value = null;
            return;
        }

        if (file.size > 1 * 1024 * 1024) { // 1MB
            toast.add({ severity: 'warn', summary: 'ファイルサイズ超過', detail: '画像は1MB以内である必要があります。', life: 4000 });
            selectedFile.value = null;
            if (fileInputRef.value) fileInputRef.value.value = ''; // Reset file input
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new window.Image(); // Use window.Image to avoid conflict with PrimeVue Image component
            img.onload = () => {
                if (img.width < 150 || img.height < 150) {
                    toast.add({ severity: 'warn', summary: '画像サイズエラー', detail: '画像は150x150px以上である必要があります。', life: 4000 });
                    selectedFile.value = null;
                    if (fileInputRef.value) fileInputRef.value.value = '';
                } else {
                    selectedFile.value = file;
                }
            };
            img.onerror = () => {
                toast.add({ severity: 'error', summary: 'ファイルエラー', detail: '無効な画像ファイルです。', life: 3000 });
                selectedFile.value = null;
                if (fileInputRef.value) fileInputRef.value.value = '';
            };
            img.src = e.target.result;
        };
        reader.onerror = () => {
            toast.add({ severity: 'error', summary: 'ファイルエラー', detail: 'ファイルの読み込みに失敗しました。', life: 3000 });
            selectedFile.value = null;
            if (fileInputRef.value) fileInputRef.value.value = '';
        };
        reader.readAsDataURL(file);
    };

    const uploadStamp = async () => {
        if (!selectedFile.value) {
            toast.add({ severity: 'warn', summary: 'ファイル未選択', detail: 'アップロードするファイルを選択してください。', life: 3000 });
            return;
        }

        isLoading.value = true;
        
        try {
            // Call the action from the store
            const result = await uploadCompanyStamp(selectedFile.value);

            // The store action should throw an error on failure or return success data
            // For this example, we assume it returns an object with a message on success
            // and throws an error (which will be caught here) on failure.
            
            toast.add({ severity: 'success', summary: '成功', detail: result.message || '印鑑を更新しました。', life: 3000 });
            updateStampUrl(); 
            selectedFile.value = null;
            if (fileInputRef.value) {
                fileInputRef.value.value = ''; 
            }
        } catch (error) {
            console.error("印鑑アップロードエラー (コンポーネントより):", error);
            toast.add({ severity: 'error', summary: 'アップロード失敗', detail: error.message || '不明なエラーが発生しました。', life: 4000 });
        } finally {
            isLoading.value = false;
        }
    };

    // Payments
    const showPaymentDialog = ref(false);
    const newPaymentData = ref(null);
    const transactionOptions = [
        { label: '現金', value: 'cash', color: '#28a745' },
        { label: '振込', value: 'wire', color: '#007bff' },
        { label: 'クレジットカード', value: 'credit', color: '#6f42c1' },
        { label: '請求書', value: 'bill', color: '#fd7e14' },
        { label: 'ポイント', value: 'point', color: '#e83e8c' },
        { label: '値引き', value: 'discount', color: '#28a784' }
    ];
    const resetNewPaymentData = () => {
        newPaymentData.value = { 
            name: '', 
            description: '', 
            transaction: 'cash',
            hotel_id: null
        };
    };
    const addNewPaymentData = async () => {
        // Validation
        if (!newPaymentData.value.name.trim()) {
            toast.add({ severity: 'warn', summary: '入力エラー', detail: '名称を入力してください。', life: 3000 });
            return;
        }
        const nameExists = paymentTypes.value.some(pt => pt.name === newPaymentData.value.name);
        if (nameExists) {
            toast.add({ severity: 'warn', summary: '入力エラー', detail: 'この名称はすでに存在します。', life: 3000 });
            return;
        }
        const isValidTransaction = transactionOptions.some(opt => opt.value === newPaymentData.value.transaction);
        if (!isValidTransaction) {
            toast.add({ severity: 'warn', summary: '入力エラー', detail: '無効な支払い区分です。', life: 3000 });
            return;
        }

        // console.log('newPaymentData:', newPaymentData.value);
        await createPaymentType(newPaymentData.value);

        toast.add({ severity: 'success', summary: '新規追加', detail: '支払い方法追加されました。', life: 3000 });
        
        resetNewPaymentData();
        await fetchPaymentTypes();

        showPaymentDialog.value = false;
    };
    const getTransactionLabel = (value) => {
        const option = transactionOptions.find(opt => opt.value === value);
        return option ? option.label : value;
    };
    const getTransactionColor = (value) => {
        const option = transactionOptions.find(opt => opt.value === value);
        return option ? option.color : 'gray'; // Default color if not found
    };
    const updatePaymentDescription = async (paymentType) => {
        try {
            await alterPaymentTypeDescription(paymentType.id, paymentType.description);
            
            toast.add({ severity: 'success', summary: '更新完了', detail: '詳細を更新しました。', life: 3000 });
        } catch (error) {
            toast.add({ severity: 'error', summary: 'エラー', detail: '詳細の更新に失敗しました。', life: 3000 });
        }
    };
    const togglePaymentVisibility = async (paymentType) => {
        try {
            await alterPaymentTypeVisibility(paymentType.id, paymentType.visible);
            
            toast.add({ severity: 'success', summary: '更新完了', detail: '表示設定を変更しました。', life: 3000 });
        } catch (error) {
            toast.add({ severity: 'error', summary: 'エラー', detail: '表示設定の更新に失敗しました。', life: 3000 });
        }
    };

    // Tax
    const showTaxDialog = ref(false);
    const newTaxData = ref(null);    
    const resetNewTaxData = () => {
        newTaxData.value = { 
            name: '', 
            description: '', 
            percentage: '0'            
        };
    };
    const addNewTaxData = async () => {
        // Validation
        if (!newTaxData.value.name.trim()) {
            toast.add({ severity: 'warn', summary: '入力エラー', detail: '名称を入力してください。', life: 3000 });
            return;
        }
        const nameExists = taxTypes.value.some(pt => pt.name === newTaxData.value.name);
        if (nameExists) {
            toast.add({ severity: 'warn', summary: '入力エラー', detail: 'この名称はすでに存在します。', life: 3000 });
            return;
        }

        newTaxData.value.percentage = newTaxData.value.percentage / 100;
        // console.log('newTaxData:', newTaxData.value);        
        
        await createTaxType(newTaxData.value);

        toast.add({ severity: 'success', summary: '新規追加', detail: '税区分追加されました。', life: 3000 });
        
        resetNewTaxData();
        await fetchTaxTypes();

        showTaxDialog.value = false;
    };
    const updateTaxDescription = async (taxType) => {
        try {
            await alterTaxTypeDescription(taxType.id, taxType.description);
            
            toast.add({ severity: 'success', summary: '更新完了', detail: '詳細を更新しました。', life: 3000 });
        } catch (error) {
            toast.add({ severity: 'error', summary: 'エラー', detail: '詳細の更新に失敗しました。', life: 3000 });
        }
    };
    const toggleTaxVisibility = async (taxType) => {
        try {
            await alterTaxTypeVisibility(taxType.id, taxType.visible);
            
            toast.add({ severity: 'success', summary: '更新完了', detail: '表示設定を変更しました。', life: 3000 });
        } catch (error) {
            toast.add({ severity: 'error', summary: 'エラー', detail: '表示設定の更新に失敗しました。', life: 3000 });
        }
    };

    onMounted(async () => {        
        await fetchPaymentTypes();
        await fetchHotels();        
        resetNewPaymentData();
        await fetchTaxTypes();
        resetNewTaxData();
        updateStampUrl();
    });
</script>
