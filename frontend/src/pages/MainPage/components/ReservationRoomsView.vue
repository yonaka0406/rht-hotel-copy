<template>   

    <Accordion :activeIndex="0">
        <AccordionPanel                        
            v-for="(group, index) in groupedRooms"
            :key="group.room_id"          
            :value="group.room_id"
        >
            <AccordionHeader>
                <div class="grid grid-cols-6 gap-4 w-full">
                    <div class="col-span-3 text-left">
                        部屋： {{ `${group.details[0]?.room_number} - ${group.room_type} (${group.details[0]?.capacity}) ${group.details[0]?.smoking ? ' 🚬' : ''}` }}
                    </div>
                    <div class="flex items-center justify-center">
                        {{ group.details[0]?.number_of_people }}
                        <i class="pi pi-user ml-1" style="margin-right: 0.5rem;"></i>                    
                        <i
                            class="pi"
                            :class="allHavePlan(group) ? 'pi-check' : 'pi-exclamation-triangle'"
                            style="margin-left: 0.5rem; color: var(--primary-color);"
                            :title="allHavePlan(group) ? 'プラン設定済み' : 'プラン未設定'"
                        ></i>
                        <i
                            class="pi"
                            :class="allPeopleCountMatch(group) ? 'pi-check' : 'pi-exclamation-triangle'"
                            style="margin-left: 0.5rem; color: var(--primary-color);"
                            :title="allPeopleCountMatch(group) ? '宿泊者設定済み' : '宿泊者未設定'"
                        ></i>
                    </div>
                    <div class="col-span-2 text-right mr-4">
                        <Button
                            icon="pi pi-pencil"
                            label="一括編集"
                            class="p-button-sm"
                            @click="openRoomEditDialog(group)"
                        />
                    </div>
                </div>
            </AccordionHeader>
            <AccordionContent>
                <DataTable 
                    :value="matchingGroupDetails(group.details)"
                    :rowStyle="rowStyle"
                    :rowExpansion="true"
                    v-model:expandedRows="expandedRows[group.room_id]"
                    dataKey="id"
                    sortField="display_date"
                    :sortOrder=1
                >
                    <Column header="詳細" style="width: 1%;"> <!-- Changed header, removed expander prop -->
                        <template #body="slotProps">
                            <!-- Pass group.room_id to the methods -->
                            <button @click="toggleRowExpansion(group.room_id, slotProps.data)" class="p-button p-button-text p-button-rounded" type="button">
                                <i :class="isRowExpanded(group.room_id, slotProps.data) ? 'pi pi-chevron-down text-blue-500' : 'pi pi-chevron-right text-blue-500'" style="font-size: 0.875rem;"></i>
                            </button>
                        </template>
                    </Column>
                    <Column field="display_date" header="日付" class="text-xs" />  
                    <Column header="部屋" class="text-xs">                        
                        <template #body="slotProps">                            
                            {{ slotProps.data.room_number }}                            
                        </template>
                    </Column>                  
                    <Column field="plan_name" header="プラン" class="text-xs">
                        <template #body="slotProps">
                            <Badge 
                                :value="slotProps.data.plan_name" 
                                :style="{ backgroundColor: slotProps.data.plan_color }" 
                                class="text-white px-2 py-1 rounded-md text-xs"
                            />                            
                        </template>
                    </Column>
                    <Column field="number_of_people" header="人数" class="text-xs" />
                    <Column field="price" header="料金" class="text-xs" />
                    <Column header="詳細">
                        <template #body="slotProps">
                            <Button icon="pi pi-eye" @click="openDayDetailDialog(slotProps.data)" size="small" variant="text" />
                        </template>
                    </Column>

                    <template #expansion="slotProps">
                        <div class="mx-20">
                            <div v-if="Array.isArray(slotProps.data.reservation_addons)">
                                <DataTable :value="slotProps.data.reservation_addons" size="small">
                                    <Column header="アドオン" sortable>
                                        <template #body="addonSlotProps">
                                            {{ addonSlotProps.data.addon_name || '' }}
                                        </template>
                                    </Column>
                                    <Column header="数量" sortable>
                                        <template #body="addonSlotProps">
                                            {{ addonSlotProps.data.quantity || 0 }}
                                        </template>
                                    </Column>
                                    <Column header="単価" sortable>
                                        <template #body="addonSlotProps">
                                            {{ formatCurrency(addonSlotProps.data.price) || 0 }}
                                        </template>
                                    </Column>
                                </DataTable>
                            </div>
                            <div v-else>
                                <p>宿泊者データがありません。</p>
                            </div>
                        </div>
                    </template>
                </DataTable>
            </AccordionContent>                        
        </AccordionPanel>
    </Accordion>

    <!-- Bulk Edit Dialog -->
    <Dialog
        v-model:visible="visibleRoomEditDialog"        
        :modal="true"
        :breakpoints="{ '960px': '75vw', '640px': '100vw' }"
        style="width: 50vw"
    >
        <template #header>
            <span class="text-xl font-bold">{{ selectedGroup.details[0].room_number }}号室一括編集</span>
        </template>
        <div class="p-fluid">
            <Tabs 
                value ="0"
                @update:value="handleTabChange"
            >
                <TabList>
                    <Tab value="0">プラン適用</Tab>
                    <Tab value="1">部屋移動</Tab>
                    <Tab v-if="reservationStatus === '保留中' || reservationStatus === '仮予約' || reservationStatus === '確定'" value="2">宿泊者</Tab>
                    <Tab v-if="reservationStatus === '保留中' || reservationStatus === '仮予約' || reservationStatus === '確定'" value="3">追加・削除</Tab>
                    <Tab v-if="reservationStatus === '保留中' || reservationStatus === '仮予約' || reservationStatus === '確定'" value="4">期間</Tab>
                </TabList>
                    
                <TabPanels>
                    <!-- Tab 1: Apply Plan -->
                    <TabPanel value="0">
                        <Card class="mb-2">
                            <template #title>プラン</template>
                            <template #content>
                                <!-- Plan manual selection -->
                                <div v-if="!isPatternInput">
                                    <div class="grid grid-cols-6 mt-8">
                                        <div class="col-span-4 mr-2">                                            
                                            <FloatLabel>
                                                <Select v-model="selectedPlan"
                                                    id="bulk-plan"
                                                    :options="plans"
                                                    optionLabel="name"
                                                    showClear 
                                                    fluid                           
                                                    @change="updatePlanAddOns"
                                                />
                                                <label for="bulk-plan">プラン選択</label>
                                            </FloatLabel>
                                        </div>
                                        <div class="col-span-2">
                                            <ToggleButton v-model="isPatternInput" :onLabel="'パターン'" :offLabel="'手動入力'" fluid />
                                        </div>
                                    </div>                                    
                                    <div class="field mt-6">
                                        <FloatLabel>
                                            <MultiSelect v-model="selectedDays"
                                                :options="daysOfWeek"
                                                optionLabel="label"
                                                fluid                            
                                                :maxSelectedLabels="3"
                                            />
                                            <label>曜日</label>
                                        </FloatLabel>
                                    </div>
                                </div>
                                <!-- Plan pattern selection -->
                                <div v-if="isPatternInput">                
                                    <div class="grid grid-cols-6 mt-8">
                                        <div class="col-span-4 mr-2">                                            
                                            <FloatLabel>
                                                <Select v-model="selectedPattern"
                                                    id="bulk-pattern"
                                                    :options="patterns"
                                                    fluid
                                                    @change="updatePattern"
                                                >
                                                    <template #value="slotProps">
                                                        <div v-if="slotProps.value">
                                                            <div class="mr-2">{{ slotProps.value.name }} </div>
                                                            <Badge severity="secondary">{{ slotProps.value.template_type === 'global' ? 'グローバル' : 'ホテル' }}</Badge>
                                                        </div>
                                                        <div v-else>
                                                            パターン選択
                                                        </div>
                                                    </template>
                                                    <template #option="slotProps">
                                                        <div class="flex items-center">
                                                            <div class="mr-2">{{ slotProps.option.name }} </div>
                                                            <Badge severity="secondary">{{ slotProps.option.template_type === 'global' ? 'グローバル' : 'ホテル' }}</Badge>
                                                        </div>
                                                    </template>
                                                </Select>
                                                <label for="bulk-pattern">パターン選択</label>
                                            </FloatLabel>
                                        </div>
                                        <div class="col-span-2">
                                            <ToggleButton v-model="isPatternInput" :onLabel="'パターン'" :offLabel="'手動入力'" fluid />
                                        </div>
                                        <div v-for="day in daysOfWeek" :key="day.value" class="col-span-3 mt-4 mr-2">
                                            <div class="mt-4 mr-2">
                                                <FloatLabel>
                                                    <Select
                                                        v-model="dayPlanSelections[day.value]"
                                                        :options="plans"
                                                        optionLabel="name"
                                                        optionValue="plan_key"
                                                        class="w-full"
                                                    />
                                                    <label class="font-semibold mb-1 block">{{ day.label }}</label>
                                                </FloatLabel>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </Card>
                        <Card v-if="!isPatternInput">
                            <template #title>アドオン</template>
                            <template #content>
                                <div class="grid grid-cols-4">
                                    <div class="field col-span-3 mt-8">
                                        <FloatLabel>
                                            <Select v-model="selectedAddonOption"
                                                :options="addonOptions"
                                                optionLabel="addon_name"
                                                optionValue="id"
                                                showClear 
                                                fluid                             
                                            />
                                            <label>アドオン選択</label>
                                        </FloatLabel>
                                    </div>
                                    <div class="field col mt-8 ml-2">
                                        <Button label="追加" @click="generateAddonPreview" />
                                    </div>
                                </div>
                                
                                <Divider />
                                <div class="field mt-6">
                                    <DataTable :value="selectedAddon" class="p-datatable-sm">
                                        <Column field="addon_name" header="アドオン名" style="width:40%" />
                                        <Column field="quantity" header="数量">
                                            <template #body="slotProps">
                                                <InputNumber 
                                                    v-model="slotProps.data.quantity" 
                                                    :min="0" 
                                                    placeholder="数量を記入" 
                                                    fluid
                                                />
                                            </template>
                                        </Column>
                                        <Column field="price" header="価格">
                                            <template #body="slotProps">
                                                <InputNumber 
                                                    v-model="slotProps.data.price" 
                                                    :min="0" 
                                                    placeholder="価格を記入" 
                                                    fluid
                                                />
                                            </template>
                                        </Column>
                                        <Column header="操作">
                                            <template #body="slotProps">
                                                <Button                                       
                                                icon="pi pi-trash"
                                                class="p-button-text p-button-danger p-button-sm"
                                                @click="deleteAddon(slotProps.data)" 
                                                />
                                            </template>
                                        </Column>
                                    </DataTable>
                                </div>
                            </template>
                        </Card>
                    </TabPanel>
                    <!-- Tab 2: Move Rooms -->
                    <TabPanel value="1">
                        <h4 class="mt-4 mb-3 font-bold">部屋移動</h4>

                        <div class="grid grid-cols-2 gap-2">
                            <div class="field mt-6 col-span-1">
                            <FloatLabel>
                                <InputNumber
                                    id="move-people"
                                    v-model="numberOfPeopleToMove"
                                    :min="0"
                                    :max="Math.max(...(selectedGroup?.details.map(item => item.number_of_people) || [0]))"
                                    fluid
                                />
                                <label for="move-people">人数</label>
                            </FloatLabel>
                            </div>
                            <div class="field mt-6 col-span-1">
                            <FloatLabel>
                                <Select
                                    id="move-room"
                                    v-model="targetRoom"
                                    :options="filteredRooms"
                                    optionLabel="label"
                                    showClear
                                    fluid
                                />
                                <label for="move-room">部屋へ移動</label>
                            </FloatLabel>
                            </div>
                        </div>
                    </TabPanel>
                    <!-- Tab 3: Set clients -->
                    <TabPanel value="2">                            
                        <DataTable                                     
                            :value="guests"
                            class="p-datatable-sm"
                            scrollable
                            responsive                                
                        >                                
                            <Column field="name" header="宿泊者" style="width: 40%">                                    
                                <template #body="slotProps">
                                    <AutoComplete
                                        v-model="slotProps.data.name"
                                        :placeholder="slotProps.data.guest_no"
                                        :suggestions="filteredClients"
                                        optionLabel="name"
                                        @complete="filterClients"
                                        field="id"                
                                        @option-select="onClientSelect($event, slotProps.data)"   
                                        @change="onClientChange(slotProps.data)" 
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
                                </template>
                                
                            </Column>
                            <Column field="gender" header="性別" style="width: 10%">                                    
                                <template #body="slotProps">
                                    <Select 
                                        v-model="slotProps.data.gender" 
                                        :options="genderOptions" 
                                        optionLabel="label" 
                                        optionValue="value" 
                                        placeholder="性別を選択"
                                        fluid
                                        :disabled="slotProps.data.isClientSelected"
                                    />
                                </template>
                                
                            </Column>
                            <Column field="email" header="メールアドレス" style="width: 25%">
                                <template #body="slotProps">
                                    <InputText v-model="slotProps.data.email"                                            
                                        :pattern="emailPattern"
                                        :class="{'p-invalid': !isValidEmail}"
                                        @input="validateEmail(slotProps.data.email)"                                            
                                        :disabled="slotProps.data.isClientSelected"
                                    />
                                </template>
                            </Column>
                            <Column field="phone" header="電話番号" style="width: 25%">
                                <template #body="slotProps">
                                    <InputText v-model="slotProps.data.phone"
                                        :pattern="phonePattern"
                                        :class="{'p-invalid': !isValidPhone}"
                                        @input="validatePhone(slotProps.data.phone)"                                            
                                        :disabled="slotProps.data.isClientSelected"
                                    />
                                </template>
                            </Column>                                
                        </DataTable>
                        
                    </TabPanel>
                    <!-- Tab 4: Modify room -->
                    <TabPanel value="3">
                        <div class="grid grid-cols-2 gap-4 items-start">
                            <Card class="mb-3">
                                <template #title>予約</template>
                                <template #content>
                                    <div class="grid grid-cols-1 gap-4 items-center">
                                        <div>
                                            <span>宿泊者：{{ reservationInfo.reservation_number_of_people }}</span>
                                        </div>                                            
                                    </div>
                                </template>                                    
                            </Card>
                            <Card class="mb-3">
                                <template #title>部屋 {{ selectedGroup.details[0].room_number }}</template>
                                <template #content>
                                    <div class="grid grid-cols-1 gap-4 items-center">
                                        <div>
                                            <span>宿泊者：{{ selectedGroup.details[0].number_of_people }}</span>
                                        </div>
                                        <div>
                                            <span>定員：{{ selectedGroup.details[0].capacity }}</span>
                                        </div>
                                    </div>
                                </template>
                                
                            </Card>
                        </div>                            
                        
                        <div v-if="groupedRooms.length > 1" class="grid grid-cols-3 gap-4 items-center mb-4">                                
                            <p class="col-span-2">部屋を予約から削除して、宿泊者の人数を減らします。</p>
                            <Button label="部屋削除" severity="danger" icon="pi pi-trash" @click="deleteRoom(selectedGroup)" />
                        </div>
                        <div v-else="groupedRooms.length > 1" class="grid grid-cols-3 gap-4 items-center mb-4">                                
                            <p class="col-span-3">部屋を予約から削除より、予約を削除・キャンセルしてください。</p>                                
                        </div>
                        <div v-if="selectedGroup.details[0].number_of_people < selectedGroup.details[0].capacity" class="grid grid-cols-3 gap-4 items-center mb-4">
                            <p class="col-span-2">予約の宿泊者の人数を<span class="font-bold text-blue-700">増やします</span>。</p>
                            <button class="bg-blue-500 text-white hover:bg-blue-600" @click="changeGuestNumber(selectedGroup, 'add')"><i class="pi pi-plus"></i> 人数増加</button>
                        </div>
                        <div v-if="selectedGroup.details[0].number_of_people > 1" class="grid grid-cols-3 gap-4 items-center mb-4">
                            <p class="col-span-2">予約の宿泊者の人数をを<span class="font-bold text-yellow-700">減らします</span>。</p>
                            <button class="bg-yellow-500 text-white hover:bg-yellow-600" @click="changeGuestNumber(selectedGroup, 'subtract')"><i class="pi pi-minus"></i> 人数削減</button>
                        </div>                                
                        
                        
                    </TabPanel>
                    <!-- Tab 5: Modify period -->
                    <TabPanel value="4">
                        <Card class="mb-3">
                            <template #title>予約</template>
                            <template #content>
                                <div class="grid grid-cols-2 gap-4 items-center">
                                    <div>
                                        <span>チェックイン：{{ reservationInfo.check_in }}</span>
                                    </div>
                                    <div>
                                        <span>チェックアウト：{{ reservationInfo.check_out }}</span>
                                    </div>                                    
                                </div>
                            </template>
                        </Card>
                        <p class="mt-2 mb-6"><span class="font-bold">注意：</span>部屋宿泊期間を変更すると、新規予約が作成されます。</p>
                        <div class="grid grid-cols-2 gap-4 items-center">
                            <div>
                                <FloatLabel>
                                <label for="checkin">チェックイン</label>
                                <DatePicker 
                                    id="checkin" 
                                    v-model="newCheckIn"
                                    :showIcon="true" 
                                    :minDate="minCheckIn || undefined"
                                    :maxDate="maxCheckOut || undefined"
                                    iconDisplay="input" 
                                    dateFormat="yy-mm-dd"
                                    :selectOtherMonths="true"                 
                                    fluid
                                />
                                </FloatLabel>
                            </div>
                            <div>
                                <FloatLabel>
                                    <label for="checkout">チェックアウト</label>
                                    <DatePicker 
                                        id="checkout" 
                                        v-model="newCheckOut"
                                        :showIcon="true" 
                                        :minDate="minCheckIn || undefined"
                                        :maxDate="maxCheckOut || undefined"
                                        iconDisplay="input" 
                                        dateFormat="yy-mm-dd"
                                        :selectOtherMonths="true"                 
                                        fluid
                                    />
                                </FloatLabel>
                            </div>
                        </div>
                    </TabPanel>
                </TabPanels>                     
            </Tabs>
        
        </div>
        <template #footer>
            <Button v-if="tabsRoomEditDialog === 0 && !isPatternInput" label="適用" icon="pi pi-check" class="p-button-success p-button-text p-button-sm" @click="applyPlanChanges" />
            <Button v-if="tabsRoomEditDialog === 0 && isPatternInput" label="適用" icon="pi pi-check" class="p-button-success p-button-text p-button-sm" @click="applyPatternChanges" />
            
            <Button v-if="tabsRoomEditDialog === 1" label="適用" icon="pi pi-check" class="p-button-success p-button-text p-button-sm" @click="applyRoomChanges" />
            <Button v-if="tabsRoomEditDialog === 2" label="適用" icon="pi pi-check" class="p-button-success p-button-text p-button-sm" @click="applyGuestChanges" />
            <Button v-if="tabsRoomEditDialog === 4" label="適用" icon="pi pi-check" class="p-button-success p-button-text p-button-sm" @click="applyDateChanges" />
            
            <Button label="キャンセル" icon="pi pi-times" class="p-button-danger p-button-text p-button-sm" text @click="closeRoomEditDialog" />                
        </template>            
    </Dialog>

    <!-- Day Detail Dialog -->
    <Dialog 
        v-model:visible="visibleDayDetailDialog" 
        :header="'日付詳細'" 
        :closable="true"
        :modal="true"
        :breakpoints="{ '960px': '75vw', '640px': '100vw' }"
        style="width: 70vw"
    >
        <ReservationDayDetail                
            :reservation_details="reservation_details_day"            
        />
        <template #footer>                
            <Button label="閉じる" icon="pi pi-times" class="p-button-danger p-button-text p-button-sm" text @click="closeDayDetailDialog" />                
        </template>  
    </Dialog>
</template>
<script setup>
    // Vue
    import { ref, computed, onMounted, watch } from 'vue';

    import ReservationDayDetail from '@/pages/MainPage/components/ReservationDayDetail.vue';

    const props = defineProps({        
        reservation_details: {
            type: [Object],
            required: true,
        },        
    });

    // Primevue
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();
    import { Card, Accordion, AccordionPanel, AccordionHeader, AccordionContent, DataTable, Column, Divider, Dialog, Tabs, TabList, Tab, TabPanels,TabPanel, FloatLabel, InputText, InputNumber, AutoComplete, Select, MultiSelect, DatePicker, ToggleButton, Button, Badge } from 'primevue';

    // Stores
    import { useReservationStore } from '@/composables/useReservationStore';
    const { setRoomPlan, setRoomPattern, setRoomGuests, availableRooms, fetchAvailableRooms, moveReservationRoom, changeReservationRoomGuestNumber, deleteReservationRoom, getAvailableDatesForChange, setCalendarChange } = useReservationStore();  
    import { usePlansStore } from '@/composables/usePlansStore';
    const { plans, addons, patterns, fetchPlansForHotel, fetchPlanAddons, fetchAllAddons, fetchPatternsForHotel } = usePlansStore();
    import { useClientStore } from '@/composables/useClientStore';
    const { clients, fetchClients, setClientsIsLoading } = useClientStore();

    // Helper
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };
    const formatDateWithDay = (date) => {
        const options = { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' };
        const parsedDate = new Date(date);
        return `${parsedDate.toLocaleDateString('ja-JP', options)}`;
    };
    const formatCurrency = (value) => {
        if (value == null) return '';
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
    };
    const allHavePlan = (group) => {
        return group.details.every(
            (detail) => detail.plans_global_id || detail.plans_hotel_id
        );
    };
    const allPeopleCountMatch = (group) => {
        return group.details.every(
            (detail) => detail.number_of_people === detail.reservation_clients.length
        );
    };
    const normalizePhone = (phone) => {
        if (!phone) return '';

        // Remove all non-numeric characters
        let normalized = phone.replace(/\D/g, '');

        // Remove leading zeros
        normalized = normalized.replace(/^0+/, '');

        return normalized;
    };
    const validateEmail = (email) => {
        isValidEmail.value = emailPattern.test(email);
        return emailPattern.test(email);            
    };
    const validatePhone = (phone) => {
        isValidPhone.value = phonePattern.test(phone);
        return phonePattern.test(phone);
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

    // Format
    
    const formattedGroupDetails = (details) => {
        // Before matchingGroupDetails this function was used
        // console.log(details)
        return details.map((item) => ({
            ...item,
            price: formatCurrency(item.price),
            display_date: formatDateWithDay(item.date),
        }));
    };
    const matchingGroupDetails = (details) => {        

        // Check if details is empty
        if (!details || !groupedRooms.value) {            
            return [];
        }

        // Check if detail has any client. If not, return the details directly.
        if (!details.some(detail => detail.reservation_clients && detail.reservation_clients.length > 0)) {            
            return details.map((item) => ({
                ...item,
                price: formatCurrency(item.price),
                display_date: formatDateWithDay(item.date),
                plan_color: getPlanColor(item.plans_global_id, item.plans_hotel_id),
            }));
        } 
        
        // Extract room_id and reservation_clients from details
        let detailRoomIds = new Set(details.map(detail => detail.room_id));
        let detailReservationClients = new Set(details.map(detail => detail.reservation_clients));        
        const matchingDetails = [];        

        groupedRooms.value.flatMap((room) => { 
            return room.details.flatMap((dtl) => {                
                if([...detailRoomIds].includes(dtl.room_id)){                    
                    matchingDetails.push({
                        ...dtl,
                        price: formatCurrency(dtl.price),
                        display_date: formatDateWithDay(dtl.date),
                        plan_color: getPlanColor(dtl.plans_global_id, dtl.plans_hotel_id),
                    });
                } else {                    
                    for(let detailClients of detailReservationClients){
                        if(detailClients && detailClients.length>0 && dtl.reservation_clients && dtl.reservation_clients.length>0){                            
                            const detailClientIds = detailClients.map(client => client.client_id);
                            const dtlClientIds = dtl.reservation_clients.map(client => client.client_id)
                            if(detailClientIds.some(client => dtlClientIds.includes(client))){                                
                                matchingDetails.push({
                                    ...dtl,
                                    price: formatCurrency(dtl.price),
                                    display_date: formatDateWithDay(dtl.date),
                                    plan_color: getPlanColor(dtl.plans_global_id, dtl.plans_hotel_id),
                                    isDifferentRoom: true,
                                });
                                return[dtl];
                            }
                        }
                    }
                    return [];
                }                
            });
        })        
        return matchingDetails;
    };
    const expandedRows = ref({});     

    const isRowExpanded = (groupId, rowData) => {
        // Check if the group's expansion state exists and then if the row is expanded
        return expandedRows.value[groupId] && expandedRows.value[groupId][rowData.id] === true;
    };

    const toggleRowExpansion = (groupId, rowData) => {
        // Ensure the group's expansion state object exists
        if (!expandedRows.value[groupId]) {
            expandedRows.value[groupId] = {};
        }

        const isExpanded = expandedRows.value[groupId][rowData.id];
        if (isExpanded) {
            delete expandedRows.value[groupId][rowData.id];
        } else {
            expandedRows.value[groupId][rowData.id] = true;
        }
        // Force reactivity if Vue struggles with deep object changes, though direct assignment should work.
        // expandedRows.value = { ...expandedRows.value };
    };

    const rowStyle = (data) => {
        const date = new Date(data.display_date);
        const day = date.getDay();
        
        // Check if the room is different
        if (data.isDifferentRoom) {
            return {
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1) 0px, rgba(0, 0, 0, 0.1) 10px, transparent 10px, transparent 20px)'
            }           
        }
        if (data.cancelled && data.billable) {
            return { color: 'red', backgroundColor: '#f3dada' };
        }
        if (data.cancelled && !data.billable) {
            return { color: 'red' };
        }
        if (!data.billable) {
            return { 'text-decoration': 'line-through', color: 'red' };
        }
        // Check if the day is a weekend
        if (day === 6) {
            return { backgroundColor: '#edf3f9' };
        }
        if (day === 0) {
            return { backgroundColor: '#ededf9' };
        }
    };
    const getPlanColor = (plans_global_id, plans_hotel_id) => {        
        const possibleKeys = [
            `${plans_global_id ?? ''}h${plans_hotel_id ?? ''}`,
            `${plans_global_id ?? ''}h`,
            `h${plans_hotel_id ?? ''}`,
        ];
        const plan = plans.value.find(p => possibleKeys.includes(p.plan_key));
        return plan?.color || "#8f8d8d";
    };

    // Computed
    const reservationInfo = computed(() => props.reservation_details?.[0]);
    const reservationStatus = computed(() => {
        switch (reservationInfo.value.status) {
            case 'hold':
                return '保留中';
            case 'provisory':
                return '仮予約';
            case 'confirmed':
                return '確定';
            case 'checked_in':
                return 'チェックイン';
            case 'checked_out':
                return 'チェックアウト';
            case 'cancelled':
                return 'キャンセル';
            case 'block':
                return '予約不可';
            default:
                return '不明';
        }
    });
    const editReservationDetails = computed(() => props.reservation_details);
    const groupedRooms = computed(() => {
        if (!editReservationDetails.value) return [];

        const groups = {};
        editReservationDetails.value.forEach((item) => {
            const key = `${item.room_id}-${item.room_type}`;
            if (!groups[key]) {
                groups[key] = { room_id: item.room_id, room_type: item.room_type_name, details: [] };
            }
            groups[key].details.push(item);
        });

        return Object.values(groups);
    });
    const allRoomsHavePlan = computed(() => {
        return groupedRooms.value.every(group => allHavePlan(group));
    });
    const allGroupsPeopleCountMatch = computed(() => {
        return groupedRooms.value.every(group => allPeopleCountMatch(group));
    });

    // Dialog: Room Edit
    const visibleRoomEditDialog = ref(false);
    const tabsRoomEditDialog = ref(0);
    const selectedGroup = ref(null);
        
        // Tab Apply Plan
        const isPatternInput = ref(false);
        const daysOfWeek = [
            { label: '月曜日', value: 'mon' },
            { label: '火曜日', value: 'tue' },
            { label: '水曜日', value: 'wed' },
            { label: '木曜日', value: 'thu' },
            { label: '金曜日', value: 'fri' },
            { label: '土曜日', value: 'sat' },
            { label: '日曜日', value: 'sun' },
        ];
        const dayPlanSelections = ref({ mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null });
        const selectedDays = ref(daysOfWeek);
        const selectedPlan = ref(null);
        const selectedPattern = ref(null);
        const selectedPatternDetails = ref(null);
        const selectedAddon = ref([]);
        const addonOptions = ref(null);
        const selectedAddonOption = ref(null);
        const updatePattern = async () => {
                        
            if (selectedPattern.value !== null) {
                // Update the selectedPatternDetails with the corresponding data
                selectedPatternDetails.value = selectedPattern.value;
                
                // Populate dayPlanSelections based on template
                for (const day of daysOfWeek) {
                    const templateEntry = selectedPatternDetails.value.template?.[day.value];
                    if (templateEntry && templateEntry.plan_key && plans.value.some(plan => plan.plan_key === templateEntry.plan_key)) {
                        dayPlanSelections.value[day.value] = templateEntry.plan_key;
                    } else {                        
                        dayPlanSelections.value[day.value] = null;
                    }
                }
            }            
        };
        const updatePlanAddOns = async () => {            
            if (selectedPlan.value) {                
                const gid = selectedPlan.value?.plans_global_id ?? 0;
                const hid = selectedPlan.value?.plans_hotel_id ?? 0;
                const hotel_id = reservationInfo.value.hotel_id ?? 0;

                try {
                    // Fetch add-ons from the store
                    await fetchPlanAddons(gid, hid, hotel_id);                    
                } catch (error) {
                    console.error('Failed to fetch plan add-ons:', error);
                    addons.value = [];                    
                }
            }
        };
        const generateAddonPreview = () => {
            // Check
            if(!selectedAddonOption.value){
                toast.add({ severity: 'warn', summary: '警告', detail: 'アドオン選択されていません。', life: 3000 });
                return
            }

            // console.log('selectedAddon before:',selectedAddon.value);

            const foundAddon = addonOptions.value.find(addon => addon.addon_type !== 'parking');            
            const isHotelAddon = foundAddon.id.startsWith('H');
            selectedAddon.value.push({
                addons_global_id: isHotelAddon ? null : foundAddon.addons_global_id,                
                addons_hotel_id: isHotelAddon ? foundAddon.addons_hotel_id : null,
                hotel_id: foundAddon.hotel_id,
                addon_name: foundAddon.addon_name,
                price: foundAddon.price,
                quantity: selectedGroup.value ? selectedGroup.value.details[0].number_of_people : 1,
                tax_type_id: foundAddon.tax_type_id,
                tax_rate: foundAddon.tax_rate
            });   
            
            selectedAddonOption.value = '';

            // console.log('selectedAddon after:',selectedAddon.value);
        };
        const deleteAddon = (addon) => {
            const index = selectedAddon.value.indexOf(addon);
            if (index !== -1) {
                selectedAddon.value.splice(index, 1);
            }
        };
        const applyPlanChanges = async () => {
            try {                                      
                const params = {
                    hotel_id: reservationInfo.value.hotel_id,
                    room_id: selectedGroup.value.room_id,
                    reservation_id: reservationInfo.value.reservation_id,
                    plan: selectedPlan.value,
                    addons: selectedAddon.value,
                    daysOfTheWeek: selectedDays.value
                };
                                
                const result = await setRoomPlan(params);
                
                closeRoomEditDialog();    
                
                toast.add({ severity: 'success', summary: '成功', detail: '予約明細が更新されました。', life: 3000 });
                
                
            } catch (error) {
                console.error('Failed to apply changes:', error);
                console.error('Error details:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    response: error.response?.data
                });
                                
                let errorMessage = '変更の適用に失敗しました。';
                if (error.response?.data?.message) {
                    errorMessage = error.response.data.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                toast.add({ 
                    severity: 'error', 
                    summary: 'エラー', 
                    detail: errorMessage, 
                    life: 5000 
                });
            }
        };
        const applyPatternChanges = async () => {
            try {                
                const hasAtLeastOnePlan = Object.values(dayPlanSelections.value).some(v => v !== null);
                if (!hasAtLeastOnePlan) {
                    toast.add({ severity: 'error', summary: 'エラー', detail: '少なくとも1日はプランを設定してください', life: 3000 });
                    return;
                }

                await setRoomPattern(reservationInfo.value.hotel_id, selectedGroup.value.room_id, reservationInfo.value.reservation_id, dayPlanSelections.value);
                        
                closeRoomEditDialog();
    
                // Provide feedback to the user
                toast.add({ severity: 'success', summary: '成功', detail: '予約明細が更新されました。', life: 3000 });
                
            } catch (error) {
                console.error('Failed to apply changes:', error);                
                toast.add({ severity: 'error', summary: 'エラー', detail: '変更の適用に失敗しました。', life: 3000 });
            }
        };

        // Tab Move Room
        const targetRoom = ref(null);
        const numberOfPeopleToMove = ref(0);
        const filteredRooms = computed(() => {
            const reservedRoomIds =  props.reservation_details.map(detail => detail.room_id);

            return availableRooms.value
                .filter(room => room.capacity >= numberOfPeopleToMove.value) // Ensure room can fit the people count
                .filter(room => !reservedRoomIds.includes(room.room_id))
                .map(room => ({
                    label: `${room.room_number} - ${room.room_type_name} (${room.capacity}) ${room.smoking ? ' 🚬' : ''} (${room.floor}階)`,
                    value: room.room_id, // Value for selection
                }));
        });
        const applyRoomChanges = async () => {
            if(numberOfPeopleToMove.value <= 0) {
                toast.add({ severity: 'warn', summary: '警告', detail: `少なくとも一人入力してください。`, life: 3000 });
                return;                        
            }
            if(targetRoom.value === null) {
                toast.add({ severity: 'warn', summary: '警告', detail: `部屋を選択してください。`, life: 3000 });
                return;                        
            }

            const reservation_id = reservationInfo.value.reservation_id;
            const data = {
                reservationId: reservation_id, 
                numberOfPeopleOGM: selectedGroup.value.details[0].number_of_people, 
                numberOfPeopleToMove: numberOfPeopleToMove.value, 
                roomIdOld: selectedGroup.value.room_id,
                roomIdNew: targetRoom.value.value,
            }
            // console.log(data);            
            await moveReservationRoom(data);
            closeRoomEditDialog();

            // Provide feedback to the user (optional)                
            toast.add({ severity: 'success', summary: '成功', detail: '予約明細が更新されました。', life: 3000 });
        };

        // Tab Set Clients
        const guests = ref();
        const filteredClients = ref([]);
        const genderOptions = [
            { label: '男性', value: 'male' },
            { label: '女性', value: 'female' },
            { label: 'その他', value: 'other' },
        ];
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const isValidEmail = ref(true);
        const phonePattern = /^[+]?[0-9]{1,4}[ ]?[-]?[0-9]{1,4}[ ]?[-]?[0-9]{1,9}$/;
        const isValidPhone = ref(true);
        const initializeGuests = () => {
            const capacity = selectedGroup.value.details[0]?.capacity || 0;
            const reservationClients = selectedGroup.value.details[0]?.reservation_clients || '';
            // console.log('Room capacity:', capacity);
            // console.log('Existing guest in reservation:', reservationClients);
            guests.value = Array.from({ length: capacity }, (_, i) => ({
                id: null,
                guest_no: '宿泊者 ' + (i + 1),
                name: '',                
                legal_or_natural_person: 'natural',
                gender: 'male',
                email: '',
                phone: '',
                isClientSelected: false
            }));
            if (reservationClients.length > 0) {
                // Fill the array with reservation_clients data
                reservationClients.forEach((client, i) => {
                if (i < capacity) { // Important check: Don't exceed capacity
                    guests.value[i] = { // Update existing guest object
                        id: client.client_id || null,
                        guest_no: '宿泊者 ' + (i + 1),
                        name: client.name_kanji || client.name || '',                        
                        legal_or_natural_person: 'natural',
                        gender: client.gender || 'male',
                        email: client.email || '',
                        phone: client.phone || '',
                        isClientSelected: true
                    };
                }
                });
            }            
        };
        const filterClients = (event) => {            
            const query = event.query.toLowerCase();
            const normalizedQuery = normalizePhone(query);
            const isNumericQuery = /^\d+$/.test(normalizedQuery);

            if (!query || !clients.value || !Array.isArray(clients.value)) {
                filteredClients.value = [];
                return;
            }

            filteredClients.value = clients.value.filter((client) =>
                client.legal_or_natural_person === 'natural' && 
                (
                    (client.name && client.name.toLowerCase().includes(query)) ||
                    (client.name_kana && normalizeKana(client.name_kana).toLowerCase().includes(normalizeKana(query))) ||
                    (client.name_kanji && client.name_kanji.toLowerCase().includes(query))
                )
            );
            filteredClients.value = clients.value.filter((client) => {
                if(client.legal_or_natural_person === 'natural'){
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
                }

                return;                
            });
        };
        const onClientSelect = (e, rowData) => {            
            // Find the guest in the guests array that was just selected
            const guestIndex = guests.value.findIndex(guest => guest.guest_no === rowData.guest_no);

            // console.log('guestIndex',guestIndex);
            // console.log('event:', e.value);

            // Update the guest's information
            if (guestIndex > -1) {
                guests.value[guestIndex] = {...guests.value[guestIndex],...e.value }; 
                guests.value[guestIndex].isClientSelected = true;               
            }

            // console.log('onClientSelect guests:', guests.value);
        };
        const onClientChange = (rowData) => {
            // Find the guest in the guests array that was just selected
            const guestIndex = guests.value.findIndex(guest => guest.guest_no === rowData.guest_no);

            if (guestIndex > -1) {
                guests.value[guestIndex].id = '';
                guests.value[guestIndex].isClientSelected = false;
            }

            // console.log('onClientChange guests:', guests.value);
        };
        const applyGuestChanges = async () => {
            const guestsWithId = guests.value.filter(guest => guest.id !== null);
            const idSet = new Set();
            const duplicatedGuest = [];
            let hasDuplicates = false;
            const number_of_people = selectedGroup.value.details[0]?.number_of_people;
            const guestCount = guests.value.filter(guest => guest.name).length;

            // Check if guest count exceeds number_of_people
            if (guestCount > number_of_people) {
                toast.add({
                    severity: 'warn',
                    summary: '警告',
                    detail: `予約の宿泊人数を超えています。 (最大: ${number_of_people}人)`,
                    life: 3000
                });
                return;
            }
            // Validate if the same person was selected more than once
            for (const guest of guestsWithId) {
                if (idSet.has(guest.id)) {
                    hasDuplicates = true;
                    duplicatedGuest.value = guest;
                    break;
                }
                idSet.add(guest.id);
            }            

            if (hasDuplicates) {
                toast.add({ severity: 'warn', summary: '警告', detail: `重複宿泊者:${duplicatedGuest.value.name}が選択されました。`, life: 3000 });
                return;
            } else {                
                // console.log('No duplicates found, checking fields...');
                for (const guest of guests.value) {
                    if (guest.name) {
                        if(!guest.email && !guest.phone){                        
                            toast.add({ severity: 'warn', summary: '警告', detail: `宿泊者: ${guest.name}にメールアドレスまたは電話番号を記入してください。`, life: 3000 });
                            return;                        
                        }
                        if(guest.email){
                            const emailValid = validateEmail(guest.email);                        
                            if (!emailValid) {
                                toast.add({ severity: 'warn', summary: '警告', detail: `宿泊者: ${guest.name}にメールアドレスの書式誤差がありました。`, life: 3000 });
                                return;
                            }
                        }
                        if(guest.phone){
                            const phoneValid = validatePhone(guest.phone);
                            if (!phoneValid) {
                                toast.add({ severity: 'warn', summary: '警告', detail: `宿泊者: ${guest.name}に電話番号の書式誤差がありました。`, life: 3000 });
                                return;
                            }
                        }
                    }
                }
                // console.log('No entry problem found, applying changes...');

                const filteredGroup = selectedGroup.value.details;

                const dataToUpdate = filteredGroup.map(group => {
                    return {
                        id: group.id,
                        hotel_id: group.hotel_id,
                        room_id: group.room_id,
                        number_of_people: group.number_of_people,                        
                        guestsToAdd: guests.value.filter(guest => guest.name) 
                    };
                });

                // console.log('applyGuestChanges:',reservationInfo.value.reservation_id, dataToUpdate[0]);

                
                
                await setRoomGuests(reservationInfo.value.reservation_id, dataToUpdate[0]);
                                
                closeRoomEditDialog();
                
                toast.add({ severity: 'success', summary: '成功', detail: '予約明細が更新されました。', life: 3000 });
            }
        };

        // Tab Modify Room
        const deleteRoom = async (group) => {
            const room = {
                hotelId: group.details[0].hotel_id,
                roomId: group.details[0].room_id,
                reservationId: group.details[0].reservation_id,
                numberOfPeople: group.details[0].number_of_people,
            }

            const response = await deleteReservationRoom(group.details[0].reservation_id, room);                        
            closeRoomEditDialog();

            // Provide feedback to the user
            toast.add({ severity: 'success', summary: '成功', detail: '予約明細が更新されました。', life: 3000 });
        };
        const changeGuestNumber = async (group, mode) => {
            // Add operation_mode to each detail in the group
            group.details.forEach(detail => {
                detail.operation_mode = mode === 'add' ? 1 : -1;
            });

            try {
                const response = await changeReservationRoomGuestNumber(group.details[0].reservation_id, group);

                // Provide feedback to the user
                toast.add({ severity: 'success', summary: '成功', detail: '予約明細が更新されました。', life: 3000 });
            } catch (error) {
                console.error('Error updating reservation details:', error);
                toast.add({ severity: 'error', summary: 'エラー', detail: '予約明細の更新に失敗しました。', life: 3000 });
            }            
        };

        // Tab Modify Period
        const newCheckIn = ref(null);
        const newCheckOut = ref(null);
        const minCheckIn = ref(null);
        const maxCheckOut = ref(null);
        const applyDateChanges = async () => {
            // console.log(newCheckIn.value, newCheckOut.value);
            // Checks            
            if (!newCheckIn.value) {
                toast.add({
                    severity: 'warn',
                    summary: '警告',
                    detail: `チェックイン日を指定してください。`,
                    life: 3000
                });
                return;
            }
            if (!newCheckOut.value) {
                toast.add({
                    severity: 'warn',
                    summary: '警告',
                    detail: `チェックアウト日を指定してください。`,
                    life: 3000
                });
                return;
            }
            if (newCheckOut.value <= newCheckIn.value) {
                toast.add({
                    severity: 'warn',
                    summary: '警告',
                    detail: `チェックアウト日がチェックイン日以前になっています。`,
                    life: 3000
                });
                return;
            }            

            const id = editReservationDetails.value[0].reservation_id;
            const old_check_in = editReservationDetails.value[0].check_in;
            const old_check_out = editReservationDetails.value[0].check_out;
            const new_check_in = formatDate(new Date(newCheckIn.value));
            const new_check_out = formatDate(new Date(newCheckOut.value));
            const old_room_id = selectedGroup.value.room_id;
            const new_room_id = selectedGroup.value.room_id;
            const number_of_people = editReservationDetails.value[0].number_of_people;

            await setCalendarChange (id, old_check_in, old_check_out, new_check_in, new_check_out, old_room_id, new_room_id, number_of_people, 'solo');

            closeRoomEditDialog();

            toast.add({ severity: 'success', summary: '成功', detail: '部屋の宿泊期間が更新されました。', life: 3000 });
            
        };
    
    const openRoomEditDialog = async (group) => {
        const hotelId = reservationInfo.value.hotel_id;
        const startDate = reservationInfo.value.check_in;
        const endDate = reservationInfo.value.check_out;        

        await fetchAvailableRooms(hotelId, startDate, endDate);
        await fetchPlansForHotel(hotelId);
        await fetchPatternsForHotel(hotelId);
        // Addons
        const allAddons = await fetchAllAddons(hotelId);
        addonOptions.value = allAddons.filter(addon => addon.addon_type !== 'parking');
        selectedGroup.value = group;
        tabsRoomEditDialog.value = 0;
        visibleRoomEditDialog.value = true;

        // Load Clients
        if(clients.value.length === 0) {
            setClientsIsLoading(true);
            const clientsTotalPages = await fetchClients(1);
            // Fetch clients for all pages
            for (let page = 2; page <= clientsTotalPages; page++) {
                await fetchClients(page);
            }
            setClientsIsLoading(false);            
        }
    };
    const closeRoomEditDialog = () => {
        visibleRoomEditDialog.value = false;
        
        selectedGroup.value = null;
        selectedPlan.value = null;
        
        selectedDays.value = [
            { label: '月曜日', value: 'mon' },
            { label: '火曜日', value: 'tue' },
            { label: '水曜日', value: 'wed' },
            { label: '木曜日', value: 'thu' },
            { label: '金曜日', value: 'fri' },
            { label: '土曜日', value: 'sat' },
            { label: '日曜日', value: 'sun' },
        ];
        
        addons.value = [];
        targetRoom.value = null;
        numberOfPeopleToMove.value = 0;            
    };
    const handleTabChange = async (newTabValue) => {
        tabsRoomEditDialog.value = newTabValue * 1;

        // Guest edit
        if(tabsRoomEditDialog.value  === 2){
            initializeGuests();            
        }
        // Period change
        if(tabsRoomEditDialog.value  === 4){                    
            const hotelId = editReservationDetails.value[0].hotel_id;
            const roomId = selectedGroup.value.room_id;            
            newCheckIn.value = new Date(editReservationDetails.value[0].check_in);
            newCheckOut.value = new Date(editReservationDetails.value[0].check_out);

            const checkIn = formatDate(newCheckIn.value);
            const checkOut = formatDate(newCheckOut.value);

            const results = await getAvailableDatesForChange(hotelId, roomId, checkIn, checkOut);

            if (results.earliestCheckIn) {
                minCheckIn.value = new Date(results.earliestCheckIn);
            } else {
                minCheckIn.value = null;
            }

            if (results.latestCheckOut) {
                maxCheckOut.value = new Date(results.latestCheckOut);
            } else {
                maxCheckOut.value = null;
            }
            
        }
    };

    // Dialog: Day Detail
    const visibleDayDetailDialog = ref(false);
    const reservation_details_day = ref(null);    
    const openDayDetailDialog = async (day) => {   
        reservation_details_day.value = day;
        visibleDayDetailDialog.value = true;
    };
    const closeDayDetailDialog = async () => {
        visibleDayDetailDialog.value = false;
    };
    
    onMounted(async () => {
        // console.log('onMounted RoomView:', props.reservation_details);
        const hotelId = reservationInfo.value.hotel_id;
        await fetchPlansForHotel(hotelId);
        // console.log('fetchPlansForHotel', plans.value);
    });

    // Watcher
    watch(addons, (newValue, oldValue) => {
        if (newValue !== oldValue) {
            // console.log('addons changed:', newValue);
            
            // Add a 'quantity' field with default value 1 to each add-on
            selectedAddon.value = newValue.map(addon => ({
                ...addon,                    
                quantity: selectedGroup.value ? selectedGroup.value.details[0].number_of_people : 1
            }));
        }
    }, { deep: true });  

</script>

<style scoped>
</style>
