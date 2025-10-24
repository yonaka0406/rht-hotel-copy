<template>
    <div class="p-4">
        <Panel header="予約データインポート">              
            <div class="flex justify-start my-4">
                <FloatLabel>
                    <label for="pms-select" class="block text-gray-700 text-sm font-bold mb-2">
                        PMS選択:
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
                <FloatLabel>
                    <label for="hotel-select" class="block text-gray-700 text-sm font-bold mb-2">
                        ホテル選択:
                    </label>                    
                    <Select
                        id="hotel-select"                        
                        v-model="selectedHotelId"
                        :options="hotels"
                        optionLabel="name" 
                        optionValue="id"
                        :virtualScrollerOptions="{ itemSize: 38 }"
                        class="ml-2"
                        placeholder="ホテル選択"
                        filter
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
                                    <DataTable :value="yadomasterReservations.toNotImport"
                                        size="small"
                                    >
                                        <template #header>
                                            <p class="text-lg text-red-500">すべての日付がアップロードされていないため、追加できない予約<span class="font-bold text-red-700">{{ yadomasterReservations.willNotImportCount }}件</span>があります：</p>                                            
                                        </template>
                                        <Column field="予約番号" header="予約番号" />
                                        <Column field="チェックイン日" header="チェックイン日" />
                                        <Column field="チェックアウト日" header="チェックアウト日" />
                                        <Column field="min宿泊日" header="最小宿泊日" />
                                        <Column field="max宿泊日" header="最大宿泊日" />
                                    </DataTable>
                                </div>

                                <DataTable :value="yadomasterReservations.toImport" 
                                    size="small"
                                >
                                    <template #header>
                                        <p class="text-lg text-cyan-600">アップロードされたファイルから<span class="font-bold text-blue-500">{{ yadomasterReservations.totalCsvRows }}行</span>を取り込みました。追加可能な予約数は<span class="font-bold text-blue-500">{{ yadomasterReservations.willImportCount }}／{{yadomasterReservations.totalReservations}}</span>です。</p>
                                        <div class="gap-2">
                                            <Button label="データ挿入" severity="danger" icon="pi pi-database" class="mx-4" @click="databaseAction()" />
                                            <Button label="SQLを表示" severity="warn" icon="pi pi-info-circle" @click="showLogs()" />
                                            <ConfirmPopup />
                                        </div>
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
    import { ref, computed, onMounted, watch } from 'vue';

    // Stores
    import { useHotelStore } from '@/composables/useHotelStore';
    const { hotels, selectedHotelId, selectedHotelRooms, fetchHotels, fetchHotel, setHotelId } = useHotelStore();
    import { useImportStore } from '@/composables/useImportStore';
    const { yadomasterAddClients, yadomasterAddReservations, yadomasterAddReservationDetails, yadomasterAddReservationPayments, yadomasterAddReservationAddons, yadomasterAddReservationRates } = useImportStore();
        
    // Primevue
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();
    import { useConfirm } from "primevue/useconfirm";
    const confirm = useConfirm();
    import { Panel, Card, Dialog, Tabs, TabList, Tab, TabPanel, 
        Select, Textarea, FloatLabel, Button, ConfirmPopup,
        DataTable, Column, ProgressSpinner
    } from 'primevue';
    import FileUpload from 'primevue/fileupload';

    // Parse
    import Papa from 'papaparse';

    // UUID
    import { v4 as uuidv4 } from 'uuid';

    // Helper
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY',
        }).format(value);
    };    
    const getRoomId = (roomNumber) => {
        const room = selectedHotelRooms.value.find(r => r.room_number * 1 === roomNumber * 1);
        if(room){return room.room_id;}

        console.log('不明な部屋番号:', roomNumber);
        return null;
    };
    const getPlanId = (planName) => {        
        if(
            planName.includes("素") ||
            planName === "シングル(喫煙)" ||
            planName === "シングル(禁煙)" ||
            planName === "喫煙シングル2" ||
            planName === "禁煙シングル（冬季）" ||
            planName === "喫煙シングル（冬季）" ||
            planName === "ツイン" ||
            planName === "ツイン(禁煙)" ||
            planName === "和室禁煙" ||
            planName === "和室喫煙" ||
            planName === "和室シングル(禁煙)" ||
            planName === "和洋ツイン(禁煙)" ||
            planName === "キャンセル料"
        ){return 1;}
        if(planName.includes("朝食")){return 2;}
        if(planName.includes("2食")){return 3;}
        if(planName.includes("3食")){return 4;}
        if(planName.includes("荷物")){return 5;}
        
        console.log('不明なプラン名:', planName);
        return null;        
    };
    const getPaymentTypeId = (paymentType, paymentName) => {
        if(paymentType === '現金'){return 1;}
        if(paymentType === 'ネットポイント'){return 2;}
        if(paymentType === '予約金・前受金'){return 3;}
        if(paymentType === 'クレジット'){return 4;}
        if(paymentType === '売掛'){
            if(paymentName.includes("カード")){return 4;}
            else{return 5;}
        }
        if(paymentName === '割引'){return 6;}        
        
        console.log('不明な支払いタイプ:', paymentType, paymentName);
        return null;        
    };
    const getAddonId = (addonName) => {        
        if(addonName.includes("朝食")){return 1;}
        if(addonName.includes("夕食")){return 2;}
        if(addonName.includes("駐車場")){return 3;}
        if(addonName.includes("弁当")){return 4;}
        
        console.log('不明なアドオン名:', addonName);
        return null;        
    };
    const getAddonType = (addonName) => {        
        if(addonName.includes("朝食")){return 'breakfast';}
        if(addonName.includes("夕食")){return 'dinner';}
        if(addonName.includes("駐車場")){return 'other';}
        if(addonName.includes("弁当")){return 'other';}
        
        console.log('不明なアドオンタイプ:', addonName);
        return null;        
    };    
    const isLegalPerson = (name) => {
        if(name.includes('株式会社')){return true;}
        if(name.includes('会社')){return true;}
        if(name.includes('法人')){return true;}
        return false;
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
        resetCsvData();

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
                        toast.add({ severity: 'success', summary: '成功', detail: 'CSVファイルアップロードされました!', life: 4000 });
                    },
                    error: (error) => {
                        loading.value = false;
                        toast.add({ severity: 'error', summary: 'エラー', detail: 'CSVファイルの解析中にエラーが発生しました。', life: 3000 });
                        console.error('CSV解析エラー:', error);
                    }
                });
            };

            reader.readAsArrayBuffer(file);
            
        } catch (error) {
            loading.value = false;
        }
        
    };
    const resetCsvData = () => {
        parsedCsvData.value = null;
        columns.value = [];
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

        // Deduplicate rows based on reservation number, date, room, and 分類, but only for '宿泊' entries
        const seenAccommodationKeys = new Set();
        const deduplicatedData = parsedCsvData.value.filter(row => {
            if (row['分類'] === '宿泊') {
                const key = `${row['予約番号']}-${row['宿泊日']}-${row['部屋番号']}-${row['分類']}`;
                if (seenAccommodationKeys.has(key)) {
                    return false; // Duplicate '宿泊' entry, discard
                }
                seenAccommodationKeys.add(key);
            }
            // For '宿泊' entries, if not seen, or for non-'宿泊' entries, always keep
            return true;
        });

        // Extract the required fields and remove duplicates
        const uniqueReservations = new Map();

        deduplicatedData.forEach((row) => {
            const reservationNumber = row['予約番号'] * 1;
            const checkInDate = row['チェックイン日'];
            const checkOutDate = row['チェックアウト日'];
            const checkInTime = row['チェックイン予定時間'];
            const stayDate = row['宿泊日'];
            const payerName = row['会社名漢字'] || row['顧客名漢字'];
            const bookerName = row['団体名'] || row['顧客名漢字'] || row['会社名漢字'];            
            const bookerTel = row['電話番号'] ? row['電話番号'].toString().replace(/\D/g, '').replace(/^0+/, '') : '';
            const numberOfPeople = row['大人男'] * 1 + row['大人女'] * 1 + row['子供Ａ'] * 1 + row['子供Ｂ'] * 1 + row['子供Ｃ'] * 1 + row['子供Ｄ'] * 1 + row['子供Ｅ'] * 1 + row['子供Ｆ'] * 1;
            const type = row['NET予約番号'] ? (row['NET予約番号'].startsWith('TY') ? 'web' : 'ota') : 'default';
            const ota_reservation_id = row['NET予約番号'];
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
                    checkInTime: checkInTime,                    
                    min宿泊日: stayDate, // Initialize
                    max宿泊日: stayDate, // Initialize
                    hasAllDates: false, // Initialize
                    payerName: payerName,
                    bookerName: bookerName,
                    bookerTel: bookerTel,
                    numberOfPeople: numberOfPeople,
                    ota_reservation_id: ota_reservation_id,
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
            if (!row['現金売掛区分'] && (row['分類'] === '宿泊' || row['分類'] === 'キャンセル料')) {
                // Only process when the reservationKey matches
                if (uniqueReservations.has(reservationKey)) {
                    const currentReservation = uniqueReservations.get(reservationKey);

                    if(row['商品名漢字'] !== '割引'){
                        // Add to details
                        currentReservation.details.push({
                            date: row['宿泊日'],
                            roomNumber: row['部屋番号'] * 1,
                            numberOfPeople: row['数量'],
                            planName: row['商品名漢字'],
                            price: row['単価'],
                            cancelled: row['分類'] === 'キャンセル料',
                        });
                    }
                    // Add to payments
                    if(row['商品名漢字'] === '割引'){
                        currentReservation.payments.push({
                            date: row['計上日'],
                            roomNumber: row['部屋番号'] * 1,
                            payer: row['会社名漢字'] || row['顧客名漢字'],
                            type: row['現金売掛区分'],
                            name: row['商品名漢字'],
                            value: row['単価'],
                        });
                    }                    

                    // Add to addons (only if parking is used)
                    if(row['駐車場利用台数'] > 0){
                        currentReservation.addons.push({
                            date: row['宿泊日'],
                            roomNumber: row['部屋番号'] * 1,
                            name: '駐車場',
                            quantity: row['駐車場利用台数'],
                            price: row['単価']
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
                        roomNumber: row['部屋番号'] * 1,
                        payer: row['会社名漢字'] || row['顧客名漢字'],
                        type: row['現金売掛区分'],
                        name: row['商品名漢字'],
                        value: row['単価'],
                    });
                }
            }else {
                if(row['分類'] !== '宿泊' && row['分類'] !== 'キャンセル料'){
                    // Add to addons
                    if (uniqueReservations.has(reservationKey)) {
                        const currentReservation = uniqueReservations.get(reservationKey);
                        currentReservation.addons.push({
                            date: row['宿泊日'],
                            roomNumber: row['部屋番号'] * 1,
                            name: row['商品名漢字'],
                            quantity: row['数量'],
                            price: row['単価']
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
            totalCsvRows: deduplicatedData.length
        };
    });
    const yadomasterReservationsSQL = computed (() => {
        if (!yadomasterReservations.value || yadomasterReservations.value.toImport.length === 0) {
            return {                
                clients: [],
                reservations: [],
                reservation_details: [],
                reservation_addons: [],                
                reservation_payments: [],                
                reservation_rates: [],
            };
        }

        // Track processed clients using name and phone number as the key
        const clientMap = new Map();

        const clients = [];
        const reservations = [];
        const reservation_details = [];
        const reservation_addons = [];        
        const reservation_payments = [];
        const reservation_rates = [];

        yadomasterReservations.value.toImport.forEach(reservation => {
            // Common fields
            const reservationId = uuidv4();            

            let bookerClientId;
            const bookerKey = `${reservation.bookerName}-${reservation.bookerTel}`;

            // Check if booker already exists in the map
            if (clientMap.has(bookerKey)) {
                bookerClientId = clientMap.get(bookerKey);
            } else {
                // Booker is new, create a new client
                bookerClientId = uuidv4();
                clients.push({
                    id: bookerClientId,
                    name: reservation.bookerName,
                    legal_or_natural_person: isLegalPerson(reservation.bookerName) ? 'legal' : 'natural',
                    gender: 'other',
                    phone: reservation.bookerTel,
                    created_by: 1,
                });
                // Add new booker and their ID to the map
                clientMap.set(bookerKey, bookerClientId);
            }
            
            let payerClientId;
            if (reservation.payerName && reservation.payerName !== reservation.bookerName) {                
                const payerKey = `${reservation.payerName}-${reservation.bookerTel}`;

                // Check if payer already exists in the map
                if (clientMap.has(payerKey)) {
                    payerClientId = clientMap.get(payerKey);
                } else {
                    // Payer is new, create a new client
                    payerClientId = uuidv4();
                    clients.push({
                        id: payerClientId,
                        name: reservation.payerName,
                        legal_or_natural_person: isLegalPerson(reservation.payerName) ? 'legal' : 'natural',
                        gender: 'other',
                        phone: reservation.bookerTel, // Assuming payer uses booker's phone
                        created_by: 1,
                    });
                    // Add new payer and their ID to the map
                    clientMap.set(payerKey, payerClientId);
                }
            } else {
                // Payer is the same as booker, use the booker's client ID
                payerClientId = bookerClientId;
            }

            // reservations table
            reservations.push({
                id: reservationId,  // Generate UUID
                hotel_id: selectedHotelId.value,  // From selected hotel
                reservation_client_id: bookerClientId,  // Function to fetch client ID
                check_in: reservation.チェックイン日,
                check_out: reservation.チェックアウト日,
                check_in_time: reservation.checkInTime,
                number_of_people: reservation.numberOfPeople,
                status: 'confirmed',  // Default to hold
                type: reservation.type,
                ota_reservation_id: reservation.ota_reservation_id,
                agent: reservation.agentName || null,
                comment: reservation.comment || null,                
                created_by: 1,                
                予約番号: reservation.予約番号,
            });
    
            //reservation_details table  
            const detailsMap = new Map();          
            reservation.details.forEach(detail => {
                const detailId = uuidv4();

                reservation_details.push({
                    id: detailId,
                    hotel_id: selectedHotelId.value,
                    reservation_id: reservationId,                    
                    date: detail.date,
                    room_id: getRoomId(detail.roomNumber),
                    plans_global_id: getPlanId(detail.planName) || null,
                    plans_hotel_id: null,
                    plan_name: detail.planName,
                    number_of_people: detail.numberOfPeople,
                    price: detail.price || null,
                    cancelled: detail.cancelled ? uuidv4() : null,
                    billable: true,                    
                    created_by: 1,                    
                    予約番号: reservation.予約番号,
                });

                //reservation_rates table
                reservation_rates.push({
                    hotel_id: selectedHotelId.value,
                    reservation_details_id: detailId,
                    adjustment_type: 'base_rate',
                    adjustment_value: detail.price || null,
                    tax_type_id: 3,
                    tax_rate: 0.1,
                    price: detail.price || null,
                    created_by: 1,                    
                    予約番号: reservation.予約番号,
                });

                detailsMap.set(`${detail.roomNumber}-${detail.date}`, detailId);
            });

            //reservation_addons table
            reservation.addons.forEach(addon => {
                reservation_addons.push({
                    id: uuidv4(),
                    hotel_id: selectedHotelId.value,
                    reservation_detail_id: detailsMap.get(`${addon.roomNumber}-${addon.date}`),
                    addons_global_id: getAddonId(addon.name),
                    addons_hotel_id: null,
                    addon_name: addon.name,
                    addon_type: getAddonType(addon.name),
                    quantity: addon.quantity,
                    price: 0,                    
                    created_by: 1,                    
                    予約番号: reservation.予約番号,
                });
            });

            //reservation_payments table
            reservation.payments.forEach(payment => {
                reservation_payments.push({
                    id: uuidv4(),
                    hotel_id: selectedHotelId.value,
                    reservation_id: reservationId,                    
                    date: payment.date,
                    room_id: getRoomId(payment.roomNumber),
                    client_id: payerClientId,
                    payment_type_id: getPaymentTypeId(payment.type, payment.name),
                    value: payment.value,
                    comment: payment.name,                    
                    created_by: 1,                    
                    予約番号: reservation.予約番号,
                });
            });
        });

        return { 
            clients,
            reservations, 
            reservation_details,
            reservation_payments,
            reservation_addons,
            reservation_rates,
        };

    });

    // Database
    const databaseAction = async () => {
        console.log('Yadomaster予約SQL:', yadomasterReservationsSQL.value);
        // Validation
        let hasErrors = false;
        let errorMessage = "";
        // Check reservation_details room_id and plans_global_id
        for (const detail of yadomasterReservationsSQL.value.reservation_details) {
            if (detail.room_id === null) {
                hasErrors = true;
                errorMessage = `すべての予約詳細には部屋IDが必要です。予約番号：${detail.予約番号}を確認してください。`;
                break;
            }
            if (detail.plans_global_id === null) {
                hasErrors = true;
                errorMessage = `すべての予約詳細にはプランIDが必要です。予約番号：${detail.予約番号}を確認してください。`;
                break;
            }
        }
        // Check reservation_payments.payment_type_id
        if (!hasErrors) {            
            for (const payment of yadomasterReservationsSQL.value.reservation_payments) {
                if (payment.payment_type_id === null) {
                    hasErrors = true;
                    errorMessage = `すべての予約支払いには支払いタイプIDが必要です。予約番号：${payment.予約番号}を確認してください。`;
                    break;
                }
            }
        }
        // Check reservation_addons.addons_global_id
        if (!hasErrors) {
            for (const addon of yadomasterReservationsSQL.value.reservation_payments) {
                if (addon.addons_global_id === null) {
                    hasErrors = true;
                    errorMessage = `すべての予約アドオンにはアドオンIDが必要です。予約番号：${addon.予約番号}を確認してください。`;
                    break;
                }
            }
        }
        if (hasErrors) {
            // Show error toast
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: errorMessage,
                life: 5000, // Increased life for error messages
            });
            return; // Stop the database action
        }

        confirm.require({
            header: 'データインポート',
            message: `データベースに挿入してもよろしいですか?`,
            icon: 'pi pi-database',
            acceptClass: 'p-button-danger',
            acceptProps: {
                label: '挿入'
            },
            accept: () => {   
                addReservations(yadomasterReservationsSQL.value);                
                toast.add({
                    severity: 'success',
                    summary: '成功',
                    detail: `データベースインポート操作されました。`,
                    life: 3000
                });
                confirm.close();
            },
            rejectProps: {
                label: 'キャンセル',
                severity: 'secondary',
                outlined: true
            },
            reject: () => {                
                confirm.close();
            }
        });
    };
    const addReservations = async (data) => {
        // Validation
        let hasErrors = false;
        let errorMessage = "";
        // Check reservation_details room_id and plans_global_id
        for (const detail of data.reservation_details) {
            if (detail.room_id === null) {
                hasErrors = true;
                errorMessage = `すべての予約詳細には部屋IDが必要です。予約番号：${detail.予約番号}を確認してください。`;
                break;
            }
            if (detail.plans_global_id === null) {
                hasErrors = true;
                errorMessage = `すべての予約詳細にはプランIDが必要です。予約番号：${detail.予約番号}を確認してください。`;
                break;
            }
        }
        // Check reservation_payments.payment_type_id
        if (!hasErrors) {            
            for (const payment of data.reservation_payments) {
                if (payment.payment_type_id === null) {
                    hasErrors = true;
                    errorMessage = `すべての予約支払いには支払いタイプIDが必要です。予約番号：${payment.予約番号}を確認してください。`;
                    break;
                }
            }
        }
        // Check reservation_addons.addons_global_id
        if (!hasErrors) {
            for (const addon of data.reservation_payments) {
                if (addon.addons_global_id === null) {
                    hasErrors = true;
                    errorMessage = `すべての予約アドオンにはアドオンIDが必要です。予約番号：${addon.予約番号}を確認してください。`;
                    break;
                }
            }
        }
        if (hasErrors) {
            // Show error toast
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: errorMessage,
                life: 5000, // Increased life for error messages
            });
            return; // Stop the database action
        }

        const chunkArray = (arr, size) => {
            return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
                arr.slice(i * size, i * size + size)
            );
        };

        // Example: Split `clients` into smaller chunks
        const clientChunks = chunkArray(data.clients, 200);
        const reservationChunks = chunkArray(data.reservations, 200);
        const reservationDetailChunks = chunkArray(data.reservation_details, 200);
        const reservationPaymentChunks = chunkArray(data.reservation_payments, 200);
        const reservationAddonChunks = chunkArray(data.reservation_addons, 200);
        const reservationRateChunks = chunkArray(data.reservation_rates, 200);

        try {
            for (const chunk of clientChunks) {
                await yadomasterAddClients(chunk);
            }
            for (const chunk of reservationChunks) {
                await yadomasterAddReservations(chunk);
            }            
            for (const chunk of reservationDetailChunks) {
                await yadomasterAddReservationDetails(chunk);
            }
            for (const chunk of reservationPaymentChunks) {
                await yadomasterAddReservationPayments(chunk);
            }
            for (const chunk of reservationAddonChunks) {
                await yadomasterAddReservationAddons(chunk);
            }
            for (const chunk of reservationRateChunks) {
                await yadomasterAddReservationRates(chunk);
            }
        } catch (error) {
            console.error("インポート中のデータベース操作に失敗しました:", error);
            toast.add({
                severity: 'error',
                summary: 'インポートエラー',
                detail: `データベース操作中にエラーが発生しました: ${error.message}`,
                life: 10000, // Longer life for database errors
            });
        } finally {
            // If all chunks processed successfully
            toast.add({
                severity: 'success',
                summary: '成功',
                detail: '予約のインポートが完了しました。',
                life: 3000,
            });
        }
    }

    // Dialog
    const isDialogVisible = ref(false);
    const selectedReservation = ref({
        details: [],
        addons: [],
        payments: []
    });
    const openDialog = (reservation) => {
        console.log('ダイアログを開く:', reservation);
        selectedReservation.value = {
            ...reservation,
            details: reservation.details || [],
            addons: reservation.addons || [],
            payments: reservation.payments || []
        };
        isDialogVisible.value = true;
    };
    const showLogs = () => {
        console.log('Yadomaster予約SQL:', yadomasterReservationsSQL.value);
    };

    onMounted(async () => {
        await fetchHotels();
        await fetchHotel();
    });

    watch(() => selectedHotelId.value, async (newValue, oldValue) => {
        if (newValue !== oldValue) {
            setHotelId(newValue);
            await fetchHotel();            
            resetCsvData();            
        }
    });
</script>
  
<style scoped></style>