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
                        placeholder="PMS選択"
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
                            chooseLabel="ファイル参照"
                            @upload="onUpload"
                            @select="handleFileUpload"
                            accept=".csv"
                            :maxFileSize="10000000"
                            :auto="true"                            
                        >                        
                        </FileUpload>

                        <div v-if="loading" class="mb-4">
                            <ProgressSpinner />
                        </div>

                        <div v-if="parsedCsvData && !loading">
                            <DataTable :value="parsedCsvData">
                                <Column v-for="col in columns" :field="col.field" :header="col.header" :key="col.field" />
                            </DataTable>
                        </div>
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
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();
    import { Panel, Card, Select, FloatLabel, ProgressSpinner, DataTable, Column } from 'primevue';
    import FileUpload from 'primevue/fileupload';

    // Parse
    import Papa from 'papaparse';
    
    // Select button
    const selectedPMS = ref(null);
    const pmsOptions = ref([
        { name: 'Yadomaster', code: 'yadomaster' },
        { name: 'innto', code: 'innto' },
    ]);

    // Data
    const loading = ref(false);    
    const parsedCsvData = ref(null);
    const columns = ref([]);
  
    const handleFileUpload = (event) => {
        console.log('handleFileUpload started')
        const file = event.files[0];
        console.log('File:', file);
        const reader = new FileReader();
        loading.value = true;

        reader.onload = (e) => {
            console.log('FileReader onload triggered');
            const text = new TextDecoder('utf-8').decode(e.target.result);
            
            Papa.parse(text, {
                header: true,
                complete: (results) => {
                    console.log('Parsed headers:', Object.keys(results.data[0]));                    
                    parsedCsvData.value = results.data;
                    if (parsedCsvData.value.length > 0) {
                    columns.value = Object.keys(parsedCsvData.value[0]).map((key) => ({
                        field: key,
                        header: key,
                    }));
                    }
                    loading.value = false;
                    toast.add({ severity: 'success', summary: 'Success', detail: 'CSV file uploaded and parsed successfully!', life: 3000 });
                },
                error: (error) => {
                    loading.value = false;
                    toast.add({ severity: 'error', summary: 'Error', detail: 'Error parsing CSV file.', life: 3000 });
                    console.error('CSV Parsing Error:', error);
                }
            });
        };

        reader.readAsText(file);
    };
    const onUpload = () => {
        toast.add({ severity: 'info', summary: 'Success', detail: 'File Uploaded', life: 3000 });
    };
</script>
  
<style scoped></style>
