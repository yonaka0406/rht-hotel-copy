<template>
  <div>    
    <Panel header="期間ごと空室">
      <!-- Select Dates and Number of People -->
      <div class="grid grid-cols-4 mb-4 mr-4 gap-2">
        <div class="col-span-4">
          <p class="text-lg text-left mb-2">最適モードでは、可能な限り少人数の部屋数が割り当てられます。</p>
        </div>
        <div class="col-span-1 mt-6">
          <FloatLabel>
            <DatePicker 
              v-model="inDate"
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
              v-model="outDate"
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
              v-model="numberOfPeople"
              :min="1"
              fluid
            />
            <label>人数</label>
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
          <FloatLabel>
            <InputText
              v-if="selectedCell"  
              type="text"
              v-model="roomTypeInput"              
              variant="filled"              
              fluid
              disabled 
            />
            <label v-if="selectedCell">部屋タイプ</label>
          </FloatLabel>
        </div>
        <div class="col-span-1 mt-6 flex items-center space-x-2">
          <Button 
            v-if="selectedCell && !isRoomUnavailableForSelection()"
            label="新規予約" 
            icon="pi pi-calendar"             
            :disabled="isCapacityExceeded(selectedCell.roomTypeId, selectedCell.dateIndex)"
            @click="openDialog" 
          />
          <Button
            v-if="selectedCell && isRoomUnavailableForSelection()"
            label="順番待ち登録"
            icon="pi pi-users"
            class="p-button-warning"
            @click="openWaitlistDialog"
          />
        </div>
      </div>
      
      <!-- Calendar-->
      <div class="table-container" ref="tableContainer" @scroll="onScroll">
        <table class="table-auto w-full mb-2">          
          <thead>
            <tr>
              <th class="bg-white sticky left-0 z-20 border-l-2 border-gray-300" >部屋タイプ</th>
              <th 
                v-for="(date, index) in dateRange" 
                :key="index" 
                class="px-4 py-2 text-center sticky top-0 bg-white z-10"
              >                
                {{ date }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
                v-for="(roomTypeId, roomIndex) in extractRoomTypes(generateDateRangeArray)"
                :key="roomIndex"
            >
              <td class="px-4 py-2 text-center font-bold bg-white sticky left-0 z-10">
                  {{ getRoomTypeName(roomTypeId, generateDateRangeArray) }}
              </td>
              <td
                  v-for="(dateData, dateIndex) in generateDateRangeArray"
                  :key="dateIndex"
                  class="px-4 py-2 text-center"
                  @click="selectCell(roomTypeId, dateIndex)"                  
                  :class="{
                  'bg-blue-100': isSelectedCell(roomTypeId, dateIndex),
                  'cursor-pointer': true,                  
                  'bg-red-100': isCapacityExceeded(roomTypeId, dateIndex)
                }"
              >
                  <div v-if="dateData.rooms && dateData.rooms[roomTypeId]">
                    <p>{{ dateData.rooms[roomTypeId].count }}室 <i class="pi pi-box" /></p>
                    <!---->
                    <p>{{ dateData.rooms[roomTypeId].total_capacity }}人 <i class="pi pi-users" /></p>
                  </div>
                  <div v-else>
                      <p>不可</p>
                  </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

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
                  :inputId="`waitlist_gender_${option.value}`"
                  :value="option.value"
                />
                <label :for="`waitlist_gender_${option.value}`">{{ option.label }}</label>
              </div>
            </div>
          </div>

          <div class="col-span-2"></div> <!-- Spacer -->

          <!-- Contact Email (Required for waitlist) -->
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

          <!-- Contact Phone (Optional, but required if preference is phone) -->
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

          <!-- Communication Preference -->
          <div class="col-span-2">
            <label class="font-semibold mb-2 block">希望連絡方法 *</label>
            <div class="flex gap-4">
              <div class="flex items-center">
                <RadioButton v-model="waitlistForm.communication_preference" inputId="comm_email_waitlist" value="email" />
                <label for="comm_email_waitlist" class="ml-2">メール</label>
              </div>
              <div class="flex items-center">
                <RadioButton v-model="waitlistForm.communication_preference" inputId="comm_phone_waitlist" value="phone" />
                <label for="comm_phone_waitlist" class="ml-2">電話</label>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div class="col-span-2">
            <FloatLabel>
              <Textarea v-model="waitlistForm.notes" rows="3" fluid />
              <label>備考</label>
            </FloatLabel>
          </div>

          <!-- Display pre-filled data (read-only) -->
          <div class="col-span-1">
            <FloatLabel>
              <InputText :value="selectedHotel ? selectedHotel.name : ''" fluid disabled />
              <label>ホテル</label>
            </FloatLabel>
          </div>
          <div class="col-span-1">
            <FloatLabel>
              <InputText :value="selectedCell ? selectedCell.roomTypeName : ''" fluid disabled />
              <label>部屋タイプ</label>
            </FloatLabel>
          </div>
          <div class="col-span-1">
            <FloatLabel>
              <InputText :value="formatDate(inDate)" fluid disabled />
              <label>希望チェックイン</label>
            </FloatLabel>
          </div>
          <div class="col-span-1">
            <FloatLabel>
              <InputText :value="formatDate(outDate)" fluid disabled />
              <label>希望チェックアウト</label>
            </FloatLabel>
          </div>
           <div class="col-span-1">
            <FloatLabel>
              <InputNumber :modelValue="numberOfPeople" fluid disabled />
              <label>人数</label>
            </FloatLabel>
          </div>

        </div>
        <template #footer>
          <Button label="閉じる" icon="pi pi-times" @click="closeWaitlistDialog" class="p-button-text p-button-danger p-button-sm" />
          <Button label="登録" icon="pi pi-plus" @click="submitWaitlistEntry" :loading="waitlistStore.loading" class="p-button-text p-button-success p-button-sm" />
        </template>
      </Dialog>
      
    </Panel>
    
  </div>
</template>


<script setup>
  // Vue
  import { ref, computed, watch, onMounted, nextTick } from 'vue';
  import { useRouter } from 'vue-router';
  const router = useRouter();

  // Primevue
  import { useToast } from 'primevue/usetoast';
  const toast = useToast();
  import Panel from 'primevue/panel';
  import FloatLabel from 'primevue/floatlabel'
  import { DatePicker, InputNumber, InputText, AutoComplete, Select, SelectButton, RadioButton, Textarea } from 'primevue'; // Added Textarea
  import { DataTable, Column } from 'primevue';
  import Dialog from 'primevue/dialog';
  import Button from 'primevue/button'

  // Stores
  import { useHotelStore } from '@/composables/useHotelStore';
  const { selectedHotel, selectedHotelId, selectedHotelRooms, fetchHotels, fetchHotel } = useHotelStore();
  import { useClientStore } from '@/composables/useClientStore';
  const { clients, fetchClients, setClientsIsLoading, createBasicClient } = useClientStore(); // Added createBasicClient
  import { useReservationStore } from '@/composables/useReservationStore';
  const { availableRooms, fetchAvailableRooms, reservationId, setReservationId, fetchReservation, fetchMyHoldReservations } = useReservationStore();
  import { useWaitlistStore } from '@/composables/useWaitlistStore';
  
  // Stores
  const waitlistStore = useWaitlistStore();

  // Form
  const inDate = ref(new Date());
  const outDate = ref(new Date(inDate.value));  
    outDate.value.setDate(inDate.value.getDate() + 1);
  const minCheckOutDate = ref(outDate.value);
  const centralDate = ref(new Date());
  const roomDataCache = ref(new Map());
  const generateDateRangeArray = ref([]);
  const dateColumns = ref([]);      
  const numberOfPeople = ref(1); 
  const selectedCell = ref(null);
  const roomTypeInput = ref('');       
  const loading = ref(false);
  const numberOfNights = computed(() => {
      if (inDate && outDate) {
      const checkInDate = inDate.value;
      const checkOutDate = outDate.value;
      const dayDiff = Math.floor((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
      if(dayDiff < 0){
          return 0;  
      } 

      return dayDiff;
      }
      return 0;
  });

  // Dialog
  const dialogVisible = ref(false);
  const waitlistDialogVisible = ref(false); // For waitlist dialog
  const waitlistForm = ref({
    client_id: null,
    hotel_id: null,
    room_type_id: null,
    requested_check_in_date: '',
    requested_check_out_date: '',
    number_of_guests: 1,
    contact_email: '',
    contact_phone: '',
    communication_preference: 'email', // Default
    notes: '',
    // Helper fields for client selection/creation in waitlist form
    client_name_waitlist: '',
    client_legal_or_natural_person_waitlist: 'legal',
    client_gender_waitlist: 'other',
    client_email_waitlist: '',
    client_phone_waitlist: ''
  });
  const selectedClientForWaitlist = ref(null);
  const isClientSelectedForWaitlist = ref(false);


  const reservationDetails = ref({
    hotel_id: null,
    room_type_id: null,
    room_id: null,
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

  const dateRange = ref([]); 
  const minDate = ref(null);
  const maxDate = ref(null);
        
  const reservation_id = computed(() => reservationId.value);
      
  // Helper function
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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
  const normalizePhone = (phone) => {
      if (!phone) return '';

      // Remove all non-numeric characters
      let normalized = phone.replace(/\D/g, '');

      // Remove leading zeros
      normalized = normalized.replace(/^0+/, '');

      return normalized;
  };
  const validateEmail = () => {
    isValidEmail.value = emailPattern.test(reservationDetails.value.email);
  };
  const validatePhone = () => {
    isValidPhone.value = phonePattern.test(reservationDetails.value.phone);
  };
  // Generate dates
  const generateDateRange = (start, end) => {
    const dates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(formatDate(new Date(d)));
    }
    return dates;
  };
  const appendDaysToRange = async (direction) => {
    if (direction === "left") {
      const newMinDate = new Date(minDate.value);
      const newMaxDate = new Date(minDate.value);
      newMinDate.setDate(newMinDate.getDate() - 3);
      newMaxDate.setDate(newMaxDate.getDate() - 1);
      const newDates = generateDateRange(newMinDate, newMaxDate);
      dateRange.value = [...newDates, ...dateRange.value];
      minDate.value = formatDate(newMinDate);
      await fetchRooms();
    } else if (direction === "right") {
      const newMinDate = new Date(maxDate.value);
      const newMaxDate = new Date(maxDate.value);
      newMinDate.setDate(newMinDate.getDate() + 1);
      newMaxDate.setDate(newMaxDate.getDate() + 3);
      const newDates = generateDateRange(newMinDate, newMaxDate);
      dateRange.value = [...dateRange.value, ...newDates];
      maxDate.value = formatDate(newMaxDate);
      await fetchRooms();
    }
  };
  const fetchRooms = async () => {        
    const fetchPromises = dateRange.value
      .filter(date => !roomDataCache.value.has(date)) // Filter dates not yet fetched
      .map(date => {
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(startDate.getDate() + numberOfNights.value);

        const formattedStartDate = formatDate(startDate);
        const formattedEndDate = formatDate(endDate);

        return fetchAvailableRooms(selectedHotelId.value, formattedStartDate, formattedEndDate)
          .then(() => {                
            const roomTypesData = availableRooms.value.reduce((acc, room) => {
              const { room_type_id, capacity } = room;

              if (!acc[room_type_id]) {
                acc[room_type_id] = {
                  room_type_name: room.room_type_name,
                  count: 0,
                  total_capacity: 0,
                };
              }

              acc[room_type_id].count += 1;
              acc[room_type_id].total_capacity += capacity;

              return acc;
            }, {});

            roomDataCache.value.set(date, { date: formattedStartDate, rooms: roomTypesData }); // Cache result
            return { date: formattedStartDate, rooms: roomTypesData };
          })
          .catch(error => {
            console.error(`Error fetching data for date ${formattedStartDate}:`, error);
            return { date: formattedStartDate, rooms: {} };
          });
      });

    try {
      const results = await Promise.all(fetchPromises);
      generateDateRangeArray.value = [...generateDateRangeArray.value, ...results];
    } catch (error) {
      console.error("Error fetching room data:", error);
    }
  };

  const onDateChange = async () => {
    
    // Set central date
    if (inDate.value && outDate.value) {         
      centralDate.value = new Date(Math.min(inDate.value.getTime(), outDate.value.getTime()));
    }

    minCheckOutDate.value = new Date(inDate.value);
    minCheckOutDate.value.setDate(inDate.value.getDate() + 1);
    if (new Date(outDate.value) < minCheckOutDate.value) {
      outDate.value = new Date(minCheckOutDate.value);
    }
    // Reset date-related data
    roomDataCache.value = new Map();
    generateDateRangeArray.value = [];
    const today = new Date(centralDate.value);
    const initialMinDate = new Date(today);
    initialMinDate.setDate(initialMinDate.getDate() - 5);
    const initialMaxDate = new Date(today);
    initialMaxDate.setDate(initialMaxDate.getDate() + 30);
    minDate.value = initialMinDate;
    maxDate.value = initialMaxDate;        
    dateRange.value = generateDateRange(initialMinDate, initialMaxDate);
    await fetchRooms();

    // Generate the new array based on the selected date range                
    const tableContainer = document.querySelector(".table-container");
    if (tableContainer) {
      const totalScrollWidth = tableContainer.scrollWidth;
      const scrollPosition = totalScrollWidth / 8;
      tableContainer.scrollTo({
        left: scrollPosition,
        behavior: "smooth",
      });            
    }

    // Logging after the async call completes to confirm data is updated
    //console.log("Array from async onDateChange", generateDateRangeArray.value);
  };

  let timeoutId = null;
  const debounce = (func, delay) => {
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  };
  const onScroll = async (event) => {
    const container = event.target;
    const threshold = 1;
    const minScrollLeft = 1;

    if (container.scrollLeft < minScrollLeft) {
        debounce(appendDaysToRange('left'), 200);

        container.scrollLeft = minScrollLeft + 10;
    }

    // Check if user is scrolling to the right (positive scroll direction)
    if (container.scrollLeft + container.clientWidth >= container.scrollWidth - threshold) {          
      debounce(appendDaysToRange('right'), 200);       
    }

  };

  const extractRoomTypes = (data) => {
    return data.reduce((acc, dateData) => {
      for (const roomTypeId in dateData.rooms) {
        if (!acc.includes(roomTypeId)) acc.push(roomTypeId);
      }
      return acc;
    }, []);
  };
  const getRoomTypeName = (roomTypeId, array) => {
    if (!Array.isArray(array)) {
      console.error('Expected array but got:', typeof array);
      return 'Unknown'; // Return default value if not an array
    }
    for (const dateData of array) {
      if (dateData.rooms && dateData.rooms[roomTypeId]) {
        return dateData.rooms[roomTypeId].room_type_name;
      }
    }
      
    return "Unknown";
  };

  const isRoomUnavailableForSelection = () => {
    if (!selectedCell.value || !generateDateRangeArray.value[selectedCell.value.dateIndex]) {
      return true; // No cell selected or date data missing
    }
    const dateData = generateDateRangeArray.value[selectedCell.value.dateIndex];
    const roomInfo = dateData.rooms ? dateData.rooms[selectedCell.value.roomTypeId] : null;
    return !roomInfo || roomInfo.count === 0;
  };

  const isCapacityExceeded = (roomTypeId, dateIndex) => {        
    if (!selectedCell.value || !generateDateRangeArray.value[dateIndex] || !generateDateRangeArray.value[dateIndex].rooms || !generateDateRangeArray.value[dateIndex].rooms[roomTypeId]) {
      return false; // No data available for this cell, or cell not selected for capacity check
    }
    // If the room is unavailable, capacity check is irrelevant for reservation (it might be relevant for waitlist though)
    if (isRoomUnavailableForSelection() && roomTypeId === selectedCell.value.roomTypeId && dateIndex === selectedCell.value.dateIndex) {
        return false;
    }
    const availableCapacity = generateDateRangeArray.value[dateIndex].rooms[roomTypeId].total_capacity;
    return numberOfPeople.value > availableCapacity;
  };

  // Select cell
  const selectCell = (roomTypeId, dateIndex) => {
    
    const roomTypeName = getRoomTypeName(roomTypeId, generateDateRangeArray.value);
    selectedCell.value = { roomTypeId, dateIndex, roomTypeName };
    roomTypeInput.value = roomTypeName;
    
    // Check if the selected date is valid and exists in generateDateRangeArray
    if (generateDateRangeArray.value && generateDateRangeArray.value[dateIndex] && generateDateRangeArray.value[dateIndex].date) {
        const selectedDate = new Date(generateDateRangeArray.value[dateIndex].date);

        const endDate = new Date(selectedDate);
        endDate.setDate(selectedDate.getDate() + numberOfNights.value); // numberOfNights is computed
        inDate.value = selectedDate; // This will trigger onDateChange via its watcher if setup that way
        outDate.value = endDate;     // This will also trigger onDateChange
    } else {
        console.warn("Selected cell's date data is invalid or missing.");
        // Potentially reset inDate/outDate or handle error
    }
  };

  const isSelectedCell = (roomTypeId, dateIndex) => {
    return selectedCell.value && selectedCell.value.roomTypeId === roomTypeId && selectedCell.value.dateIndex === dateIndex;
  };

  // Dialog
  const openDialog = () => {
    if (isRoomUnavailableForSelection()) {
        toast.add({ severity: 'warn', summary: '予約不可', detail: '選択された部屋タイプと日付では利用可能な部屋がありません。順番待ちリストをご利用ください。', life: 4000 });
        return;
    }
    reservationDetails.value.hotel_id = selectedHotelId.value;
    reservationDetails.value.room_type_id = selectedCell.value.roomTypeId;
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
    //console.log('Selected Client:', selectedClient.value);        

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

  const onClientSelectForWaitlist = (event) => {
    selectedClientForWaitlist.value = event.value;
    isClientSelectedForWaitlist.value = true;

    waitlistForm.value.client_id = selectedClientForWaitlist.value.id;
    // Pre-fill contact info from selected client
    waitlistForm.value.contact_email = selectedClientForWaitlist.value.email || '';
    waitlistForm.value.contact_phone = selectedClientForWaitlist.value.phone || '';

    // Update client_name_waitlist for the AutoComplete display
    waitlistForm.value.client_name_waitlist = selectedClientForWaitlist.value.name_kanji || selectedClientForWaitlist.value.name_kana || selectedClientForWaitlist.value.name;
  };

  const resetWaitlistClientSelection = () => {
    selectedClientForWaitlist.value = null;
    isClientSelectedForWaitlist.value = false;
    waitlistForm.value.client_id = null;
    // Don't clear contact_email and contact_phone here, allow user to override
  };

  // Watch for changes in client_name_waitlist to reset if user clears selection or types new name
  watch(() => waitlistForm.value.client_name_waitlist, (newName, oldName) => {
    if (isClientSelectedForWaitlist.value && newName !== (selectedClientForWaitlist.value?.name_kanji || selectedClientForWaitlist.value?.name_kana || selectedClientForWaitlist.value?.name)) {
        // If a client was selected, but the name in input changes to something else (not via selection)
        // it means user is typing a new name or cleared it.
        if (!newName || newName.trim() === '') { // If input is cleared
            resetWaitlistClientSelection();
            waitlistForm.value.contact_email = ''; // Clear prefill only if input is fully cleared
            waitlistForm.value.contact_phone = '';
        } else if (oldName && newName !== oldName) { // If user is typing a new name over a selected one
             resetWaitlistClientSelection();
        }
    }
  });


  const openWaitlistDialog = () => {
    if (!selectedCell.value) {
      toast.add({ severity: 'warn', summary: '選択エラー', detail: 'まずカレンダーから部屋タイプと日付を選択してください。', life: 3000 });
      return;
    }
    if (!isRoomUnavailableForSelection() && !isCapacityExceeded(selectedCell.value.roomTypeId, selectedCell.value.dateIndex)) {
       toast.add({ severity: 'info', summary: '予約可能', detail: 'この部屋は現在予約可能です。通常の予約手続きをご利用ください。', life: 4000 });
      // Optionally, could redirect to openDialog()
      // openDialog();
      return;
    }

    // Reset form fields for new entry, but pre-fill from current selection
    waitlistForm.value = {
      client_id: null, // Will be set by selection or new client creation
      hotel_id: selectedHotelId.value,
      room_type_id: selectedCell.value.roomTypeId,
      requested_check_in_date: formatDate(inDate.value),
      requested_check_out_date: formatDate(outDate.value),
      number_of_guests: numberOfPeople.value,
      contact_email: '', // User must fill this or it comes from selected client
      contact_phone: '', // User must fill this or it comes from selected client
      communication_preference: 'email',
      notes: '',
      client_name_waitlist: '',
      client_legal_or_natural_person_waitlist: 'legal',
      client_gender_waitlist: 'other',
      client_email_waitlist: '', // This is for new client creation within waitlist form
      client_phone_waitlist: ''  // This is for new client creation
    };
    selectedClientForWaitlist.value = null;
    isClientSelectedForWaitlist.value = false;
    waitlistDialogVisible.value = true;
  };

  const closeWaitlistDialog = () => {
    waitlistDialogVisible.value = false;
  };

  const submitWaitlistEntry = async () => {
    // Basic validation
    if (!waitlistForm.value.contact_email) {
      toast.add({ severity: 'error', summary: '検証エラー', detail: '連絡用メールアドレスは必須です。', life: 3000 });
      return;
    }
    if (waitlistForm.value.communication_preference === 'phone' && !waitlistForm.value.contact_phone) {
      toast.add({ severity: 'error', summary: '検証エラー', detail: '電話連絡をご希望の場合は、電話番号も必須です。', life: 3000 });
      return;
    }

    let finalClientId = waitlistForm.value.client_id;

    // If no existing client is selected for waitlist, try to create one
    if (!isClientSelectedForWaitlist.value && waitlistForm.value.client_name_waitlist) {
        try {
            const newClient = await createBasicClient(
                waitlistForm.value.client_name_waitlist,
                null, // name_kana - not collected in this minimal form, can be enhanced
                waitlistForm.value.client_legal_or_natural_person_waitlist,
                waitlistForm.value.client_gender_waitlist,
                waitlistForm.value.client_email_waitlist || waitlistForm.value.contact_email, // Use contact_email if specific client_email is not provided
                waitlistForm.value.client_phone_waitlist || waitlistForm.value.contact_phone  // Use contact_phone if specific client_phone is not provided
            );
            finalClientId = newClient.client.id;
            toast.add({ severity: 'info', summary: '顧客作成', detail: `新規顧客「${newClient.client.name}」が作成されました。`, life: 3000 });
            await fetchClients(1); // Refresh client list for AutoComplete
        } catch (error) {
            toast.add({ severity: 'error', summary: '顧客作成エラー', detail: '新規顧客の作成に失敗しました。' + error.message, life: 3000 });
            return;
        }
    } else if (!finalClientId) {
        toast.add({ severity: 'error', summary: '検証エラー', detail: '顧客を選択するか、新規顧客名を入力してください。', life: 3000 });
        return;
    }

    const entryData = {
      client_id: finalClientId,
      hotel_id: waitlistForm.value.hotel_id,
      room_type_id: waitlistForm.value.room_type_id,
      requested_check_in_date: waitlistForm.value.requested_check_in_date,
      requested_check_out_date: waitlistForm.value.requested_check_out_date,
      number_of_guests: waitlistForm.value.number_of_guests,
      contact_email: waitlistForm.value.contact_email,
      contact_phone: waitlistForm.value.contact_phone,
      communication_preference: waitlistForm.value.communication_preference,
      notes: waitlistForm.value.notes,
    };

    const result = await waitlistStore.addEntry(entryData);
    if (result) {
      closeWaitlistDialog();
      // Optionally clear fields or refresh some data
    }
    // Toast messages are handled by the store
  };

  const submitReservation = async () => {
    // Validate email and phone
    validateEmail();
    validatePhone();
    
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

    const authToken = localStorage.getItem('authToken');
    try {
      const response = await fetch('/api/reservation/hold', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`, // Authorization header with token
          'Content-Type': 'application/json', // Content-Type for JSON data
        },
        body: JSON.stringify(reservationDetails.value), // Send the reservation details as JSON
      });

      if (response.ok) {
        const data = await response.json();
        const { reservation, reservationDetails } = data;
        toast.add({ severity: 'success', summary: '成功', detail: '保留中予約作成されました。', life: 3000 });
        
        await fetchMyHoldReservations();
        await goToEditReservationPage(reservation.id);            
        
        dialogVisible.value = false;
/*
        // Fetch available rooms
        const availableRoomsResponse = await fetchAvailableRooms(reservationDetails.value.hotel_id, reservationDetails.value.check_in, reservationDetails.value.check_out);

        if (availableRoomsResponse.status === 201) {
            // Update generateDateRangeArray to 0 for the specific date
            generateDateRangeArray.value = generateDateRangeArray.value.map(dateData => {
                if (dateData.date === reservationDetails.value.check_in && dateData.rooms) {
                    const updatedRooms = {};
                    for (const roomTypeId in dateData.rooms) {
                        updatedRooms[roomTypeId] = {
                            ...dateData.rooms[roomTypeId],
                            count: 0,
                            total_capacity: 0,
                        };
                    }
                    return { ...dateData, rooms: updatedRooms };
                }
                return dateData;
            });
        } else if(availableRoomsResponse.status === 200){
          const availableRoomsData = availableRooms.value;
          //console.log("availableRoomsResponse.data:", availableRoomsData);

          const roomTypesData = availableRoomsData.reduce((acc, room) => {
            const { room_type_id, room_type_name, capacity } = room;

            if (!acc[room_type_id]) {
              acc[room_type_id] = {
                room_type_name,
                count: 0,
                total_capacity: 0,
              };
            }

            acc[room_type_id].count += 1; // Increment count for this room type
            acc[room_type_id].total_capacity += capacity; // Add capacity

            return acc;
          }, {});

          // Update generateDateRangeArray for the specific check-in date
          generateDateRangeArray.value = generateDateRangeArray.value.map(dateData => {
            if (dateData.date === reservationDetails.value.check_in) {
              return {
                ...dateData,
                rooms: roomTypesData, // Replace with updated room data
              };
            }
            return dateData;
          });

          //console.log("Updated room data for check-in date:", generateDateRangeArray.value);                  
            
        } else {
            const errorText = await availableRoomsResponse.text();
            console.error("fetchAvailableRooms API Error:", availableRoomsResponse.status, availableRoomsResponse.statusText, errorText);
            toast.add({ severity: 'error', summary: 'エラー', detail: '空室状況の取得に失敗しました。', life: 3000 });
        }
*/
      } else {
          console.warn("No data returned from fetchAvailableRooms. Not updating room availability.");
          toast.add({ severity: 'warn', summary: '警告', detail: '利用可能な部屋のデータが返されませんでした。', life: 3000 });
      }

        //dialogVisible.value = false;
      
    } catch (error) {
      console.error('Network error:', error); // Handle any network errors
    }
  };

  const goToEditReservationPage = async (reservation_id) => {                
      await setReservationId(reservation_id);
                
      router.push({ name: 'ReservationEdit', params: { reservation_id: reservation_id } });                          
  };
  
  // Watcher
  watch(() => selectedHotel.value,
    async (newVal, oldVal) => {
      //console.log('Watcher triggered:', { newVal, oldVal });
      if (newVal !== oldVal && oldVal !== null) {
        //console.log('New hotel selected.');

        // Reset and fetch new data
        roomDataCache.value = new Map();
        generateDateRangeArray.value = [];
        // Update date-related properties            
        const today = new Date();
        const initialMinDate = new Date(today);
        initialMinDate.setDate(initialMinDate.getDate() - 5);
        const initialMaxDate = new Date(today);
        initialMaxDate.setDate(initialMaxDate.getDate() + 30);
        minDate.value = initialMinDate;
        maxDate.value = initialMaxDate;
        dateRange.value = generateDateRange(initialMinDate, initialMaxDate);

        try {
          //console.log("Date range for new hotel:", dateRange.value);
          await fetchRooms(); // Fetch new data
          //console.log("Updated generateDateRangeArray:", generateDateRangeArray.value);
          

          if (!generateDateRangeArray.value.length) {
            console.warn("No data fetched for the new hotel.");
          }

          // Scroll to a specific position after fetching and rendering
          nextTick(() => {
            const tableContainer = document.querySelector(".table-container");
            if (tableContainer) {
              const totalScrollWidth = tableContainer.scrollWidth;
              const scrollPosition = totalScrollWidth / 8;
              tableContainer.scrollTo({
                left: scrollPosition,
                behavior: "smooth",
              });
            }
          });
        } catch (error) {
          console.error("Error fetching data for new hotel:", error);
        }
      }
    }
  );
    
  watch(selectedHotelId, async (newVal) => {
    if (newVal) {                              
        // console.log('Hotel ID in ReservationsNew:', newVal);   
        await fetchHotel();               
    }
  });    
  watch([inDate, outDate], ([checkInDate, checkOutDate]) => {
      if (checkInDate && checkOutDate) {
          reservationDetails.value.check_in = formatDate(checkInDate);
          reservationDetails.value.check_out = formatDate(checkOutDate);
          reservationDetails.value.number_of_nights = numberOfNights.value;
          reservationDetails.value.number_of_people = numberOfPeople.value;
      }
  }, { immediate: true }); 
  watch(() => numberOfPeople.value,
    (newNumber) => {
      reservationDetails.value.number_of_people = numberOfPeople.value;
    }
  );
  watch(() => reservationDetails.value.legal_or_natural_person,
    (newValue) => {
      if (newValue === 'legal') {
        //console.log('Changed to other');
        reservationDetails.value.gender = 'other';
      } 
      if (newValue === 'natural' && reservationDetails.value.client_id == null){
        reservationDetails.value.gender = 'male';
      }
    },
  ); 
  watch(() => reservationDetails.value.name,
    (newValue, oldValue) => {
      //console.log('Changed name:', newValue); 
      if(selectedClient.value){   
        const selectedName = selectedClient.value.name_kanji || selectedClient.value.name;
        //console.log('Selected name:', selectedName); 
        if (newValue && newValue !== oldValue && newValue !== selectedName) {            
          // Reset fields if name changes and a client was previously selected
          reservationDetails.value.client_id = null;
          reservationDetails.value.legal_or_natural_person = 'legal';
          reservationDetails.value.gender = 'other';
          reservationDetails.value.email = '';
          reservationDetails.value.phone = '';

          isClientSelected.value = false;
        }
      }
    },
    { immediate: true }
  );
  watch(reservationDetails, (newVal, oldVal) => {
    //console.log('reservationDetails changed:', newVal);        
  }, { deep: true }); 
  watch(dateRange, (newVal, oldVal) => {
    //console.log('dateRange changed:', newVal);        
  }, { deep: true }); 
  watch(() => generateDateRangeArray.value,
    (newVal, oldVal) => {
      //console.log('generateDateRangeArray updated:', newVal);          
    },
    { deep: true } // Use deep to watch for nested object changes
  );
  watch(reservation_id, async (newId) => {
    // console.log('Updated reservation_id:', newId);
    if(!newId){
      // console.log('No new reservation ID found.');
      // Reset and fetch new data
      roomDataCache.value = new Map();
      generateDateRangeArray.value = [];
      // Update date-related properties            
      const today = new Date();
      const initialMinDate = new Date(today);
      initialMinDate.setDate(initialMinDate.getDate() - 5);
      const initialMaxDate = new Date(today);
      initialMaxDate.setDate(initialMaxDate.getDate() + 30);
      minDate.value = initialMinDate;
      maxDate.value = initialMaxDate;
      dateRange.value = generateDateRange(initialMinDate, initialMaxDate);

      try {
          //console.log("Date range for new hotel:", dateRange.value);
          await fetchRooms(); // Fetch new data
          //console.log("Updated generateDateRangeArray:", generateDateRangeArray.value);
          

          if (!generateDateRangeArray.value.length) {
            console.warn("No data fetched for the new hotel.");
          }

          // Scroll to a specific position after fetching and rendering
          nextTick(() => {
            const tableContainer = document.querySelector(".table-container");
            if (tableContainer) {
              const totalScrollWidth = tableContainer.scrollWidth;
              const scrollPosition = totalScrollWidth / 8;
              tableContainer.scrollTo({
                left: scrollPosition,
                behavior: "smooth",
              });
            }
          });
        } catch (error) {
          console.error("Error fetching data for new hotel:", error);
        }
    }
  });      
/*
  watch(filteredClients, (newVal, oldVal) => {
    // console.log('filteredClients changed:', newVal);        
  }, { deep: true });
*/
  // Mount
  onMounted(async () => {  
    //console.log('onMounted triggered');      
    await fetchHotels();
    await fetchHotel();

    const today = new Date();
    const initialMinDate = new Date(today);
    initialMinDate.setDate(initialMinDate.getDate() - 5);
    const initialMaxDate = new Date(today);
    initialMaxDate.setDate(initialMaxDate.getDate() + 30);
    minDate.value = initialMinDate;
    maxDate.value = initialMaxDate;        
    dateRange.value = generateDateRange(initialMinDate, initialMaxDate);
    
    nextTick(() => {
      fetchRooms();
      // Scroll to 1/5 of the total scroll height
      const tableContainer = document.querySelector(".table-container");
      if (tableContainer) {
        const totalScrollWidth = tableContainer.scrollWidth;
        const scrollPosition = totalScrollWidth / 8;
        tableContainer.scrollTo({
          left: scrollPosition,
          behavior: "smooth",
        });            
      }
    });
    nextTick(() => {
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
  }); 
    
</script>

<style scoped>
  th, td {
    border: 1px solid #ddd;
    padding: 8px 12px; /* Increased padding for readability */
    text-align: center;
  }

  .overflow-x-auto {
    overflow-x: auto;
    max-width: 100%;
  }

  .table-container {
    width: 100%;
    overflow-x: scroll;    
    max-width: 100%;
    position: relative;    
  }

  .table-container::-webkit-scrollbar-button:single-button {
    background-color: rgba(0, 0, 0, 0.3); /* Make buttons always visible */
  }

  .table-container::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.3); /* Scrollbar thumb color */
    border-radius: 4px;
    transition: background-color 0.3s ease;
  }

  .table-container::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1); /* Track color */
  }

  .table-container::-webkit-scrollbar-button {
    background-color: rgba(0, 0, 0, 0.1); /* Button color */
  }
  
  .table-container:active::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.7);
  }

  .table-container:focus {
    outline: none;
    border: 2px solid #4CAF50; /* Visual cue for focus */
  }
</style>

