<template>
  <div>
    <h2 class="text-xl font-semibold mb-3 text-gray-700 dark:text-gray-200">当日の概要</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card v-for="metric in summaryMetrics" :key="metric.title" class="shadow-md rounded-lg dark:bg-gray-800 dark:border-gray-700">
        <template #title>
          <i :class="[metric.icon, metric.iconColor, 'text-xl mr-2']"></i>
          <span class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ metric.title }}</span>
        </template>
        <template #content>
          <div v-if="!isLoading" class="text-center">
            <p class="text-3xl font-bold text-gray-800 dark:text-white pt-1">{{ metric.count }}</p>
            <template v-if="metric.title === '滞在者数' && metric.roomMoveCount">
              <div class="flex items-center justify-center gap-2 mt-1">
                <span class="text-sm text-gray-600 dark:text-gray-300">その内、部屋移動</span>
                <Badge :value="metric.roomMoveCount" severity="warn" class="px-2 py-0.5 text-sm" />
              </div>
            </template>
            <template v-else-if="metric.title === '空室数' && metric.blockedRoomsCount">
              <div class="flex items-center justify-center gap-2 mt-1">
                <span class="text-sm text-gray-600 dark:text-gray-300">部屋ブロック</span>
                <Badge :value="metric.blockedRoomsCount" severity="danger" class="px-2 py-0.5 text-sm" />                
              </div>
            </template>
          </div>
          <div v-else class="flex justify-center">
            <Skeleton width="3rem" height="2rem" class="mt-1"></Skeleton>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import Card from 'primevue/card';
import Skeleton from 'primevue/skeleton';
import Badge from 'primevue/badge';

const props = defineProps({
  roomGroups: {
    type: Array,
    required: true,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
});

const summaryMetrics = computed(() => {
  const checkInCount = props.roomGroups.find(g => g.title === '本日チェックイン')?.rooms.length || 0;
  const checkOutCount = props.roomGroups.find(g => g.title === '本日チェックアウト')?.rooms.length || 0;
  const occupiedCount = props.roomGroups.find(g => g.title === '滞在')?.rooms.length || 0;
  const freeRoomsCount = props.roomGroups.find(g => g.title === '空室')?.rooms.length || 0;
  const roomMoveCount = props.roomGroups.find(g => g.title === '部屋移動')?.rooms.length || 0;
  const blockedRoomsCount = props.roomGroups.find(g => g.title === '部屋ブロック')?.rooms.length || 0;

  return [
    {
      title: '本日チェックイン',
      icon: 'pi pi-arrow-down-left',
      iconColor: 'text-blue-500',
      count: checkInCount
    },
    {
      title: '本日チェックアウト',
      icon: 'pi pi-arrow-up-right',
      iconColor: 'text-green-500',
      count: checkOutCount
    },
    {
      title: '滞在者数',
      icon: 'pi pi-users',
      iconColor: 'text-yellow-500',
      count: occupiedCount + roomMoveCount,
      roomMoveCount: roomMoveCount > 0 ? roomMoveCount : undefined
    },
    {
      title: '空室数',
      icon: 'pi pi-home',
      iconColor: 'text-gray-500',
      count: freeRoomsCount,
      blockedRoomsCount: blockedRoomsCount > 0 ? blockedRoomsCount : undefined
    },
  ];
});
</script>

<style scoped>
</style>
