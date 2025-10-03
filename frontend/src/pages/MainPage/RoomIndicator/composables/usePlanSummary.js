import { computed } from 'vue';
import { useReservationStore } from '@/composables/useReservationStore';
import { formatDate } from '@/utils/dateUtils';

export function usePlanSummary(selectedDate) {
  const { reservedRoomsDayView } = useReservationStore();

  const planSummary = computed(() => {
    const roomPlans = {};
    const reservations = reservedRoomsDayView.value?.filter(room => room.cancelled === null && room.status !== 'cancelled') || [];
    const selectedDateStr = formatDate(selectedDate.value);
    
    // Process each reservation
    reservations.forEach(reservation => {
      if (!reservation?.id) return;
      
      const roomNumber = reservation.room_number;
      if (!roomNumber) {
        return;
      }
      
      // Only process reservations that are relevant for the selected date
      const checkInDate = new Date(reservation.check_in);
      const checkOutDate = new Date(reservation.check_out);
      const selectedDateObj = new Date(selectedDate.value);
      
      // Skip this reservation if it doesn't overlap with the selected date
      // A reservation is relevant if:
      // 1. It's checking in today, OR
      // 2. The selected date falls within the stay period (check-in <= selected < check-out)
      const isCheckingInToday = formatDate(checkInDate) === selectedDateStr;
      const isActiveDuringSelectedDate = checkInDate <= selectedDateObj && selectedDateObj < checkOutDate;
      
      if (!isCheckingInToday && !isActiveDuringSelectedDate) {
        return; // Skip this reservation
      }
      
      if (!roomPlans[roomNumber]) {
        roomPlans[roomNumber] = {};
      }
      
      // Process each day's plan in the reservation, but only count plans for the selected date
      if (reservation.details?.length) {
        reservation.details.forEach(detail => {
          // Count all plan details for non-checkout reservations
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
      }
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
