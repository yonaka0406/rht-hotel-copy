
<template>
    <Card class="shadow-lg rounded-lg overflow-hidden mt-2">
        <template #title>
            <div class="p-5 bg-blue-600 text-white text-xl">
            予算データのインポート
            </div>
        </template>
        <template #content>
            <div class="p-5 space-y-6">
            <div>
                <h3 class="text-lg font-medium text-gray-700 mb-2">ステップ1: テンプレートのダウンロード</h3>
                <p class="text-sm text-gray-600 mb-3">
                以下のボタンをクリックしてCSVテンプレートをダウンロードし、予算データを入力してください。<br />
                テンプレートには、選択された月から12ヶ月分のデータが含まれます。
                </p>
                <div class="flex items-center gap-2">
                    <DatePicker v-model="forecastDate" view="month" dateFormat="yy/mm" />
                    <Button
                    label="予算テンプレートをダウンロード"
                    icon="pi pi-download"
                    class="p-button-info"
                    @click="downloadTemplate('forecast', forecastDate)"
                    />
                    <Button
                    label="データ入力済みテンプレートをダウンロード"
                    icon="pi pi-download"
                    class="p-button-help"
                    @click="downloadPrefilledTemplate('forecast', forecastDate)"
                    />
                </div>
            </div>

            <div class="border-t border-gray-200 pt-6">
                <h3 class="text-lg font-medium text-gray-700 mb-2">ステップ2: CSVファイルのアップロード</h3>
                <p class="text-sm text-gray-600 mb-3">
                入力済みの予算CSVファイルをアップロードしてください。
                </p>
                <FileUpload
                    name="forecastFile"
                    @uploader="handleForecastUpload"
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
                <Message v-if="forecastStatus.message" :severity="forecastStatus.type" :closable="false" class="mt-4">
                {{ forecastStatus.message }}
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

const { maxFileSize, downloadTemplate, handleFileUpload, downloadPrefilledTemplate } = useImportLogic();

const forecastDate = ref(new Date());
const forecastStatus = ref({ message: '', type: 'info' });

const handleForecastUpload = async (event) => {
    try {
        await handleFileUpload(event, 'forecast', forecastStatus);
    } catch (error) {
        console.error("Forecast upload process failed:", error.message);
    }
};
</script>
