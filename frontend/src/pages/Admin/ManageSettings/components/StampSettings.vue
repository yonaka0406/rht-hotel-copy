<template>
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
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Image from 'primevue/image';
import InputText from 'primevue/inputtext';
import { useSettingsStore } from '@/composables/useSettingsStore';

const toast = useToast();
const { getCompanyStampImageUrl, uploadCompanyStamp } = useSettingsStore();

const selectedFile = ref(null);
const currentStampImageUrl = ref('');
const isLoading = ref(false);
const fileInputRef = ref(null);
const stampImageLoaded = ref(false);

const updateStampUrl = async () => {
    stampImageLoaded.value = false;
    try {
        const imageUrl = await getCompanyStampImageUrl();
        if (imageUrl) {
            currentStampImageUrl.value = imageUrl + '?t=' + new Date().getTime(); // Add cache-busting query param
        } else {
            currentStampImageUrl.value = '';
            stampImageLoaded.value = false;
        }
    } catch (error) {
        console.error("ストアからの会社印鑑URL取得失敗:", error);
        currentStampImageUrl.value = '';
        stampImageLoaded.value = false;
        toast.add({ severity: 'error', summary: '印鑑取得エラー', detail: error.message || '印鑑画像の読み込みに失敗しました。', life: 3000 });
    }
};

const handleStampImageLoad = () => {
    stampImageLoaded.value = true;
};

const handleStampImageError = () => {
    console.warn('会社印鑑画像の読み込み失敗 元URL:', currentStampImageUrl.value);
    stampImageLoaded.value = false;
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
        if (fileInputRef.value) fileInputRef.value.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new window.Image();
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
        const result = await uploadCompanyStamp(selectedFile.value);
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

onMounted(() => {
    updateStampUrl();
});
</script>
