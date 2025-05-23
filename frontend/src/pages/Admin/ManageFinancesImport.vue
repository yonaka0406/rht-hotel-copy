<template>
    <div class="p-4 md:p-6 bg-gray-50 min-h-screen font-sans">
        <Toast />
  
        <Panel header="財務データインポート" :toggleable="false" class="shadow-md rounded-lg">
            <Tabs v-model:value="activeTab" class="pt-2">
                <TabList>
                    <Tab :value="0">予算データインポート</Tab>
                    <Tab :value="1">実績データインポート</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel :value="0">
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
                                    以下のボタンをクリックしてCSVテンプレートをダウンロードし、予算データを入力してください。
                                    </p>
                                    <Button
                                    label="予算テンプレートをダウンロード"
                                    icon="pi pi-download"
                                    class="p-button-info"
                                    @click="downloadTemplate('forecast')"
                                    />
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
                    </TabPanel>

                    <TabPanel :value="1">
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
                                    <Button
                                    label="実績テンプレートをダウンロード"
                                    icon="pi pi-download"
                                    class="p-button-success"
                                    @click="downloadTemplate('accounting')"
                                    />
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
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </Panel>
    </div>
</template>
  
<script setup>    
    // Vue
    import { ref, computed, onMounted } from 'vue';

    // Stores
    import { useHotelStore } from '@/composables/useHotelStore';
    const { hotels, fetchHotels } = useHotelStore();
    import { useImportStore } from '@/composables/useImportStore';
    const { forecastAddData, accountingAddData } = useImportStore();
      
    // Primevue
    import { Tabs, TabList, Tab, TabPanels, TabPanel, Card, Button, FileUpload, Message, Toast, Panel } from 'primevue';
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();

    // --- FileUpload Configuration ---
    const maxFileSize = 5000000; // 5MB

    // --- Active Tab State ---
    const activeTab = ref(0);
  
    const budgetItems = ['宿泊売上', '営業日数', '客室数', '販売客室数'];

    // Mapping from Japanese CSV budget item names to English JSON keys
    const budgetItemKeyMap = {
      '宿泊売上': 'accommodation_revenue',
      '営業日数': 'operating_days',
      '客室数': 'available_room_nights',
      '販売客室数': 'rooms_sold_nights'
    };
      
    // --- Status Messages ---
    const forecastStatus = ref({ message: '', type: 'info' }); // type can be 'info', 'success', 'warn', 'error'
    const accountingStatus = ref({ message: '', type: 'info' });
    
    // --- CSV Template Generation ---
    const getDaysInMonth = (year, month) => {
        // Month is 0-indexed for Date object (0 for January, 11 for December)
        return new Date(year, month + 1, 0).getDate();
    };
  
    const generateCSVData = (type) => {        
        const csvRows = [];
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth(); // 0-indexed
    
        // Generate headers for the next 12 months
        const monthHeaders = [];
        if (type === 'accounting') {        
            for (let i = 0; i < 12; i++) {
                // year, month - 12 months + i-th month in the 12-month sequence
                const d = new Date(year, month - 12 + i, 1);
                monthHeaders.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
            }
        } else { // 'forecast' or other types         
            for (let i = 0; i < 12; i++) {
                const d = new Date(year, month + i, 1);
                monthHeaders.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
            }
        }

        let itemsForProcessing;
        let itemColumnTitle;
        if (type === 'accounting') {
            itemColumnTitle = '会計項目'; // Set column title for accounting
            itemsForProcessing = ['宿泊売上']; // Only this item for accounting
        } else {
            itemColumnTitle = '予算項目'; // Default column title
            itemsForProcessing = budgetItems; // Use all budget items for other types (e.g., 'forecast')
        }

        // Add header row to CSV
        csvRows.push(['ID', '施設', itemColumnTitle, ...monthHeaders].join(','));
    
        // Generate data rows
        if (!hotels.value || hotels.value.length === 0) {
            console.warn('Hotel data is not available for CSV generation.');
            return "";
        }
        hotels.value.forEach(hotel => {
            itemsForProcessing.forEach(item => {
                const row = [hotel.id, hotel.name, item];
                monthHeaders.forEach(header => {
                    const [hYear, hMonth] = header.split('-').map(Number);
                    if (item === '営業日数') {
                        row.push(getDaysInMonth(hYear, hMonth - 1));
                    } else if (item === '客室数') {
                        const daysInCurrentMonth = getDaysInMonth(hYear, hMonth - 1);            
                        const totalRoomsForMonth = (hotel.total_rooms && typeof hotel.total_rooms === 'number')
                            ? hotel.total_rooms * daysInCurrentMonth
                            : 0; 
                        row.push(totalRoomsForMonth);
                    } else {
                        row.push(''); // Blank for 宿泊売上 and 販売客室数
                    }
                });
                csvRows.push(row.join(','));
            });
        });
    
        return csvRows.join('\n');
    };
    
    const downloadTemplate = async (type) => {
        console.log('downloadTemplate was triggered');
        if (!hotels.value || hotels.value.length === 0) {
            try {
                await fetchHotels();
                if (!hotels.value || hotels.value.length === 0) {
                    toast.add({ severity: 'warn', summary: '注意', detail: 'ホテルデータが利用できません。テンプレートを生成できません。', life: 3000 });
                    return;
                }
            } catch (error) {
                console.error("Error fetching hotels for template:", error);
                toast.add({ severity: 'error', summary: 'エラー', detail: 'ホテルデータの取得に失敗しました。', life: 3000 });
                return;
            }
        }        
        const csvContent = generateCSVData(type);
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });    
        const link = document.createElement('a');
        if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${type}_template_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.add({ severity: 'success', summary: '成功', detail: `${type === 'forecast' ? '予算' : '実績'}テンプレートがダウンロードされました。`, life: 3000 });
        } else {
        toast.add({ severity: 'error', summary: 'エラー', detail: 'お使いのブラウザはダウンロードに対応していません。', life: 3000 });
        }
    };
  
    // --- File Upload Handlers ---
    const parseCSVtoJSON = (csvText) => {
        // console.log('parseCSVtoJSON was triggered');
        // For robust CSV parsing, consider a library like PapaParse.
        // This is a simplified parser.
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            throw new Error("CSV data is too short or invalid.");
        }

        const headerLine = lines[0].trim();        
        const parseCsvRow = (rowString) => {
            const result = [];
            let currentField = '';
            let inQuotes = false;
            for (let i = 0; i < rowString.length; i++) {
            const char = rowString[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(currentField.trim());
                currentField = '';
            } else {
                currentField += char;
            }
            }
            result.push(currentField.trim()); // Add the last field
            return result;
        };


        const headers = parseCsvRow(headerLine);
        const monthDateHeaders = headers.slice(3);
        
        // Temporary store: Key "hotelId_monthString", Value: { hotel_id, hotel_name, forecast_month, details: [{...items...}] }
        const hotelMonthDataMap = {};

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = parseCsvRow(line);
            if (parts.length !== headers.length) {
                console.warn(`不正な形式の行をスキップします: ${line}. ${headers.length}列必要ですが、${parts.length}列でした。`);
                continue;
            }

            const hotelId = parts[0];
            const hotelName = parts[1].replace(/^"|"$/g, '');
            const budgetItemFromCsv = parts[2]; // This is the Japanese name from CSV "予算項目"

            monthDateHeaders.forEach((monthString, monthIndex) => {
                const valueString = parts[monthIndex + 3];
                const value = valueString && valueString.trim() !== '' ? parseFloat(valueString) : 0;

                const mapKey = `${hotelId}_${monthString}`;

                if (!hotelMonthDataMap[mapKey]) {
                    hotelMonthDataMap[mapKey] = {
                        hotel_id: hotelId,
                        hotel_name: hotelName,
                        month: formatToFirstDayOfMonth(monthString),
                        accommodation_revenue: null,
                        operating_days: null,
                        available_room_nights: null,
                        rooms_sold_nights: null,
                    };                    
                }

                // Get the English key corresponding to the Japanese budgetItemFromCsv
                const englishKey = budgetItemKeyMap[budgetItemFromCsv];
                if (englishKey) {
                    // Set the value using the English key
                    hotelMonthDataMap[mapKey][englishKey] = value;
                } else {
                    console.warn(`Unknown budget_item from CSV: '${budgetItemFromCsv}' for hotel ${hotelId}, month ${monthString}. No English key mapping found.`);
                }
            });
        }

        // Convert the map values to an array
        return Object.values(hotelMonthDataMap);
    };
    const formatToFirstDayOfMonth = (input) => {
        // Try to parse the date in various formats, fallback if needed
        const parsed = new Date(input);
        if (isNaN(parsed)) {
            console.warn(`Invalid month string: ${input}`);
            return input; // fallback: return the raw input
        }

        // Set to first of the month
        parsed.setDate(1);
                
        // Format to YYYY-MM-DD
        return parsed.getFullYear() + '-' +
            String(parsed.getMonth() + 1).padStart(2, '0') + '-' +
            String(parsed.getDate()).padStart(2, '0');

    };

  
    const handleFileUpload = (event, type) => {
        // console.log('handleFileUpload was triggered. Event:', event, 'Type:', type); // Added user's log

        const file = event.files[0];
        const statusRef = type === 'forecast' ? forecastStatus : accountingStatus;
        const typeText = type === 'forecast' ? '予算' : '実績';

        // Return a new Promise that wraps the FileReader logic
        return new Promise((resolvePromise, rejectPromise) => {
            if (!file) {
            statusRef.value = { message: 'ファイルが選択されていません。', type: 'warn' };
            if (event.options && typeof event.options.clear === 'function') {
                console.log("No file selected, attempting to clear FileUpload if necessary.");
                event.options.clear();
            }
            rejectPromise(new Error('ファイルが選択されていません。'));
                return;
            }

            statusRef.value = { message: `${file.name} を処理中...`, type: 'info' };
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const csvText = e.target.result;
                    const jsonData = parseCSVtoJSON(csvText);

                    if (jsonData.length === 0) {
                        statusRef.value = { message: 'CSVファイルに処理可能なデータが見つかりませんでした。', type: 'warn' };
                        toast.add({ severity: 'warn', summary: '注意', detail: 'データが見つかりません。', life: 3000 });
                        resolvePromise();
                        return;
                    }

                    statusRef.value = { message: `${jsonData.length}件のデータをアップロード中...`, type: 'info' };
                    // console.log(`Uploading ${type} data as JSON:`, JSON.stringify(jsonData, null, 2));

                    let result = null;
                    if(type === 'forecast'){
                        result = await forecastAddData(jsonData);
                    } else{
                        result = await accountingAddData(jsonData);
                    }
                    
                    
                    if (result && result.success) {
                        statusRef.value = { message: `${typeText}データ「${file.name}」(${jsonData.length}件)が正常にインポートされました。`, type: 'success' };
                        toast.add({ severity: 'success', summary: '成功', detail: `${typeText}データがアップロードされました。`, life: 3000 });
                        resolvePromise();
                    } else {
                        throw new Error("APIアップロード失敗");
                    }
                } catch (error) {
                    console.error(`Error processing or uploading ${type} file:`, error);
                    statusRef.value = { message: `${typeText}データ「${file.name}」の処理中またはアップロード中にエラーが発生しました: ${error.message}`, type: 'error' };
                    toast.add({ severity: 'error', summary: 'エラー', detail: 'アップロードに失敗しました。', life: 5000 });
                    rejectPromise(error);
                } 
            };

            reader.onerror = (error) => {
                console.error("Error reading file:", error);
                statusRef.value = { message: `ファイル読み取りエラー: ${file.name}`, type: 'error' };
                toast.add({ severity: 'error', summary: 'ファイルエラー', detail: 'ファイルの読み取りに失敗しました。', life: 3000 });
                if (event.options && typeof event.options.clear === 'function') {
                    console.log("Calling event.options.clear() in reader.onerror block.");
                    event.options.clear();
                } else {
                    console.warn("event.options.clear() not available in reader.onerror. Event options:", event.options);
                }
                rejectPromise(error);
            };

            reader.readAsText(file);
        });
    };

    const handleForecastUpload = async (event) => {
        // console.log('handleForecastUpload was triggered', event); // User's log
        try {
            await handleFileUpload(event, 'forecast');
            // console.log("Forecast upload process completed.");
        } catch (error) {
            console.error("Forecast upload process failed:", error.message);
        }
    };

    const handleAccountingUpload = async (event) => {
        // It's good practice to also log here if debugging
        // console.log('handleAccountingUpload was triggered', event);
        try {
            await handleFileUpload(event, 'accounting');
            // console.log("Accounting upload process completed.");
        } catch (error) {
            console.error("Accounting upload process failed:", error.message);
        }
    };
    
  </script>
  
  <style scoped>
  
  </style>
  