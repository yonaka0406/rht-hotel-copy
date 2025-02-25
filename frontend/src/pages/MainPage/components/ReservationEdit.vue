<template>
    <div>        
        <!-- Form or fields to edit the reservation details -->
        <Card class="m-2">
            <template #title>予約編集</template>
            <template #content>
                <!--<p>ID: {{ reservation_id }}</p>-->
                <div 
                    v-if="editReservationDetails && editReservationDetails.length > 0"
                    class="grid grid-cols-2 gap-2 gap-y-4"
                >
                    <div class="field flex flex-col">                        
                        <div class="flex items-center justify-between mr-2 mb-2">
                            <p class="font-bold">予約者：</p>
                            <Button label="顧客変更" severity="help" icon="pi pi-pencil" @click="openChangeClientDialog" />
                        </div>
                        <InputText type="text" v-model="editReservationDetails[0].client_name" disabled style="background-color: transparent;"/>                        
                    </div>
                    
                    <div class="field flex flex-col" >
                        <div class="flex items-center justify-between mr-2 mb-2">
                            <p class="font-bold">宿泊者：</p>
                            <Button label="部屋追加" severity="help" icon="pi pi-pencil" @click="openBulkEditRoomDialog" />
                        </div> 
                        
                        <span>
                            人数：{{ editReservationDetails[0].reservation_number_of_people }}
                            <i class="pi pi-user ml-1 mr-1"></i> 
                            部屋数：{{ groupedRooms.length }} <i class="pi pi-box ml-1"></i>
                        </span>
                    </div>

                    <div class="field flex flex-col">
                        <div class="flex items-start justify-between mr-2 mb-2">
                            <p class="font-bold">チェックイン：</p>
                            <span>{{ editReservationDetails[0].check_in }} <i class="pi pi-arrow-down-right ml-1"></i></span>
                            <span></span>
                        </div>
                        
                    </div>

                    <div class="field flex flex-col">
                        <div class="flex items-start justify-between mr-2 mb-2">
                            <p class="font-bold">チェックアウト：</p>
                            <span>{{ editReservationDetails[0].check_out }} <i class="pi pi-arrow-up-right ml-1"></i></span>
                            <Button label="プラン・期間編集" severity="help" icon="pi pi-pencil" @click="openReservationBulkEditDialog" />
                        </div> 
                        
                        
                    </div>

                    <div class="field flex flex-col col-span-2">
                        <Divider />
                    </div>             
                    
                    <div class="field flex flex-col">
                        <span><span class="font-bold">ステータス：</span> {{ reservationStatus }}</span>
                    </div>
<!--
                    <div class="field flex flex-col">
                        <span><span class="font-bold">更新日時：</span> {{ formatDateTime(updatedDateTime) }}</span>
                    </div>
-->
                    <div class="field flex flex-col col-span-2">
                        
                        <div class="grid grid-cols-4 gap-x-6">
                            <div v-if="reservationStatus === '保留中' || reservationStatus === '確定'" class="field flex flex-col">
                                <Button 
                                    label="仮予約として保存"                                     
                                    severity="info"
                                    :disabled="!allRoomsHavePlan"
                                    @click="updateReservationStatus('provisory')"
                                /> 
                            </div>
                            <div v-if="reservationStatus === '保留中' || reservationStatus === '仮予約'" class="field flex flex-col">
                                <Button 
                                    label="確定予約として保存" 
                                    severity="success"
                                    :disabled="!allRoomsHavePlan"
                                    @click="updateReservationStatus('confirmed')"
                                /> 
                            </div>
                            <div v-if="reservationStatus === '確定' && allGroupsPeopleCountMatch" class="field flex flex-col">
                                <Button 
                                    label="チェックイン" 
                                    severity="success"
                                    icon="pi pi-sign-in"
                                    fluid
                                    @click="updateReservationStatus('checked_in')"
                                />
                            </div>
                            <div v-if="reservationStatus === 'チェックイン'" class="field flex flex-col">
                                <Button 
                                    label="チェックアウト" 
                                    severity="warn"
                                    icon="pi pi-eject"
                                    fluid
                                    @click="updateReservationStatus('checked_out')"
                                />
                            </div> 
                            <div v-if="reservationStatus === '仮予約' || reservationStatus === '確定'" class="field flex flex-col">
                                <Button 
                                    label="キャンセル" 
                                    severity="contrast"
                                    :disabled="!allRoomsHavePlan"
                                    @click="updateReservationStatus('cancelled')"
                                /> 
                            </div>
                            
                            <div v-if="reservationStatus === '保留中'" class="field flex flex-col">
                                <Button 
                                    label="保留中予約を削除" 
                                    severity="danger"
                                    fluid
                                    @click="deleteReservation"
                                />
                                <ConfirmPopup />
                            </div>                 
                        </div>
                    </div>
                    
                </div>
                <div v-else>Loading reservation information...</div>
            </template>
            
        </Card>

        <!-- Rooms Data Table -->
        <Card class="m-2">
            <template #title>部屋</template>
            <template #content>
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
                                <div class="col-span-2 text-right">
                                    <Button
                                        icon="pi pi-pencil"
                                        label="一括編集"
                                        class="p-button-sm"
                                        @click="openBulkEditDialog(group)"
                                    />
                                </div>
                            </div>
                        </AccordionHeader>
                        <AccordionContent>
                            <DataTable 
                                :value="formattedGroupDetails(group.details)"
                                :rowStyle="rowStyle"
                            >
                                <Column field="display_date" header="日付" class="text-xs" />
                                <Column field="plan_name" header="プラン" class="text-xs" />
                                <Column field="number_of_people" header="人数" class="text-xs" />
                                <Column field="price" header="料金" class="text-xs" />
                                <Column header="詳細">
                                    <template #body="slotProps">
                                        <Button icon="pi pi-eye" @click="openReservationDayDetailDialog(slotProps.data)" size="small" variant="text" />
                                    </template>
                                </Column>
                            </DataTable>
                        </AccordionContent>                        
                    </AccordionPanel>
                </Accordion>                
            </template>
        </Card>

        <!-- Reservation Bulk Edit Dialog -->
        <Dialog
            v-model:visible="bulkEditReservationDialogVisible"
            header="全部屋一括編集"
            :modal="true"
            :breakpoints="{ '960px': '75vw', '640px': '100vw' }"
            style="width: 50vw"
        >
            <div class="p-fluid">
                <Tabs 
                    value ="0"
                    @update:value="handleTabChange"
                >
                    <TabList>
                        <Tab value="0">プラン適用</Tab>                        
                        <Tab v-if="reservationStatus === '保留中' || reservationStatus === '仮予約'" value="4">期間</Tab>
                    </TabList>
                    
                     
                    <TabPanels>
                        <!-- Tab 1: Apply Plan -->
                        <TabPanel value="0"> 
                            <Card class="mb-2">
                                <template #title>プラン</template>
                                <template #content>
                                    <div class="field mt-8">
                                        <FloatLabel>
                                            <Select
                                                id="bulk-plan"
                                                v-model="selectedPlan"
                                                :options="plans"
                                                optionLabel="name"
                                                showClear 
                                                fluid                           
                                                @change="updatePlanAddOns"
                                            />
                                            <label for="bulk-plan">プラン選択</label>
                                        </FloatLabel>
                                    </div>
                                    <div class="field mt-6">
                                        <FloatLabel>
                                            <MultiSelect
                                                v-model="selectedDays"
                                                :options="daysOfWeek"
                                                optionLabel="label"
                                                fluid                            
                                                :maxSelectedLabels="3"
                                            />
                                            <label>曜日</label>
                                        </FloatLabel>
                                    </div>
                                </template>
                            </Card>
                            <Card>
                                <template #title>アドオン</template>
                                <template #content>
                                    <div class="grid grid-cols-4">
                                        <div class="field col-span-3 mt-8">
                                            <FloatLabel>
                                                <Select
                                                    v-model="selectedAddonOption"
                                                    :options="addonOptions"
                                                    optionLabel="name"
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
                                            <Column field="name" header="アドオン名" style="width:40%" />                        
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
                        <!-- Tab 5: Modify period -->
                        <TabPanel value="4">
                            <Card class="mb-3">
                                <template #title>予約</template>
                                <template #content>
                                    <div class="grid grid-cols-2 gap-4 items-center">
                                        <div>
                                            <span>チェックイン：{{ editReservationDetails[0].check_in }}</span>
                                        </div>
                                        <div>
                                            <span>チェックアウト：{{ editReservationDetails[0].check_out }}</span>
                                        </div>
                                        <div>
                                            <span>宿泊者：{{ editReservationDetails[0].reservation_number_of_people }}</span>
                                        </div>
                                        <div>
                                            <span>部屋数：{{ groupedRooms.length }}</span>
                                        </div>                                        
                                    </div>
                                </template>
                            </Card>
                            <p class="mt-2 mb-6"><span class="font-bold">注意：</span>全ての部屋宿泊期間を変更できる日付が表示されています。</p>
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
                                        class="w-full"
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
                                            class="w-full"
                                        />
                                    </FloatLabel>
                                </div>
                            </div>
                            <Card class="mt-3 mb-3">
                                <template #title>部屋毎の状況</template>
                                <template #content>                                    
                                    <div class="grid grid-cols-3 gap-4 items-center text-center font-bold">
                                        <p>部屋</p>
                                        <p>最も早い日付</p>
                                        <p>最も遅い日付</p>
                                    </div>
                                    <div v-for="(change, index) in roomsAvailableChanges" :key="index" class="room-status">
                                        <div class="grid grid-cols-3 gap-4 items-center">
                                            <p
                                             class="text-center"
                                            >{{ change.roomValues.details[0].room_type_name + ' ' + change.roomValues.details[0].room_number }}</p>
                                            <p
                                             class="text-center"              
                                             :class="{'text-xs text-center': !change.results.earliestCheckIn}"
                                            >
                                                {{ change.results.earliestCheckIn ? change.results.earliestCheckIn : '制限なし' }}
                                            </p>
                                            <p
                                             class="text-center"
                                             :class="{'text-xs text-center': !change.results.latestCheckOut}"
                                            >
                                                {{ change.results.latestCheckOut ? change.results.latestCheckOut : '制限なし' }}
                                            </p>
                                        </div>
                                        
                                        
                                    </div>
                                </template>
                            </Card>
                        </TabPanel>                     
                    </TabPanels>                     
                </Tabs>
         
            </div>
            <template #footer>
                <Button v-if="bulkEditReservationDialogTab === 0" label="適用" icon="pi pi-check" class="p-button-success p-button-text p-button-sm" @click="applyPlanChangesToAll" />
                <Button v-if="bulkEditReservationDialogTab === 4" label="適用" icon="pi pi-check" class="p-button-success p-button-text p-button-sm" @click="applyDateChangesToAll" />
                
                <Button label="キャンセル" icon="pi pi-times" class="p-button-danger p-button-text p-button-sm" text @click="closeReservationBulkEditDialog" />                
            </template>            
        </Dialog>

        <!-- Bulk Edit Dialog -->
        <Dialog
            v-model:visible="bulkEditDialogVisible"
            header="部屋一括編集"
            :modal="true"
            :breakpoints="{ '960px': '75vw', '640px': '100vw' }"
            style="width: 50vw"
        >
            <div class="p-fluid">
                <Tabs 
                    value ="0"
                    @update:value="handleTabChange"
                >
                    <TabList>
                        <Tab value="0">プラン適用</Tab>
                        <Tab value="1">部屋移動</Tab>
                        <Tab v-if="reservationStatus === '保留中' || reservationStatus === '仮予約' || reservationStatus === '確定'" value="2">宿泊者</Tab>
                        <Tab v-if="reservationStatus === '保留中' || reservationStatus === '仮予約'" value="3">追加・削除</Tab>
                        <Tab v-if="reservationStatus === '保留中' || reservationStatus === '仮予約'" value="4">期間</Tab>
                    </TabList>
                     
                    <TabPanels>
                        <!-- Tab 1: Apply Plan -->
                        <TabPanel value="0">
                            <Card class="mb-2">
                                <template #title>プラン</template>
                                <template #content>
                                    <div class="field mt-8">
                                        <FloatLabel>
                                            <Select
                                                id="bulk-plan"
                                                v-model="selectedPlan"
                                                :options="plans"
                                                optionLabel="name"
                                                showClear 
                                                fluid                           
                                                @change="updatePlanAddOns"
                                            />
                                            <label for="bulk-plan">プラン選択</label>
                                        </FloatLabel>
                                    </div>
                                    <div class="field mt-6">
                                        <FloatLabel>
                                            <MultiSelect
                                                v-model="selectedDays"
                                                :options="daysOfWeek"
                                                optionLabel="label"
                                                fluid                            
                                                :maxSelectedLabels="3"
                                            />
                                            <label>曜日</label>
                                        </FloatLabel>
                                    </div>
                                </template>
                            </Card>
                            <Card>
                                <template #title>アドオン</template>
                                <template #content>
                                    <div class="grid grid-cols-4">
                                        <div class="field col-span-3 mt-8">
                                            <FloatLabel>
                                                <Select
                                                    v-model="selectedAddonOption"
                                                    :options="addonOptions"
                                                    optionLabel="name"
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
                                            <Column field="name" header="アドオン名" style="width:40%" />
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
                        <!-- Tab 2: Move Rooms Content -->
                        <TabPanel value="1">
                            <h4 class="mt-4 mb-3 font-bold">部屋移動</h4>

                            <div class="grid xs:grid-cols-1 grid-cols-2 gap-2">
                                <div class="field mt-6 col-6">
                                    <FloatLabel>
                                        <InputNumber
                                            id="move-people"
                                            v-model="numberOfPeopleToMove"
                                            :min="0"
                                            :max="Math.max(...(selectedGroup?.details.map(item => item.number_of_people) || [0]))"
                                        />
                                        <label for="move-people">人数</label>
                                    </FloatLabel>
                                </div>
                                <div class="field mt-6 col-6">
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
                                            v-model="slotProps.data"
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
                                                    {{ slotProps.option.name_kanji || slotProps.option.name || '' }}
                                                    <span v-if="slotProps.option.name_kana"> ({{ slotProps.option.name_kana }})</span>
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
                                                <span>宿泊者：{{ editReservationDetails[0].reservation_number_of_people }}</span>
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
                                            <span>チェックイン：{{ editReservationDetails[0].check_in }}</span>
                                        </div>
                                        <div>
                                            <span>チェックアウト：{{ editReservationDetails[0].check_out }}</span>
                                        </div>
                                        <div>
                                            <span>宿泊者：{{ editReservationDetails[0].reservation_number_of_people }}</span>
                                        </div>
                                        <div>
                                            <span>部屋数：{{ groupedRooms.length }}</span>
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
                                        class="w-full"
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
                                            class="w-full"
                                        />
                                    </FloatLabel>
                                </div>
                            </div>
                        </TabPanel>
                    </TabPanels>                     
                </Tabs>
         
            </div>
            <template #footer>
                <Button v-if="bulkEditDialogTab === 0" label="適用" icon="pi pi-check" class="p-button-success p-button-text p-button-sm" @click="applyPlanChanges" />
                <Button v-if="bulkEditDialogTab === 1" label="適用" icon="pi pi-check" class="p-button-success p-button-text p-button-sm" @click="applyRoomChanges" />
                <Button v-if="bulkEditDialogTab === 2" label="適用" icon="pi pi-check" class="p-button-success p-button-text p-button-sm" @click="applyGuestChanges" />
                <Button v-if="bulkEditDialogTab === 4" label="適用" icon="pi pi-check" class="p-button-success p-button-text p-button-sm" @click="applyDateChanges" />
                
                <Button label="キャンセル" icon="pi pi-times" class="p-button-danger p-button-text p-button-sm" text @click="closeBulkEditDialog" />                
            </template>            
        </Dialog>

        <!-- Change Client Dialog -->
        <Dialog 
            v-model:visible="changeClientDialogVisible" 
            :header="'顧客変更'" 
            :closable="true"
            :modal="true"
            :style="{ width: '600px' }"
        >
            <ReservationClientEdit
                v-if="selectedClient"
                :client_id="selectedClient"                
            />
            <template #footer>                
                <Button label="閉じる" icon="pi pi-times" class="p-button-danger p-button-text p-button-sm" text @click="closeChangeClientDialog" />                
            </template>  
        </Dialog>

        <!-- Change Rooms Dialog -->
        <Dialog
            v-model:visible="bulkEditRoomDialogVisible"
            header="予約一括編集"
            :modal="true"
            :breakpoints="{ '960px': '75vw', '640px': '100vw' }"
            style="width: 50vw"
        >
            <div class="p-fluid">
                <Tabs 
                    value ="0"
                    @update:value="handleTabChange"
                >
                    <TabList>                        
                        <Tab value="0">部屋追加</Tab>                        
                    </TabList>
                     
                    <TabPanels>                        
                        <!-- Tab 1: Rooms -->
                        <TabPanel value="0">
                            <h4 class="mt-4 mb-3 font-bold">部屋追加</h4>

                            <div class="grid xs:grid-cols-1 grid-cols-2 gap-2">
                                <div class="field mt-6 col-6">
                                    <FloatLabel>
                                        <InputNumber
                                            id="move-people"
                                            v-model="numberOfPeopleToMove"
                                            :min="0"
                                        />
                                        <label for="move-people">人数</label>
                                    </FloatLabel>
                                </div>
                                <div class="field mt-6 col-6">
                                    <FloatLabel>
                                        <Select
                                            id="move-room"
                                            v-model="targetRoom"
                                            :options="filteredRooms"
                                            optionLabel="label"
                                            showClear 
                                            fluid
                                        />
                                        <label for="move-room">部屋を追加</label>
                                    </FloatLabel>
                                </div>
                            </div>
                        </TabPanel>
                    </TabPanels>                     
                </Tabs>
         
            </div>
            <template #footer>
                <Button label="追加" icon="pi pi-check" class="p-button-success p-button-text p-button-sm" @click="applyReservationRoomChanges" />                
                
                <Button label="キャンセル" icon="pi pi-times" class="p-button-danger p-button-text p-button-sm" text @click="closeBulkEditRoomDialog" />                
            </template>            
        </Dialog>
        
        <!-- Day Detail Dialog -->
        <Dialog 
            v-model:visible="changeReservationDayDetailDialogVisible" 
            :header="'日付詳細'" 
            :closable="true"
            :modal="true"
            :breakpoints="{ '960px': '75vw', '640px': '100vw' }"
            style="width: 50vw"
        >
            <ReservationDayDetail                
                :hotel_id="dialogHotelId"
                :reservation_id="dialogReservationId"
                :reservation_details_id="dialogReservationDtlId"
            />
            <template #footer>                
                <Button label="閉じる" icon="pi pi-times" class="p-button-danger p-button-text p-button-sm" text @click="closeChangeReservationDayDetailDialog" />                
            </template>  
        </Dialog>

    </div>
</template>

<script>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';  
import { io } from 'socket.io-client';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from "primevue/useconfirm";

import { useHotelStore } from '@/composables/useHotelStore';
import { useReservationStore } from '@/composables/useReservationStore';
import { usePlansStore } from '@/composables/usePlansStore';
import { useClientStore } from '@/composables/useClientStore';
import ReservationClientEdit from '@/pages/MainPage/components/ReservationClientEdit.vue';
import ReservationDayDetail from '@/pages/MainPage/components/ReservationDayDetail.vue';

import { Panel, Card, Divider, Dialog, Tabs, TabList, Tab, TabPanels,TabPanel, ConfirmPopup } from 'primevue';
import { Accordion, AccordionPanel, AccordionHeader, AccordionContent } from 'primevue';
import { DataTable, Column } from 'primevue';
import { FloatLabel, InputText, InputNumber, AutoComplete, Select, MultiSelect, RadioButton, Button, DatePicker } from 'primevue';


export default {
    props: {
        reservation_id: {
            type: String,
            required: true,
        },
        room_id: { // Add room_id prop
            type: [String, Number], // Allow both string and number types
            required: false,     // Make it not required
            default: null,       // Provide a default value
        },
    },
    name: "ReservationEdit",
    components: { 
        ReservationClientEdit,
        ReservationDayDetail,
        Panel,  
        Card,
        Divider,
        Dialog,
        Tabs,
        TabList,
        Tab,
        TabPanels,
        TabPanel,
        ConfirmPopup,
        Accordion,
        AccordionPanel,
        AccordionHeader,
        AccordionContent, 
        DataTable,
        Column,
        FloatLabel, 
        InputText,
        InputNumber, 
        AutoComplete,
        Select,
        MultiSelect,
        RadioButton,
        Button,
        DatePicker,
    },
    setup(props) {
        const router = useRouter();
        const socket = ref(null);
        const toast = useToast();
        const confirm = useConfirm();
        const isUpdating = ref(false);
        const { selectedHotelId, setHotelId } = useHotelStore();
        const { setReservationId, availableRooms, reservationDetails, fetchReservation, fetchReservations, fetchAvailableRooms, setCalendarChange, getAvailableDatesForChange,  setReservationStatus, changeReservationRoomGuestNumber, deleteHoldReservation, deleteReservationRoom } = useReservationStore();        
        const { plans, addons, fetchPlansForHotel, fetchPlanAddons, fetchAllAddons } = usePlansStore();
        const { clients, fetchClients } = useClientStore();
        const editReservationDetails = computed(() => reservationDetails.value.reservation);        
        const daysOfWeek = [
            { label: '月曜日', value: 'mon' },
            { label: '火曜日', value: 'tue' },
            { label: '水曜日', value: 'wed' },
            { label: '木曜日', value: 'thu' },
            { label: '金曜日', value: 'fri' },
            { label: '土曜日', value: 'sat' },
            { label: '日曜日', value: 'sun' },
        ];
        const bulkEditDialogVisible = ref(false);
        const bulkEditDialogTab = ref(0);
        const bulkEditReservationDialogVisible = ref(false);
        const bulkEditReservationDialogTab = ref(0);
        const changeClientDialogVisible = ref(false);
        const changeReservationDayDetailDialogVisible = ref(false);        
        const bulkEditRoomDialogVisible = ref(false);        
        const selectedClient = ref(null);
        const selectedGroup = ref(null);
        const selectedPlan = ref(null);
        const selectedDays = ref(daysOfWeek);
        const selectedAddon = ref();
        const addonOptions = ref(null);
        const selectedAddonOption = ref(null);
        const targetRoom = ref(null);
        const numberOfPeopleToMove = ref(0);
        const newCheckIn = ref(null);
        const newCheckOut = ref(null);
        const minCheckIn = ref(null);
        const maxCheckOut = ref(null);
        const roomsAvailableChanges = ref([]);
        const filteredRooms = computed(() => {
            const reservedRoomIds = editReservationDetails.value.map(detail => detail.room_id);

            return availableRooms.value
                .filter(room => room.capacity >= numberOfPeopleToMove.value) // Ensure room can fit the people count
                .filter(room => !reservedRoomIds.includes(room.room_id))
                .map(room => ({
                    label: `${room.room_number} - ${room.room_type_name} (${room.capacity}) ${room.smoking ? ' 🚬' : ''} (${room.floor}階)`,
                    value: room.room_id, // Value for selection
                }));
        });
        const guests = ref();        
        const editingRows = ref([]);
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
        const dialogHotelId = ref(null);
        const dialogReservationId = ref(null);
        const dialogReservationDtlId = ref(null);

        // Helper
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        };
        const formatDateTime = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
        const formatDateWithDay = (date) => {
            const options = { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' };
            const parsedDate = new Date(date);
            return `${parsedDate.toLocaleDateString(undefined, options)}`;
        };
        const formatCurrency = (value) => {
            if (value == null) return '';
            return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
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
            return emailPattern.test(email);            
        };
        const validatePhone = (phone) => {
            isValidPhone.value = phonePattern.test(phone);
            return phonePattern.test(phone);
        };
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
            // console.log('filterClients event');
            const query = event.query.toLowerCase();
            filteredClients.value = clients.value.filter((client) =>
                client.legal_or_natural_person === 'natural' && 
                (
                    (client.name && client.name.toLowerCase().includes(query)) ||
                    (client.name_kana && normalizeKana(client.name_kana).toLowerCase().includes(normalizeKana(query))) ||
                    (client.name_kanji && client.name_kanji.toLowerCase().includes(query))
                )
            );
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

        const generateAddonPreview = () => {
            // Check
            if(!selectedAddonOption.value){
                toast.add({ severity: 'warn', summary: '注意', detail: 'アドオン選択されていません。', life: 3000 }); 
                return
            }

            const foundAddon = addonOptions.value.find(addon => addon.id === selectedAddonOption.value);
            console.log('foundAddon:',foundAddon);
            const isHotelAddon = foundAddon.id.startsWith('H');
            console.log('selectedAddon:',selectedAddon.value);
            console.log('selectedAddonOption:', selectedAddonOption.value);            
            selectedAddon.value.push({
                addons_global_id: isHotelAddon ? null : foundAddon.id,
                addons_hotel_id: isHotelAddon ? foundAddon.id.replace('H', '') : null,
                hotel_id: foundAddon.hotel_id,
                name: foundAddon.name,
                price: foundAddon.price,
                quantity: selectedGroup.value ? selectedGroup.value.details[0].number_of_people : 1,
            });            
        };

        const deleteAddon = (addon) => {
            const index = selectedAddon.value.indexOf(addon);
            if (index !== -1) {
                selectedAddon.value.splice(index, 1);
            }
        };

        // Computed
        const allRoomsHavePlan = computed(() => {
            return groupedRooms.value.every(group => allHavePlan(group));
        });
        const reservationStatus = computed(() => {
            switch (editReservationDetails.value[0]?.status) {
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
                default:
                return '不明'; // Or any default value you prefer
            }
        });
/*
        const updatedDateTime = computed(() => {
            // console.log('updatedDateTime', editReservationDetails.value)
            return editReservationDetails.value.reduce((max, detail) => {
                const maxLogTime = new Date(Math.max(new Date(detail.reservation_log_time), new Date(detail.reservation_detail_log_time)));
                //console.log('max:', max);
                return maxLogTime > max ? maxLogTime : max;
            }, new Date(0));            
        });
*/        

        // Format
        const rowStyle = (data) => {
            const date = new Date(data.display_date);
            const day = date.getDay();
            if (day === 6) {
                return { backgroundColor: '#fcfdfe' };
            }
            if (day === 0) {
                return { backgroundColor: '#fcfcfe' };
            }
            
        };

        // Map group details with formatted date
        const formattedGroupDetails = (details) => {
            return details.map((item) => ({
                ...item,
                price: formatCurrency(item.price),
                display_date: formatDateWithDay(item.date),
            }));
        };
        
        const updatePlanAddOns = async () => {
            if (selectedPlan.value) {                
                const gid = selectedPlan.value?.plans_global_id ?? 0;
                const hid = selectedPlan.value?.plans_hotel_id ?? 0;
                const hotel_id = editReservationDetails.value[0]?.hotel_id ?? 0;


                try {
                    // Fetch add-ons from the store
                    await fetchPlanAddons(gid, hid, hotel_id);                    
                } catch (error) {
                    console.error('Failed to fetch plan add-ons:', error);
                    addons.value = [];                    
                }
            }
        };

        const updateReservationStatus = async (status) => {
            // console.log('updateReservationStatus');
            // console.log('allRoomsHavePlan:',allRoomsHavePlan.value);
            if (!allRoomsHavePlan.value) {                                
                toast.add({ 
                  severity: 'warn', 
                  summary: 'Warn', 
                  detail: '部屋の予約にプランを追加してください。', life: 3000 
                });
                return; 
            }         

            try {
                await setReservationStatus(status); // Call the setReservationStatus from your store
                // await fetchReservation(props.reservation_id); // Fetch the updated reservation details
            } catch (error) {
                console.error('Error updating and fetching reservation:', error);
                // Handle the error, e.g., show a toast message
            }
        };

        const deleteReservation = () => {
            const reservation_id = editReservationDetails.value[0].reservation_id;
            confirm.require({
                message: `保留中予約を削除してもよろしいですか?`,
                header: 'Delete Confirmation',                    
                icon: 'pi pi-info-circle',
                acceptClass: 'p-button-danger',
                acceptProps: {
                    label: '削除'
                },
                accept: () => {
                    deleteHoldReservation(reservation_id);                    
                    toast.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: `保留中予約削除されました。`,
                        life: 3000
                    });
                    setReservationId(null);
                    goToNewReservation();
                },
                rejectProps: {
                    label: 'キャンセル',
                    severity: 'secondary',
                    outlined: true
                },
                reject: () => {
                    toast.add({
                        severity: 'info',
                        summary: '削除キャンセル',
                        detail: '削除するのをキャンセルしました。',
                        life: 3000
                    });
                }
            });
        };

        const handleTabChange = async (newTabValue) => {

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
            roomsAvailableChanges.value = [];
            
            if(bulkEditDialogVisible.value){
                console.log('bulkEditDialogVisible is true');
                bulkEditDialogTab.value = newTabValue * 1;
                
                // Guest edit
                if(bulkEditDialogTab.value  === 2){
                    initializeGuests();
                    // console.log('Guest edit tab selected.');                
                }
                // Period change
                if(bulkEditDialogTab.value  === 4){                    
                    const hotelId = editReservationDetails.value[0].hotel_id;
                    console.log('selectedGroup', selectedGroup.value.room_id);
                    const roomId = selectedGroup.value.room_id;
                    newCheckIn.value = new Date(editReservationDetails.value[0].check_in);
                    newCheckOut.value = new Date(editReservationDetails.value[0].check_out);

                    const checkIn = formatDate(newCheckIn.value);
                    const checkOut = formatDate(newCheckOut.value);

                    const results = await getAvailableDatesForChange(hotelId, roomId, checkIn, checkOut);

                    if (results.earliestCheckIn) {
                        minCheckIn.value = new Date(results.earliestCheckIn);
                    } else {
                        minCheckIn.value = null; // Ensuring it's null when there's no value
                    }

                    if (results.latestCheckOut) {
                        maxCheckOut.value = new Date(results.latestCheckOut);
                    } else {
                        maxCheckOut.value = null; // Ensuring it's null when there's no value
                    }
                                    
                    // console.log('in',minCheckIn.value,'out',maxCheckOut.value);
                }
            }
            if(bulkEditReservationDialogVisible.value){
                console.log('bulkEditReservationDialogVisible is true');
                bulkEditReservationDialogTab.value = newTabValue * 1;
                // Period change
                if(bulkEditReservationDialogTab.value === 4){                    
                    const hotelId = editReservationDetails.value[0].hotel_id;
                    newCheckIn.value = new Date(editReservationDetails.value[0].check_in);
                    newCheckOut.value = new Date(editReservationDetails.value[0].check_out);

                    const checkIn = formatDate(newCheckIn.value);
                    const checkOut = formatDate(newCheckOut.value);

                    groupedRooms.value.every(async (room) =>{
                        const roomId = room.room_id;
                        const results = await getAvailableDatesForChange(hotelId, roomId, checkIn, checkOut);
                        
                        if (results.earliestCheckIn) {
                            const earliestCheckInDate = new Date(results.earliestCheckIn);
                            if (!minCheckIn.value || earliestCheckInDate > minCheckIn.value) {
                                minCheckIn.value = earliestCheckInDate;
                            }
                        }

                        if (results.latestCheckOut) {
                            const latestCheckOutDate = new Date(results.latestCheckOut);
                            if (!maxCheckOut.value || latestCheckOutDate < maxCheckOut.value) {
                                maxCheckOut.value = latestCheckOutDate;
                            }
                        }

                        // Store the results and room values in roomsAvailableChanges
                        roomsAvailableChanges.value.push({
                            roomId: roomId,
                            roomValues: room,
                            results: results
                        });
                        console.log('roomsAvailableChanges', roomsAvailableChanges.value);
                        console.log('Earliest Check-In:', minCheckIn.value, 'Latest Check-Out:', maxCheckOut.value);
                    });
                }
            }
        };

        const openReservationBulkEditDialog = async () => {
            await setReservationId(editReservationDetails.value[0].reservation_id);

            const hotelId = editReservationDetails.value[0].hotel_id;
            const startDate = editReservationDetails.value[0].check_in;
            const endDate = editReservationDetails.value[0].check_out;

            await fetchAvailableRooms(hotelId, startDate, endDate);
            await fetchPlansForHotel(editReservationDetails.value[0].hotel_id);
            // Addons
            addonOptions.value = await fetchAllAddons(hotelId);
            bulkEditReservationDialogTab.value = 0;
            bulkEditReservationDialogVisible.value = true;
        };

        const closeReservationBulkEditDialog = () => {
            bulkEditReservationDialogVisible.value = false;            
            
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
        }; 

        const openReservationDayDetailDialog = async (day) => {   
            
            await setReservationId(day.reservation_id);
            
            dialogHotelId.value = day.hotel_id;            
            dialogReservationId.value = day.reservation_id;
            dialogReservationDtlId.value = day.id;
            
            changeReservationDayDetailDialogVisible.value = true;
        };

        const closeChangeReservationDayDetailDialog = async () => {
            
            // dialogHotelId.value = null;
            // dialogReservationId.value = null;
            // dialogReservationDtlId.value = null;
            await fetchReservation(props.reservation_id);

            changeReservationDayDetailDialogVisible.value = false;
        };

        const openBulkEditDialog = async (group) => {
            const hotelId = editReservationDetails.value[0].hotel_id;
            const startDate = editReservationDetails.value[0].check_in;
            const endDate = editReservationDetails.value[0].check_out;

            await fetchAvailableRooms(hotelId, startDate, endDate);
            await fetchPlansForHotel(editReservationDetails.value[0].hotel_id);
            // Addons
            addonOptions.value = await fetchAllAddons(hotelId);
            selectedGroup.value = group;
            bulkEditDialogTab.value = 0;
            bulkEditDialogVisible.value = true;
            initializeGuests();
            fetchClients();
        };

        const closeBulkEditDialog = () => {
            bulkEditDialogVisible.value = false;
            
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

        const applyPlanChanges = async () => {
            // Map selectedDays to a set of day values for efficient comparison
            const selectedDayValues = new Set(selectedDays.value.map(day => day.value));

            // Filter selectedGroup.details based on the day of the week
            const filteredGroup = selectedGroup.value.details
                .filter(detail => {
                    const dayOfWeek = new Date(detail.date).toLocaleString('en-US', { weekday: 'short' }).toLowerCase();
                    return selectedDayValues.has(dayOfWeek); // Match with selectedDays
                })
                .map(detail => {
                    // If a plan is selected, update plans_global_id and plans_hotel_id
                    if (selectedPlan.value) {
                        return {
                            ...detail,
                            plans_global_id: selectedPlan.value.plans_global_id,
                            plans_hotel_id: selectedPlan.value.plans_hotel_id,
                            reservation_id: props.reservation_id,
                        };
                    }
                    return {
                        ...detail,
                        reservation_id: props.reservation_id,
                    };
                });
            // console.log('filteredGroup:',filteredGroup)

            // Prepare the data to be sent in the PUT request
            //const dataToUpdate = [];
            
            // Prepare the data to be sent in the PUT request
            const dataToUpdate = filteredGroup.map(group => {
                // Check if the number of people to move is 0 or equal to number of people in reservation
                if (numberOfPeopleToMove.value === 0 || numberOfPeopleToMove.value === group.number_of_people) {
                    return {
                        id: group.id, // The reservation detail id
                        hotel_id: group.hotel_id, // The hotel id
                        room_id: targetRoom.value ? targetRoom.value.value : group.room_id,
                        plans_global_id: group.plans_global_id, // Updated plans_global_id
                        plans_hotel_id: group.plans_hotel_id,
                        number_of_people: group.number_of_people, // Number of people
                        price: group.price === null ? 0 : group.price, // Updated price (if applicable)
                        addons: selectedAddon.value.map(addon => ({
                            id: addon.id,
                            addons_global_id: addon.addons_global_id,
                            addons_hotel_id: addon.addons_hotel_id,
                            plans_global_id: addon.plans_global_id,
                            plans_hotel_id: addon.plans_hotel_id,
                            price: addon.price,
                            quantity: addon.quantity
                        }))
                    };
                } else if (numberOfPeopleToMove.value < group.number_of_people) {
                    // Create the first updated entry for the current room with the reduced number of people
                    const updatedCurrentRoom = {
                        reservation_id: group.reservation_id, // The reservation id
                        id: group.id, // The reservation detail id
                        hotel_id: group.hotel_id, // The hotel id
                        date: group.date, // The date
                        room_id: group.room_id, // Current room stays as it is
                        plans_global_id: group.plans_global_id, // Updated plans_global_id
                        plans_hotel_id: group.plans_hotel_id, // Updated plans_hotel_id
                        number_of_people: group.number_of_people - numberOfPeopleToMove.value, // Reduce number of people in the current room
                        price: group.price === null ? 0 : group.price, // Updated price (if applicable)
                        addons: selectedAddon.value.map(addon => ({
                            id: addon.id,
                            addons_global_id: addon.addons_global_id,
                            addons_hotel_id: addon.addons_hotel_id,
                            plans_global_id: addon.plans_global_id,
                            plans_hotel_id: addon.plans_hotel_id,
                            price: addon.price,
                            quantity: addon.quantity
                        }))
                    };

                    // Create the second entry for the new room with numberOfPeopleToMove.value people
                    const newRoomEntry = {
                        reservation_id: group.reservation_id, // The reservation id
                        id: null, // This is a new entry, so no existing id
                        ogm_id: group.id,
                        hotel_id: group.hotel_id, // The hotel id
                        date: group.date, // The date
                        room_id: targetRoom.value ? targetRoom.value.value : group.room_id, // New room with targetRoom if available
                        plans_global_id: group.plans_global_id, // Use selected plan if available, else fallback to existing
                        plans_hotel_id: group.plans_hotel_id, // Use selected plan if available, else fallback to existing
                        number_of_people: numberOfPeopleToMove.value, // Number of people to move
                        price: group.price === null ? 0 : group.price, // Updated price (if applicable)
                        addons: selectedAddon.value.map(addon => ({
                            id: addon.id,
                            addons_global_id: addon.addons_global_id,
                            addons_hotel_id: addon.addons_hotel_id,
                            plans_global_id: addon.plans_global_id,
                            plans_hotel_id: addon.plans_hotel_id,
                            price: addon.price,
                            quantity: addon.quantity
                        }))
                    };
                    // Return both the updated current room and the new room
                    return [updatedCurrentRoom, newRoomEntry];                   
                }

                // Default case: Return the original room if no conditions match
                return {
                    reservation_id: group.reservation_id, // The reservation id
                    id: group.id, // The reservation detail id
                    hotel_id: group.hotel_id, // The hotel id
                    room_id: group.room_id, // The room id
                    date: group.date, // The date
                    plans_global_id: group.plans_global_id, // Updated plans_global_id
                    plans_hotel_id: group.plans_hotel_id, // Updated plans_hotel_id
                    number_of_people: group.number_of_people, // Number of people
                    price: group.price === null ? 0 : group.price, // Updated price (if applicable)
                    addons: selectedAddon.value.map(addon => ({
                        id: addon.id,
                        addons_global_id: addon.addons_global_id,
                        addons_hotel_id: addon.addons_hotel_id,
                        plans_global_id: addon.plans_global_id,
                        plans_hotel_id: addon.plans_hotel_id,
                        price: addon.price,
                        quantity: addon.quantity
                    }))
                };
            }).flat();

            // console.log('dataToUpdate', dataToUpdate);
            isUpdating.value = true; // Disable WebSocket updates

            try {
                for (const data of dataToUpdate) {
                    const authToken = localStorage.getItem('authToken');

                    if (data.id === null) {
                        // When `id` is null, make a POST request instead
                        const response = await fetch(`/api/reservation/update/details/`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${authToken}`, // Pass token for authentication
                                'Content-Type': 'application/json', // Ensure the body is JSON
                            },
                            body: JSON.stringify(data), // Send the data to create a new reservation
                        });

                        const newReservation = await response.json(); // Parse the response as JSON

                        if (!response.ok) {
                            throw new Error(`Error creating new reservation detail: ${newReservation.error || 'Unknown error'}`);
                        }
                        //console.log('Created New Reservation:', newReservation);
                    } else {
                        // For existing reservations, make a PUT request
                        const response = await fetch(`/api/reservation/update/details/${data.id}`, {
                            method: 'PUT',
                            headers: {
                                'Authorization': `Bearer ${authToken}`, // Pass token for authentication
                                'Content-Type': 'application/json', // Ensure the body is JSON
                            },
                            body: JSON.stringify(data), // Send the data to update
                        });

                        const updatedReservation = await response.json(); // Parse the response as JSON

                        if (!response.ok) {
                            throw new Error(`Error updating reservation detail: ${updatedReservation.error || 'Unknown error'}`);
                        }
                        //console.log('Updated Reservation:', updatedReservation);
                    }
                }
                
                isUpdating.value = false; // Re-enable WebSocket updates
                await fetchReservation(props.reservation_id);

                closeBulkEditDialog();

                // Provide feedback to the user
                toast.add({ severity: 'success', summary: 'Success', detail: '予約明細が更新されました。', life: 3000 });
                
            } catch (error) {
                console.error('Failed to apply changes:', error);                
                toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to apply changes.', life: 3000 });
            }
        };

        const applyPlanChangesToAll = async () => {
            // Map selectedDays to a set of day values for efficient comparison
            const selectedDayValues = new Set(selectedDays.value.map(day => day.value));

            const filteredGroupedRooms = groupedRooms.value.map(group => {
                return {
                    ...group,
                    details: group.details
                        .filter(detail => {
                            const dayOfWeek = new Date(detail.date)
                                .toLocaleString('en-US', { weekday: 'short' })
                                .toLowerCase();
                            return selectedDayValues.has(dayOfWeek); // Match with selectedDays
                        })
                        .map(detail => ({
                            ...detail,
                            plans_global_id: selectedPlan.value ? selectedPlan.value.plans_global_id : detail.plans_global_id,
                            plans_hotel_id: selectedPlan.value ? selectedPlan.value.plans_hotel_id : detail.plans_hotel_id,
                            reservation_id: props.reservation_id,
                        })),
                }
            });

            // console.log('Filtered Group:',filteredGroupedRooms);

            // Prepare the data to be sent in the PUT request
            const dataToUpdate = filteredGroupedRooms.flatMap(
                group => (group.details || []).map(
                    detail => ({
                    reservation_id: detail.reservation_id, // The reservation id
                    id: detail.id, // The reservation detail id
                    hotel_id: detail.hotel_id, // The hotel id
                    room_id: detail.room_id, // The room id
                    date: detail.date, // The date
                    plans_global_id: detail.plans_global_id, // Updated plans_global_id
                    plans_hotel_id: detail.plans_hotel_id, // Updated plans_hotel_id
                    number_of_people: detail.number_of_people, // Number of people
                    price: detail.price === null ? 0 : detail.price, // Updated price (if applicable)
                    addons: selectedAddon.value.map(
                            addon => ({
                                id: addon.id,
                                addons_global_id: addon.addons_global_id,
                                addons_hotel_id: addon.addons_hotel_id,
                                plans_global_id: addon.plans_global_id,
                                plans_hotel_id: addon.plans_hotel_id,
                                price: addon.price,
                                quantity: addon.quantity
                            })
                        )
                    })
                )
            );
            console.log('Data to Update:', dataToUpdate);

            isUpdating.value = true; // Disable WebSocket updates

            try {
                for (const data of dataToUpdate) {
                    const authToken = localStorage.getItem('authToken');

                    if (data.id === null) {
                        // When `id` is null, make a POST request instead
                        const response = await fetch(`/api/reservation/update/details/`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${authToken}`, // Pass token for authentication
                                'Content-Type': 'application/json', // Ensure the body is JSON
                            },
                            body: JSON.stringify(data), // Send the data to create a new reservation
                        });

                        const newReservation = await response.json(); // Parse the response as JSON

                        if (!response.ok) {
                            throw new Error(`Error creating new reservation detail: ${newReservation.error || 'Unknown error'}`);
                        }
                        //console.log('Created New Reservation:', newReservation);
                    } else {
                        // For existing reservations, make a PUT request
                        const response = await fetch(`/api/reservation/update/details/${data.id}`, {
                            method: 'PUT',
                            headers: {
                                'Authorization': `Bearer ${authToken}`, // Pass token for authentication
                                'Content-Type': 'application/json', // Ensure the body is JSON
                            },
                            body: JSON.stringify(data), // Send the data to update
                        });

                        const updatedReservation = await response.json(); // Parse the response as JSON

                        if (!response.ok) {
                            throw new Error(`Error updating reservation detail: ${updatedReservation.error || 'Unknown error'}`);
                        }
                        //console.log('Updated Reservation:', updatedReservation);
                    }
                }

                await fetchReservation(props.reservation_id);
                isUpdating.value = false; // Re-enable WebSocket updates

                closeReservationBulkEditDialog();

                // Provide feedback to the user
                toast.add({ severity: 'success', summary: 'Success', detail: '予約明細が更新されました。', life: 3000 });
                
            } catch (error) {
                console.error('Failed to apply changes:', error);                
                toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to apply changes.', life: 3000 });
            }
        };

        const applyRoomChanges = async () => {
            const filteredGroup = selectedGroup.value.details                
                .map(detail => {                    
                    return {
                        ...detail,
                        reservation_id: props.reservation_id,
                    };
                });
            // console.log('filteredGroup:',filteredGroup)

            // Prepare the data to be sent in the PUT request
            const dataToUpdate = filteredGroup.map(group => {
                // Check if the number of people to move is 0 or equal to number of people in reservation
                if (numberOfPeopleToMove.value === 0 || numberOfPeopleToMove.value === group.number_of_people) {
                    return {
                        id: group.id, // The reservation detail id
                        hotel_id: group.hotel_id, // The hotel id
                        room_id: targetRoom.value ? targetRoom.value.value : group.room_id,
                        plans_global_id: group.plans_global_id, // Updated plans_global_id
                        plans_hotel_id: group.plans_hotel_id,
                        number_of_people: group.number_of_people, // Number of people
                        price: group.price === null ? 0 : group.price, // Updated price (if applicable)
                        addons: selectedAddon.value.map(addon => ({
                            id: addon.id,
                            addons_global_id: addon.addons_global_id,
                            addons_hotel_id: addon.addons_hotel_id,
                            plans_global_id: addon.plans_global_id,
                            plans_hotel_id: addon.plans_hotel_id,
                            price: addon.price,
                            quantity: addon.quantity
                        }))
                    };
                } else if (numberOfPeopleToMove.value < group.number_of_people) {
                    // Create the first updated entry for the current room with the reduced number of people
                    const updatedCurrentRoom = {
                        reservation_id: group.reservation_id, // The reservation id
                        id: group.id, // The reservation detail id
                        hotel_id: group.hotel_id, // The hotel id
                        date: group.date, // The date
                        room_id: group.room_id, // Current room stays as it is
                        plans_global_id: group.plans_global_id, // Updated plans_global_id
                        plans_hotel_id: group.plans_hotel_id, // Updated plans_hotel_id
                        number_of_people: group.number_of_people - numberOfPeopleToMove.value, // Reduce number of people in the current room
                        price: group.price === null ? 0 : group.price, // Updated price (if applicable)
                        addons: selectedAddon.value.map(addon => ({
                            id: addon.id,
                            addons_global_id: addon.addons_global_id,
                            addons_hotel_id: addon.addons_hotel_id,
                            plans_global_id: addon.plans_global_id,
                            plans_hotel_id: addon.plans_hotel_id,
                            price: addon.price,
                            quantity: addon.quantity
                        }))
                    };

                    // Create the second entry for the new room with numberOfPeopleToMove.value people
                    const newRoomEntry = {
                        reservation_id: group.reservation_id, // The reservation id
                        id: null, // This is a new entry, so no existing id
                        ogm_id: group.id,
                        hotel_id: group.hotel_id, // The hotel id
                        date: group.date, // The date
                        room_id: targetRoom.value ? targetRoom.value.value : group.room_id, // New room with targetRoom if available
                        plans_global_id: group.plans_global_id, // Use selected plan if available, else fallback to existing
                        plans_hotel_id: group.plans_hotel_id, // Use selected plan if available, else fallback to existing
                        number_of_people: numberOfPeopleToMove.value, // Number of people to move
                        price: group.price === null ? 0 : group.price, // Updated price (if applicable)
                        addons: selectedAddon.value.map(addon => ({
                            id: addon.id,
                            addons_global_id: addon.addons_global_id,
                            addons_hotel_id: addon.addons_hotel_id,
                            plans_global_id: addon.plans_global_id,
                            plans_hotel_id: addon.plans_hotel_id,
                            price: addon.price,
                            quantity: addon.quantity
                        }))
                    };
                    // Return both the updated current room and the new room
                    return [updatedCurrentRoom, newRoomEntry];                   
                }
            }).flat();

            // console.log('dataToUpdate', dataToUpdate);
            isUpdating.value = true; // Disable WebSocket updates

            try {
                for (const data of dataToUpdate) {
                    const authToken = localStorage.getItem('authToken');

                    if (data.id === null) {
                        // When `id` is null, make a POST request instead
                        const response = await fetch(`/api/reservation/update/details/`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${authToken}`, // Pass token for authentication
                                'Content-Type': 'application/json', // Ensure the body is JSON
                            },
                            body: JSON.stringify(data), // Send the data to create a new reservation
                        });

                        const newReservation = await response.json(); // Parse the response as JSON

                        if (!response.ok) {
                            throw new Error(`Error creating new reservation detail: ${newReservation.error || 'Unknown error'}`);
                        }
                        //console.log('Created New Reservation:', newReservation);
                    } else {
                        // For existing reservations, make a PUT request
                        const response = await fetch(`/api/reservation/update/details/${data.id}`, {
                            method: 'PUT',
                            headers: {
                                'Authorization': `Bearer ${authToken}`, // Pass token for authentication
                                'Content-Type': 'application/json', // Ensure the body is JSON
                            },
                            body: JSON.stringify(data), // Send the data to update
                        });

                        const updatedReservation = await response.json(); // Parse the response as JSON

                        if (!response.ok) {
                            throw new Error(`Error updating reservation detail: ${updatedReservation.error || 'Unknown error'}`);
                        }
                        //console.log('Updated Reservation:', updatedReservation);
                    }
                }

                isUpdating.value = false; // Re-enable WebSocket updates
                await fetchReservation(props.reservation_id);

                closeBulkEditDialog();

                // Provide feedback to the user (optional)                
                toast.add({ severity: 'success', summary: 'Success', detail: '予約明細が更新されました。', life: 3000 });
                
            } catch (error) {
                console.error('Failed to apply changes:', error);                
                toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to apply changes.', life: 3000 });
            }
        }

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
                    summary: 'Warning',
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
                toast.add({ severity: 'warn', summary: 'Warning', detail: `重複宿泊者:${duplicatedGuest.value.name}が選択されました。`, life: 3000 });
                return;
            } else {                
                // console.log('No duplicates found, checking fields...');
                for (const guest of guests.value) {
                    if (guest.name) {
                        if(!guest.email && !guest.phone) {                        
                            toast.add({ severity: 'warn', summary: 'Warning', detail: `宿泊者: ${guest.name}にメールアドレスまたは電話番号を記入してください。`, life: 3000 });
                            return;                        
                        }
                        if(guest.email){
                            const emailValid = validateEmail(guest.email);                        
                            if (!emailValid) {
                                toast.add({ severity: 'warn', summary: 'Warning', detail: `宿泊者: ${guest.name}にメールアドレスの書式誤差がありました。`, life: 3000 });
                                return;
                            }
                        }
                        if(guest.phone){
                            const phoneValid = validatePhone(guest.phone);
                            if (!phoneValid) {
                                toast.add({ severity: 'warn', summary: 'Warning', detail: `宿泊者: ${guest.name}に電話番号の書式誤差がありました。`, life: 3000 });
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
                // console.log('dataToUpdate', dataToUpdate);
                isUpdating.value = true; // Disable WebSocket updates

                try {
                    const authToken = localStorage.getItem('authToken');
                    const response = await fetch(`/api/reservation/update/guest/${props.reservation_id}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${authToken}`, // Pass token for authentication
                            'Content-Type': 'application/json', // Ensure the body is JSON
                        },
                        body: JSON.stringify(dataToUpdate), 
                    });

                    const updatedReservation = await response.json();

                    if (!response.ok) {
                        throw new Error(`Error updating reservation guests: ${updatedReservation.error || 'Unknown error'}`);
                    }

                    isUpdating.value = false; // Re-enable WebSocket updates
                    await fetchReservation(props.reservation_id);

                    closeBulkEditDialog();

                    // Provide feedback to the user (optional)                
                    toast.add({ severity: 'success', summary: 'Success', detail: '予約明細が更新されました。', life: 3000 });
                } catch (err) {
                    console.error('Error during fetch:', err);
                    console.error('Failed to apply changes:', error);                
                    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to apply changes.', life: 3000 });
                }
            }
        };

        const applyDateChanges = async () => {
            console.log(newCheckIn.value, newCheckOut.value);
            // Checks            
            if (!newCheckIn.value) {
                toast.add({
                    severity: 'warn',
                    summary: 'Warning',
                    detail: `チェックイン日を指定してください。`,
                    life: 3000
                });
                return;
            }
            if (!newCheckOut.value) {
                toast.add({
                    severity: 'warn',
                    summary: 'Warning',
                    detail: `チェックアウト日を指定してください。`,
                    life: 3000
                });
                return;
            }
            if (newCheckOut.value <= newCheckIn.value) {
                toast.add({
                    severity: 'warn',
                    summary: 'Warning',
                    detail: `チェックアウト日がチェックイン日以前になっています。`,
                    life: 3000
                });
                return;
            }
            //newCheckIn.value = formatDate(newCheckIn.value);
            //newCheckOut.value = formatDate(newCheckOut.value);

            const id = editReservationDetails.value[0].reservation_id;
            const old_check_in = editReservationDetails.value[0].check_in;
            const old_check_out = editReservationDetails.value[0].check_out;
            const new_check_in = formatDate(new Date(newCheckIn.value));
            const new_check_out = formatDate(new Date(newCheckOut.value));
            const old_room_id = selectedGroup.value.room_id;
            const new_room_id = selectedGroup.value.room_id;
            const number_of_people = editReservationDetails.value[0].number_of_people;

            await setCalendarChange (id, old_check_in, old_check_out, new_check_in, new_check_out, old_room_id, new_room_id, number_of_people, 'solo');

            closeBulkEditDialog();

            toast.add({ severity: 'success', summary: 'Success', detail: '部屋の宿泊期間が更新されました。', life: 3000 });  
            
        }

        const applyDateChangesToAll = async () => {            
            // Checks            
            if (!newCheckIn.value) {
                toast.add({
                    severity: 'warn',
                    summary: 'Warning',
                    detail: `チェックイン日を指定してください。`,
                    life: 3000
                });
                return;
            }
            if (!newCheckOut.value) {
                toast.add({
                    severity: 'warn',
                    summary: 'Warning',
                    detail: `チェックアウト日を指定してください。`,
                    life: 3000
                });
                return;
            }
            if (newCheckOut.value <= newCheckIn.value) {
                toast.add({
                    severity: 'warn',
                    summary: 'Warning',
                    detail: `チェックアウト日がチェックイン日以前になっています。`,
                    life: 3000
                });
                return;
            }

            const new_check_in = formatDate(new Date(newCheckIn.value));
            const new_check_out = formatDate(new Date(newCheckOut.value));

            isUpdating.value = true; // Disable WebSocket updates

            for (const room of roomsAvailableChanges.value) {
                
                const id = room.roomValues.details[0].reservation_id;
                const old_check_in = room.roomValues.details[0].check_in;
                const old_check_out = room.roomValues.details[0].check_out;
                const old_room_id = room.roomId;
                const new_room_id = room.roomId;
                const number_of_people = room.roomValues.details[0].number_of_people;
                
                await setCalendarChange(id, old_check_in, old_check_out, new_check_in, new_check_out, old_room_id, new_room_id, number_of_people, 'bulk');
            }

            await fetchReservation(props.reservation_id);
            isUpdating.value = false; // Re-enable WebSocket updates

            closeReservationBulkEditDialog();

            toast.add({ severity: 'success', summary: 'Success', detail: '全ての部屋の宿泊期間が更新されました。', life: 3000 });  
            
        }

        const applyReservationRoomChanges = async () => {
            // console.log('Number of people to add:', numberOfPeopleToMove.value);
            // console.log('Selected room:', targetRoom.value);
            // console.log('Reservation id to copy:', props.reservation_id);

            if(numberOfPeopleToMove.value <= 0) {
                toast.add({ severity: 'warn', summary: 'Warning', detail: `少なくとも一人入力してください。`, life: 3000 });
                return;                        
            }
            if(targetRoom.value === null) {
                toast.add({ severity: 'warn', summary: 'Warning', detail: `部屋を選択してください。`, life: 3000 });
                return;                        
            }
            
            const data = {
                reservationId: props.reservation_id, 
                numberOfPeople: numberOfPeopleToMove.value, 
                roomId: targetRoom.value.value,
            }

            isUpdating.value = true; // Disable WebSocket updates

            try {
                const authToken = localStorage.getItem('authToken');
                const response = await fetch(`/api/reservation/add/room/`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`, // Pass token for authentication
                        'Content-Type': 'application/json', // Ensure the body is JSON
                    },
                    body: JSON.stringify(data), // Send the data to create a new reservation
                });

                const newReservation = await response.json(); // Parse the response as JSON

                if (!response.ok) {
                    throw new Error(`Error creating new reservation detail: ${newReservation.error || 'Unknown error'}`);
                }                

                isUpdating.value = false; // Re-enable WebSocket updates
                await fetchReservation(props.reservation_id);

                closeBulkEditRoomDialog();
                
                toast.add({ severity: 'success', summary: 'Success', detail: '部屋追加されました。', life: 3000 });   
            } catch (error) {
                
            }
        };

        const deleteRoom = async (group) => {    

            const room = {
                hotelId: group.details[0].hotel_id,
                roomId: group.details[0].room_id,
                reservationId: group.details[0].reservation_id,
                numberOfPeople: group.details[0].number_of_people,
            }

            const response = await deleteReservationRoom(group.details[0].reservation_id, room);                        
            closeBulkEditDialog();

            // Provide feedback to the user
            toast.add({ severity: 'success', summary: 'Success', detail: '予約明細が更新されました。', life: 3000 });
        };

        const changeGuestNumber = async (group, mode) => {
            // Add operation_mode to each detail in the group
            group.details.forEach(detail => {
                detail.operation_mode = mode === 'add' ? 1 : -1;
            });

            try {
                const response = await changeReservationRoomGuestNumber(group.details[0].reservation_id, group);

                // Provide feedback to the user
                toast.add({ severity: 'success', summary: 'Success', detail: '予約明細が更新されました。', life: 3000 });
            } catch (error) {
                console.error('Error updating reservation details:', error);
                toast.add({ severity: 'error', summary: 'Error', detail: '予約明細の更新に失敗しました。', life: 3000 });
            }            
        };

        const openChangeClientDialog = () => {
            changeClientDialogVisible.value = true;
        };

        const closeChangeClientDialog = () => {
            changeClientDialogVisible.value = false;
        };

        const openBulkEditRoomDialog = async () => {
            const hotelId = editReservationDetails.value[0].hotel_id;
            const startDate = editReservationDetails.value[0].check_in;
            const endDate = editReservationDetails.value[0].check_out;

            await fetchAvailableRooms(hotelId, startDate, endDate);
            await fetchPlansForHotel(editReservationDetails.value[0].hotel_id);
            // Addons
            addonOptions.value = await fetchAllAddons(hotelId);
            bulkEditRoomDialogVisible.value = true;
        };

        const closeBulkEditRoomDialog = () => {
            bulkEditRoomDialogVisible.value = false;
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
        const allGroupsPeopleCountMatch = computed(() => {
            return groupedRooms.value.every(group => allPeopleCountMatch(group));
        });

        const goToNewReservation = () => {                
            setReservationId(null);                
            router.push({ name: 'ReservationsNew' });
        };

        // Group rooms by room_id and room_type
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

        // Fetch reservation details on mount
        onMounted(async () => {
            // console.log('Reservation ID provided:', props.reservation_id);
            await fetchReservation(props.reservation_id);
            
            // Establish Socket.IO connection
            socket.value = io(import.meta.env.VITE_BACKEND_URL);

            socket.value.on('connect', () => {
                 console.log('Connected to server');
            });

            socket.value.on('tableUpdate', async (data) => {
                // Prevent fetching if bulk update is in progress
                if (isUpdating.value) {
                    console.log('Skipping fetchReservation because update is still running');
                    return;
                }
                console.log('Reservation updated detected in ReservationEdit');
                // Web Socket fetchReservation                
                await fetchReservation(props.reservation_id);
            });
        });

        onUnmounted(() => {
            // Close the Socket.IO connection when the component is unmounted
            if (socket.value) {
                socket.value.disconnect();
            }
        });

        // Watch
        watch(() => props.reservation_id, async (newReservationId, oldReservationId) => {            
            if (newReservationId !== oldReservationId) {
                //console.log("reservation_id changed:", newReservationId);
                // await fetchReservation(newReservationId);
                // console.log('editReservationDetails.value[0].hotel_id:', editReservationDetails.value[0].hotel_id);
                
            }
        }, { deep: true });          
        watch(editReservationDetails, async (newValue, oldValue) => {
            if (newValue !== oldValue) {
                console.log('editReservationDetails changed:', newValue);  
                await setHotelId(editReservationDetails.value[0].hotel_id);              
                selectedClient.value = editReservationDetails.value[0].client_id;

                /*
                // IMPLEMENT:
                I need to run getAvailableDatesForChange for each room_id in editReservationDetails.value array and log each result
                getAvailableDatesForChange(hotelId, roomId, checkIn, checkOut)
                */

                //console.log('selectedClient.value:', selectedClient.value);
            }
        }, { deep: true });
        watch(groupedRooms, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                // console.log('groupedRooms changed:', newValue);

                if (newValue && newValue.length > 0) {                    

                    if(!selectedGroup){
                        // Try to find the updated group in newValue
                        const updatedGroup = newValue.find(group => 
                            group.room_id === selectedGroup.value.room_id && 
                            group.room_type === selectedGroup.value.room_type
                        );

                        if (updatedGroup) {
                            // console.log('selectedGroup updated');
                            selectedGroup.value = updatedGroup; // Update the selected group if found                            
                        } else {
                            // console.log('selectedGroup not selected or no longer exists');
                            selectedGroup.value = null; // Reset if the group no longer exists
                        }
                    }                    
                }  
            }
        }, { deep: true });
        watch(selectedGroup, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                // console.log('selectedGroup changed:', newValue);
                if (newValue && newValue.details && newValue.details.length > 0) {
                    
                }                
            }
        }, { deep: true });
        watch(plans, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                //console.log('plans changed:', newValue);
            }
        }, { deep: true });
        watch(selectedPlan, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                //console.log('selectedPlan changed:', newValue);
            }
        }, { deep: true });
        watch(selectedDays, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                //console.log('selectedDays changed:', newValue);
            }
        }, { deep: true });
        watch(addons, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                //console.log('addons changed:', newValue);
                
                // Add a 'quantity' field with default value 1 to each add-on
                selectedAddon.value = newValue.map(addon => ({
                    ...addon,                    
                    quantity: selectedGroup.value ? selectedGroup.value.details[0].number_of_people : 1
                }));
            }
        }, { deep: true });
        watch(selectedAddon, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                //console.log('selectedAddon changed:', newValue);
            }
        }, { deep: true });
        watch(targetRoom, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                //console.log('targetRoom changed:', newValue);
            }
        }, { deep: true });
        watch(numberOfPeopleToMove, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                //console.log('numberOfPeopleToMove changed:', newValue);
            }
        }, { deep: true });
        watch(selectedHotelId, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                // console.log('selectedHotelId changed:', newValue);
                /*
                // If another hotel is selected, go to a new reservation page (still needed?)
                if (newValue !== editReservationDetails.value[0]?.hotel_id) {
                    goToNewReservation();
                }
                */
                
            }
        }, { deep: true });
        watch(guests, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                // console.log('guests changed:', guests.value);
            }
        }, { immediate: true });

        return {  
            formatDateTime,  
            formatCurrency,  
            getAvailableDatesForChange,      
            editReservationDetails,
            groupedRooms,
            formattedGroupDetails,
            bulkEditDialogVisible,
            bulkEditDialogTab,
            changeClientDialogVisible,
            changeReservationDayDetailDialogVisible,
            bulkEditRoomDialogVisible,
            bulkEditReservationDialogVisible,
            bulkEditReservationDialogTab,
            selectedClient,
            selectedGroup,
            selectedPlan,
            selectedDays,
            selectedAddon,  
            addonOptions,
            selectedAddonOption,
            targetRoom,
            numberOfPeopleToMove,
            newCheckIn,
            newCheckOut,
            minCheckIn,
            maxCheckOut,
            roomsAvailableChanges,
            filteredRooms,
            guests,
            filteredClients,
            editingRows,
            genderOptions,
            emailPattern,
            isValidEmail,
            phonePattern,
            isValidPhone,
            dialogHotelId,
            dialogReservationId,
            dialogReservationDtlId,
            allRoomsHavePlan,
            reservationStatus,
/*          updatedDateTime,          */
            plans,
            daysOfWeek,
            availableRooms,
            rowStyle,
            updatePlanAddOns,
            updateReservationStatus,
            deleteReservation,
            handleTabChange,
            openReservationBulkEditDialog,
            closeReservationBulkEditDialog,
            openReservationDayDetailDialog,
            closeChangeReservationDayDetailDialog,
            openBulkEditDialog,
            closeBulkEditDialog,
            applyPlanChanges,
            applyPlanChangesToAll,
            applyRoomChanges,
            applyGuestChanges,
            applyDateChanges,
            applyDateChangesToAll,
            applyReservationRoomChanges,
            deleteRoom,
            changeGuestNumber,
            openChangeClientDialog,
            closeChangeClientDialog,
            openBulkEditRoomDialog,
            closeBulkEditRoomDialog,
            allHavePlan,
            allPeopleCountMatch,
            allGroupsPeopleCountMatch,
            validateEmail,
            validatePhone,
            filterClients,
            onClientSelect,     
            onClientChange, 
            generateAddonPreview,
            deleteAddon,
        };
    },    
};
</script>

<style scoped>
.saturday-row {
  background-color: rgba(0, 0, 255, 0.1); /* Light Blue */
}
</style>
