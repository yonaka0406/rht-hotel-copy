<template>
  <Panel class="dark:bg-gray-800 dark:border-gray-700">
    <template #header>
      <div class="flex items-center w-full">
        <div class="flex-grow"></div> <!-- Left spacer -->
        <h2 class="text-xl font-semibold text-gray-700 dark:text-gray-200 flex-shrink-0">予定表</h2>
        <div class="flex-grow flex justify-end"> <!-- Right spacer and button container -->
          
          <Button v-if="checkInClientsCount > 0" label="宿泊者名簿を作成" icon="pi pi-file-excel" severity="info"
            @click="createGuestList" :loading="isGenerating" />
            
        </div>
      </div>
    </template>
    <div v-if="isLoading" class="grid gap-4">
      <div v-for="n in 4" :key="n" class="col-span-1 md:col-span-1">
        <Skeleton shape="rectangle" width="100%" height="50px" />
      </div>
    </div>
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div v-for="group in filteredRoomGroups" 
           :key="group.title" 
           class="col-span-1 lg:col-span-1">
        <div
          :class="`p-2 rounded-lg ${group.color} ${group.darkColor}`">
          <Card class="p-2 dark:bg-gray-700 dark:border-gray-600">
            <template #header>
              <h3 :class="`text-lg rounded-lg font-semibold mb-2 ${group.color} ${group.darkColor} dark:text-white`">{{
                group.title }} ({{ group.rooms.length }})</h3>
            </template>
            <template #content>
              <div v-if="group.rooms.length > 0"
                class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                <div v-for="room in group.rooms" :key="`${room.room_id}-${room.id || 'no-reservation'}`" :class="[
                  'p-2 rounded outline-zinc-500/50 dark:outline-gray-400/50 outline-dashed',
                  // Default background
                  'dark:bg-gray-600',
                  // Conditional background colors based on group and status
                  {
                    // 本日チェックアウト - Already checked out (completed)
                    'bg-green-200 dark:bg-green-800': group.title === '本日チェックアウト' && room.status === 'checked_out',

                    // 本日チェックイン - Already checked in or checked out (completed)
                    'bg-blue-200 dark:bg-blue-800': group.title === '本日チェックイン' && (room.status === 'checked_in' || room.status === 'checked_out'),

                    // Default background for pending/incomplete statuses
                    'bg-white dark:bg-gray-600': !(
                      (group.title === '本日チェックアウト' && room.status === 'checked_out') ||
                      (group.title === '本日チェックイン' && (room.status === 'checked_in' || room.status === 'checked_out'))
                    )
                  }
                ]">
                  <!-- Status completion indicator -->
                  <div v-if="group.title === '本日チェックアウト' && room.status === 'checked_out'"
                    class="absolute top-1 right-1 text-xs bg-green-500 text-white px-2 py-1 rounded">
                    完了
                  </div>
                  <div
                    v-else-if="group.title === '本日チェックイン' && (room.status === 'checked_in' || room.status === 'checked_out')"
                    class="absolute top-1 right-1 text-xs bg-blue-500 text-white px-2 py-1 rounded">
                    完了
                  </div>

                  <!-- Rest of your existing room card content -->
                  <div class="flex items-center justify-between">
                    <span class="font-semibold dark:text-white">{{ room.room_number + '：' + room.room_type_name
                      }}</span>
                    <div class="flex items-center">
                      <div v-if="room.number_of_people" class="flex items-center mr-2">
                        <div class="flex items-center dark:text-gray-200">
                          <i class="pi pi-users mr-1"></i>
                          <span>{{ room.number_of_people }}</span>
                        </div>
                      </div>
                      <div class="flex items-center justify-end">
                        <span v-if="room.status === 'hold'" class="bg-yellow-500 rounded-full w-3 h-3 mr-1"></span>
                        <span v-else-if="room.status === 'provisory'"
                          class="bg-cyan-300 rounded-full w-3 h-3 mr-1"></span>
                        <span v-else-if="room.status === 'confirmed'"
                          class="bg-sky-600 rounded-full w-3 h-3 mr-1"></span>
                        <span v-else-if="room.status === 'checked_in'"
                          class="bg-green-500 rounded-full w-3 h-3 mr-1"></span>
                        <span v-else-if="room.status === 'checked_out'"
                          class="bg-purple-500 rounded-full w-3 h-3 mr-1"></span>
                        <span v-else-if="room.status === 'cancelled'"
                          class="bg-red-500 rounded-full w-3 h-3 mr-1"></span>
                        <span v-else class="bg-gray-500 rounded-full w-3 h-3 mr-1"></span>
                      </div>
                    </div>
                  </div>

                  <!-- Client info section -->
                  <div v-if="room.client_name">
                    <div v-if="room.client_name" class="flex self-center dark:text-gray-200"
                      @click="openEditReservation(room)">
                      <i v-if="room.has_important_comment"
                        class="pi pi-exclamation-triangle text-yellow-500 animate-pulse" style="font-size: 2rem"
                        v-tooltip.top="'重要コメントがあります'">
                      </i>
                      <div v-else>
                        <Avatar icon="pi pi-user" size="small" class="mr-2" />
                      </div>
                      <div class="flex flex-wrap gap-1 mb-2">
                        <div v-for="client in getClientName(room)" :key="client.name" class="flex items-center">
                          <span v-if="client.gender === 'male'" class="mr-1 text-blue-500">♂</span>
                          <span v-else-if="client.gender === 'female'" class="mr-1 text-pink-500">♀</span>
                          <Button :label="client.name" :severity="client.isBooker ? 'info' : 'secondary'" size="small"
                            :rounded="true" :text="true" :outlined="true"
                            v-tooltip.top="client.isBooker ? '予約者' : '宿泊者'" />
                        </div>
                      </div>
                    </div>
                    <p v-if="room.payment_timing === 'on-site'" class="mb-2 text-emerald-500"><i
                        class="pi pi-wallet mr-1"></i>{{ translatePaymentTiming(room.payment_timing) }}</p>
                    <div v-else class="mb-2"></div>
                  </div>
                  <div v-else @click="openNewReservation(room)" class="dark:text-gray-200">
                    <Avatar icon="pi pi-plus" size="small" class="mr-2" />
                    <span>予約を追加</span>
                  </div>

                  <!-- Time and plan info -->
                  <div v-if="group.title === '本日チェックイン'">
                    <div class="flex items-center gap-2">
                      <span class="dark:text-gray-200">
                        <i class="pi pi-clock mr-1"></i>
                        {{ room.check_in_time ? formatTime(room.check_in_time) : '' }}
                      </span>

                      <div v-if="room.plan_name">
                        <div v-for="(planData, planName) in planSummary[room.reservation_id]?.[room.room_number]" :key="planName" class="mb-1">
                          <Button type="button" :label="`${planName}`" :badge="`${planData.count}`"
                            badgeSeverity="secondary" variant="outlined" :style="{
                              backgroundColor: `${planData.color}40`,
                              border: `1px solid ${planData.color}`,
                              color: 'black',
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.5rem'
                            }" v-tooltip.top="getPlanDaysTooltip(planData.details, planName)" />
                        </div>
                      </div>
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      <i class="pi pi-calendar mr-1"></i>アウト: {{ formatDate(new Date(room.check_out)) }}
                    </p>
                  </div>
                  <div v-else-if="group.title === '本日チェックアウト'" class="flex items-center gap-2">
                    <div>
                      <span class="dark:text-gray-200">
                        <i class="pi pi-clock mr-1"></i>
                        {{ room.check_out_time ? formatTime(room.check_out_time) : '' }}
                      </span>
                    </div>
                  </div>
                  <div v-else>
                    <div v-if="room.plan_name">
                      <div v-for="(planData, planName) in planSummary[room.reservation_id]?.[room.room_number]" :key="planName" class="mb-1">
                        <Button type="button" :label="`${planName}`" :badge="`${planData.count}`"
                          badgeSeverity="secondary" variant="outlined" :style="{
                            backgroundColor: `${planData.color}40`,
                            border: `1px solid ${planData.color}`,
                            color: 'black',
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem'
                          }" v-tooltip.top="getPlanDaysTooltip(planData.details, planName)" />
                      </div>
                      <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        <i class="pi pi-calendar mr-1"></i>アウト: {{ formatDate(new Date(room.check_out)) }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else>
                <p class="dark:text-gray-400">予約予定はありません。</p>
              </div>
            </template>


          </Card>
        </div>
      </div>
    </div>
  </Panel>
</template>

<script setup>
// Vue
import { computed } from 'vue';

const props = defineProps({
  isLoading: {
    type: Boolean,
    required: true,
  },
  roomGroups: {
    type: Array,
    required: true,
  },
  openNewReservation: {
    type: Function,
    required: true,
  },
  openEditReservation: {
    type: Function,
    required: true,
  },
  getClientName: {
    type: Function,
    required: true,
  },
  translatePaymentTiming: {
    type: Function,
    required: true,
  },
  formatTime: {
    type: Function,
    required: true,
  },
  formatDate: {
    type: Function,
    required: true,
  },
  planSummary: {
    type: Object,
    required: true,
  },
  getPlanDaysTooltip: {
    type: Function,
    required: true,
  },
  selectedDate: {
    type: Date,
    required: true,
  },
  selectedHotelId: {
    type: [String, Number],
    required: true,
  },
});

const filteredRoomGroups = computed(() => {
  const specialTitles = ['部屋ブロック', '部屋移動'];
  return props.roomGroups.filter(group => {
    const isSpecial = specialTitles.includes(group.title);
    const rooms = group.rooms || [];
    
    if (isSpecial) {
      return rooms.length > 0;
    }
    
    return true;
  });
});

// Primevue
import Panel from 'primevue/panel';
import Card from 'primevue/card';
import Skeleton from 'primevue/skeleton';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';

// Store
import { useGuestStore } from '@/composables/useGuestStore';
const { isGenerating, generateGuestListExcel } = useGuestStore();

const checkInClientsCount = computed(() => {
  const checkInGroup = props.roomGroups.find(group => group.title === '本日チェックイン');
  return checkInGroup ? checkInGroup.rooms.length : 0;
});

const createGuestList = async () => {
  try {
    const formattedDate = props.formatDate(props.selectedDate);
    await generateGuestListExcel(formattedDate, props.selectedHotelId); // Call the store function
    //console.log('Guest list Excel file download initiated via store.');
  } catch (error) {
    console.error('Error creating guest list via store:', error);
    // TODO: Show a toast notification for the error
  }
};
</script>

<style scoped>
/* Add any specific styles for the Panel or its contents if they were present in RoomIndicator.vue and are not global */
</style>