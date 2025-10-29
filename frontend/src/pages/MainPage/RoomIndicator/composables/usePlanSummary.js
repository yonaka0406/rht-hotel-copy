import { computed } from 'vue';
import { useReservationStore } from '@/composables/useReservationStore';
import { formatDate } from '@/utils/dateUtils';

export function usePlanSummary(selectedDate) {
  const { roomsForIndicator } = useReservationStore();

  const planSummary = computed(() => {
    const roomPlans = {};
    const reservations = roomsForIndicator.value?.filter(room => room.cancelled === null && room.status !== 'cancelled') || [];

    
    // Process each reservation detail (which is a room for the selected date)
    reservations.forEach(roomDetail => {
      if (!roomDetail?.room_id) return;
      
      const roomNumber = roomDetail.room_number;
      if (!roomNumber) {
        return;
      }
      
      if (!roomPlans[roomNumber]) {
        roomPlans[roomNumber] = {};
      }
      
      // Iterate through all roomDetail entries for this room to get the full plan count
      roomDetail.details?.forEach(detail => {
        const planName = detail.plan_name || '未設定';
        const planColor = detail.plan_color || '#CCCCCC';

        if (!roomPlans[roomNumber][planName]) {
          roomPlans[roomNumber][planName] = {
            count: 0,
            color: planColor,
            details: []
          };
        }
        roomPlans[roomNumber][planName].count++;
        roomPlans[roomNumber][planName].details.push(detail);
      });
    });
    
    return roomPlans;
  });

  const getPlanDaysTooltip = (details, planName) => {
    if (!details || !details.length) {
      return null;
    }

    const planDetails = details.filter(detail => detail.plan_name === planName);
    
    // Define day order (0 = Sunday, 1 = Monday, etc.)
    const dayOrder = { '日': 7, '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6 };
    
    // Get unique days for the plan
    const days = [...new Set(
      planDetails
        .filter(detail => detail.plan_name === planName)
        .map(detail => {
          const date = new Date(detail.date);
          return date.toLocaleDateString('ja-JP', { weekday: 'short' }).replace('曜日', '');
        })
    )];
    
    // Sort days according to dayOrder
    const sortedDays = days.sort((a, b) => dayOrder[a] - dayOrder[b]);
    
    return `曜日: ${sortedDays.join(', ')}`;
  };

  return {
    planSummary,
    getPlanDaysTooltip
  };
}
