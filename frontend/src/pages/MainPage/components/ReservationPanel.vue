<template>
    <!-- Top Panel -->
    <div v-if="reservationStatus === '予約不可'" class="grid grid-cols-3 gap-2 gap-y-4 flex items-center">
        <div class="flex">
            <InputText type="text" v-model="reservationInfo.client_name" disabled
                style="background-color: transparent;" />
        </div>
        <div class="flex items-start mr-2 mb-2">
            <p class="font-bold">開始日：</p>
            <span>{{ reservationInfo.check_in }}</span>
        </div>
        <div class="flex items-start mr-2 mb-2">
            <p class="font-bold">終了日：</p>
            <span>{{ reservationInfo.check_out }}</span>
        </div>
        <div class="col-span-3">
            <p class="font-bold mb-1">備考：<span
                class="text-xs text-gray-400">(タブキーで編集確定)</span></p>
            <Textarea v-model="reservationInfo.comment"
                :disabled="reservationInfo.client_id !== '22222222-2222-2222-2222-222222222222'"
                @keydown="handleKeydown"
                :style="{ 'background-color': reservationInfo.client_id === '22222222-2222-2222-2222-222222222222' ? 'white' : 'transparent' }"
                fluid />
        </div>
    </div>
    <div v-else class="grid grid-cols-2 gap-2 gap-y-4">
        <div class="field flex flex-col">
            <div class="flex items-center justify-between mr-2 mb-2">
                <p class="font-bold">予約者：</p>
                <Button label="顧客変更" severity="help" icon="pi pi-pencil" @click="openChangeClientDialog" />

            </div>
            <InputText type="text" v-model="reservationInfo.client_name" disabled
                style="background-color: transparent;" />
        </div>
        <div class="field flex flex-col">
            <div v-if="reservationStatus === '保留中' || reservationStatus === '仮予約' || reservationStatus === '確定'">
                <div class="flex items-center justify-between mr-2 mb-2">
                    <p class="font-bold">宿泊者：</p>
                    <SplitButton label="予約操作" :model="actionOptions" icon="pi pi-cog" severity="help" class="ml-2"
                        @click="onActionClick" />
                </div>
            </div>
            <div v-else>
                <p class="font-bold mb-8">宿泊者：</p>
            </div>
            <div class="flex flex-wrap gap-2">
                <div>
                    <Button type="button" label="人数" icon="pi pi-user"
                        :badge="String(reservationInfo.reservation_number_of_people)" severity="contrast"
                        badgeSeverity="contrast" outlined />
                </div>
                <div>
                    <Button type="button" label="部屋数" icon="pi pi-box" :badge="String(groupedRooms.length)"
                        severity="contrast" badgeSeverity="contrast" outlined />
                </div>
                <div>
                    <Button type="button" label="泊数" icon="pi pi-calendar-minus" :badge="String(numberOfNights)"
                        severity="contrast" badgeSeverity="contrast" outlined />
                </div>
                <div>
                    <Button type="button" label="総泊数" icon="pi pi-calendar" :badge="String(numberOfNightsTotal)"
                        severity="contrast" badgeSeverity="contrast" outlined />
                </div>
            </div>
        </div>
        <div class="field flex flex-col">
            <div class="grid grid-cols-4 flex items-center">
                <p class="font-bold">チェックイン：</p>
                <span>
                    <i class="pi pi-arrow-down-right mr-1"></i>{{ reservationInfo.check_in }}
                </span>
                <div class="col-span-2">
                    <i class="pi pi-clock mx-1"></i>
                    <DatePicker id="datepicker-timeonly" v-model="checkInTime" @update:modelValue="checkInChange"
                        timeOnly style="width: 80px;" />
                </div>
                <p class="font-bold">チェックアウト：</p>
                <span>
                    <i class="pi pi-arrow-up-right mr-1"></i>{{ reservationInfo.check_out }}
                </span>
                <div class="col-span-2">
                    <i class="pi pi-clock mx-1"></i>
                    <DatePicker id="datepicker-timeonly" v-model="checkOutTime" @update:modelValue="checkOutChange"
                        timeOnly style="width: 80px;" />
                </div>
            </div>

        </div>
        <div class="field">
            <div class="flex justify-between items-center">
                <p class="font-bold flex items-center">
                    備考：
                    <span class="text-xs text-gray-400 ml-2">(タブキーで編集確定)</span>
                </p>
                <Button 
                    v-tooltip.top="'重要コメントとしてマーク'"
                    :class="{ 'p-button-warning': reservationInfo.has_important_comment }"
                    :icon="reservationInfo.has_important_comment ? 'pi pi-star-fill' : 'pi pi-star'"
                    @click="toggleImportantComment"
                    text
                    rounded
                    aria-label="重要コメントとしてマーク"
                />
            </div>
            <Textarea 
                v-model="reservationInfo.comment" 
                @keydown="handleKeydown" 
                :class="{ 'border-yellow-500 border-2': reservationInfo.has_important_comment }"
                class="w-full"
            />
        </div>

        <div class="field flex flex-col col-span-2">
            <Divider />
        </div>

        <div class="field flex flex-col col-span-2" v-if="isLongTermReservation">
            <span>
                <Button label="キャンセル発生日計算" icon="pi pi-calculator" class="p-button-text p-button-sm ml-2" @click="showCancellationCalculator = true" />
                からキャンセル料発生日の確認ができます。
                <i class="pi pi-info-circle ml-1" v-tooltip.top=cancellationFeeMessage></i>                
            </span>
        </div>
        <div class="field flex flex-col">
            <div class="items-center flex">
                <span class="font-bold">支払い：</span>
                <SelectButton v-model="paymentTimingSelected" :options="paymentTimingOptions"
                    optionLabel="label" optionValue="value" @change="updatePaymentTiming"
                    :disabled="reservationStatus === 'キャンセル'" />
            </div>
        </div>        
        <div class="field flex flex-col ">
            <div class="items-center flex">
                <span class="font-bold">種類：</span>
                <template v-if="reservationType === '通常予約' || reservationType === '社員'">
                    <SelectButton v-model="reservationTypeSelected" :options="reservationTypeOptions"
                        optionLabel="label" optionValue="value" @change="updateReservationType"
                        :disabled="reservationStatus === 'キャンセル'" />
                </template>
                <template v-else-if="reservationType === 'OTA' || reservationType === '自社WEB'">
                    <div class="text-left">
                        <Badge class="mr-1" severity="secondary">エージェント（{{ reservationType }}）</Badge>{{
                            reservationInfo.agent }} <br>
                        <Badge class="mr-1" severity="secondary">予約番号</Badge>{{ reservationInfo.ota_reservation_id }}
                    </div>
                </template>
                <template v-else>
                    <span>{{ reservationType }}</span>
                </template>
            </div>
        </div>
        <div class="field flex flex-col" v-if="reservationType !== '社員'">
            <span class="items-center flex"><span class="font-bold">ステータス：</span> {{ reservationStatus }}</span>
        </div>        
        <div class="field flex flex-col col-span-2 relative">
            <div class="absolute top-0 right-0">
                <Button icon="pi pi-history" class="p-button-rounded p-button-text" @click="showHistoryDialog" />
            </div>

            <ConfirmDialog group="delete"></ConfirmDialog>
            <ConfirmDialog group="revert"></ConfirmDialog>
            <ConfirmDialog group="cancel"></ConfirmDialog>
            <ConfirmDialog group="recovery"></ConfirmDialog>

            <!-- Delete button for employee reservations (always shown when status is 保留中) -->
            <div v-if="reservationType === '社員' && reservationStatus === '確定'" class="grid grid-cols-4 gap-x-6">
                <div class="field flex flex-col">
                    <Button label="社員予約を削除" severity="danger" fluid @click="deleteReservation" :loading="isSubmitting" :disabled="isSubmitting" />
                </div>
            </div>

            <!-- Regular status buttons (hidden for employee reservations) -->
            <div v-if="reservationType !== '社員'" class="grid grid-cols-4 gap-x-6">
                <div v-if="reservationStatus === '保留中' || reservationStatus === '確定'" class="field flex flex-col">
                    <Button label="仮予約として保存" severity="info" :disabled="!allRoomsHavePlan || isSubmitting"
                        @click="updateReservationStatus('provisory')" :loading="isSubmitting" />
                </div>
                <div v-if="reservationStatus === '保留中' || reservationStatus === '仮予約'" class="field flex flex-col">
                    <Button label="確定予約として保存" severity="success" :disabled="!allRoomsHavePlan || isSubmitting"
                        @click="updateReservationStatus('confirmed')" :loading="isSubmitting" />
                </div>
                <div v-if="reservationStatus === '確定'" class="field flex flex-col">
                    <Button label="チェックイン" severity="success" icon="pi pi-sign-in" fluid
                        @click="updateReservationStatus('checked_in')" :loading="isSubmitting" :disabled="isSubmitting" />
                </div>
                <div v-if="reservationStatus === 'チェックイン'" class="field flex flex-col">
                    <Button label="確定に戻す" severity="info" icon="pi pi-undo" fluid
                        @click="updateReservationStatus('confirmed')" :loading="isSubmitting" :disabled="isSubmitting" />
                </div>
                <div v-if="reservationStatus === 'チェックイン'" class="field flex flex-col">
                    <Button label="チェックアウト" severity="warn" icon="pi pi-eject" fluid
                        @click="updateReservationStatus('checked_out')" :loading="isSubmitting" :disabled="isSubmitting" />
                </div>
                <div v-if="reservationStatus === '仮予約' || reservationStatus === '確定'" class="field flex flex-col">
                    <Button label="キャンセル" severity="contrast" :disabled="!allRoomsHavePlan || isSubmitting" @click="handleCancel" :loading="isSubmitting" />
                </div>
                <div v-if="reservationStatus === 'キャンセル'" class="field flex flex-col">
                    <Button label="キャンセル復活" severity="secondary" raised @click="updateReservationStatus('confirmed')" :loading="isSubmitting" :disabled="isSubmitting" />
                </div>
                <div v-if="reservationStatus === '保留中'" class="field flex flex-col">
                    <Button :label="'保留中予約を削除'" severity="danger" fluid @click="deleteReservation" :loading="isSubmitting" :disabled="isSubmitting" />
                </div>
            </div>
        </div>
    </div>

    <!-- Cancel Date Dialog -->
    <Dialog v-model:visible="showDateDialog" header="日付を選択" modal>
        <p>何日からキャンセル料が発生しますか？</p>
        <DatePicker v-model="cancelStartDate" showIcon fluid iconDisplay="input" showOnFocus
            :minDate="cancelMinDate || undefined" :maxDate="cancelMaxDate || undefined" dateFormat="yy-mm-dd" />
        <template #footer>
            <Button label="全日" severity="warn" icon="pi pi-calendar-times"
                @click="updateReservationStatus('cancelled', 'full-fee')" :loading="isSubmitting" :disabled="isSubmitting" />
            <Button label="キャンセル適用" icon="pi pi-check" @click="confirmPartialCancel" :loading="isSubmitting" :disabled="isSubmitting" />
        </template>
    </Dialog>

    <!-- Change Client Dialog -->
    <Dialog v-model:visible="visibleClientChangeDialog" :header="'顧客変更'" :closable="true" :modal="true"
        :style="{ width: '60vw' }">
        <ReservationClientEdit v-if="selectedClient" :client_id="selectedClient" />
        <template #footer>
            <Button label="閉じる" icon="pi pi-times" class="p-button-danger p-button-text p-button-sm" text
                @click="closeChangeClientDialog" :loading="isSubmitting" :disabled="isSubmitting" />
        </template>
    </Dialog>

    <!-- Change Rooms Dialog -->
    <Dialog v-model:visible="visibleAddRoomDialog" header="予約一括編集" :modal="true"
        :breakpoints="{ '960px': '75vw', '640px': '100vw' }" style="width: 50vw">
        <div class="p-fluid">
            <Tabs value="0">
                <TabList>
                    <Tab value="0">部屋追加</Tab>
                </TabList>

                <TabPanels>
                    <!-- Tab 1: Rooms -->
                    <TabPanel value="0">
                        <h4 class="mt-4 mb-3 font-bold">部屋追加</h4>

                        <div class="grid grid-cols-2 gap-2">
                            <div class="field mt-6 col-span-1">
                                <FloatLabel>
                                    <InputNumber id="move-people" v-model="numberOfPeopleToMove" :min="0" fluid />
                                    <label for="move-people">人数</label>
                                </FloatLabel>
                            </div>
                            <div class="field mt-6 col-span-1">
                                <FloatLabel>
                                    <Select id="move-room" v-model="targetRoom" :options="filteredRooms"
                                        optionLabel="label" showClear fluid />
                                    <label for="move-room">部屋を追加</label>
                                </FloatLabel>
                            </div>
                        </div>
                    </TabPanel>
                </TabPanels>
            </Tabs>

        </div>
        <template #footer>
            <Button label="追加" icon="pi pi-check" class="p-button-success p-button-text p-button-sm"
                @click="applyReservationRoomChanges" :loading="isSubmitting" :disabled="isSubmitting" />
            <Button label="キャンセル" icon="pi pi-times" class="p-button-danger p-button-text p-button-sm" text
                @click="closeAddRoomDialog" :loading="isSubmitting" :disabled="isSubmitting" />
        </template>
    </Dialog>

    <!-- Reservation Edit Dialog -->
    <Dialog v-model:visible="visibleReservationBulkEditDialog" header="全部屋一括編集" :modal="true"
        :breakpoints="{ '960px': '75vw', '640px': '100vw' }" style="width: 50vw">
        <div class="p-fluid">
            <Tabs value="0" @update:value="handleTabChange">
                <TabList>
                    <Tab value="0">プラン適用</Tab>
                    <Tab v-if="reservationStatus === '保留中' || reservationStatus === '仮予約' || reservationStatus === '確定'"
                        value="4">期間</Tab>
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
                                                <Select id="bulk-plan" v-model="selectedPlan" :options="plans"
                                                    optionLabel="name" showClear fluid @change="updatePlanAddOns" />
                                                <label for="bulk-plan">プラン選択</label>
                                            </FloatLabel>
                                        </div>
                                        <div class="col-span-2">
                                            <ToggleButton v-model="isPatternInput" :onLabel="'パターン'" :offLabel="'手動入力'"
                                                fluid />
                                        </div>
                                    </div>
                                    <div class="field mt-6">
                                        <FloatLabel>
                                            <MultiSelect v-model="selectedDays" :options="daysOfWeek"
                                                optionLabel="label" fluid :maxSelectedLabels="3" />
                                            <label>曜日</label>
                                        </FloatLabel>
                                    </div>
                                </div>
                                <!-- Plan pattern selection -->
                                <div v-if="isPatternInput">
                                    <div class="grid grid-cols-6 mt-8">
                                        <div class="col-span-4 mr-2">
                                            <FloatLabel>
                                                <Select v-model="selectedPattern" id="bulk-pattern" :options="patterns"
                                                    fluid @change="updatePattern">
                                                    <template #value="slotProps">
                                                        <div v-if="slotProps.value">
                                                            <div class="mr-2">{{ slotProps.value.name }} </div>
                                                            <Badge severity="secondary">{{ slotProps.value.template_type
                                                                === 'global' ? 'グローバル' : 'ホテル' }}</Badge>
                                                        </div>
                                                        <div v-else>
                                                            パターン選択
                                                        </div>
                                                    </template>
                                                    <template #option="slotProps">
                                                        <div class="flex items-center">
                                                            <div class="mr-2">{{ slotProps.option.name }} </div>
                                                            <Badge severity="secondary">{{
                                                                slotProps.option.template_type === 'global' ? 'グローバル' :
                                                                    'ホテル' }}</Badge>
                                                        </div>
                                                    </template>
                                                </Select>
                                                <label for="bulk-pattern">パターン選択</label>
                                            </FloatLabel>
                                        </div>
                                        <div class="col-span-2">
                                            <ToggleButton v-model="isPatternInput" :onLabel="'パターン'" :offLabel="'手動入力'"
                                                fluid />
                                        </div>
                                        <div v-for="day in daysOfWeek" :key="day.value" class="col-span-3 mt-4 mr-2">
                                            <div class="mt-4 mr-2">
                                                <FloatLabel>
                                                    <Select v-model="dayPlanSelections[day.value]" :options="plans"
                                                        optionLabel="name" optionValue="plan_key" class="w-full" />
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
                                            <Select v-model="selectedAddonOption" :options="addonOptions"
                                                optionLabel="addon_name" optionValue="id" showClear fluid />
                                            <label>アドオン選択</label>
                                        </FloatLabel>
                                    </div>
                                    <div class="field col mt-8 ml-2">
                                        <Button label="追加" @click="generateAddonPreview" :loading="isSubmitting" :disabled="isSubmitting" />
                                    </div>
                                </div>

                                <Divider />

                                <div class="field mt-6">
                                    <DataTable :value="selectedAddon" class="p-datatable-sm">
                                        <Column field="addon_name" header="アドオン名" style="width:40%" />
                                        <Column field="quantity" header="数量" style="width:20%">
                                            <template #body="slotProps">
                                                <InputNumber v-model="slotProps.data.quantity" :min="0"
                                                    placeholder="数量を記入" fluid />
                                            </template>
                                        </Column>
                                        <Column field="price" header="価格" style="width:20%">
                                            <template #body="slotProps">
                                                <InputNumber v-model="slotProps.data.price" :min="0" placeholder="価格を記入"
                                                    fluid />
                                            </template>
                                        </Column>
                                        <Column header="操作" style="width:10%">
                                            <template #body="slotProps">
                                                <Button icon="pi pi-trash"
                                                    class="p-button-text p-button-danger p-button-sm"
                                                    @click="deleteAddon(slotProps.data)" :loading="isSubmitting" :disabled="isSubmitting" />
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
                                        <span>チェックイン：{{ reservationInfo.check_in }}</span>
                                    </div>
                                    <div>
                                        <span>チェックアウト：{{ reservationInfo.check_out }}</span>
                                    </div>
                                    <div>
                                        <span>宿泊者：{{ reservationInfo.reservation_number_of_people }}</span>
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
                                    <DatePicker id="checkin" v-model="newCheckIn" :showIcon="true"
                                        :minDate="minCheckIn || undefined" :maxDate="maxCheckOut || undefined"
                                        iconDisplay="input" dateFormat="yy-mm-dd" :selectOtherMonths="true" fluid />
                                </FloatLabel>
                            </div>
                            <div>
                                <FloatLabel>
                                    <label for="checkout">チェックアウト</label>
                                    <DatePicker id="checkout" v-model="newCheckOut" :showIcon="true"
                                        :minDate="minCheckIn || undefined" :maxDate="maxCheckOut || undefined"
                                        iconDisplay="input" dateFormat="yy-mm-dd" :selectOtherMonths="true" fluid />
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
                                        <p class="text-center">{{ change.roomValues.details[0].room_type_name + ' ' +
                                            change.roomValues.details[0].room_number }}</p>
                                        <p class="text-center"
                                            :class="{ 'text-xs text-center': !change.results.earliestCheckIn }">
                                            {{ change.results.earliestCheckIn ? change.results.earliestCheckIn : '制限なし'
                                            }}
                                        </p>
                                        <p class="text-center"
                                            :class="{ 'text-xs text-center': !change.results.latestCheckOut }">
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
            <Button v-if="tabsReservationBulkEditDialog === 0 && !isPatternInput" label="適用" icon="pi pi-check"
                class="p-button-success p-button-text p-button-sm" @click="applyPlanChangesToAll" :loading="isSubmitting" :disabled="isSubmitting" />
            <Button v-if="tabsReservationBulkEditDialog === 0 && isPatternInput" label="適用" icon="pi pi-check"
                class="p-button-success p-button-text p-button-sm" @click="applyPatternChangesToAll" :loading="isSubmitting" :disabled="isSubmitting" />
            <Button v-if="tabsReservationBulkEditDialog === 4" label="適用" icon="pi pi-check"
                class="p-button-success p-button-text p-button-sm" @click="applyDateChangesToAll" :loading="isSubmitting" :disabled="isSubmitting" />

            <Button label="キャンセル" icon="pi pi-times" class="p-button-danger p-button-text p-button-sm" text
                @click="closeReservationBulkEditDialog" :loading="isSubmitting" :disabled="isSubmitting" />
        </template>
    </Dialog>

    <!-- Reservation Edit History -->
    <Dialog v-model:visible="historyDialogVisible" header="編集履歴" :modal="true" :dismissableMask="true"
        :style="{ width: '80vw', 'max-height': '80vh', 'overflow-y': 'auto' }">
        <ReservationHistory v-if="props.reservation_id" :reservation_id="props.reservation_id" />
    </Dialog>

    <!-- ReservationCopy dialog -->
    <Dialog v-model:visible="showCopyDialog" header="予約を複製"
        :style="{ width: '50vw', 'max-height': '80vh', 'overflow-y': 'auto' }" modal>
        <ReservationCopyDialog :reservation_id="props.reservation_id" @close="showCopyDialog = false" />
    </Dialog>

    <CancellationCalculatorDialog 
        v-model:visible="showCancellationCalculator" 
        :reservationDetails="reservation_details" 
        v-if="reservation_details?.length > 0"
    />
</template>

<script setup>
// Vue
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();

import ReservationClientEdit from '@/pages/MainPage/components/ReservationClientEdit.vue';
import ReservationHistory from '@/pages/MainPage/components/ReservationHistory.vue';
import ReservationCopyDialog from '@/pages/MainPage/components/Dialogs/ReservationCopyDialog.vue';
import CancellationCalculatorDialog from '@/pages/MainPage/components/Dialogs/CancellationCalculatorDialog.vue';

// Primevue
import { useToast } from 'primevue/usetoast';
const toast = useToast();
import { useConfirm } from "primevue/useconfirm";
// Assign unique group names to each confirm instance
const confirm = useConfirm();
import {
    Card, Dialog, Tabs, TabList, Tab, TabPanels, TabPanel, DataTable, Column, InputNumber, InputText, Textarea, Select, MultiSelect, DatePicker, FloatLabel, SelectButton, Button, ToggleButton, Badge, Divider, ConfirmDialog, SplitButton
} from 'primevue';

const props = defineProps({
    reservation_id: {
        type: String,
        required: true,
    },
    reservation_details: {
        type: [Object],
        required: true,
    },
});

//Stores
import { useReservationStore } from '@/composables/useReservationStore';
const { setReservationId, setReservationType, setReservationStatus, setReservationDetailStatus, setRoomPlan, setRoomPattern, 
    deleteHoldReservation, availableRooms, fetchAvailableRooms, addRoomToReservation, getAvailableDatesForChange, setCalendarChange, 
    setReservationComment, setReservationImportantComment, setReservationTime, setPaymentTiming } = useReservationStore();
import { usePlansStore } from '@/composables/usePlansStore';
const { plans, addons, patterns, fetchPlansForHotel, fetchPlanAddons, fetchAllAddons, fetchPatternsForHotel } = usePlansStore();

const reservationTypeSelected = ref(null);
const reservationTypeOptions = computed(() => {
    return [
        { label: '通常予約', value: 'default' },
        { label: '社員', value: 'employee' },
    ];
});

const paymentTimingSelected = ref(null);
const paymentTimingOptions = computed(() => {
    return [
        { label: '未設定', value: 'not_set' },
        { label: '事前決済', value: 'prepaid' },
        { label: '現地決済', value: 'on-site' },
        { label: '後払い', value: 'postpaid' },
    ];
});

const isSubmitting = ref(false);

const updatePaymentTiming = async (event) => {
    try {
        const selectedOption = event.value;
        await setPaymentTiming(selectedOption);
        toast.add({
            severity: 'success',
            summary: '成功',
            detail: '支払いタイミングが更新されました。',
            life: 3000
        });
    } catch (error) {
        console.error('Error updating payment timing:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: '支払いタイミングの更新に失敗しました。',
            life: 3000
        });
    }
};

const toggleImportantComment = async () => {
    try {
        const hotelId = reservationInfo.value.hotel_id;
        const newValue = !reservationInfo.value.has_important_comment;
        await setReservationImportantComment(
            props.reservation_id,
            hotelId,
            newValue
        );
        
        // Update local state
        reservationInfo.value.has_important_comment = newValue;
        
        // Show feedback
        toast.add({
            severity: 'success',
            summary: '成功',
            detail: newValue ? '重要コメントとしてマークしました' : '重要コメントのマークを解除しました',
            life: 3000
        });
    } catch (error) {
        console.error('Error updating important comment status:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: '重要コメントの更新に失敗しました',
            life: 3000
        });
    }
};

// Helper
const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};
const formatTime = (time) => {
    if (!time) return "";
    // Check if time is already a Date object
    if (time instanceof Date) {
        return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // If time is a string
    const date = new Date(`1970-01-01T${time}`);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
const reservationType = computed(() => {
    switch (reservationInfo.value.type) {
        case 'default':
            return '通常予約';
        case 'employee':
            return '社員';
        case 'ota':
            return 'OTA';
        case 'web':
            return '自社WEB';
        default:
            return '不明';
    }
});
const checkInTime = ref(null);
const checkOutTime = ref(null);
const groupedRooms = computed(() => {
    if (!reservationInfo.value) return [];

    const groups = {};

    props.reservation_details.forEach((item) => {
        const key = `${item.room_id}-${item.room_type}`;
        if (!groups[key]) {
            groups[key] = { room_id: item.room_id, room_type: item.room_type_name, details: [] };
        }
        groups[key].details.push(item);
    });

    return Object.values(groups);

});
const allRoomsHavePlan = computed(() => {
    // Check if every room in every group has a plan
    const allPlansSet = groupedRooms.value.every(group => allHavePlan(group));

    // Check if payment_timing is set
    const paymentTimingSet = reservationInfo.value.payment_timing && reservationInfo.value.payment_timing !== 'not_set';

    return allPlansSet && paymentTimingSet;
});
const allHavePlan = (group) => {
    return group.details.every(
        (detail) => detail.plans_global_id || detail.plans_hotel_id
    );
};
const allGroupsPeopleCountMatch = computed(() => {
    return groupedRooms.value.every(group => allPeopleCountMatch(group));
});
const allPeopleCountMatch = (group) => {
    return group.details.every(
        (detail) => detail.number_of_people === detail.reservation_clients.length
    );
};

const isLongTermReservation = computed(() => numberOfNights.value >= 30);

const cancellationFeeDate = computed(() => {
    if (!isLongTermReservation.value) return null;
    const checkInDate = new Date(reservationInfo.value.check_in);
    checkInDate.setDate(checkInDate.getDate() - 30);
    return checkInDate;
});

const cancellationFeeMessage = computed(() => {
    if (!cancellationFeeDate.value) return '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const feeDate = new Date(cancellationFeeDate.value);
    feeDate.setHours(0, 0, 0, 0);

    const formattedFeeDate = formatDate(feeDate);

    return `キャンセルポリシーは予約の規模に応じて、「〇日前まで」であればキャンセル料が発生しないように設定できます。`;
    
});

const numberOfNights = ref(0);
const numberOfNightsTotal = ref(0);
// Reservation Type
const updateReservationType = async (event) => {

    if (reservationStatus.value === 'キャンセル') {
        toast.add({ severity: 'error', summary: 'エラー', detail: 'キャンセル済みの予約の種類は変更できません', life: 3000 });
        // Reset to original value
        reservationTypeSelected.value = reservationInfo.value.type;
        return;
    }

    try {
        const selectedOption = event.value;
        const currentType = reservationType.value;

        // Store the current value to revert if needed
        const previousValue = reservationTypeSelected.value;

        // If changing from employee to default, validate that all rooms have plans
        if (currentType === '社員' && selectedOption === 'default') {
            if (!allRoomsHavePlan.value) {
                // Use $nextTick to ensure the DOM updates after the current tick
                await nextTick();
                // Force update the selected value
                reservationTypeSelected.value = 'employee';

                toast.add({
                    severity: 'error',
                    summary: 'エラー',
                    detail: '通常予約に変更するには、予約の支払いの設定及びすべての部屋にプランを設定してください。',
                    life: 5000
                });
                return;
            }
        }

        try {
            await setReservationType(selectedOption);
            // Update the local state on success
            reservationType.value = selectedOption === 'employee' ? '社員' : '通常予約';

            toast.add({
                severity: 'success',
                summary: '成功',
                detail: '予約種類が更新されました。',
                life: 3000
            });
        } catch (error) {
            // Revert to previous value on error
            reservationTypeSelected.value = previousValue;
            throw error;
        }

    } catch (error) {
        console.error('Error updating reservation type:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: '予約タイプの更新に失敗しました。',
            life: 3000
        });
    }
};

// Status Buttons
const showDateDialog = ref(false);
const cancelStartDate = ref(null);
const cancelMinDate = ref(null);
const cancelMaxDate = ref(null);
const cancelledIds = computed(() => {
    return props.reservation_details
        .filter(detail => new Date(detail.date) >= cancelStartDate.value) // Filter by date >= cancelStartDate
        .map(detail => ({
            id: detail.id,
            hotel_id: detail.hotel_id,
            date: detail.date
        }));
});
const updateReservationStatus = async (status, type = null) => {
    if (!allRoomsHavePlan.value) {
        toast.add({
            severity: 'warn',
            summary: '警告',
            detail: '予約の支払いの設定及び部屋の予約にプランを追加してください。', life: 3000
        });
        return;
    }

    // Specific confirmation for Checked In -> Confirmed
    if (reservationStatus.value === 'チェックイン' && status === 'confirmed') {
        confirm.require({
            group: 'revert',
            message: 'チェックイン済みの予約を確定済みに戻しますか？',
            header: 'ステータス変更確認',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: '変更する',
            rejectLabel: 'キャンセル',
            acceptClass: 'p-button-warning',
            rejectClass: 'p-button-secondary p-button-outlined',
            accept: async () => {
                try {
                    await setReservationStatus(status);
                    toast.add({ severity: 'success', summary: '成功', detail: '予約ステータスが更新されました。', life: 3000 });
                } catch (error) {
                    console.error('Error updating reservation status:', error);
                    toast.add({ severity: 'error', summary: 'エラー', detail: '予約ステータスの更新に失敗しました。', life: 3000 });
                }

            },
            reject: () => {
                toast.add({ severity: 'info', summary: 'キャンセル', detail: 'ステータス変更はキャンセルされました。', life: 3000 });

            }
        });
        return; // Stop further execution for this specific case
    }

    // Check if reservation is being recovered from cancellation
    if (reservationStatus.value === 'キャンセル') {
        // Check availability for each detail in groupedRooms
        let allRoomsAvailable = true;
        for (const group of groupedRooms.value) {
            for (const detail of group.details) {
                const hotelId = detail.hotel_id;
                const roomId = detail.room_id;
                const checkIn = detail.date;

                // Calculate checkOut as checkIn + 1 day
                const checkInDate = new Date(checkIn);
                const checkOutDate = new Date(checkInDate);
                checkOutDate.setDate(checkOutDate.getDate() + 1);
                const checkOut = checkOutDate.toISOString().split('T')[0];

                try {
                    const results = await getAvailableDatesForChange(hotelId, roomId, checkIn, checkOut);
                    if (!results) {
                        allRoomsAvailable = false;
                        // console.log(`Room ${roomId} on ${checkIn} is not available (no results).`);
                        break;
                    }

                    let isAvailable = true;

                    if (results.earliestCheckIn) {
                        if (checkIn < results.earliestCheckIn) {
                            isAvailable = false;
                        }
                    }
                    if (results.latestCheckOut) {
                        if (checkIn === results.latestCheckOut) {
                            isAvailable = false;
                        }
                    }
                    if (!isAvailable) {
                        allRoomsAvailable = false;
                        // console.log(`Room ${roomId} on ${checkIn} is not in available range.`);
                        break;
                    }
                } catch (error) {
                    allRoomsAvailable = false;
                    console.error(`Error checking availability for room ${roomId} on ${checkIn}:`, error);
                    break;
                }
            }
            if (!allRoomsAvailable) {
                break; // Stop loop, one or more rooms are unavailable.
            }
        }
        if (!allRoomsAvailable) {
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: '一部の部屋は復活できません。',
                life: 3000,
            });
            return; // Don't proceed with recovery
        }

        confirm.require({
            group: 'recovery',
            message: `キャンセルされた予約を復活してもよろしいですか?`,
            header: '復活確認',
            icon: 'pi pi-info-circle',
            acceptClass: 'p-button-warn',
            acceptProps: {
                label: '復活'
            },
            rejectProps: {
                label: 'キャンセル',
                severity: 'secondary',
                outlined: true,
                icon: 'pi pi-times'
            },
            accept: () => {
                setReservationStatus(status);
                toast.add({
                    severity: 'success',
                    summary: '成功',
                    detail: `復活されました。`,
                    life: 3000
                });

            },
            reject: () => {

            }
        });
    } else {
        if (!type) {
            try {
                await setReservationStatus(status);
            } catch (error) {
                console.error('Error updating and fetching reservation:', error);
            }
        } else {
            try {
                await setReservationStatus(type);
            } catch (error) {
                console.error('Error updating and fetching reservation:', error);
            }
        }
    }

    showDateDialog.value = false;

};
const deleteReservation = () => {
    const hotel_id = reservationInfo.value.hotel_id;
    const reservation_id = reservationInfo.value.reservation_id;

    confirm.require({
        group: 'delete',
        message: `保留中予約を削除してもよろしいですか?`,
        header: '削除確認',
        icon: 'pi pi-info-circle',
        acceptClass: 'p-button-danger',
        acceptProps: {
            label: '削除',
            loading: isSubmitting.value
        },
        rejectProps: {
            label: 'キャンセル',
            severity: 'secondary',
            outlined: true,
            icon: 'pi pi-times',
            disabled: isSubmitting.value
        },
        accept: async () => {
            isSubmitting.value = true;
            try {
                await deleteHoldReservation(hotel_id, reservation_id);
                toast.add({
                    severity: 'success',
                    summary: '成功',
                    detail: `保留中予約が削除されました。`,
                    life: 3000
                });
            } catch (e) {
                // Always show Japanese warning for not found/404
                toast.add({
                    severity: 'warn',
                    summary: '警告',
                    detail: '予約は既に削除されています。',
                    life: 3000
                });
            } finally {
                isSubmitting.value = false;
            }
            await goToNewReservation();

        },
        reject: () => {
            // Do nothing on reject
        }
    });
};
const handleCancel = () => {
    confirm.require({
        group: 'cancel',
        message: 'キャンセルの種類を選択してください。',
        header: 'キャンセル確認',
        icon: 'pi pi-exclamation-triangle',
        accept: () => updateReservationStatus('cancelled'),
        reject: () => { showDateDialog.value = true; },
        acceptLabel: 'キャンセル料無し',
        acceptClass: 'p-button-success',
        acceptIcon: 'pi pi-check',
        rejectLabel: 'キャンセル料発生',
        rejectClass: 'p-button-danger',
        rejectIcon: 'pi pi-calendar'
    });
};
const confirmPartialCancel = async () => {
    if (cancelStartDate.value) {

        await updateReservationStatus('cancelled');

        for (const cancelledDetail of cancelledIds.value) {
            await setReservationDetailStatus(cancelledDetail.id, cancelledDetail.hotel_id, 'cancelled');
        }

        showDateDialog.value = false;
    }
};

// Check-in and Check-out
const checkInChange = async (event) => {
    await setReservationTime('in', reservationInfo.value.reservation_id, reservationInfo.value.hotel_id, formatTime(event));
    toast.add({ severity: 'success', summary: '成功', detail: `チェックイン時刻を${formatTime(event)}に更新されました。`, life: 3000 });
}
const checkOutChange = async (event) => {
    await setReservationTime('out', reservationInfo.value.reservation_id, reservationInfo.value.hotel_id, formatTime(event));
    toast.add({ severity: 'success', summary: '成功', detail: `チェックアウト時刻を${formatTime(event)}に更新されました。`, life: 3000 });
}

// Comment update
const handleKeydown = (event) => {
    if (event.key === 'Tab') {
        // Check if status is blocked and client_id doesn't match the allowed client
        if (reservationInfo.value.status === 'block' &&
            reservationInfo.value.client_id !== '22222222-2222-2222-2222-222222222222') {
            event.preventDefault();
            toast.add({
                severity: 'warn',
                summary: '編集不可',
                detail: 'この予約の備考は編集できません。',
                life: 3000
            });
            return;
        }
        updateReservationComment(reservationInfo.value);
    }
};
const updateReservationComment = async (data) => {
    isSubmitting.value = true;
    try {
        await setReservationComment(data.reservation_id, data.hotel_id, data.comment);
        toast.add({
            severity: 'success',
            summary: '成功',
            detail: `備考更新されました。`,
            life: 3000
        });
    } catch (error) {
        console.error('Error updating comment:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: 'コメントの更新に失敗しました',
            life: 3000
        });
    } finally {
        isSubmitting.value = false;
    }
};

// Router
const goToNewReservation = async () => {
    await setReservationId(null);
    await router.push({ name: 'ReservationsNew' });
};

// Dialog: Add Room
const visibleAddRoomDialog = ref(false);
const targetRoom = ref(null);
const numberOfPeopleToMove = ref(0);
const filteredRooms = computed(() => {
    const reservedRoomIds = props.reservation_details.map(detail => detail.room_id);

    return availableRooms.value
        .filter(room => room.capacity >= numberOfPeopleToMove.value) // Ensure room can fit the people count
        .filter(room => !reservedRoomIds.includes(room.room_id))
        .map(room => ({
            label: `${room.room_number} - ${room.room_type_name} (${room.capacity}) ${room.smoking ? ' 🚬' : ''} (${room.floor}階)`,
            value: room.room_id, // Value for selection
        }));
});
const openAddRoomDialog = async () => {
    const hotelId = reservationInfo.value.hotel_id;
    const startDate = reservationInfo.value.check_in;
    const endDate = reservationInfo.value.check_out;

    await fetchAvailableRooms(hotelId, startDate, endDate);

    visibleAddRoomDialog.value = true;
};
const closeAddRoomDialog = () => {
    visibleAddRoomDialog.value = false;
};
const applyReservationRoomChanges = async () => {
    isSubmitting.value = true;
    try {
        if (numberOfPeopleToMove.value <= 0) {
            toast.add({ severity: 'warn', summary: '警告', detail: `少なくとも一人入力してください。`, life: 3000 });
            return
        }
        if (targetRoom.value === null) {
            toast.add({ severity: 'warn', summary: '警告', detail: `部屋を選択してください。`, life: 3000 });
            return;
        }

        const reservation_id = reservationInfo.value.reservation_id;

        const data = {
            reservationId: reservation_id,
            numberOfPeople: numberOfPeopleToMove.value,
            roomId: targetRoom.value.value,
        }

        await addRoomToReservation(data);

        closeAddRoomDialog();

        toast.add({ severity: 'success', summary: '成功', detail: '部屋追加されました。', life: 3000 });
    } catch (error) {
        console.error('Error applying room changes:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: '部屋の変更に失敗しました',
            life: 3000
        });
    } finally {
        isSubmitting.value = false;
    }
};

// Dialog: Change Client
const visibleClientChangeDialog = ref(false);
const selectedClient = ref(null);
const openChangeClientDialog = () => {
    // Always set selectedClient to the latest client_id from reservationInfo
    selectedClient.value = reservationInfo.value?.client_id;
    visibleClientChangeDialog.value = true;
};
const closeChangeClientDialog = () => {
    visibleClientChangeDialog.value = false;
};

// Dialog: Reservation
const visibleReservationBulkEditDialog = ref(false);
const tabsReservationBulkEditDialog = ref(0);
const openReservationBulkEditDialog = async () => {

    const hotelId = reservationInfo.value.hotel_id;
    const startDate = reservationInfo.value.check_in;
    const endDate = reservationInfo.value.check_out;

    await fetchAvailableRooms(hotelId, startDate, endDate);
    await fetchPlansForHotel(hotelId);
    await fetchPatternsForHotel(hotelId);
    // Addons
    const allAddons = await fetchAllAddons(hotelId);
    //console.log('[ReservationPanel] fetchAllAddons', allAddons);
    addonOptions.value = allAddons.filter(addon => addon.addon_type !== 'parking');
    //console.log('[ReservationPanel] addonOptions', addonOptions.value);
    tabsReservationBulkEditDialog.value = 0;
    visibleReservationBulkEditDialog.value = true;
};
const closeReservationBulkEditDialog = () => {
    visibleReservationBulkEditDialog.value = false;

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
const handleTabChange = async (newTabValue) => {
    tabsReservationBulkEditDialog.value = newTabValue * 1;

    // Period change
    if (tabsReservationBulkEditDialog.value === 4) {
        roomsAvailableChanges.value = [];
        const hotelId = reservationInfo.value.hotel_id;
        newCheckIn.value = new Date(reservationInfo.value.check_in);
        newCheckOut.value = new Date(reservationInfo.value.check_out);

        const checkIn = formatDate(newCheckIn.value);
        const checkOut = formatDate(newCheckOut.value);

        groupedRooms.value.every(async (room) => {
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
        });
    }
};

// Dialog: History
const historyDialogVisible = ref(false);
const showHistoryDialog = () => {
    historyDialogVisible.value = true;
};

const showCancellationCalculator = ref(false);

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
const generateAddonPreview = async () => {
    // Check
    if (!selectedAddonOption.value) {
        toast.add({ severity: 'warn', summary: '注意', detail: 'アドオン選択されていません。', life: 3000 });
        return
    }

    const foundAddon = addonOptions.value.find(addon => addon.id === selectedAddonOption.value);
    const isHotelAddon = foundAddon.id.startsWith('H');

    const addonData = {
        addons_global_id: isHotelAddon ? null : foundAddon.addons_global_id,
        addons_hotel_id: isHotelAddon ? foundAddon.addons_hotel_id : null,
        hotel_id: foundAddon.hotel_id,
        addon_name: foundAddon.addon_name,
        price: foundAddon.price,
        quantity: 1,
        tax_type_id: foundAddon.tax_type_id,
        tax_rate: foundAddon.tax_rate
    };

    selectedAddon.value.push(addonData);

    selectedAddonOption.value = '';

};
const deleteAddon = (addon) => {
    const index = selectedAddon.value.indexOf(addon);
    if (index !== -1) {
        selectedAddon.value.splice(index, 1);
    }
};

const applyPlanChangesToAll = async () => {
    isSubmitting.value = true;
    try {
        // 1. Create an array of promises
        const updatePromises = groupedRooms.value.map(room => {
            const params = {
                hotel_id: reservationInfo.value.hotel_id,
                room_id: room.room_id,
                reservation_id: reservationInfo.value.reservation_id,
                plan: selectedPlan.value,
                addons: selectedAddon.value,
                daysOfTheWeek: selectedDays.value
            };
            // Assuming setRoomPlan is refactored to take one object
            return setRoomPlan(params);
        });

        // 2. Wait for all promises to resolve
        await Promise.all(updatePromises);

        // 3. This code now runs only after all updates succeed
        closeReservationBulkEditDialog();
        toast.add({
            severity: 'success',
            summary: '成功',
            detail: 'すべての部屋の予約明細が更新されました。', // "All rooms updated"
            life: 3000
        });

    } catch (error) {
        // If any of the updates fail, Promise.all will reject
        // and the error will be caught here.
        console.error('Failed to apply bulk changes:', error);

        const errorMessage = error.response?.data?.message || '変更の適用に失敗しました。';

        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: errorMessage,
            life: 5000
        });
    } finally {
        isSubmitting.value = false;
    }
};
const applyPatternChangesToAll = async () => {
    isSubmitting.value = true;
    try {
        console.log('Starting to apply pattern to all rooms:', {
            hotelId: reservationInfo.value.hotel_id,
            reservationId: reservationInfo.value.reservation_id,
            pattern: dayPlanSelections.value
        });

        // Use Promise.all to wait for all room updates to complete
        const updatePromises = groupedRooms.value.map(async (room) => {
            const roomId = room.room_id;
            console.log('Applying pattern to room:', roomId);
            try {
                const result = await setRoomPattern(
                    reservationInfo.value.hotel_id,
                    roomId,
                    reservationInfo.value.reservation_id,
                    dayPlanSelections.value
                );
                console.log('Pattern applied to room:', roomId, result);
                return result;
            } catch (error) {
                console.error(`Failed to apply pattern to room ${roomId}:`, error);
                throw error; // Re-throw to be caught by the outer try-catch
            }
        });

        await Promise.all(updatePromises);

        closeReservationBulkEditDialog();
        console.log('Successfully applied pattern to all rooms');

        toast.add({
            severity: 'success',
            summary: '成功',
            detail: '予約明細が更新されました。',
            life: 3000
        });

    } catch (error) {
        console.error('Failed to apply pattern changes:', {
            error,
            message: error.message,
            stack: error.stack
        });
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: '変更の適用に失敗しました。詳細はコンソールを確認してください。',
            life: 5000
        });
    } finally {
        isSubmitting.value = false;
    }
};

// Tab Modify Period
const newCheckIn = ref(null);
const newCheckOut = ref(null);
const minCheckIn = ref(null);
const maxCheckOut = ref(null);
const roomsAvailableChanges = ref([]);
const applyDateChangesToAll = async () => {
    isSubmitting.value = true;
    try {
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

        const new_check_in = formatDate(new Date(newCheckIn.value));
        const new_check_out = formatDate(new Date(newCheckOut.value));

        for (const room of roomsAvailableChanges.value) {

            const id = room.roomValues.details[0].reservation_id;
            const old_check_in = room.roomValues.details[0].check_in;
            const old_check_out = room.roomValues.details[0].check_out;
            const old_room_id = room.roomId;
            const new_room_id = room.roomId;
            const number_of_people = room.roomValues.details[0].number_of_people;

            await setCalendarChange(id, old_check_in, old_check_out, new_check_in, new_check_out, old_room_id, new_room_id, number_of_people, 'bulk');
        }

        closeReservationBulkEditDialog();

        toast.add({ severity: 'success', summary: '成功', detail: '全ての部屋の宿泊期間が更新されました。', life: 3000 });

    } catch (error) {
        console.error('Error applying date changes:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: '日付変更の適用に失敗しました',
            life: 3000
        });
    } finally {
        isSubmitting.value = false;
    }
};

const showCopyDialog = ref(false);
const actionOptions = [
    {
        label: 'プラン・期間編集',
        icon: 'pi pi-pencil',
        command: openReservationBulkEditDialog
    },
    {
        label: '部屋追加',
        icon: 'pi pi-plus',
        command: openAddRoomDialog
    },
    {
        label: '予約を複製',
        icon: 'pi pi-copy',
        command: () => {
            console.log('[SplitButton] 予約を複製 clicked');
            console.log('reservationInfo.value:', reservationInfo.value);
            console.log('reservationInfo.value.reservation_id:', reservationInfo.value?.reservation_id);
            console.log('showCopyDialog (before):', showCopyDialog.value);
            showCopyDialog.value = true;
            console.log('showCopyDialog (after):', showCopyDialog.value);
        }
    }
];
const onActionClick = () => {
    // Default action if needed
};

onMounted(async () => {
    // console.log('[ReservationPanel] Reservation loaded:', reservationInfo.value);

    reservationTypeSelected.value = reservationInfo.value.type;
    paymentTimingSelected.value = reservationInfo.value.payment_timing;
    selectedClient.value = reservationInfo.value.client_id;
    cancelStartDate.value = new Date(reservationInfo.value.check_in);
    cancelMinDate.value = new Date(reservationInfo.value.check_in);
    const checkOutDate = new Date(reservationInfo.value.check_out);
    checkOutDate.setDate(checkOutDate.getDate() - 1);
    cancelMaxDate.value = checkOutDate;

    checkInTime.value = formatTime(reservationInfo.value.check_in_time);
    checkOutTime.value = formatTime(reservationInfo.value.check_out_time);

    numberOfNights.value = (new Date(reservationInfo.value.check_out) - new Date(reservationInfo.value.check_in)) / (1000 * 60 * 60 * 24);
    numberOfNightsTotal.value = reservationInfo.value.reservation_number_of_people * numberOfNights.value;
});

// Watcher
watch(addons, (newValue, oldValue) => {
    if (newValue !== oldValue) {
        // Add a 'quantity' field with default value 1 to each add-on
        selectedAddon.value = newValue.map(addon => ({
            ...addon,
            quantity: 1
        }));
    }
}, { deep: true });
</script>