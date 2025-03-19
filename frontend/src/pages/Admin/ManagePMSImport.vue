<template>
    <div class="p-4">
        <Panel header="予約データインポート">              
            <div class="flex justify-start my-4">
                <FloatLabel>
                    <label for="pms-select" class="block text-gray-700 text-sm font-bold mb-2">
                        Select PMS:
                    </label>
                    <Select
                        id="pms-select"
                        v-model="selectedPMS"
                        :options="pmsOptions"
                        optionLabel="name"
                        placeholder="Select a PMS"
                        fluid
                    />
                </FloatLabel>
            </div>
            <Card>                
                <template #content>
                    <div v-if="!selectedPMS">
                        <span>選択されていない</span>
                    </div>
                    <div v-if="selectedPMS && selectedPMS.code === 'yadomaster'">                        
                        <label for="csv-upload" class="block text-gray-700 text-sm font-bold mb-2">
                            明細単位ファイルをアップロード：
                        </label>
                        <FileUpload
                            id="csv-upload"
                            mode="basic"
                            chooseLabel="Choose File"
                            @uploader="handleFileUpload"
                            accept=".csv"
                            :maxFileSize="10000000"
                        />
                    </div>
                </template>
            </Card>            
        </Panel>
    </div>
</template>
  
<script setup>
    // Vue
    import { ref } from 'vue';

    // Primevue
    import { Panel, Card, Select, FloatLabel } from 'primevue';
    import FileUpload from 'primevue/fileupload';
    
    // Select button
    const selectedPMS = ref(null);
    const pmsOptions = ref([
        { name: 'Yadomaster', code: 'yadomaster' },
        { name: 'innto', code: 'innto' },
    ]);

    // Data
    const tempCsvData = ref(null);
  
    const handleFileUpload = (event) => {
        const file = event.files[0];
        const reader = new FileReader();
    
        reader.onload = (e) => {
        // Placeholder for CSV parsing logic
        // In a real application, you would use a library like papaparse here
        // to properly handle CSV parsing, including delimiters, headers, etc.
        tempCsvData.value = e.target.result;
        console.log('CSV Data Loaded (Placeholder):', tempCsvData.value);
        };
    
        reader.readAsText(file);
    };
</script>
  
<style scoped></style>
