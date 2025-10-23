
<template>
    <Card class="shadow-lg rounded-lg overflow-hidden mt-2">
        <template #title>
            <div class="p-5 bg-green-600 text-white text-xl">
            実績データのインポート
            </div>
        </template>
        <template #content>
            <div class="p-5 space-y-6">
            <div>
                <h3 class="text-lg font-medium text-gray-700 mb-2">ステップ1: テンプレートのダウンロード</h3>
                <p class="text-sm text-gray-600 mb-3">
                以下のボタンをクリックしてCSVテンプレートをダウンロードし、実績データを入力してください。
                </p>
                <div class="flex items-center gap-2">
                    <DatePicker v-model="accountingDate" dateFormat="yy/mm/dd" />
                    <Button
                    label="実績テンプレートをダウンロード"
                    icon="pi pi-download"
                    class="p-button-success"
                    @click="downloadTemplate('accounting', accountingDate)"
                    />
                </div>
            </div>

            <div class="border-t border-gray-200 pt-6">
                <h3 class="text-lg font-medium text-gray-700 mb-2">ステップ2: CSVファイルのアップロード</h3>
                <p class="text-sm text-gray-600 mb-3">
                入力済みの実績CSVファイルをアップロードしてください。
                </p>
                <FileUpload
                    name="accountingFile"
                    @uploader="handleAccountingUpload"
                    :multiple="false"
                    accept=".csv"
                    :maxFileSize="maxFileSize"
                    chooseLabel="ファイルを選択"
                    uploadLabel="アップロード"
                    cancelLabel="キャンセル"
                    :customUpload="true"
                    fluid
                >
                    <template #empty>
                        <div class="flex items-center justify-center flex-col p-8 border-2 border-dashed border-gray-300 rounded-lg text-center">
                        <i class="pi pi-cloud-upload !text-4xl !text-gray-400" />
                        <p class="mt-4 mb-0 text-gray-500">ここにファイルをドラッグ＆ドロップするか、<br/>「選択」ボタンでファイルを選んでください。</p>
                        </div>
                    </template>
                </FileUpload>
                <Message v-if="accountingStatus.message" :severity="accountingStatus.type" :closable="false" class="mt-4">
                {{ accountingStatus.message }}
                </Message>
            </div>
            </div>
        </template>
    </Card>
</template>

<script setup>
import { ref } from 'vue';
import { Card, Button, FileUpload, Message, DatePicker } from 'primevue';
import { useImportLogic } from '../composables/useImportLogic';

const { maxFileSize, downloadTemplate, handleFileUpload } = useImportLogic();

const accountingDate = ref(new Date());
const accountingStatus = ref({ message: '', type: 'info' });

const handleAccountingUpload = async (event) => {
    try {
        await handleFileUpload(event, 'accounting', accountingStatus);
    } catch (error) {
        console.error("Accounting upload process failed:", error.message);
    }
};
</script>
