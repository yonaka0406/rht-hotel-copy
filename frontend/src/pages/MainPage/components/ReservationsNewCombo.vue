<template>
    <div>
        <Panel header="部屋タイプ組み合わせ">
            <!-- Select Dates and Number of People -->
            <form @submit.prevent="addReservationCombo">
                <div class="grid grid-cols-4 mb-4 mr-4 gap-2">
                
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <DatePicker 
                                v-model="comboRow.check_in"
                                :showIcon="true" 
                                iconDisplay="input" 
                                dateFormat="yy-mm-dd"
                                :selectOtherMonths="true"              
                                fluid           
                                @update:model-value="onDateChange"
                            />
                            <label>チェックイン</label>
                        </FloatLabel>
                    </div>
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <DatePicker 
                                v-model="comboRow.check_out"
                                :showIcon="true" 
                                iconDisplay="input" 
                                dateFormat="yy-mm-dd"
                                :selectOtherMonths="true"
                                :minDate="minCheckOutDate"
                                fluid           
                                @update:model-value="onDateChange"
                            />
                            <label>チェックアウト</label>
                        </FloatLabel>
                    </div>
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <InputNumber
                            v-model="numberOfNights"
                            variant="filled" 
                            fluid             
                            disabled 
                            />
                            <label>宿泊数</label>
                        </FloatLabel>
                    </div>
                    <div class="col-span-1 mt-6"></div>
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <Select
                                v-model="comboRow.room_type_id"
                                :options="roomTypes"
                                optionLabel="room_type_name" 
                                optionValue="room_type_id" 
                                fluid
                            />
                            <label>部屋タイプ</label>
                        </FloatLabel>
                    </div>
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <InputNumber
                                v-model="comboRow.number_of_rooms"
                                :min="1"
                                :max="maxRoomNumber"
                                fluid
                            />
                            <label>部屋数</label>                            
                        </FloatLabel>
                        <p class="text-xs text-gray-500">最大: {{ maxRoomNumber }}</p>
                    </div>
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <InputNumber
                                v-model="comboRow.number_of_people"
                                :min="minNumberOfPeople"
                                :max="maxCapacity"
                                fluid 
                            />
                            <label>人数</label>
                        </FloatLabel>
                        <p class="text-xs text-gray-500">最大: {{ maxCapacity }}</p>
                    </div>   
                    <div class="col-span-1 mt-6">
                        <Button label="追加" severity="success" type="submit" />
                    </div>             
                </div>
            </form>

            
            <Card>
                <template #header>
                    <div class="flex justify-start">
                        <span class="font-bold text-lg p-3">組み合わせ</span>                        
                    </div>
                    <div v-if="validationErrors.length > 0" class="text-red-500 mt-2">
                        <p v-for="(error, index) in validationErrors" :key="index">{{ error }}</p>
                    </div>
                    <div v-else>
                        <Button 
                            v-if="reservationCombos.length > 0" 
                            label="新規予約" 
                            icon="pi pi-calendar"                            
                            @click="openDialog" 
                        />
                    </div>                    
                </template>
                <template #content>
                    <DataTable :value="reservationCombos" class="mt-4">
                        <Column header="チェックイン">
                            <template #body="slotProps">
                                {{ formatDate(slotProps.data.check_in) }}
                            </template>
                        </Column>
                        <Column header="チェックアウト">
                            <template #body="slotProps">
                                {{ formatDate(slotProps.data.check_out) }}
                            </template>
                        </Column>
                        <Column field="room_type_name" header="部屋タイプ" />
                        <Column field="number_of_rooms" header="部屋数" />
                        <Column field="number_of_people" header="人数" />
                        <Column header="操作">
                            <template #body="slotProps">
                            <Button icon="pi pi-trash" severity="danger" @click="deleteCombo(slotProps.data)" />
                            </template>
                        </Column>
                    </DataTable>
                </template>
            </Card>
        </Panel>

        <!-- Dialog -->
        <Dialog 
            v-model:visible="dialogVisible" 
            :header="'予約'" 
            :closable="true"
            :modal="true"
            :style="{ width: '600px' }"
        >
            <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 gap-y-6 pt-6">
            <!-- Name of the person making the reservation -->
            <div class="col-span-2 mb-6">
                <FloatLabel>              
                <AutoComplete
                    v-model="client"
                    :suggestions="filteredClients"
                    optionLabel="display_name"
                    @complete="filterClients"
                    field="id"                
                    @option-select="onClientSelect"                
                    fluid
                    required                
                >
                    <template #option="slotProps">
                    <div>
                        {{ slotProps.option.name_kanji || slotProps.option.name || '' }}
                        <span v-if="slotProps.option.name_kana"> ({{ slotProps.option.name_kana }})</span>
                    </div>
                    </template>
                </AutoComplete>
                <label>個人氏名　||　法人名称</label>
                </FloatLabel>
            </div>

            <!-- Type of person (Legal or Natural) -->
            <div class="col-6">
                <SelectButton 
                    v-model="reservationDetails.legal_or_natural_person" 
                    :options="personTypeOptions" 
                    option-label="label" 
                    option-value="value"
                    fluid                  
                    :disabled="isClientSelected"
                />
            </div>

            <!-- Gender input if person is natural -->
            <div class="field col-6">
                <div v-if="reservationDetails.legal_or_natural_person === 'natural'" class="flex gap-3">
                    <div v-for="option in genderOptions" :key="option.value" class="flex items-center gap-2">
                        <RadioButton
                            v-model="reservationDetails.gender"
                            :inputId="option.value"
                            :value="option.value"
                            :disabled="isClientSelected"
                        />
                        <label :for="option.value">{{ option.label }}</label>
                    </div>
                </div>
            </div> 

            <!-- Email input -->
            <div class="col-6">
                <FloatLabel>
                <InputText 
                    v-model="reservationDetails.email"
                    :pattern="emailPattern"
                    :class="{'p-invalid': !isValidEmail}"
                    @input="validateEmail(reservationDetails.email)"
                    fluid 
                    :disabled="isClientSelected"
                />
                <label>メールアドレス</label>
                <small v-if="!isValidEmail" class="p-error">有効なメールアドレスを入力してください。</small>
                </FloatLabel>
            </div>

            <!-- Phone number input -->
            <div class="col-6">
                <FloatLabel>
                <InputText
                    v-model="reservationDetails.phone"
                    :pattern="phonePattern"
                    :class="{'p-invalid': !isValidPhone}"
                    @input="validatePhone(reservationDetails.phone)"
                    fluid
                    :disabled="isClientSelected"

                />
                <label>電話番号</label>
                <small v-if="!isValidPhone" class="p-error">有効な電話番号を入力してください。</small>
                </FloatLabel>
            </div>

            <!-- Additional fields for check-in, check-out, number of people -->
            <div class="col-6">
                <FloatLabel>
                <InputText 
                    v-model="reservationDetails.check_in" 
                    type="date" 
                    variant="filled" 
                    fluid 
                    disabled
                />
                <label>チェックイン</label>
                </FloatLabel>
            </div>

            <div class="col-6">
                <FloatLabel>
                <InputText 
                    v-model="reservationDetails.check_out" 
                    type="date" 
                    variant="filled"                    
                    fluid 
                    disabled
                />
                <label>チェックアウト</label>
                </FloatLabel>
            </div>
            <div class="col-6">
                <FloatLabel>
                <InputNumber 
                    v-model="reservationDetails.number_of_nights" 
                    variant="filled" 
                    fluid                
                    disabled
                />
                <label>宿泊数</label>
                </FloatLabel>
            </div>
            <div class="col-6">
                <FloatLabel>
                <InputNumber 
                    v-model="reservationDetails.number_of_people" 
                    variant="filled" 
                    fluid                
                    disabled
                />
                <label>人数</label>
                </FloatLabel>
            </div>
            </div>
            <template #footer>
            <Button label="閉じる" icon="pi pi-times" @click="closeDialog" class="p-button-danger p-button-text p-button-sm" />
            <Button label="保存" icon="pi pi-check" @click="submitReservation" class="p-button-success p-button-text p-button-sm" />
            </template>        
        </Dialog>
    </div>
</template>
<script setup>
    // Vue
    import { ref, computed, watch, onMounted } from 'vue';
    import { useRouter } from 'vue-router';
    const router = useRouter();

    // Primevue
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();
    import { Panel, Card, Dialog, FloatLabel, DatePicker, InputText, InputNumber, AutoComplete, Select, SelectButton, RadioButton, Button, DataTable, Column } from 'primevue';

    // Stores
    import { useHotelStore } from '@/composables/useHotelStore';
    const { selectedHotel, selectedHotelId, selectedHotelRooms, fetchHotels, fetchHotel } = useHotelStore();
    import { useClientStore } from '@/composables/useClientStore';
    const { clients, fetchClients, setClientsIsLoading } = useClientStore();
    import { useReservationStore } from '@/composables/useReservationStore';
    const { availableRooms, fetchAvailableRooms, reservationId, setReservationId, fetchReservation, fetchMyHoldReservations, createHoldReservationCombo } = useReservationStore();

    // Helper function
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };
    const calcDateDiff = (startDate, endDate) => {
        if (startDate && endDate) {
            const start = startDate;
            const end = endDate;
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);            
            const dayDiff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
            if(dayDiff < 0){
                return 0;  
            }
            return dayDiff;
        }
        return 0;
    };

    // Form
    const inDate = ref(new Date());
    const outDate = ref(new Date(inDate.value));
        outDate.value.setDate(inDate.value.getDate() + 1);
    const minCheckOutDate = ref(outDate.value);
    const numberOfNights = computed(() => {
        if (comboRow.value.check_in && comboRow.value.check_out) {
            return calcDateDiff(comboRow.value.check_in, comboRow.value.check_out);
        }
        return 0;
    }); 
    const roomTypes = computed(() => {
        if(!selectedHotelRooms.value){
            return
        }
        const roomSet = new Map();
        selectedHotelRooms.value.forEach(({ room_type_id, room_type_name }) => {
            roomSet.set(room_type_id, room_type_name);
        });
        return Array.from(roomSet, ([room_type_id, room_type_name]) => ({ room_type_id, room_type_name }));
    });
    const countOfRoomTypes = computed(() => {
        if(!availableRooms.value){
            return
        }
        const roomMap = new Map();

        availableRooms.value.forEach(({ room_type_id, room_type_name, for_sale, capacity }) => {
            if (for_sale) {
                if (!roomMap.has(room_type_id)) {
                    roomMap.set(room_type_id, { room_type_id, room_type_name, quantity: 0, total_capacity: 0 });
                }
                const roomData = roomMap.get(room_type_id);
                roomData.quantity += 1;
                roomData.total_capacity += capacity;
            }
        });

        return Array.from(roomMap.values());
    }); 
    const maxRoomNumber = computed(() => {
        if(!countOfRoomTypes.value && !comboRow.value.room_type_id){
            return
        }
        const roomData = countOfRoomTypes.value.find(room => room.room_type_id === comboRow.value.room_type_id);
        return roomData ? roomData.quantity : 0;
    });    
    const maxCapacity = computed(() => {
        if(!countOfRoomTypes.value && !comboRow.value.room_type_id){
            return
        }
        const roomData = countOfRoomTypes.value.find(room => room.room_type_id === comboRow.value.room_type_id);
        return roomData ? roomData.total_capacity : 0;
    });
    const minNumberOfPeople = computed(() => {
        return comboRow.value.number_of_rooms || 1; // Ensuring at least 1 person
    });   
    const numberOfRooms = ref(1);
    const numberOfPeople = ref(1);
    const comboRow = ref({
        check_in: inDate.value,
        check_out: outDate.value,
        room_type_id: null,
        number_of_rooms: numberOfRooms.value,
        number_of_people: numberOfPeople.value
    });
    
    const checkDates = async () => {
        const hotelId = selectedHotelId.value;
        const startDate = formatDate(comboRow.value.check_in);
        const endDate = formatDate(comboRow.value.check_out);
        await fetchAvailableRooms(hotelId, startDate, endDate);        
    };
    const onDateChange = async () => {
        minCheckOutDate.value = new Date(comboRow.value.check_in);
        minCheckOutDate.value.setDate(comboRow.value.check_in.getDate() + 1);
        if (new Date(comboRow.value.check_out) < minCheckOutDate.value) {
            comboRow.value.check_out = new Date(minCheckOutDate.value);
        }

        reservationCombos.value.forEach(combo => {
            combo.check_in = comboRow.value.check_in;
            combo.check_out = comboRow.value.check_out;
        });
        await checkDates();
        validateCombos();
    };
    const addReservationCombo = () => {
        // console.log('addReservationCombo:',comboRow.value);
        const roomType = roomTypes.value.find(rt => rt.room_type_id === comboRow.value.room_type_id);
        reservationCombos.value.push({
            ...comboRow.value,
            room_type_name: roomType.room_type_name,
        });
        // Reset comboRow for the next addition
        comboRow.value.number_of_rooms = 1;
        comboRow.value.number_of_people = 1;
            
        validateCombos();
    };    

    // Table
    const reservationCombos = ref([]);
    const validationErrors = ref([]);
    const consolidatedCombos = computed(() => {
        const consolidated = {};
        if (reservationCombos.value) {
            reservationCombos.value.forEach(combo => {
                if (!consolidated[combo.room_type_id]) {
                consolidated[combo.room_type_id] = {
                    room_type_id: combo.room_type_id,
                    room_type_name: combo.room_type_name,
                    totalRooms: 0,
                    totalPeople: 0,
                    roomCapacities: [],
                };
                }
                consolidated[combo.room_type_id].totalRooms += combo.number_of_rooms;
                consolidated[combo.room_type_id].totalPeople += combo.number_of_people;
                for (let i = 0; i < combo.number_of_rooms; i++) {
                consolidated[combo.room_type_id].roomCapacities.push(
                    availableRooms.value?.find(room => room.room_type_id === combo.room_type_id)?.capacity || 0
                );
                }
            });            
        }
        
        return consolidated;
    });
    const totalPeople = computed(() => {
        return Object.values(consolidatedCombos.value).reduce((sum, combo) => sum + combo.totalPeople, 0);
    });
    const deleteCombo = (combo) => {
        reservationCombos.value = reservationCombos.value.filter(c => c !== combo);
        validateCombos();
    };
    const validateCombos = () => {
        validationErrors.value = [];
        const rooms = ref(availableRooms.value ? [...availableRooms.value] : []);

        for (const roomTypeId in consolidatedCombos.value) {
        const combo = consolidatedCombos.value[roomTypeId];
        let availableRoomCount = 0;
        let availableCapacity = 0;
        const availableRoomsForCapacity = [];

        rooms.value.forEach(room => {
            if (room.room_type_id === combo.room_type_id && room.for_sale) {
            availableRoomCount++;
            availableCapacity += room.capacity;
            availableRoomsForCapacity.push(room.capacity);
            }
        });

        if (combo.totalRooms > availableRoomCount) {
            validationErrors.value.push(`部屋タイプ ${combo.room_type_name} の部屋数が不足しています。利用可能数: ${availableRoomCount}, 要求数: ${combo.totalRooms}`);
        } else {
            const sortedRoomCapacities = combo.roomCapacities.slice().sort((a, b) => b - a);
            const sortedAvailableCapacities = availableRoomsForCapacity.slice().sort((a, b) => b - a);

            let peopleRemaining = combo.totalPeople;
            for (let i = 0; i < sortedRoomCapacities.length; i++) {
            if (peopleRemaining > 0) {
                peopleRemaining -= sortedAvailableCapacities[i] || 0;
            }
            }
            if (peopleRemaining > 0) {
            validationErrors.value.push(`部屋タイプ ${combo.room_type_name} の人数が部屋のキャパシティを超えています。`);
            }
        }

        reservationCombos.value.forEach(individualCombo => {
            if (individualCombo.room_type_id === combo.room_type_id) {
            let peopleRemaining = combo.totalPeople;
            for (let i = 0; i < combo.roomCapacities.length; i++) {
                if (peopleRemaining > 0) {
                peopleRemaining -= availableRoomsForCapacity[i] || 0;
                }
            }
            if (combo.totalRooms > availableRoomCount || peopleRemaining > 0) {
                individualCombo.rowStyle = { backgroundColor: 'rgba(255, 0, 0, 0.2)' };
            } else {
                individualCombo.rowStyle = {};
            }
            }
        });
        }
    };

    // Dialog
    const dialogVisible = ref(false);
    const reservationDetails = ref({
        hotel_id: null,
        client_id: null,
        check_in: '',
        check_out: '',
        number_of_nights: 1,
        number_of_people: 1,
        name: '',        
        legal_or_natural_person: 'legal',
        gender: 'other',
        email: null,
        phone: null,
    });
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
    const isClientSelected = ref(false);
    const selectedClient = ref(null);
    const client = ref({});
    const filteredClients = ref([]);
    const openDialog = () => {   
        reservationDetails.value.check_in = formatDate(reservationCombos.value[0].check_in);
        reservationDetails.value.check_out = formatDate(reservationCombos.value[0].check_out);
        reservationDetails.value.number_of_nights = calcDateDiff(reservationCombos.value[0].check_in, reservationCombos.value[0].check_out);
        dialogVisible.value = true;        
    };
    const closeDialog = () => {
        dialogVisible.value = false; 
    };
    const filterClients = (event) => {
        const query = event.query.toLowerCase();
        filteredClients.value = clients.value.filter((client) =>
        (client.name && client.name.toLowerCase().includes(query)) ||
        (client.name_kana && normalizeKana(client.name_kana).toLowerCase().includes(normalizeKana(query))) ||
        (client.name_kanji && client.name_kanji.toLowerCase().includes(query))
        );
        
        reservationDetails.value.name = query;
    };
    const onClientSelect = (event) => {
        // Get selected client object from the event
        selectedClient.value = event.value;
        isClientSelected.value = true;
        //console.log('Selected Client:', selectedClient.value);        

        // Update reservationDetails with the selected client's information
        reservationDetails.value.client_id = selectedClient.value.id;
        reservationDetails.value.legal_or_natural_person = selectedClient.value.legal_or_natural_person;
        reservationDetails.value.gender = selectedClient.value.gender;
        reservationDetails.value.email = selectedClient.value.email;
        reservationDetails.value.phone = selectedClient.value.phone;        

        // Update the name field (optional, as it's already handled by v-model)
        reservationDetails.value.name = selectedClient.value.name_kanji || selectedClient.value.name;

        client.value = { display_name: reservationDetails.value.name_kanji || reservationDetails.value.name };
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
    const submitReservation = async () => {
        // Validate email and phone
        validateEmail(reservationDetails.value.email);
        validatePhone(reservationDetails.value.phone);        

        // Check if either email or phone is filled
        if (!reservationDetails.value.email && !reservationDetails.value.phone) {
            toast.add({
                severity: 'warn',
                summary: '注意',
                detail: 'メールアドレスまたは電話番号の少なくとも 1 つを入力する必要があります。',
                life: 3000,
            });
            return; // Stop further execution if validation fails
        }
        // Check for valid email format
        if (reservationDetails.value.email && !isValidEmail.value) {
            toast.add({
                severity: 'warn',
                summary: '注意',
                detail: '有効なメールアドレスを入力してください。',
                life: 3000,
            });
            return;
        }
        // Check for valid phone format
        if (reservationDetails.value.phone && !isValidPhone.value) {
            toast.add({
                severity: 'warn',
                summary: '注意',
                detail: '有効な電話番号を入力してください。',
                life: 3000,
            });
            return;
        }
        
        console.log(reservationDetails.value, consolidatedCombos.value);
        const reservation = await createHoldReservationCombo(reservationDetails.value, consolidatedCombos.value);        
        await fetchMyHoldReservations();
        await goToEditReservationPage(reservation.reservation.id); 
        reservationCombos.value = [];
        closeDialog();
        
    };
    const goToEditReservationPage = async (reservation_id) => {                
        await setReservationId(reservation_id);
                    
        router.push({ name: 'ReservationEdit', params: { reservation_id: reservation_id } });                          
    };

    onMounted(async () => {  
        await fetchHotels();
        await fetchHotel();  
        await checkDates();
        
        comboRow.value.room_type_id = roomTypes.value[0].room_type_id;        
        reservationDetails.value.hotel_id = selectedHotelId.value;

        if(clients.value.length === 0) {
            setClientsIsLoading(true);
            const clientsTotalPages = fetchClients(1);
            // Fetch clients for all pages
            for (let page = 2; page <= clientsTotalPages; page++) {
                fetchClients(page);
            }
            setClientsIsLoading(false);            
        }
    });

    watch(() => comboRow.value.number_of_rooms,
        (newRooms) => {
            if (comboRow.value.number_of_people < newRooms) {
                comboRow.value.number_of_people = newRooms;
            }
        }
    );
    watch(totalPeople, (newTotal) => {
        reservationDetails.value.number_of_people = newTotal;
    });
    watch(() => selectedHotelId.value,
        async(newId) => {
            await fetchHotels();
            await fetchHotel();  
            await checkDates();
            
            comboRow.value.room_type_id = roomTypes.value[0].room_type_id;        
            reservationDetails.value.hotel_id = selectedHotelId.value;
        }
    );
</script>