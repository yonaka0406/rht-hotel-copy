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
        <Message v-if="!allGroupsPeopleCountMatch" severity="warn" :closable="false" class="col-span-2">
            <div class="flex items-center">
                <i class="pi pi-exclamation-triangle mr-2"></i>
                <span>予約の人数と宿泊者の人数が一致していない可能性があります。</span>
            </div>
        </Message>
        <div class="field flex flex-col">
            <div class="flex items-center justify-between mr-2 mb-2">
                <p class="font-bold">予約者：</p>
                <Button label="顧客変更" severity="help" icon="pi pi-pencil" @click="openChangeClientDialog" />

            </div>
            <InputText type="text" v-model="reservationInfo.client_name" disabled
                style="background-color: transparent;" />
        </div>
        <div class="field flex flex-col">
            <div v-if="reservationStatus === '保留中' || reservationStatus === '仮予約' || reservationStatus === '確定' || reservationStatus === 'チェックイン'">
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
                    <DatePicker id="datepicker-timeonly" v-model="checkInTime" @update:modelValue="checkInChange"
                        timeOnly fluid />
                <div class="col-span-1 flex items-center justify-start">
                    <i class="pi pi-clock ml-1"></i>
                </div>
                <p class="font-bold">チェックアウト：</p>
                <span>
                    <i class="pi pi-arrow-up-right mr-1"></i>{{ reservationInfo.check_out }}
                </span>
                
                <DatePicker id="datepicker-timeonly" v-model="checkOutTime" @update:modelValue="checkOutChange"
                    timeOnly fluid />
                <div class="col-span-1 flex items-center justify-start">
                    <i class="pi pi-clock ml-1"></i>
                </div>                
                
            </div>

        </div>
        <div class="field relative">
            <div class="absolute top-0 right-0 z-10">
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
            <Fieldset legend="備考" :toggleable="true">
                <p class="m-0 text-left" style="white-space: pre-wrap;">
                    {{ reservationInfo.comment }}
                </p>
                <div class="flex justify-end mt-2">
                    <Button 
                        v-tooltip.top="'備考を編集'"
                        icon="pi pi-pencil"
                        @click="openCommentDialog"
                        text
                        rounded
                        aria-label="備考を編集"
                    />
                </div>
            </Fieldset>
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
            <ConfirmDialog group="revertCheckout"></ConfirmDialog>

            <ReservationStatusButtons
                :reservationType="reservationType"
                :reservationStatus="reservationStatus"
                :allRoomsHavePlan="allRoomsHavePlan"
                :isSubmitting="isSubmitting"
                :reservation_id="props.reservation_id"
                :hotel_id="String(reservationInfo.hotel_id)"
                @updateReservationStatus="updateReservationStatus"
                @revertCheckout="revertCheckout"
                @handleCancel="handleCancel"
                @onReservationDeleted="goToNewReservation"
            />
        </div>
    </div>

    <ReservationCancelDialog
        :reservation_id="props.reservation_id"
        :reservation_details="props.reservation_details"
        v-model:showDateDialog="showDateDialog"
        v-model:isSubmitting="isSubmitting"
    />

    <!-- Change Client Dialog -->
    <Dialog v-model:visible="visibleClientChangeDialog" :header="'顧客変更'" :closable="true" :modal="true"
        :style="{ width: '60vw' }">
        <ReservationClientEdit v-if="selectedClient" :client_id="selectedClient" />
        <template #footer>
            <Button label="閉じる" icon="pi pi-times" class="p-button-danger p-button-text p-button-sm" text
                @click="closeChangeClientDialog" :loading="isSubmitting" :disabled="isSubmitting" />
        </template>
    </Dialog>

    <ReservationAddRoomDialog
        :reservation_details="reservation_details"
        :isSubmitting="isSubmitting"
        ref="reservationAddRoomDialogRef"        
    />

    <!-- Reservation Edit Dialog -->
    <Dialog v-model:visible="visibleReservationBulkEditDialog" header="全部屋一括編集" :modal="true"
        :breakpoints="{ '960px': '75vw', '640px': '100vw' }" style="width: 50vw">
        <div class="p-fluid">
            <Tabs value="0" @update:value="handleTabChange">
                <TabList>
                    <Tab value="0">プラン適用</Tab>
                    <Tab v-if="reservationStatus === '保留中' || reservationStatus === '仮予約' || reservationStatus === '確定' || reservationStatus === 'チェックイン'"
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
                        <Message v-if="!areAllRoomsSelectedComputed" severity="info" :closable="false" class="mt-2 mb-6">
                            選択された部屋は新しい予約に移動されます。
                        </Message>
                        <p class="mt-2 mb-6"><span class="font-bold">注意：</span>全ての部屋宿泊期間を変更できる日付が表示されています。</p>
                        <div class="grid grid-cols-2 gap-4 items-center">
                            <div>
                                <FloatLabel>
                                    <label for="checkin">チェックイン</label>
                                    <DatePicker id="checkin" v-model="newCheckIn" :showIcon="true"
                                        :minDate="computedMinCheckIn || undefined" :maxDate="computedMaxCheckOut || undefined"
                                        iconDisplay="input" dateFormat="yy-mm-dd" :selectOtherMonths="true" fluid />
                                </FloatLabel>
                            </div>
                            <div>
                                <FloatLabel>
                                    <label for="checkout">チェックアウト</label>
                                    <DatePicker id="checkout" v-model="newCheckOut" :showIcon="true"
                                        :minDate="computedMinCheckIn || undefined" :maxDate="computedMaxCheckOut || undefined"
                                        iconDisplay="input" dateFormat="yy-mm-dd" :selectOtherMonths="true" fluid />
                                </FloatLabel>
                            </div>
                        </div>
                        <Card class="mt-3 mb-3">
                            <template #title>部屋毎の状況</template>
                            <template #content>
                                <div class="grid grid-cols-4 gap-4 items-center text-center font-bold">
                                    <p>部屋</p>
                                    <p>選択</p>
                                    <p>最も早い日付</p>
                                    <p>最も遅い日付</p>
                                </div>
                                <div v-for="(change, index) in roomsAvailableChanges" :key="index" class="room-status">
                                    <div class="grid grid-cols-4 gap-4 items-center">
                                        <p class="text-center">{{ change.roomValues.details[0].room_type_name + ' ' +
                                            change.roomValues.details[0].room_number }}
                                            <i v-if="hasRoomChange(change.roomValues)" class="pi pi-exclamation-triangle ml-2 text-orange-500"
                                                v-tooltip.top="'この部屋には期間変更があります。'"></i>
                                        </p>
                                        <div class="flex justify-center">
                                            <Checkbox v-model="selectedRoomsForChange" :value="change.roomId" :disabled="hasRoomChange(change.roomValues)" />
                                        </div>
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
            <div class="flex justify-center items-center">
                <div v-if="tabsReservationBulkEditDialog === 0 && !isPatternInput" class="field-checkbox mr-4">
                    <Checkbox id="overrideRounding" v-model="overrideRounding" :binary="true" />
                    <label for="overrideRounding" class="ml-2">端数処理を上書きする</label>
                </div>                                
                <Button v-if="tabsReservationBulkEditDialog === 0 && !isPatternInput" label="適用" icon="pi pi-check"
                    class="p-button-success p-button-text p-button-sm" @click="applyPlanChangesToAll" :loading="isSubmitting" :disabled="isSubmitting" />
                
                <Button v-if="tabsReservationBulkEditDialog === 0 && isPatternInput" label="適用" icon="pi pi-check"
                    class="p-button-success p-button-text p-button-sm" @click="applyPatternChangesToAll" :loading="isSubmitting" :disabled="isSubmitting" />
                <Button v-if="tabsReservationBulkEditDialog === 4" label="適用" icon="pi pi-check"
                    class="p-button-success p-button-text p-button-sm" @click="applyDateChanges" :loading="isSubmitting" :disabled="isSubmitting" />

                <Button label="キャンセル" icon="pi pi-times" class="p-button-danger p-button-text p-button-sm" text
                    @click="closeReservationBulkEditDialog" :loading="isSubmitting" :disabled="isSubmitting" />
            </div>
        </template>
    </Dialog>

    <!-- Reservation Edit History -->
    <Dialog v-model:visible="historyDialogVisible" header="編集履歴" :modal="true" :dismissableMask="true"
        :style="{ width: '80vw', 'max-height': '80vh', 'overflow-y': 'auto' }">
        <ReservationHistory v-if="props.reservation_id" :reservation_id="props.reservation_id" />
    </Dialog>

    <ReservationCopyDialog
        :reservation_id="props.reservation_id"
        :hotel_id="String(reservationInfo.hotel_id)"
        v-model:visible="showCopyDialog"
    />

    <ReservationSplitDialog
        :reservation_id="props.reservation_id"
        :reservation_details="props.reservation_details"
        v-model:visible="showSplitDialog"
    />

    <ReservationCommentDialog
        v-model:visible="commentDialogVisible"
        :comment="reservationInfo.comment"
        :has-important-comment="reservationInfo.has_important_comment"
        @save="(newComment) => updateReservationComment(reservationInfo.reservation_id, reservationInfo.hotel_id, newComment)"
    />

    <CancellationCalculatorDialog 
        v-model:visible="showCancellationCalculator" 
        :reservationDetails="reservation_details" 
        v-if="reservation_details?.length > 0"
    />

    <ReservationAnnounceDialog
        v-model:visible="visibleSlackDialog"
        :reservationInfo="reservationInfo"
        :groupedRooms="groupedRooms"
        :allReservationClients="allReservationClients"
        :parking_reservations="props.parking_reservations"
        :reservation_payments="props.reservation_payments"
        ref="reservationAnnounceDialogRef"
    />

</template>

<script setup>
// Vue
import { ref, watch, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();

import ReservationClientEdit from '@/pages/MainPage/Reservation/components/ReservationClientEdit.vue';
import ReservationHistory from '@/pages/MainPage/Reservation/components/ReservationHistory.vue';
import ReservationCopyDialog from '@/pages/MainPage/Reservation/components/dialogs/ReservationCopyDialog.vue';

import CancellationCalculatorDialog from '@/pages/MainPage/Reservation/components/dialogs/CancellationCalculatorDialog.vue';
import ReservationAddRoomDialog from '@/pages/MainPage/Reservation/components/dialogs/ReservationAddRoomDialog.vue';
import ReservationAnnounceDialog from '@/pages/MainPage/Reservation/components/dialogs/ReservationAnnounceDialog.vue';
import ReservationCancelDialog from '@/pages/MainPage/Reservation/components/dialogs/ReservationCancelDialog.vue';
import ReservationSplitDialog from '@/pages/MainPage/Reservation/components/dialogs/ReservationSplitDialog.vue';
import ReservationStatusButtons from '@/pages/MainPage/Reservation/components/ReservationStatusButtons.vue';

import ReservationCommentDialog from './dialogs/ReservationCommentDialog.vue';

// Primevue
import { useToast } from 'primevue/usetoast';
const toast = useToast();
import { useConfirm } from "primevue/useconfirm";
// Assign unique group names to each confirm instance
const confirm = useConfirm();
import {
    Card, Dialog, Tabs, TabList, Tab, TabPanels, TabPanel, DataTable, Column, InputNumber, InputText, Textarea, Select, MultiSelect, DatePicker, FloatLabel, SelectButton, Button, ToggleButton, Badge, Divider, ConfirmDialog, SplitButton, Checkbox, Message, Fieldset
} from 'primevue';

const commentDialogVisible = ref(false);
const openCommentDialog = () => {
    commentDialogVisible.value = true;
};

const reservationAddRoomDialogRef = ref(null);
const reservationAnnounceDialogRef = ref(null);

const props = defineProps({
    reservation_id: {
        type: String,
        required: true,
    },
    reservation_details: {
        type: [Object],
        required: true,
    },
    parking_reservations: {
        type: [Object, Array],
        default: () => ({}),
    },
    reservation_payments: {
        type: [Object, Array],
        default: () => [],
    },
});

//Stores
import { useReservationStore } from '@/composables/useReservationStore';
const { setReservationType, setReservationStatus, setRoomPlan, setRoomPattern,
    fetchAvailableRooms, getAvailableDatesForChange, setReservationRoomsPeriod,
    setReservationComment, setReservationImportantComment, setReservationTime, setPaymentTiming, setReservationId } = useReservationStore();
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

// Comment update related refs and computed
const localCommentInput = ref('');
const isCommentDirty = computed(() => localCommentInput.value !== reservationInfo.value.comment);

const updateReservationCommentOnBlur = () => {
    if (isCommentDirty.value) {
        updateReservationComment(reservationInfo.value.reservation_id, reservationInfo.value.hotel_id, localCommentInput.value);
    }
};

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

const hasRoomChange = (group) => {
    if (!group || !group.details || group.details.length === 0) return false;

    const reservationCheckIn = new Date(reservationInfo.value.check_in);
    const reservationCheckOut = new Date(reservationInfo.value.check_out);

    // Calculate the total number of nights for the entire reservation
    const totalReservationNights = (reservationCheckOut.getTime() - reservationCheckIn.getTime()) / (1000 * 60 * 60 * 24);

    // If the number of details (nights) for this room group is less than the total reservation nights,
    // it implies a room change (i.e., this room is not present for the entire duration).
    if (group.details.length < totalReservationNights) {
        return true;
    }

    // Also check if the room's details span the *exact* period of the reservation.
    const roomFirstDetailDate = new Date(group.details[0].date);
    const roomLastDetailDate = new Date(group.details[group.details.length - 1].date);

    // Check if the start date of this room's details matches the reservation check-in
    if (formatDate(roomFirstDetailDate) !== formatDate(reservationCheckIn)) {
        return true;
    }

    // Check if the end date of this room's details matches the reservation check-out last night
    const reservationLastNightDate = new Date(reservationCheckOut.getTime() - (1000 * 60 * 60 * 24));
    if (formatDate(roomLastDetailDate) !== formatDate(reservationLastNightDate)) {
        return true;
    }

    return false;
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
        const key = `${item.room_id}-${item.room_type_name}`;
        if (!groups[key]) {
            groups[key] = { room_id: item.room_id, room_type: item.room_type_name, details: [] };
        }
        groups[key].details.push(item);
    });

    return Object.values(groups);

});
const allHavePlan = (group) => {
    return group.details.every(
        (detail) => detail.plans_global_id || detail.plans_hotel_id
    );
};
const allRoomsHavePlan = computed(() => {
    // Check if every room in every group has a plan
    const allPlansSet = groupedRooms.value.every(group => allHavePlan(group));

    // Check if payment_timing is set
    const paymentTimingSet = reservationInfo.value.payment_timing && reservationInfo.value.payment_timing !== 'not_set';

    return allPlansSet && paymentTimingSet;
});
const allGroupsPeopleCountMatch = computed(() => {
    if (!reservationInfo.value || !props.reservation_details.length) {
        return true; // No reservation info or details, so no mismatch
    }

    const totalReservationPeople = reservationInfo.value.reservation_number_of_people;
    const reservationCheckIn = new Date(reservationInfo.value.check_in);
    const reservationCheckOut = new Date(reservationInfo.value.check_out);

    let currentDate = new Date(reservationCheckIn);
    while (currentDate < reservationCheckOut) {
        const formattedCurrentDate = formatDate(currentDate);
        let peopleOnThisDate = 0;

        // Sum people from all reservation_details that fall on the current date
        props.reservation_details.forEach(detail => {
            if (formatDate(new Date(detail.date)) === formattedCurrentDate) {
                peopleOnThisDate += detail.number_of_people;
            }
        });

        if (peopleOnThisDate !== totalReservationPeople) {
            return false; // Mismatch found on this date
        }

        currentDate.setDate(currentDate.getDate() + 1); // Move to the next day
    }

    return true; // No mismatch found on any date
});
const allReservationClients = computed(() => {
    const uniqueClients = new Map();
    let fallbackId = 0;

    if (props.reservation_details && props.reservation_details.length > 0) {
        props.reservation_details.forEach(detail => {
            if (detail.reservation_clients && detail.reservation_clients.length > 0) {
                detail.reservation_clients.forEach(client => {
                    // Use client_id as the key if available, otherwise generate a fallback key.
                    // This prevents clients without a client_id from overwriting each other in the Map.
                    const key = client.client_id ? client.client_id : `fallback-${fallbackId++}`;
                    uniqueClients.set(key, client);
                });
            }
        });
    }

    return Array.from(uniqueClients.values());
});

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

    return `キャンセルポリシーは予約の規模に応じて、「〇日前まで」であればキャンセル料が発生しないように設定できます。`;
    
});

const numberOfNights = ref(0);
const numberOfNightsTotal = ref(0);

const computedMinCheckIn = computed(() => {
    let minDate = null;
    const newSelectedRooms = selectedRoomsForChange.value;

    if (newSelectedRooms.length > 0) {
        const selectedChanges = roomsAvailableChanges.value.filter(change => newSelectedRooms.includes(change.roomId));

        selectedChanges.forEach(change => {
            if (change.results.earliestCheckIn) {
                const earliestCheckInDate = new Date(change.results.earliestCheckIn);
                if (!minDate || earliestCheckInDate > minDate) {
                    minDate = earliestCheckInDate;
                }
            }
        });
    }
    return minDate;
});

const computedMaxCheckOut = computed(() => {
    let maxDate = null;
    const newSelectedRooms = selectedRoomsForChange.value;

    if (newSelectedRooms.length > 0) {
        const selectedChanges = roomsAvailableChanges.value.filter(change => newSelectedRooms.includes(change.roomId));

        selectedChanges.forEach(change => {
            if (change.results.latestCheckOut) {
                const latestCheckOutDate = new Date(change.results.latestCheckOut);
                if (!maxDate || latestCheckOutDate < maxDate) {
                    maxDate = latestCheckOutDate;
                }
            }
        });
    }
    return maxDate;
});

const areAllRoomsSelectedComputed = computed(() => {
    const roomIdsToChange = selectedRoomsForChange.value;
    const allOriginalRoomIds = groupedRooms.value.map(group => group.room_id);
    return roomIdsToChange.length === allOriginalRoomIds.length && roomIdsToChange.every(id => allOriginalRoomIds.includes(id));
});

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
            reservationTypeSelected.value = selectedOption;

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


const revertCheckout = () => {
    confirm.require({
        group: 'revertCheckout',
        message: 'チェックアウトを取り消し、ステータスを「チェックイン」に戻しますか？',
        header: 'チェックアウト取り消し確認',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: '取り消す',
        rejectLabel: 'キャンセル',
        acceptClass: 'p-button-danger',
        rejectClass: 'p-button-secondary p-button-outlined',
        accept: () => {
            updateReservationStatus('checked_in');
            toast.add({ severity: 'success', summary: '成功', detail: 'チェックアウトが取り消されました。', life: 3000 });
        },
        reject: () => {
            toast.add({ severity: 'info', summary: 'キャンセル', detail: '操作はキャンセルされました。', life: 3000 });
        }
    });
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
const updateReservationComment = async (reservationId, hotelId, comment) => {
    isSubmitting.value = true;
    try {
        await setReservationComment(reservationId, hotelId, comment);
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
        selectedRoomsForChange.value = [];
        const hotelId = reservationInfo.value.hotel_id;
        newCheckIn.value = new Date(reservationInfo.value.check_in);
        newCheckOut.value = new Date(reservationInfo.value.check_out);

        const checkIn = formatDate(newCheckIn.value);
        const checkOut = formatDate(newCheckOut.value);

        const changesPromises = groupedRooms.value.map(async (room) => {
            const roomId = room.room_id;
            const results = await getAvailableDatesForChange(hotelId, roomId, checkIn, checkOut);
            return {
                roomId: roomId,
                roomValues: room,
                results: results
            };
        });

        const allChanges = await Promise.all(changesPromises);

        roomsAvailableChanges.value = allChanges;
        selectedRoomsForChange.value = allChanges
            .filter(change => !hasRoomChange(change.roomValues)) // Only select rooms without changes
            .map(change => change.roomId);

        // Add conditional toast warning
        if (selectedRoomsForChange.value.length === 0 && allChanges.length > 0) {
            toast.add({
                severity: 'warn',
                summary: '警告',
                detail: '期間変更可能な部屋がありません。', // "No rooms available for period change."
                life: 5000
            });
        }
    }
};

// Dialog: History
const historyDialogVisible = ref(false);
const showHistoryDialog = () => {
    historyDialogVisible.value = true;
};

const showCancellationCalculator = ref(false);
const showCopyDialog = ref(false);
const showSplitDialog = ref(false);
const visibleSlackDialog = ref(false);

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
const overrideRounding = ref(false);

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
            // Get the number of people for this specific room
            const roomNumberOfPeople = room.details[0].number_of_people;

            // Adjust addon quantities based on the number of people for THIS room
            const adjustedAddons = selectedAddon.value.map(addon => ({
                ...addon,
                quantity: addon.quantity * roomNumberOfPeople
            }));
            const params = {
                hotel_id: reservationInfo.value.hotel_id,
                room_id: room.room_id,
                reservation_id: reservationInfo.value.reservation_id,
                plan: selectedPlan.value,
                addons: adjustedAddons,
                daysOfTheWeek: selectedDays.value,
                overrideRounding: overrideRounding.value
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
        // console.log('Starting to apply pattern to all rooms:', {
        //    hotelId: reservationInfo.value.hotel_id,
        //    reservationId: reservationInfo.value.reservation_id,
        //    pattern: dayPlanSelections.value
        // });

        // Use Promise.all to wait for all room updates to complete
        const updatePromises = groupedRooms.value.map(async (room) => {
            const roomId = room.room_id;
            // console.log('Applying pattern to room:', roomId);
            try {
                const result = await setRoomPattern(
                    reservationInfo.value.hotel_id,
                    roomId,
                    reservationInfo.value.reservation_id,
                    dayPlanSelections.value,
                    overrideRounding.value
                );
                // console.log('Pattern applied to room:', roomId, result);
                return result;
            } catch (error) {
                console.error(`Failed to apply pattern to room ${roomId}:`, error);
                throw error; // Re-throw to be caught by the outer try-catch
            }
        });

        await Promise.all(updatePromises);

        closeReservationBulkEditDialog();
        // console.log('Successfully applied pattern to all rooms');

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
const roomsAvailableChanges = ref([]);
const selectedRoomsForChange = ref([]);
const applyDateChanges = async () => {
    isSubmitting.value = true;
    try {
        // Checks
        if (selectedRoomsForChange.value.length === 0) {
            toast.add({
                severity: 'warn',
                summary: '警告',
                detail: '変更する部屋を選択してください。',
                life: 3000
            });
            return;
        }

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

        const roomIdsToChange = selectedRoomsForChange.value;
        const id = reservationInfo.value.reservation_id;

        // Add a check to prevent processing rooms that should be disabled
        const roomsWithChangesAttempted = roomIdsToChange.filter(roomId => {
            const roomChangeEntry = roomsAvailableChanges.value.find(change => change.roomId === roomId);
            return roomChangeEntry && hasRoomChange(roomChangeEntry.roomValues);
        });

        if (roomsWithChangesAttempted.length > 0) {
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: '期間変更ができない部屋が含まれています。',
                life: 5000
            });
            return;
        }

        const allOriginalRoomIds = groupedRooms.value.map(group => group.room_id);
        const allRoomsSelected = roomIdsToChange.length === allOriginalRoomIds.length && roomIdsToChange.every(id => allOriginalRoomIds.includes(id));

        const result = await setReservationRoomsPeriod(id, reservationInfo.value.hotel_id, new_check_in, new_check_out, roomIdsToChange, allRoomsSelected);

        closeReservationBulkEditDialog();

        toast.add({ severity: 'success', summary: '成功', detail: '選択された部屋の宿泊期間が更新されました。', life: 3000 });

        if (result.success && result.newReservationId) {
            router.push({ name: 'ReservationEdit', params: { reservation_id: result.newReservationId } });
        }

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

const actionOptions = [
    {
        label: 'プラン・期間編集',
        icon: 'pi pi-pencil',
        command: openReservationBulkEditDialog
    },
    {
        label: '部屋追加',
        icon: 'pi pi-plus',
        command: () => reservationAddRoomDialogRef.value.openAddRoomDialog()
    },
    {
        label: '予約を複製',
        icon: 'pi pi-copy',
        command: () => { showCopyDialog.value = true; }
    },
    {
        label: '予約報告書',
        icon: 'pi pi-slack',
        command: () => { visibleSlackDialog.value = true; }
    },
    {
        label: '予約分割',
        icon: 'pi pi-th-large',
        command: () => { showSplitDialog.value = true; }
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


    checkInTime.value = formatTime(reservationInfo.value.check_in_time);
    checkOutTime.value = formatTime(reservationInfo.value.check_out_time);

    numberOfNights.value = (new Date(reservationInfo.value.check_out) - new Date(reservationInfo.value.check_in)) / (1000 * 60 * 60 * 24);
    numberOfNightsTotal.value = reservationInfo.value.reservation_number_of_people * numberOfNights.value;

    // Initialize localCommentInput with the current comment from reservationInfo
    localCommentInput.value = reservationInfo.value.comment;
});



// Watcher

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

watch([computedMinCheckIn, computedMaxCheckOut], ([newMin, newMax]) => {
    // Adjust newCheckIn
    if (newMin && (!newCheckIn.value || newCheckIn.value < newMin)) {
        newCheckIn.value = newMin;
    }

    // Adjust newCheckOut
    if (newMax && (!newCheckOut.value || newCheckOut.value > newMax)) {
        newCheckOut.value = newMax;
    }

    // Ensure newCheckOut is always after newCheckIn
    if (newCheckIn.value && newCheckOut.value && newCheckOut.value <= newCheckIn.value) {
        // If newCheckOut is before or same as newCheckIn, adjust newCheckOut to be newCheckIn + 1 day
        const adjustedCheckOut = new Date(newCheckIn.value);
        adjustedCheckOut.setDate(adjustedCheckOut.getDate() + 1);
        newCheckOut.value = adjustedCheckOut;
    }
}, { immediate: true });
</script>