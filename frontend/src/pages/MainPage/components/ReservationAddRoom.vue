<template>
    <div class="p-2">
        <Card class="m-2">
            <template #title>
                {{ drawerHeader }}
            </template>
            <template #content>
                <div class="grid grid-cols-4 mb-4 mr-4 gap-2">
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <DatePicker 
                                v-model="selectedDates"
                                selection-mode="range"
                                :showIcon="true"
                                :minDate="minDateRange"
                                :maxDate="maxDateRange"
                                iconDisplay="input" 
                                dateFormat="yy-mm-dd"
                                fluid
                            />
                            <label>チェックイン & チェックアウト</label>
                        </FloatLabel>
                    </div>
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <InputNumber
                                v-model="numberOfPeople"
                                :min="1"
                                :max="maxNumberOfPeople"
                            />
                            <label>人数</label>
                        </FloatLabel>
                    </div>
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <InputNumber
                                v-model="numberOfNights"
                                variant="filled"
                                disabled 
                            />
                            <label>宿泊数</label>
                        </FloatLabel>
                    </div>
                    <div class="col-span-1 mt-6">                
                        <Button
                            label="新規予約" 
                            icon="pi pi-calendar"
                            @click="openDialog" 
                        />
                    </div>                    
                </div>
            </template>            
        </Card>
        
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
                <div class="col-span-2">
                    <FloatLabel>              
                        <AutoComplete
                            v-model="reservationDetails"
                            :suggestions="filteredClients"
                            optionLabel="name"
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
                <div class="col-6">          
                    <div v-if="reservationDetails.legal_or_natural_person === 'natural'" class="flex gap-3">
                        <RadioButton
                        v-model="reservationDetails.gender"
                        :inputId="'male'"
                        :value="'male'"
                        :disabled="isClientSelected"
                        />
                        <label for="male">男性</label>
                        <RadioButton
                        v-model="reservationDetails.gender"
                        :inputId="'female'"
                        :value="'female'"
                        :disabled="isClientSelected"
                        />
                        <label for="female">女性</label>
                        <RadioButton
                        v-model="reservationDetails.gender"
                        :inputId="'other'"
                        :value="'other'"
                        :disabled="isClientSelected"
                        />
                        <label for="other">その他</label>
                    </div>
                </div>

                <!-- Email input -->
                <div class="col-6">
                    <FloatLabel>
                    <InputText 
                        v-model="reservationDetails.email"
                        :pattern="emailPattern"
                        :class="{'p-invalid': !isValidEmail}"
                        @input="validateEmail"
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
                        @input="validatePhone"
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

<script>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from "primevue/useconfirm";

import { useHotelStore } from '@/composables/useHotelStore';
import { useReservationStore } from '@/composables/useReservationStore';
import { usePlansStore } from '@/composables/usePlansStore';
import { useClientStore } from '@/composables/useClientStore';
import ReservationClientEdit from '@/pages/MainPage/components/ReservationClientEdit.vue';

import { Card, Dialog, FloatLabel, Button } from 'primevue';
import { DatePicker, InputNumber, InputText, AutoComplete, SelectButton, RadioButton } from 'primevue';

export default {
    props: {        
        room_id: { // Add room_id prop
            type: [String, Number],
            required: true,
        },
        date: {
            type: [String, Date],
            required: true,
        },
    },
    name: "ReservationAddRoom",
    components: { 
        ReservationClientEdit,        
        Card,
        Dialog,
        FloatLabel,
        Button,
        DatePicker,
        InputNumber,
        InputText,
        AutoComplete,
        SelectButton,
        RadioButton,
    },
    setup(props) {
        const router = useRouter();
        const toast = useToast();
        const confirm = useConfirm();
        const isUpdating = ref(false);
        const { selectedHotelId, selectedHotelRooms } = useHotelStore();
        const { clients, fetchClients } = useClientStore();
        const { getAvailableDatesForChange, setReservationId, fetchMyHoldReservations } = useReservationStore();
        
        const filteredClients = ref([]);
        const today = new Date(props.date);
        const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
        const selectedDates = ref([today, tomorrow]);
        const minDateRange = ref(null);
        const maxDateRange = ref(null);
        const numberOfPeople = ref(1);
        const maxNumberOfPeople = ref(1);
        const dialogVisible = ref(false);
        const reservationDetails = ref({
            hotel_id: selectedHotelId.value,
            room_type_id: null,
            room_id: props.room_id,
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
        const selectedRoom = ref(null);
        const drawerHeader = ref('Loading...');

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
        const validateEmail = () => {
            isValidEmail.value = emailPattern.test(reservationDetails.value.email);
        };
        const validatePhone = () => {
            isValidPhone.value = phonePattern.test(reservationDetails.value.phone);
        };

        // Compute
        const numberOfNights = computed(() => {
            if (selectedDates.value.length === 2) {
            const checkInDate = selectedDates.value[0];
            const checkOutDate = selectedDates.value[1];
            const dayDiff = Math.floor((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
            if(dayDiff < 0){
                return 0;  
            } 

            return dayDiff;
            }
            return 0;
        });

        // Dialog
        const openDialog = () => {   
            if (!reservationDetails.value.number_of_people) {
                toast.add({
                    severity: 'warn',
                    summary: '注意',
                    detail: '人数未記入',
                    life: 3000,
                });
                return
            }

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
                toast.add({ severity: 'success', summary: 'Success', detail: '保留中予約作成されました。', life: 3000 });
                
                await fetchMyHoldReservations();
                await goToEditReservationPage(reservation.id);            
                
                dialogVisible.value = false;

            } else {
                console.warn("No data returned from fetchAvailableRooms. Not updating room availability.");
                toast.add({ severity: 'warn', summary: 'Warning', detail: 'No data returned for available rooms.', life: 3000 });
            }

                //dialogVisible.value = false;
            
            } catch (error) {
            console.error('Network error:', error); // Handle any network errors
            }
        };

        const goToEditReservationPage = async (reservation_id) =>{
            await setReservationId(reservation_id);
                    
            router.push({ name: 'ReservationEdit', params: { reservation_id: reservation_id } });                          
        };


        // Fetch reservation details on mount
        
        onMounted(async() => {
            // Filter the selected room
            selectedRoom.value = selectedHotelRooms.value.find(room => room.room_id === props.room_id);

            drawerHeader.value = selectedRoom.value.name + '：' + selectedRoom.value.room_number + '号室 ' + selectedRoom.value.room_type_name;
            maxNumberOfPeople.value = selectedRoom.value.room_capacity;

            await fetchClients();
            const datesResult = await getAvailableDatesForChange(selectedRoom.value.id, selectedRoom.value.room_id, formatDate(today), formatDate(tomorrow));

            if(datesResult.earliestCheckIn){                
                minDateRange.value = new Date(datesResult.earliestCheckIn);
            }
            if(datesResult.latestCheckOut){
                maxDateRange.value = new Date(datesResult.latestCheckOut);
            }

            console.log('reservationDetails start:', reservationDetails.value);
            console.log('selectedRoom:',selectedRoom.value);
            console.log('minDateRange:', minDateRange.value,'maxDateRange:', maxDateRange.value);
        });

        // Watch
        watch(reservationDetails, (newVal, oldVal) => {
            console.log('reservationDetails changed:', newVal);        
        }, { deep: true });
        watch(() => selectedDates.value, (newDates) => {
                if (newDates.length === 2) {
                const [checkInDate, checkOutDate] = newDates;
                if (checkInDate && checkOutDate) {
                    reservationDetails.value.check_in = formatDate(checkInDate);
                    reservationDetails.value.check_out = formatDate(checkOutDate);
                    reservationDetails.value.number_of_nights = numberOfNights.value;
                    reservationDetails.value.number_of_people = numberOfPeople.value;
                }
                }
            },
        { immediate: true });
        watch(() => numberOfPeople.value,
        (newNumber) => {
            reservationDetails.value.number_of_people = numberOfPeople.value;
        });
        watch(() => reservationDetails.value.legal_or_natural_person, (newValue) => {
            if (newValue === 'legal') {
                //console.log('Changed to other');
                reservationDetails.value.gender = 'other';
            } 
            if (newValue === 'natural' && reservationDetails.value.client_id == null){
                reservationDetails.value.gender = 'male';
            }
            },
        ); 
        watch(() => reservationDetails.value.name, (newValue, oldValue) => {
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

        return {
            clients,    
            filteredClients,            
            selectedDates,
            minDateRange,
            maxDateRange,
            numberOfPeople,
            maxNumberOfPeople,
            dialogVisible,
            selectedRoom,
            drawerHeader,
            reservationDetails,
            personTypeOptions,
            genderOptions,
            emailPattern,
            isValidEmail,
            phonePattern,
            isValidPhone,
            validateEmail,
            validatePhone,
            isClientSelected,

            numberOfNights,
            openDialog,
            closeDialog,
            filterClients,
            onClientSelect,
            submitReservation,
        };
    },    
};
</script>

<style scoped>

</style>
