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
                    <div class="col-span-1 mt-6">
                        <!-- Smoking Preference -->
                        <label class="font-semibold mb-2 block">喫煙設定</label>
                        <div class="flex gap-3">
                            <div v-for="option in smokingPreferenceOptions" :key="option.value" class="flex items-center">
                            <RadioButton
                                v-model="selectedSmokingPreference"
                                :inputId="`combo_smoking_${option.value}`"
                                name="comboSmokingPreference"
                                :value="option.value"
                                @change="onSmokingPreferenceChange"
                            />
                            <label :for="`combo_smoking_${option.value}`" class="ml-1">{{ option.label }}</label>
                            </div>
                        </div>
                    </div>
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
                        <Button
                            v-if="reservationCombos.length > 0"
                            label="順番待ち登録"
                            icon="pi pi-users"
                            class="p-button-warning mt-2"
                            @click="openWaitlistDialog"
                        />
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
            :style="{ width: '50vw' }"
        >
            <div class="grid grid-cols-2 gap-2 gap-y-6 pt-6">
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
                        <p>
                            <i v-if="slotProps.option.is_legal_person" class="pi pi-building"></i>
                            <i v-else class="pi pi-user"></i>
                            {{ slotProps.option.name_kanji || slotProps.option.name_kana || slotProps.option.name || '' }}
                            <span v-if="slotProps.option.name_kana"> ({{ slotProps.option.name_kana }})</span>
                        </p>
                        <div class="flex items-center gap-2">
                            <p v-if="slotProps.option.phone" class="text-xs text-sky-800"><i class="pi pi-phone"></i> {{ slotProps.option.phone }}</p>
                            <p v-if="slotProps.option.phone" class="text-xs text-sky-800"><i class="pi pi-at"></i> {{ slotProps.option.email }}</p>
                            <p v-if="slotProps.option.fax" class="text-xs text-sky-800"><i class="pi pi-send"></i> {{ slotProps.option.fax }}</p>
                        </div>
                        </div>
                    </template>
                    </AutoComplete>
                    <label>個人氏名　||　法人名称</label>
                </FloatLabel>
                </div>

                <!-- Type of person (Legal or Natural) -->
                <div class="col-span-1">
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
                <div class="col-span-1">
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
                <div class="col-span-1">
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
                <div class="col-span-1">
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
                <div class="col-span-1">
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

                <div class="col-span-1">
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

                <div class="col-span-1">
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

                <div class="col-span-1">
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

        <!-- Waitlist Dialog -->
      <Dialog
        v-model:visible="waitlistDialogVisible"
        header="順番待ちリスト登録"
        :closable="true"
        :modal="true"
        :style="{ width: '50vw' }"
      >
        <div class="grid grid-cols-2 gap-x-4 gap-y-6 pt-6">
          <!-- Client Selection/Creation for Waitlist -->
          <div class="col-span-2 mb-2">
            <FloatLabel>
              <AutoComplete
                v-model="waitlistForm.client_name_waitlist"
                :suggestions="filteredClients"
                optionLabel="display_name"
                @complete="filterClients"
                @option-select="onClientSelectForWaitlist"
                fluid
                placeholder="既存顧客を検索または新規顧客名を入力"
              >
                <template #option="slotProps">
                  <div>
                    <p>
                      <i v-if="slotProps.option.is_legal_person" class="pi pi-building"></i>
                      <i v-else class="pi pi-user"></i>
                      {{ slotProps.option.name_kanji || slotProps.option.name_kana || slotProps.option.name || '' }}
                      <span v-if="slotProps.option.name_kana"> ({{ slotProps.option.name_kana }})</span>
                    </p>
                     <div class="flex items-center gap-2">
                      <p v-if="slotProps.option.phone" class="text-xs text-sky-800"><i class="pi pi-phone"></i> {{ slotProps.option.phone }}</p>
                      <p v-if="slotProps.option.email" class="text-xs text-sky-800"><i class="pi pi-at"></i> {{ slotProps.option.email }}</p>
                    </div>
                  </div>
                </template>
              </AutoComplete>
              <label>顧客名（検索または新規入力）</label>
            </FloatLabel>
          </div>

          <div class="col-span-1" v-if="!isClientSelectedForWaitlist">
            <SelectButton
              v-model="waitlistForm.client_legal_or_natural_person_waitlist"
              :options="personTypeOptions"
              option-label="label"
              option-value="value"
              fluid
            />
          </div>
          <div class="col-span-1" v-if="!isClientSelectedForWaitlist && waitlistForm.client_legal_or_natural_person_waitlist === 'natural'">
            <div class="flex gap-3">
              <div v-for="option in genderOptions" :key="option.value" class="flex items-center gap-2">
                <RadioButton
                  v-model="waitlistForm.client_gender_waitlist"
                  :inputId="`combo_waitlist_gender_${option.value}`"
                  :value="option.value"
                />
                <label :for="`combo_waitlist_gender_${option.value}`">{{ option.label }}</label>
              </div>
            </div>
          </div>

          <div class="col-span-2"></div>

          <div class="col-span-1">
            <FloatLabel>
              <InputText
                v-model="waitlistForm.contact_email"
                type="email"
                fluid
                required
                :disabled="isClientSelectedForWaitlist && selectedClientForWaitlist && selectedClientForWaitlist.email"
              />
              <label>連絡用メールアドレス *</label>
            </FloatLabel>
          </div>

          <div class="col-span-1">
            <FloatLabel>
              <InputText
                v-model="waitlistForm.contact_phone"
                type="tel"
                fluid
                :disabled="isClientSelectedForWaitlist && selectedClientForWaitlist && selectedClientForWaitlist.phone"
              />
              <label>連絡用電話番号</label>
            </FloatLabel>
          </div>

          <div class="col-span-2">
            <label class="font-semibold mb-2 block">希望連絡方法 *</label>
            <div class="flex gap-4">
              <div class="flex items-center">
                <RadioButton v-model="waitlistForm.communication_preference" inputId="combo_comm_email_waitlist" value="email" />
                <label for="combo_comm_email_waitlist" class="ml-2">メール</label>
              </div>
              <div class="flex items-center">
                <RadioButton v-model="waitlistForm.communication_preference" inputId="combo_comm_phone_waitlist" value="phone" />
                <label for="combo_comm_phone_waitlist" class="ml-2">電話</label>
              </div>
            </div>
          </div>

          <div class="col-span-2">
            <FloatLabel>
              <Textarea v-model="waitlistForm.notes" rows="3" fluid placeholder="例：デラックスルーム1室、スタンダードルーム2室希望" />
              <label>備考（部屋タイプ詳細など）</label>
            </FloatLabel>
          </div>

          <div class="col-span-1">
            <FloatLabel>
              <InputText :value="selectedHotel ? selectedHotel.name : ''" fluid disabled />
              <label>ホテル</label>
            </FloatLabel>
          </div>
          <div class="col-span-1">
             <FloatLabel>
                <InputText
                    :value="waitlistForm.room_type_id ? roomTypes.find(rt => rt.room_type_id === waitlistForm.room_type_id)?.room_type_name : '指定なし'"
                    fluid
                    disabled />
                <label>代表部屋タイプ (備考参照)</label>
            </FloatLabel>
          </div>
          <div class="col-span-1">
            <FloatLabel>
              <InputText :value="waitlistForm.requested_check_in_date" fluid disabled />
              <label>希望チェックイン</label>
            </FloatLabel>
          </div>
          <div class="col-span-1">
            <FloatLabel>
              <InputText :value="waitlistForm.requested_check_out_date" fluid disabled />
              <label>希望チェックアウト</label>
            </FloatLabel>
          </div>
           <div class="col-span-1">
            <FloatLabel>
              <InputNumber :modelValue="waitlistForm.number_of_guests" fluid disabled />
              <label>合計人数</label>
            </FloatLabel>
          </div>
          <div class="col-span-1">
            <FloatLabel>
              <InputText :value="smokingPreferenceOptions.find(o => o.value === waitlistForm.preferred_smoking_status)?.label || '指定なし'" fluid disabled />
              <label>喫煙設定の希望</label>
            </FloatLabel>
          </div>

        </div>
        <template #footer>
          <Button label="閉じる" icon="pi pi-times" @click="closeWaitlistDialog" class="p-button-text p-button-danger p-button-sm" />
          <Button label="登録" icon="pi pi-plus" @click="submitWaitlistEntry" :loading="waitlistStore.loading" class="p-button-text p-button-success p-button-sm" />
        </template>
      </Dialog>

      <WaitlistDialog
        v-model:visible="waitlistDialogVisibleState"
        :initialHotelId="selectedHotelId"
        :initialHotelName="selectedHotel ? selectedHotel.name : ''"
        :initialRoomTypeId="waitlistInitialRoomTypeId"
        :initialCheckInDate="waitlistInitialCheckInDate"
        :initialCheckOutDate="waitlistInitialCheckOutDate"
        :initialNumberOfGuests="waitlistInitialNumberOfGuests"
        :initialSmokingPreference="selectedSmokingPreference"
        :initialNotes="waitlistInitialNotes"
        :allClients="clients"
        :allRoomTypes="roomTypes"
        :smokingPreferenceOptions="smokingPreferenceOptions"
        @submitted="handleWaitlistSubmitted"
      />
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
    import WaitlistDialog from '@/components/Dialogs/WaitlistDialog.vue'; // Import the new component

    // Stores
    import { useHotelStore } from '@/composables/useHotelStore';
    const { selectedHotel, selectedHotelId, selectedHotelRooms, fetchHotels, fetchHotel } = useHotelStore();
    import { useClientStore } from '@/composables/useClientStore';
    const { clients, fetchClients, setClientsIsLoading, createBasicClient } = useClientStore(); // Added createBasicClient
    import { useReservationStore } from '@/composables/useReservationStore';
    const { availableRooms, fetchAvailableRooms, reservationId, setReservationId, fetchReservation, fetchMyHoldReservations, createHoldReservationCombo } = useReservationStore();
    import { useWaitlistStore } from '@/composables/useWaitlistStore';

    // Stores
    const waitlistStore = useWaitlistStore();

    // Refs for props to pass to WaitlistDialog
    const waitlistDialogVisibleState = ref(false);
    const waitlistInitialRoomTypeId = ref(null);
    const waitlistInitialCheckInDate = ref('');
    const waitlistInitialCheckOutDate = ref('');
    const waitlistInitialNumberOfGuests = ref(1);
    const waitlistInitialNotes = ref('');


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
    const normalizePhone = (phone) => {
        if (!phone) return '';

        // Remove all non-numeric characters
        let normalized = phone.replace(/\D/g, '');

        // Remove leading zeros
        normalized = normalized.replace(/^0+/, '');

        return normalized;
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
    const selectedSmokingPreference = ref('any'); // 'any', 'smoking', 'non_smoking'
    const smokingPreferenceOptions = ref([
        { label: '指定なし', value: 'any' },
        { label: '喫煙', value: 'smoking' },
        { label: '禁煙', value: 'non_smoking' },
    ]);

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
            return []; // Return empty array if no available rooms
        }
        const roomMap = new Map();

        const preferenceFilteredRooms = availableRooms.value.filter(room => {
            if (selectedSmokingPreference.value === 'any') return room.for_sale;
            if (selectedSmokingPreference.value === 'smoking') return room.for_sale && room.smoking === true;
            if (selectedSmokingPreference.value === 'non_smoking') return room.for_sale && room.smoking === false;
            return false;
        });

        preferenceFilteredRooms.forEach(({ room_type_id, room_type_name, capacity }) => {
            // All rooms here are already for_sale and match preference
            if (!roomMap.has(room_type_id)) {
                // Ensure room_type_name is sourced correctly, potentially from selectedHotelRooms if not present on all room objects
                const baseRoomTypeInfo = selectedHotelRooms.value.find(rt => rt.room_type_id === room_type_id);
                roomMap.set(room_type_id, {
                    room_type_id,
                    room_type_name: room_type_name || (baseRoomTypeInfo ? baseRoomTypeInfo.room_type_name : 'Unknown'),
                    quantity: 0,
                    total_capacity: 0
                });
            }
            const roomData = roomMap.get(room_type_id);
            roomData.quantity += 1;
            roomData.total_capacity += capacity;
        });

        // Ensure all room types from the hotel are present, even if with 0 quantity for the preference
        if (selectedHotelRooms.value) {
            selectedHotelRooms.value.forEach(hotelRoomType => {
                if (hotelRoomType.room_type_id && !roomMap.has(hotelRoomType.room_type_id)) {
                    roomMap.set(hotelRoomType.room_type_id, {
                        room_type_id: hotelRoomType.room_type_id,
                        room_type_name: hotelRoomType.room_type_name,
                        quantity: 0,
                        total_capacity: 0
                    });
                }
            });
        }

        return Array.from(roomMap.values());
    }); 
    const maxRoomNumber = computed(() => {
        if(!countOfRoomTypes.value || !comboRow.value.room_type_id){ // Added check for countOfRoomTypes length
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
        await checkDates(); // This will fetch available rooms
        validateCombos();   // This will validate based on new availability (needs to be preference aware)
    };

    const onSmokingPreferenceChange = async () => {
        // console.log("Combo smoking preference changed to:", selectedSmokingPreference.value);
        await checkDates();
        validateCombos();
    };

    // const onClientSelectForWaitlist, resetWaitlistClientSelection, and watcher for client_name_waitlist are moved to WaitlistDialog.vue

    const openWaitlistDialog = () => {
        if (!reservationCombos.value.length) {
            toast.add({ severity: 'warn', summary: '情報不足', detail: 'まず予約コンボに部屋を追加してください。', life: 3000 });
            return;
        }

        const primaryComboItem = reservationCombos.value[0];
        let notesContent = "希望の組み合わせ：\n";
        reservationCombos.value.forEach(c => {
            notesContent += `- ${c.room_type_name}: ${c.number_of_rooms}室, ${c.number_of_people}名\n`;
        });

        // Set refs that will be passed as props
        waitlistInitialRoomTypeId.value = primaryComboItem.room_type_id;
        waitlistInitialCheckInDate.value = formatDate(primaryComboItem.check_in);
        waitlistInitialCheckOutDate.value = formatDate(primaryComboItem.check_out);
        waitlistInitialNumberOfGuests.value = totalPeople.value;
        waitlistInitialNotes.value = notesContent.trim();
        // selectedSmokingPreference is already a ref and passed directly

        waitlistDialogVisibleState.value = true; // Changed from waitlistDialogVisible
    };

    const handleWaitlistSubmitted = () => {
        // Optional: any action needed in parent after waitlist is submitted
        console.log("Waitlist entry submitted (event received in parent)");
        // e.g., refresh some data if necessary, though usually not for waitlist creation itself
    };

    // const closeWaitlistDialog and submitWaitlistEntry are moved to WaitlistDialog.vue

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
        if (!availableRooms.value) {
            validationErrors.value.push("利用可能な部屋のデータがありません。日付を確認してください。");
            return;
        }

        // Filter all available rooms based on the global smoking preference first
        const preferenceFilteredOverallRooms = availableRooms.value.filter(room => {
            if (!room.for_sale) return false;
            if (selectedSmokingPreference.value === 'any') return true;
            if (selectedSmokingPreference.value === 'smoking') return room.smoking === true;
            if (selectedSmokingPreference.value === 'non_smoking') return room.smoking === false;
            return false;
        });

        for (const roomTypeIdStr in consolidatedCombos.value) {
            const roomTypeId = parseInt(roomTypeIdStr, 10);
            const combo = consolidatedCombos.value[roomTypeId];

            // Further filter for the specific room type being validated
            const roomsOfThisTypeAndPreference = preferenceFilteredOverallRooms.filter(
                room => room.room_type_id === roomTypeId
            );

            const availableRoomCount = roomsOfThisTypeAndPreference.length;
            const availableRoomsForCapacity = roomsOfThisTypeAndPreference.map(r => r.capacity).sort((a, b) => b - a); // Sort descending for optimal fit

            if (combo.totalRooms > availableRoomCount) {
                validationErrors.value.push(`部屋タイプ ${combo.room_type_name} (${smokingPreferenceOptions.value.find(o=>o.value === selectedSmokingPreference.value).label}) の部屋数が不足しています。利用可能数: ${availableRoomCount}, 要求数: ${combo.totalRooms}`);
            } else {
                // Check capacity: Assign people to largest available rooms first
                let peopleToAssign = combo.totalPeople;
                let roomsUsedCount = 0;
                for (const capacity of availableRoomsForCapacity) {
                    if (roomsUsedCount >= combo.totalRooms) break; // Only use up to the number of rooms requested for this type
                    if (peopleToAssign <= 0) break;
                    peopleToAssign -= capacity;
                    roomsUsedCount++;
                }

                if (peopleToAssign > 0) {
                    validationErrors.value.push(`部屋タイプ ${combo.room_type_name} (${smokingPreferenceOptions.value.find(o=>o.value === selectedSmokingPreference.value).label}) の人数が部屋のキャパシティを超えています。`);
                }
            }
        }

        // Update row styles based on validation (this part might need adjustment if individual combo items can have different preferences, but for now global pref)
        reservationCombos.value.forEach(individualCombo => {
            const comboForValidation = consolidatedCombos.value[individualCombo.room_type_id];
            if (comboForValidation) { // Check if it exists in consolidated (it should)
                 const roomsOfThisTypeAndPreference = preferenceFilteredOverallRooms.filter(
                    room => room.room_type_id === individualCombo.room_type_id
                );
                const availableRoomCount = roomsOfThisTypeAndPreference.length;
                const availableCaps = roomsOfThisTypeAndPreference.map(r => r.capacity).sort((a,b) => b - a);

                let peopleRemaining = individualCombo.number_of_people; // Validate this specific combo item's people count
                let roomsUsed = 0;
                for(const cap of availableCaps) {
                    if(roomsUsed >= individualCombo.number_of_rooms) break;
                    peopleRemaining -= cap;
                    roomsUsed++;
                    if(peopleRemaining <=0) break;
                }

                if (individualCombo.number_of_rooms > availableRoomCount || peopleRemaining > 0) {
                    individualCombo.rowStyle = { backgroundColor: 'rgba(255, 0, 0, 0.2)' };
                } else {
                    individualCombo.rowStyle = {};
                }
            }
        });
    };

    // Dialog
    const dialogVisible = ref(false);
    const waitlistDialogVisible = ref(false);
    const waitlistForm = ref({
        client_id: null,
        hotel_id: null,
        room_type_id: null,
        requested_check_in_date: '',
        requested_check_out_date: '',
        number_of_guests: 1,
        contact_email: '',
        contact_phone: '',
        communication_preference: 'email',
        notes: '',
        preferred_smoking_status: 'any',
        client_name_waitlist: '',
        client_legal_or_natural_person_waitlist: 'legal',
        client_gender_waitlist: 'other',
        client_email_waitlist: '',
        client_phone_waitlist: ''
    });
    // const selectedClientForWaitlist = ref(null); // Moved to dialog
    // const isClientSelectedForWaitlist = ref(false); // Moved to dialog

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
        const normalizedQuery = normalizePhone(query);
        const isNumericQuery = /^\d+$/.test(normalizedQuery);

        if (!query || !clients.value || !Array.isArray(clients.value)) {
            filteredClients.value = [];
            return;
        }

        filteredClients.value = clients.value.filter((client) => {
            // Name filtering (case-insensitive)
            const matchesName = 
                (client.name && client.name.toLowerCase().includes(query)) || 
                (client.name_kana && normalizeKana(client.name_kana).toLowerCase().includes(normalizeKana(query))) || 
                (client.name_kanji && client.name_kanji.toLowerCase().includes(query));
            // Phone/Fax filtering (only for numeric queries)
            const matchesPhoneFax = isNumericQuery &&
                ((client.fax && normalizePhone(client.fax).includes(normalizedQuery)) || 
                (client.phone && normalizePhone(client.phone).includes(normalizedQuery)));
            // Email filtering (case-insensitive)
            const matchesEmail = client.email && client.email.toLowerCase().includes(query);

            // console.log('Client:', client, 'Query:', query, 'matchesName:', matchesName, 'matchesPhoneFax:', matchesPhoneFax, 'isNumericQuery', isNumericQuery, 'matchesEmail:', matchesEmail);

            return matchesName || matchesPhoneFax || matchesEmail;
        });
        
        reservationDetails.value.name = query;
    };
    const onClientSelect = (event) => {
        // Get selected client object from the event
        selectedClient.value = event.value;
        isClientSelected.value = true;
        // console.log('Selected Client:', selectedClient.value);        

        // Update reservationDetails with the selected client's information
        reservationDetails.value.client_id = selectedClient.value.id;
        reservationDetails.value.legal_or_natural_person = selectedClient.value.legal_or_natural_person;
        reservationDetails.value.gender = selectedClient.value.gender;
        reservationDetails.value.email = selectedClient.value.email;
        reservationDetails.value.phone = selectedClient.value.phone;        

        // Update the name field (optional, as it's already handled by v-model)
        reservationDetails.value.name = selectedClient.value.name_kanji || selectedClient.value.name_kana || selectedClient.value.name;

        client.value = { display_name: selectedClient.value.name_kanji || selectedClient.value.name_kana || selectedClient.value.name };
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
        
        // console.log(reservationDetails.value, consolidatedCombos.value);
        const reservation = await createHoldReservationCombo(reservationDetails.value, consolidatedCombos.value);
        toast.add({ severity: 'success', summary: '成功', detail: '保留中予約作成されました。', life: 3000 });
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