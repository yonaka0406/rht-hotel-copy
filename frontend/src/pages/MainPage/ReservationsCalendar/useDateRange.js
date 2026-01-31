import { ref } from 'vue';
import { formatDate } from '@/utils/dateUtils';

export function useDateRange(selectedHotelId, fetchReservedRooms) {
  const dateRange = ref([]);
  const minDate = ref(null);
  const maxDate = ref(null);

  const generateDateRange = (start, end) => {
    const dates = [];
    const endDate = new Date(end);
    for (let d = new Date(start); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(formatDate(new Date(d)));
    }
    return dates;
  };

  const appendDaysToRange = async (direction) => {
    if (direction === "up") {
      const oldMinDateValue = minDate.value;
      const newMinDate = new Date(minDate.value);
      newMinDate.setDate(newMinDate.getDate() - 7);
      minDate.value = formatDate(newMinDate);

      const newMaxDate = new Date(oldMinDateValue);
      newMaxDate.setDate(newMaxDate.getDate() - 1);

      const newDates = generateDateRange(newMinDate, newMaxDate);
      dateRange.value = [...newDates, ...dateRange.value];

      await fetchReservedRooms(selectedHotelId.value, minDate.value, formatDate(newMaxDate));

    } else if (direction === "down") {
      const oldMaxDateValue = maxDate.value;
      const newMaxDate = new Date(maxDate.value);
      newMaxDate.setDate(newMaxDate.getDate() + 7);
      maxDate.value = formatDate(newMaxDate);

      const newMinDate = new Date(oldMaxDateValue);
      newMinDate.setDate(newMinDate.getDate() + 1);

      const newDates = generateDateRange(newMinDate, newMaxDate);
      dateRange.value = [...dateRange.value, ...newDates];

      await fetchReservedRooms(selectedHotelId.value, formatDate(newMinDate), maxDate.value);
    }
  };

  return {
    dateRange,
    minDate,
    maxDate,
    generateDateRange,
    appendDaysToRange
  };
}
