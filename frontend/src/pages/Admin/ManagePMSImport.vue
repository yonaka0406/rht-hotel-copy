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
                        <div v-if="loading" class="mb-4">
                            <ProgressSpinner />
                        </div>
                        <div v-else>
                            <FileUpload
                                id="csv-upload"
                                mode="basic"
                                chooseLabel="ファイル参照"                                
                                @select="handleFileUpload"
                                accept=".csv"
                                :maxFileSize="10000000"
                                :auto="true"                            
                            >                        
                            </FileUpload>
                            
                            <div v-if="parsedCsvData && !loading" class="mx-auto mt-4">
                                <div v-if="yadomasterReservations.toNotImport.length > 0">                                    
                                    <DataTable :value="yadomasterReservations.toNotImport">
                                        <template #header>
                                            <span class="text-lg text-red-500">すべての日付がアップロードされていないため、追加できない予約<span class="font-bold text-red-700">{{ yadomasterReservations.willNotImportCount }}件</span>があります：</span>
                                        </template>
                                        <Column field="予約番号" header="予約番号" />
                                        <Column field="チェックイン日" header="チェックイン日" />
                                        <Column field="チェックアウト日" header="チェックアウト日" />
                                        <Column field="min宿泊日" header="最小宿泊日" />
                                        <Column field="max宿泊日" header="最大宿泊日" />
                                    </DataTable>
                                </div>

                                <DataTable :value="yadomasterReservations.toImport">
                                    <template #header>
                                        <span class="text-lg text-cyan-600">アップロードされたファイルから<span class="font-bold text-blue-500">{{ yadomasterReservations.totalCsvRows }}行</span>を取り込みました。追加可能な予約数は<span class="font-bold text-blue-500">{{ yadomasterReservations.willImportCount }}／{{yadomasterReservations.totalReservations}}</span>です。</span>
                                    </template>
                                    <Column field="予約番号" header="予約番号" />
                                    <Column field="チェックイン日" header="チェックイン日" />
                                    <Column field="チェックアウト日" header="チェックアウト日" />
                                    <Column field="bookerName" header="予約者" />
                                    <Column field="bookerTel" header="電話番号" />
                                    <Column field="numberOfPeople" header="人数" />
                                    <Column field="typeName" header="予約種類" />
                                    <Column field="agentName" header="エージェント" />
                                    <Column header="備考">                                        
                                        <template #body="slotProps">
                                            <Textarea :value="slotProps.data.comment" readonly />
                                        </template>                                        
                                    </Column>
                                    <Column header="詳細">
                                        <template #body="slotProps">
                                            <Button label="詳細を表示" icon="pi pi-info-circle" @click="openDialog(slotProps.data)" />
                                        </template>
                                    </Column>
                                </DataTable>
                            </div>                            
                        </div>
                    </div>
                </template>
            </Card>            
        </Panel>

        <!-- Dialog for Yadomaster details -->
        <Dialog v-model:visible="isDialogVisible" :modal="true" header="詳細情報" :style="{ width: '800px' }" class="p-fluid">            
            <Tabs value="0">
                <TabList>
                    <Tab value="0">詳細</Tab>
                    <Tab value="1">アドオン</Tab>
                    <Tab value="2">支払い</Tab>
                </TabList>
                <TabPanel value="0" header="詳細">                
                    <DataTable :value="selectedReservation.details">
                        <Column field="date" header="宿泊日" />
                        <Column field="roomNumber" header="部屋番号" />
                        <Column field="numberOfPeople" header="数量" />
                        <Column field="planName" header="商品名" />                        
                        <Column field="price" header="単価">
                            <template #body="slotProps">
                                {{ formatCurrency(slotProps.data.price) }}
                            </template>
                        </Column>
                    </DataTable>
                </TabPanel>                
                <TabPanel value="1" header="アドオン">
                    <DataTable :value="selectedReservation.addons">
                        <Column field="date" header="宿泊日" />
                        <Column field="name" header="アドオン名" />
                        <Column field="quantity" header="数量" />
                    </DataTable>
                </TabPanel>
                <TabPanel value="2" header="支払い">
                    <DataTable :value="selectedReservation.payments">
                        <Column field="date" header="計上日" />
                        <Column field="payer" header="支払者" />
                        <Column field="type" header="分類" />
                        <Column field="name" header="商品名" />
                        <Column field="value" header="単価">
                            <template #body="slotProps">
                                {{ formatCurrency(slotProps.data.value) }}
                            </template>
                        </Column>
                    </DataTable>
                </TabPanel>
            </Tabs>            
        </Dialog>
    </div>
</template>
  
<script setup>
    // Vue
    import { ref, computed } from 'vue';

    // Primevue
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();
    import { Panel, Card, Dialog, Tabs, TabList, Tab, TabPanel, 
        Select, Textarea, FloatLabel, Button, 
        DataTable, Column, ProgressSpinner
    } from 'primevue';
    import FileUpload from 'primevue/fileupload';

    // Parse
    import Papa from 'papaparse';

    // Helper
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY',
        }).format(value);
    };
    
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
        const file = event.files[0];        
        const reader = new FileReader();
        loading.value = true;
        try {
            reader.onload = (e) => {                
                const text = new TextDecoder('shift-jis').decode(e.target.result);
                
                Papa.parse(text, {
                    header: true,
                    complete: (results) => {                        
                        parsedCsvData.value = results.data;
                        if (parsedCsvData.value.length > 0) {
                        columns.value = Object.keys(parsedCsvData.value[0]).map((key) => ({
                            field: key,
                            header: key,
                        }));
                        }
                        loading.value = false;                        
                        toast.add({ severity: 'success', summary: 'Success', detail: 'CSVファイルアップロードされました!', life: 4000 });
                    },
                    error: (error) => {
                        loading.value = false;
                        toast.add({ severity: 'error', summary: 'Error', detail: 'Error parsing CSV file.', life: 3000 });
                        console.error('CSV Parsing Error:', error);
                    }
                });
            };

            reader.readAsArrayBuffer(file);
            
        } catch (error) {
            loading.value = false;
        }
        
    };
    
    // Yadomaster
    const yadomasterReservations = computed(() => {
        if (!parsedCsvData.value || parsedCsvData.value.length === 0) {
            return {
                allReservations: [],
                toImport: [],
                toNotImport: [],
                totalReservations: 0,
                willImportCount: 0,
                willNotImportCount: 0,
                totalCsvRows: 0
            };
        }

        // Extract the required fields and remove duplicates
        const uniqueReservations = new Map();

        parsedCsvData.value.forEach((row) => {
            const reservationNumber = row['予約番号'];
            const checkInDate = row['チェックイン日'];
            const checkOutDate = row['チェックアウト日'];
            const stayDate = row['宿泊日'];
            const bookerName = row['団体名'] || row['顧客名漢字'] || row['会社名漢字'];
            const bookerTel = row['電話番号'];
            const numberOfPeople = row['大人男'] * 1 + row['大人女'] * 1 + row['子供Ａ'] * 1 + row['子供Ｂ'] * 1 + row['子供Ｃ'] * 1 + row['子供Ｄ'] * 1 + row['子供Ｅ'] * 1 + row['子供Ｆ'] * 1;
            const type = row['NET予約番号'] ? (row['NET予約番号'].startsWith('TY') ? 'web' : 'ota') : 'default';
            const agentName = row['エージェント名'];
            const concatenatedNotes = [
                row['顧客備考'] || '',
                row['宿泊備考'] || '',
                row['清掃備考'] || '',
                row['食事備考'] || ''
            ].join('\n');

            if (!reservationNumber || !checkInDate || !checkOutDate || !stayDate) {
                return;  // Skip the row
            }            
            const reservationKey = `${reservationNumber}-${checkInDate}-${checkOutDate}`;
                        
            if (!uniqueReservations.has(reservationKey)) {
                uniqueReservations.set(reservationKey, {
                    予約番号: reservationNumber,
                    チェックイン日: checkInDate,
                    チェックアウト日: checkOutDate,
                    min宿泊日: stayDate, // Initialize
                    max宿泊日: stayDate, // Initialize
                    hasAllDates: false, // Initialize
                    bookerName: bookerName,
                    bookerTel: bookerTel,
                    numberOfPeople: numberOfPeople,
                    type: type,
                    typeName: type === 'web' ? '自社ウェブ' : (type === 'ota' ? 'OTA' : '通常'),
                    agentName: agentName,
                    comment: concatenatedNotes,
                    details: [], // Initialize
                    addons: [], // Initialize
                    payments: [], // Initialize
                });
            }

            // Min and Max dates
            const currentReservation = uniqueReservations.get(reservationKey);            
            if (new Date(stayDate) < new Date(currentReservation.min宿泊日)) {
                currentReservation.min宿泊日 = stayDate;  // Update to the earlier date
            }            
            if (new Date(stayDate) > new Date(currentReservation.max宿泊日)) {
                currentReservation.max宿泊日 = stayDate;  // Update to the later date
            }
            // Missing dates check            
            uniqueReservations.forEach((reservation) => {
                const checkInDate = new Date(reservation.チェックイン日);
                const checkOutDate = new Date(reservation.チェックアウト日);
                const maxDate = new Date(reservation.max宿泊日);
                
                // Check if min宿泊日 is equal to チェックイン日, and max宿泊日 is equal to チェックアウト日 - 1 day
                reservation.hasAllDates = (
                    new Date(reservation.min宿泊日).getTime() === checkInDate.getTime() &&
                    maxDate.getTime() === new Date(checkOutDate.setDate(checkOutDate.getDate() - 1)).getTime()
                );
            });
            // Process details, addons, and payments
            if (row['分類'] === '宿泊') {
                // Only process when the reservationKey matches
                if (uniqueReservations.has(reservationKey)) {
                    const currentReservation = uniqueReservations.get(reservationKey);

                    // Add to details
                    currentReservation.details.push({
                        date: row['宿泊日'],
                        roomNumber: row['部屋番号'] * 1,
                        numberOfPeople: row['数量'],
                        planName: row['商品名漢字'],
                        price: row['単価']
                    });

                    // Add to addons (only if parking is used)
                    if(row['駐車場利用台数'] > 0){
                        currentReservation.addons.push({
                            date: row['宿泊日'],
                            name: '駐車場',
                            quantity: row['駐車場利用台数']
                        });
                    }
                }
            }
            if (row['現金売掛区分'] && row['現金売掛区分'].trim() !== '') {
                // Add to payments
                if (uniqueReservations.has(reservationKey)) {
                    const currentReservation = uniqueReservations.get(reservationKey);
                    currentReservation.payments.push({
                        date: row['計上日'],
                        payer: row['会社名漢字'] || row['顧客名漢字'],
                        type: row['分類'],
                        name: row['商品名漢字'],
                        value: row['単価'],
                    });
                }
            } else {
                if(row['分類'] !== '宿泊'){
                    // Add to addons
                    if (uniqueReservations.has(reservationKey)) {
                        const currentReservation = uniqueReservations.get(reservationKey);
                        currentReservation.addons.push({
                            date: row['宿泊日'],
                            name: row['商品名漢字'],
                            quantity: row['数量']
                        });
                    }
                }                
            }
        });

        // Separate the reservations into two groups based on hasAllDates
        const allReservations = Array.from(uniqueReservations.values());
        const toImport = allReservations.filter(reservation => reservation.hasAllDates === true);
        const toNotImport = allReservations.filter(reservation => reservation.hasAllDates === false);

        // Calculate counts
        const totalReservations = allReservations.length;
        const willImportCount = toImport.length;
        const willNotImportCount = toNotImport.length;

        return {
            allReservations,
            toImport,
            toNotImport,
            totalReservations,
            willImportCount,
            willNotImportCount,
            totalCsvRows: parsedCsvData.value.length
        };
    });

    // Dialog
    const isDialogVisible = ref(false);
    const selectedReservation = ref({
        details: [],
        addons: [],
        payments: []
    });
    const openDialog = (reservation) => {
        console.log('openDialog:', reservation);
        selectedReservation.value = {
            ...reservation,
            details: reservation.details || [],
            addons: reservation.addons || [],
            payments: reservation.payments || []
        };
        isDialogVisible.value = true;
    };
</script>
  
<style scoped></style>
