<template>
  <div class="stock-investigator">
    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-search text-blue-500"></i>
          在庫調査ツール
        </div>
      </template>
      <template #content>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div class="p-field mt-6">
            <FloatLabel>
              <Select id="hotel" v-model="selectedHotelId" :options="hotels" optionLabel="name" optionValue="id"
                placeholder="ホテルを選択" class="w-full" filter />
              <label for="hotel">ホテル</label>
            </FloatLabel>
          </div>

          <div class="p-field mt-6">
            <FloatLabel>
              <DatePicker id="targetDate" v-model="targetDate" dateFormat="yy-mm-dd" placeholder="調査対象日"
                class="w-full" />
              <label for="targetDate">調査対象日</label>
            </FloatLabel>
          </div>

          <div class="p-field flex items-end">
            <Button label="調査開始" icon="pi pi-search" @click="runInvestigation" :loading="loading"
              :disabled="!selectedHotelId || !targetDate" class="w-full" />
          </div>
        </div>
      </template>
    </Card>

    <!-- Investigation Results -->
    <div v-if="investigationResult" class="mt-4">
      <!-- Summary Analysis -->
      <Card class="mb-4">
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-chart-line text-indigo-500"></i>
            分析サマリー
          </div>
        </template>
        <template #content>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div class="text-center">
              <div class="text-xl font-bold">{{ investigationResult.summary.totalPMSEvents }}</div>
              <div class="text-sm text-gray-600">PMSイベント</div>
            </div>
            <div class="text-center">
              <div class="text-xl font-bold">{{ investigationResult.summary.totalOTAEvents }}</div>
              <div class="text-sm text-gray-600">OTA送信</div>
            </div>
            <div class="text-center">
              <div class="text-xl font-bold text-red-600">{{ investigationResult.summary.potentialGaps }}</div>
              <div class="text-sm text-gray-600">潜在的ギャップ</div>
            </div>
            <div class="text-center">
              <Badge :value="getRiskLevelText(investigationResult.summary.analysis.riskLevel)"
                :severity="getRiskLevelSeverity(investigationResult.summary.analysis.riskLevel)" class="text-lg" />
              <div class="text-sm text-gray-600 mt-1">リスクレベル</div>
            </div>
          </div>

          <!-- Detailed Operation Statistics -->
          <div v-if="investigationResult.summary.operationStats" class="mb-4">
            <h4 class="font-semibold mb-2 text-blue-600">操作統計:</h4>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div class="bg-green-50 p-3 rounded border-l-4 border-green-400">
                <div class="font-semibold text-green-700">追加 (INSERT)</div>
                <div class="text-lg">{{ investigationResult.summary.operationStats.totalInserts }}</div>
              </div>
              <div class="bg-red-50 p-3 rounded border-l-4 border-red-400">
                <div class="font-semibold text-red-700">削除 (DELETE)</div>
                <div class="text-lg">{{ investigationResult.summary.operationStats.totalDeletes }}</div>
              </div>
              <div class="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                <div class="font-semibold text-blue-700">更新 (UPDATE)</div>
                <div class="text-lg">{{ investigationResult.summary.operationStats.totalUpdates }}</div>
              </div>
              <div class="bg-orange-50 p-3 rounded border-l-4 border-orange-400">
                <div class="font-semibold text-orange-700">キャンセル→有効</div>
                <div class="text-lg">{{ investigationResult.summary.operationStats.updatesCancelledToActive }}</div>
              </div>
              <div class="bg-purple-50 p-3 rounded border-l-4 border-purple-400">
                <div class="font-semibold text-purple-700">有効→キャンセル</div>
                <div class="text-lg">{{ investigationResult.summary.operationStats.updatesActiveToCancelled }}</div>
              </div>
              <div class="bg-gray-50 p-3 rounded border-l-4 border-gray-400">
                <div class="font-semibold text-gray-700">正味変化</div>
                <div class="text-lg"
                  :class="investigationResult.summary.operationStats.netRoomChange < 0 ? 'text-red-600' : 'text-green-600'">
                  {{ investigationResult.summary.operationStats.netRoomChange > 0 ? '+' : '' }}{{
                    investigationResult.summary.operationStats.netRoomChange }}
                </div>
              </div>
            </div>

            <!-- Verification Message -->
            <div class="mt-3 p-3 rounded" :class="getVerificationClass()">
              <div class="font-semibold">{{ getVerificationMessage() }}</div>
              <div class="text-sm mt-1">
                現在の利用可能室数: {{ investigationResult.currentState.calculatedAvailableStock }}室 |
                正味変化: {{ investigationResult.summary.operationStats.netRoomChange }}室
              </div>
            </div>
          </div>

          <!-- Gap Details -->
          <div v-if="investigationResult.summary.gaps.length > 0" class="mt-4">
            <h4 class="font-semibold mb-2 text-red-600">検出されたギャップ:</h4>
            <div v-for="(gap, index) in investigationResult.summary.gaps" :key="index"
              class="mb-2 p-3 bg-red-50 border-l-4 border-red-400">
              <div class="text-sm">
                <strong>{{ formatDateTime(gap.pmsEvent.timestamp) }}</strong> - {{ gap.message }}
              </div>
              <div class="text-xs text-gray-600 mt-1">
                {{ getEventTypeText(gap.pmsEvent.event_type) }} ({{ getActionText(gap.pmsEvent.action) }}): {{
                  gap.pmsEvent.guest_name || gap.pmsEvent.reason || 'N/A' }}
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- Event Timeline -->
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-clock text-amber-500"></i>
            イベントタイムライン
          </div>
        </template>
        <template #content>
          <DataTable :value="enhancedTimeline" :paginator="true" :rows="20" :rowsPerPageOptions="[10, 20, 50]"
            class="w-full" sortField="timestamp" :sortOrder="-1">
            <Column field="timestamp" header="時刻" sortable>
              <template #body="slotProps">
                {{ formatDateTime(slotProps.data.timestamp) }}
              </template>
            </Column>

            <Column field="event_type" header="イベント種別" sortable>
              <template #body="slotProps">
                <Badge :value="getEventTypeText(slotProps.data.event_type)"
                  :severity="getEventTypeSeverity(slotProps.data.event_type)" />
              </template>
            </Column>

            <Column field="action" header="アクション" sortable>
              <template #body="slotProps">
                {{ getActionText(slotProps.data.action) }}
              </template>
            </Column>

            <Column header="在庫変化" class="text-center">
              <template #body="slotProps">
                <div class="flex items-center justify-center gap-1">
                  <span v-if="slotProps.data.room_count_change !== 0"
                    :class="getRoomChangeClass(slotProps.data.room_count_change)">
                    {{ slotProps.data.room_count_change > 0 ? '+' : '' }}{{ slotProps.data.room_count_change }}
                  </span>
                  <span v-else class="text-gray-400">-</span>
                </div>
              </template>
            </Column>

            <Column header="利用可能室数" class="text-center">
              <template #body="slotProps">
                <div class="font-semibold text-blue-600">
                  {{ slotProps.data.running_room_count }}
                </div>
              </template>
            </Column>

            <Column header="詳細">
              <template #body="slotProps">
                <div class="text-sm">
                  <div v-if="slotProps.data.event_type === 'reservation'">
                    <strong>{{ slotProps.data.guest_name }}</strong><br>
                    {{ formatDate(slotProps.data.check_in) }} - {{ formatDate(slotProps.data.check_out) }}<br>
                    <div class="flex items-center gap-2 mt-1">
                      <Badge :value="getStatusText(slotProps.data.status)"
                        :severity="getStatusSeverity(slotProps.data.status)" />
                      <span v-if="slotProps.data.room_count_change !== 0"
                        :class="getRoomChangeClass(slotProps.data.room_count_change)" class="text-xs">
                        ({{ slotProps.data.room_count_change > 0 ? '+' : '' }}{{ slotProps.data.room_count_change }} 室)
                      </span>
                    </div>
                  </div>
                  <div v-else-if="slotProps.data.event_type === 'reservation_detail'">
                    <div v-if="slotProps.data.action === 'DELETE' && slotProps.data.is_related_to_insert">
                      <strong>{{ slotProps.data.original_guest_name || slotProps.data.guest_name }}</strong>
                      <span class="text-blue-600 text-xs ml-2">
                        ({{ formatDateTime(slotProps.data.original_insert_timestamp) }}に追加された予約の削除)
                      </span>
                    </div>
                    <div v-else>
                      <strong>{{ slotProps.data.guest_name }}</strong>
                    </div>

                    <div v-if="slotProps.data.grouped_count > 1">
                      {{ slotProps.data.grouped_count }}室の一括操作<br>
                      部屋番号: {{ slotProps.data.room_numbers ? slotProps.data.room_numbers.join(', ') : 'N/A' }}
                    </div>
                    <div v-else>
                      部屋番号: {{ slotProps.data.room_number || 'N/A' }}
                    </div>
                    <div class="flex items-center gap-2 mt-1">
                      <Badge :value="slotProps.data.cancelled ? 'キャンセル済' : '有効'"
                        :severity="slotProps.data.cancelled ? 'danger' : 'success'" />
                      <span v-if="slotProps.data.room_count_change !== 0"
                        :class="getRoomChangeClass(slotProps.data.room_count_change)" class="text-xs">
                        ({{ slotProps.data.room_count_change > 0 ? '+' : '' }}{{ slotProps.data.room_count_change }} 室)
                      </span>
                      <span v-if="slotProps.data.action === 'DELETE' && slotProps.data.is_related_to_insert"
                        class="text-blue-600 text-xs">
                        🔗 関連削除
                      </span>
                    </div>
                  </div>
                  <div v-else-if="slotProps.data.event_type === 'maintenance'">
                    <strong>{{ slotProps.data.reason }}</strong><br>
                    {{ formatDate(slotProps.data.start_date) }} - {{ formatDate(slotProps.data.end_date) }}<br>
                    <span class="text-red-600 text-xs">(-1 室)</span>
                  </div>
                  <div v-else-if="slotProps.data.event_type === 'ota_xml'">
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <strong>{{ slotProps.data.service_name }}</strong><br>
                        リクエストID: {{ slotProps.data.request_id }}<br>
                        <div class="flex items-center gap-2 mt-1">
                          <Badge :value="getStatusText(slotProps.data.status)"
                            :severity="getStatusSeverity(slotProps.data.status)" />
                          <span class="text-blue-600 text-xs">(在庫同期)</span>
                        </div>
                        <div v-if="slotProps.data.retries > 0" class="text-xs text-orange-600 mt-1">
                          再試行: {{ slotProps.data.retries }}回
                        </div>
                      </div>
                      <Button icon="pi pi-code" size="small" severity="info" outlined
                        @click="openXMLDialog(slotProps.data.id, slotProps.data.service_name)" v-tooltip="'XML データを表示'"
                        class="ml-2" />
                    </div>
                  </div>
                </div>
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>

      <!-- Reservation Lifecycle Summary -->
      <Card v-if="investigationResult.reservationLifecycle" class="mt-4">
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-list text-purple-500"></i>
            予約ライフサイクル概要
          </div>
        </template>
        <template #content>
          <!-- Status Summary -->
          <div class="mb-4 p-3 bg-gray-50 rounded">
            <div class="grid grid-cols-3 gap-4 text-center">
              <div>
                <div class="text-lg font-bold text-green-600">
                  {{ getLifecycleStatusCount('active') }}
                </div>
                <div class="text-sm text-gray-600">有効</div>
              </div>
              <div>
                <div class="text-lg font-bold text-orange-600">
                  {{ getLifecycleStatusCount('cancelled') }}
                </div>
                <div class="text-sm text-gray-600">キャンセル済</div>
              </div>
              <div>
                <div class="text-lg font-bold text-red-600">
                  {{ getLifecycleStatusCount('deleted') }}
                </div>
                <div class="text-sm text-gray-600">削除済</div>
              </div>
            </div>
            <div class="text-center mt-2 text-sm text-gray-600">
              合計: {{ investigationResult.reservationLifecycle.length }} 件の予約詳細レコード
            </div>
          </div>

          <!-- Filter Buttons -->
          <div class="mb-4">
            <div class="flex flex-wrap gap-2 mb-2">
              <Button label="全て" :severity="lifecycleStatusFilter === 'all' ? 'primary' : 'secondary'"
                :outlined="lifecycleStatusFilter !== 'all'" size="small" @click="lifecycleStatusFilter = 'all'" />
              <Button :label="`有効 (${getLifecycleStatusCount('active')})`"
                :severity="lifecycleStatusFilter === 'active' ? 'success' : 'secondary'"
                :outlined="lifecycleStatusFilter !== 'active'" size="small" @click="lifecycleStatusFilter = 'active'" />
              <Button :label="`キャンセル済 (${getLifecycleStatusCount('cancelled')})`"
                :severity="lifecycleStatusFilter === 'cancelled' ? 'warn' : 'secondary'"
                :outlined="lifecycleStatusFilter !== 'cancelled'" size="small"
                @click="lifecycleStatusFilter = 'cancelled'" />
              <Button :label="`削除済 (${getLifecycleStatusCount('deleted')})`"
                :severity="lifecycleStatusFilter === 'deleted' ? 'danger' : 'secondary'"
                :outlined="lifecycleStatusFilter !== 'deleted'" size="small"
                @click="lifecycleStatusFilter = 'deleted'" />
            </div>
            <div class="text-sm text-gray-600">
              表示中: {{ filteredLifecycleData.length }} 件
              <span v-if="lifecycleStatusFilter !== 'all'">
                ({{ lifecycleStatusFilter === 'active' ? '有効' : lifecycleStatusFilter === 'cancelled' ? 'キャンセル済' : '削除済'
                }}のみ)
              </span>
            </div>
          </div>

          <DataTable :value="filteredLifecycleData" :paginator="true" :rows="10" :rowsPerPageOptions="[10, 20, 50]"
            class="w-full" sortField="first_log_time" :sortOrder="-1">
            <Column field="record_id" header="予約詳細ID" sortable>
              <template #body="slotProps">
                <span class="font-mono text-xs">{{ slotProps.data.record_id?.substring(0, 8) }}...</span>
              </template>
            </Column>

            <Column field="guest_name" header="顧客名" sortable>
              <template #body="slotProps">
                <strong>{{ slotProps.data.guest_name }}</strong>
              </template>
            </Column>

            <Column field="sort_room_number" header="部屋番号" sortable dataType="numeric">
              <template #body="slotProps">
                {{ slotProps.data.display_room_number }}
              </template>
            </Column>

            <Column field="first_log_time" header="最初のログ" sortable>
              <template #body="slotProps">
                <div class="text-sm">
                  {{ formatDateTime(slotProps.data.first_log_time) }}
                  <div class="text-xs text-gray-500">{{ slotProps.data.first_action }}</div>
                </div>
              </template>
            </Column>

            <Column field="last_log_time" header="最後のログ" sortable>
              <template #body="slotProps">
                <div class="text-sm">
                  {{ formatDateTime(slotProps.data.last_log_time) }}
                  <div class="text-xs text-gray-500">{{ slotProps.data.last_action }}</div>
                </div>
              </template>
            </Column>

            <Column field="total_operations" header="操作回数" sortable class="text-center">
              <template #body="slotProps">
                <Badge :value="slotProps.data.total_operations" severity="info" />
              </template>
            </Column>

            <Column field="final_status" header="最終状態" sortable>
              <template #body="slotProps">
                <Badge :value="getFinalStatusText(slotProps.data.final_status)"
                  :severity="getFinalStatusSeverity(slotProps.data.final_status)" />
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>
    </div>

    <!-- Error Display -->
    <Message v-if="error" severity="error" class="mt-4">
      {{ error }}
    </Message>

    <!-- OTA XML Dialog -->
    <OTAXMLDialog v-model:visible="xmlDialogVisible" :xml-id="selectedXMLId" :service-name="selectedServiceName"
      @hide="closeXMLDialog" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useHotelStore } from '@/composables/useHotelStore';
import { otaInvestigationService } from '@/services/otaInvestigationService';
import { formatDate } from '@/utils/dateUtils';
import OTAXMLDialog from './dialogs/OTAXMLDialog.vue';

// PrimeVue Components
import { Card, FloatLabel, Select, DatePicker, Button, DataTable, Column, Badge, Message } from 'primevue';

// Store
const { hotels, fetchHotels } = useHotelStore();

// Reactive data
const selectedHotelId = ref(null);
const targetDate = ref(null);
const loading = ref(false);
const investigationResult = ref(null);
const error = ref(null);
const lifecycleStatusFilter = ref('all'); // New filter state

// Dialog state
const xmlDialogVisible = ref(false);
const selectedXMLId = ref(null);
const selectedServiceName = ref('');

// Computed properties for enhanced timeline
const enhancedTimeline = computed(() => {
  if (!investigationResult.value) return [];

  const timeline = investigationResult.value.eventTimeline;
  const totalRooms = investigationResult.value.currentState.totalRooms;
  const currentAvailableStock = investigationResult.value.currentState.calculatedAvailableStock;

  console.log('=== NEW TIMELINE CALCULATION ===');
  console.log('Timeline calculation:', {
    totalRooms,
    currentAvailableStock,
    timelineLength: timeline.length
  });

  // Sort events chronologically (oldest first)
  const sortedTimeline = [...timeline].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  console.log('First 3 events chronologically:', sortedTimeline.slice(0, 3).map(e => ({
    timestamp: e.timestamp,
    action: e.action,
    room_count_change: e.room_count_change,
    date: e.date,
    event_type: e.event_type
  })));

  console.log('Last 3 events chronologically:', sortedTimeline.slice(-3).map(e => ({
    timestamp: e.timestamp,
    action: e.action,
    room_count_change: e.room_count_change,
    date: e.date,
    event_type: e.event_type
  })));

  // Calculate running room count by going forward through time
  // Start with total rooms and apply each event's impact
  let runningCount = totalRooms;

  console.log('=== FORWARD CALCULATION ===');
  console.log('Starting with total rooms:', runningCount);

  // Calculate running room count by going forward through the timeline
  const enhancedEvents = sortedTimeline.map((event, index) => {
    // Apply the room count change for this event
    runningCount += (event.room_count_change || 0);

    const roomCountAfterEvent = Math.max(0, runningCount);

    if (index < 5 || index > sortedTimeline.length - 5) {
      console.log(`FORWARD Event ${index}: ${event.action} at ${event.timestamp}, room_count_change: ${event.room_count_change}, running_room_count: ${roomCountAfterEvent}`);
    }

    return {
      ...event,
      running_room_count: roomCountAfterEvent
    };
  });

  console.log('Final running count:', runningCount, 'should equal currentAvailableStock:', currentAvailableStock);

  if (runningCount !== currentAvailableStock) {
    console.warn('⚠️ MISMATCH: Final running count does not match currentAvailableStock!');
    console.warn('This suggests there may be missing events or incorrect room_count_change calculations');
    console.warn('Possible causes:');
    console.warn('1. Timeline includes events from multiple dates but currentState is only for target date');
    console.warn('2. Some events have incorrect room_count_change values');
    console.warn('3. Current state calculation is incorrect');

    // Debug info
    const insertEvents = enhancedEvents.filter(e => e.action === 'INSERT').length;
    const deleteEvents = enhancedEvents.filter(e => e.action === 'DELETE').length;
    const totalRoomChanges = enhancedEvents.reduce((sum, e) => sum + (e.room_count_change || 0), 0);

    console.warn('Debug info:', {
      insertEvents,
      deleteEvents,
      totalRoomChanges,
      expectedFinalCount: totalRooms + totalRoomChanges,
      actualCurrentState: currentAvailableStock
    });
  } else {
    console.log('✅ SUCCESS: Final running count matches currentAvailableStock');
  }

  console.log('=== END CALCULATION ===');

  // Return in reverse chronological order (newest first) for display
  return enhancedEvents.reverse();
});

// Computed property for filtered lifecycle data
const filteredLifecycleData = computed(() => {
  if (!investigationResult.value?.reservationLifecycle) return [];

  // Add computed room number for display and use backend sort value
  const dataWithComputedFields = investigationResult.value.reservationLifecycle.map(record => ({
    ...record,
    display_room_number: record.last_room_number || record.first_room_number || 'N/A',
    // Use backend room_number_sort if available, otherwise compute it
    sort_room_number: record.room_number_sort || (parseInt(record.last_room_number || record.first_room_number || '0') || 0)
  }));

  // Debug: Log first few records to check room number sorting
  if (dataWithComputedFields.length > 0) {
    console.log('Room number sorting debug:', dataWithComputedFields.slice(0, 3).map(r => ({
      display: r.display_room_number,
      sort: r.sort_room_number,
      last: r.last_room_number,
      first: r.first_room_number
    })));
  }

  if (lifecycleStatusFilter.value === 'all') {
    return dataWithComputedFields;
  }

  return dataWithComputedFields.filter(
    record => record.final_status === lifecycleStatusFilter.value
  );
});

// Methods
const runInvestigation = async () => {
  if (!selectedHotelId.value || !targetDate.value) {
    error.value = 'ホテルと調査対象日を選択してください。';
    return;
  }

  loading.value = true;
  error.value = null;
  investigationResult.value = null;
  lifecycleStatusFilter.value = 'all'; // Reset filter when running new investigation

  try {
    // Use the formatDate utility to properly format the date
    const dateString = formatDate(targetDate.value);

    console.log('Selected date:', targetDate.value);
    console.log('Formatted date string:', dateString);
    console.log('Hotel ID:', selectedHotelId.value);

    investigationResult.value = await otaInvestigationService.investigateStock(selectedHotelId.value, dateString);
  } catch (err) {
    console.error('Investigation error:', err);
    error.value = err.message || '調査中にエラーが発生しました。';
  } finally {
    loading.value = false;
  }
};

// Helper methods
const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const getEventTypeText = (eventType) => {
  const types = {
    'reservation': '予約',
    'reservation_detail': '予約詳細',
    'maintenance': 'メンテナンス',
    'ota_xml': 'OTA送信'
  };
  return types[eventType] || eventType;
};

const getEventTypeSeverity = (eventType) => {
  const severities = {
    'reservation': 'info',
    'reservation_detail': 'info',
    'maintenance': 'warn',
    'ota_xml': 'success'
  };
  return severities[eventType] || 'secondary';
};

const getActionText = (action) => {
  const actions = {
    'created': '作成',
    'updated': '更新',
    'INSERT': '追加',
    'UPDATE': '更新',
    'DELETE': '削除',
    'stock_adjustment': '在庫調整'
  };
  return actions[action] || action;
};

const getStatusText = (status) => {
  const statusTexts = {
    'confirmed': '確定',
    'pending': '保留',
    'cancelled': 'キャンセル',
    'completed': '完了',
    'failed': '失敗',
    'processing': '処理中',
    'checked_in': 'チェックイン済',
    'checked_out': 'チェックアウト済',
    'block': 'ブロック'
  };
  return statusTexts[status] || status;
};

const getStatusSeverity = (status) => {
  const severities = {
    'confirmed': 'success',
    'pending': 'warn',
    'cancelled': 'danger',
    'completed': 'success',
    'failed': 'danger',
    'processing': 'info',
    'checked_in': 'success',
    'checked_out': 'info',
    'block': 'warn'
  };
  return severities[status] || 'secondary';
};

const getRiskLevelText = (level) => {
  const levels = {
    'LOW': '低',
    'MEDIUM': '中',
    'HIGH': '高'
  };
  return levels[level] || level;
};

const getRiskLevelSeverity = (level) => {
  const severities = {
    'LOW': 'success',
    'MEDIUM': 'warn',
    'HIGH': 'danger'
  };
  return severities[level] || 'secondary';
};

const getRoomChangeClass = (change) => {
  if (change > 0) {
    return 'text-green-600 font-semibold'; // Rooms become available
  } else if (change < 0) {
    return 'text-red-600 font-semibold'; // Rooms become unavailable
  }
  return 'text-gray-400';
};

const getVerificationClass = () => {
  if (!investigationResult.value?.summary?.operationStats) return 'bg-gray-50 border border-gray-200';

  const stats = investigationResult.value.summary.operationStats;
  const currentState = investigationResult.value.currentState;
  const totalRooms = currentState.totalRooms;
  const currentAvailable = currentState.calculatedAvailableStock;

  let expectedAvailable;

  // Use CASCADE DELETE aware calculation if available
  if (stats.totalActive !== undefined) {
    expectedAvailable = totalRooms - stats.totalActive;
  } else {
    // Fallback to old calculation method
    expectedAvailable = totalRooms
      - stats.totalInserts
      + stats.totalDeletes
      + stats.updatesActiveToCancelled
      - stats.updatesCancelledToActive;
  }

  const discrepancy = expectedAvailable - currentAvailable;

  if (discrepancy === 0) {
    return 'bg-green-50 border border-green-200';
  } else {
    return 'bg-red-50 border border-red-200';
  }
};

const getVerificationMessage = () => {
  if (!investigationResult.value?.summary?.operationStats) return '統計情報なし';

  const stats = investigationResult.value.summary.operationStats;
  const currentState = investigationResult.value.currentState;
  const totalRooms = currentState.totalRooms;
  const currentAvailable = currentState.calculatedAvailableStock;

  // Use CASCADE DELETE aware calculation if available
  if (stats.totalActive !== undefined) {
    // New calculation using CASCADE DELETE aware lifecycle data
    const expectedAvailable = totalRooms - stats.totalActive;
    const discrepancy = expectedAvailable - currentAvailable;

    if (discrepancy === 0) {
      return `✅ 計算一致: ${totalRooms} - ${stats.totalActive} (有効予約) = ${expectedAvailable}`;
    } else {
      return `⚠️ 計算不一致: 期待値 ${expectedAvailable} vs 実際 ${currentAvailable} (差異: ${discrepancy})`;
    }
  } else {
    // Fallback to old calculation method
    const expectedAvailable = totalRooms
      - stats.totalInserts  // Active inserts reduce availability
      + stats.totalDeletes  // Deletes increase availability  
      + stats.updatesActiveToCancelled  // Cancellations increase availability
      - stats.updatesCancelledToActive; // Un-cancellations reduce availability

    const discrepancy = expectedAvailable - currentAvailable;

    if (discrepancy === 0) {
      return `✅ 計算一致: ${totalRooms} - ${stats.totalInserts} + ${stats.totalDeletes} + ${stats.updatesActiveToCancelled} - ${stats.updatesCancelledToActive} = ${expectedAvailable}`;
    } else {
      return `⚠️ 計算不一致: 期待値 ${expectedAvailable} vs 実際 ${currentAvailable} (差異: ${discrepancy})`;
    }
  }
};

const getFinalStatusText = (status) => {
  const statusTexts = {
    'active': '有効',
    'cancelled': 'キャンセル済',
    'deleted': '削除済'
  };
  return statusTexts[status] || status;
};

const getFinalStatusSeverity = (status) => {
  const severities = {
    'active': 'success',
    'cancelled': 'warn',
    'deleted': 'danger'
  };
  return severities[status] || 'secondary';
};

const getLifecycleStatusCount = (status) => {
  if (!investigationResult.value?.reservationLifecycle) return 0;
  return investigationResult.value.reservationLifecycle.filter(record => record.final_status === status).length;
};

// Dialog methods
const openXMLDialog = (xmlId, serviceName) => {
  selectedXMLId.value = xmlId;
  selectedServiceName.value = serviceName || '';
  xmlDialogVisible.value = true;
};

const closeXMLDialog = () => {
  xmlDialogVisible.value = false;
  selectedXMLId.value = null;
  selectedServiceName.value = '';
};

// Lifecycle
onMounted(async () => {
  await fetchHotels();
});
</script>

<style scoped>
.stock-investigator {
  max-width: 100%;
}

.p-field {
  margin-bottom: 0;
}
</style>