import { ref, computed, watch, toRef } from 'vue';

/**
* A composable to calculate cancellation fees for long-term reservations.
* @param {Function} getReservationDetails - Function that returns the reservation details
* @param {ref<Date>} cancellationDate - The simulated date of cancellation.
* @param {ref<number>} ruleDays - The number of days before the stay when cancellation fees apply.
*/
export function useCancellationFeeCalculator(getReservationDetails, cancellationDate, ruleDays = ref(30)) {
  const reservationInfo = ref({});
  
  // Watch for changes to reservationDetails
  watch(() => getReservationDetails(), (newDetails) => {
    
    if (!newDetails) {
      reservationInfo.value = {};
      return;
    }
    
    // If it's an array, get the first item with check_in/check_out, otherwise use the object directly
    let details = newDetails;
    
    if (Array.isArray(newDetails)) {
      // Find the first item with check_in and check_out
      details = newDetails.find(item => item.check_in && item.check_out) || {};
      
      if (!details.check_in || !details.check_out) {
        details = {};
      }
    }    

    reservationInfo.value = details;
  }, { immediate: true });

  const formatDate = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      console.error("Invalid Date object:", date);
      throw new Error("The provided input is not a valid Date object:");
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const numberOfNights = computed(() => {
    if (!reservationInfo.value?.check_in || !reservationInfo.value?.check_out) {
      return 0;
    }
    
    const checkIn = new Date(reservationInfo.value.check_in);
    const checkOut = new Date(reservationInfo.value.check_out);
    
    // Set to noon to avoid timezone issues
    checkIn.setHours(12, 0, 0, 0);
    checkOut.setHours(12, 0, 0, 0);
    
    const diffTime = checkOut.getTime() - checkIn.getTime();
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return nights;
  });

  const isLongTermReservation = computed(() => {
    const isLongTerm = numberOfNights.value >= 30;
    return isLongTerm;
  });

  const cancellationFeeDate = computed(() => {
    if (!isLongTermReservation.value || !reservationInfo.value?.check_in) {
      return null;
    }
    const checkInDate = new Date(reservationInfo.value.check_in);
    checkInDate.setHours(12, 0, 0, 0);
    checkInDate.setDate(checkInDate.getDate() - ruleDays.value);
    return checkInDate;
  });
  
  const nightsCancelled = computed(() => {
    const defaultValue = { dates: [], count: 0 };
    if (
      !reservationInfo.value?.check_in ||
      !reservationInfo.value?.check_out ||
      !cancellationDate.value ||
      ruleDays.value <= 0
    ) {
      console.log("Skipping calculation – invalid parameters");
      return defaultValue;
    }
  
    const checkIn = formatDate(new Date(reservationInfo.value.check_in));
    const checkOut = formatDate(new Date(reservationInfo.value.check_out));
        const cancelDateObj = new Date(cancellationDate.value);
    const cancelStart = formatDate(cancelDateObj);

    let cancelRangeStart;
    if (cancelStart <= checkOut && cancelStart >= checkIn) {
      cancelRangeStart = cancelStart;
    } else {
            const nextDay = new Date(cancelDateObj);
            nextDay.setDate(nextDay.getDate() + 1);
            cancelRangeStart = formatDate(nextDay);
        }

        const endDate = new Date(cancelDateObj);
        endDate.setDate(endDate.getDate() + ruleDays.value);
        const cancelRangeEnd = formatDate(endDate);

        // Determine the actual overlap between the reservation and the cancellation window
        const overlapRangeStart = checkIn > cancelRangeStart ? checkIn : cancelRangeStart;
        const overlapRangeEnd = checkOut < cancelRangeEnd ? checkOut : cancelRangeEnd;

        if (overlapRangeEnd < overlapRangeStart) {
            return defaultValue;
        }

        const dates = [];
        const currentDate = new Date(overlapRangeStart);
        const lastDate = new Date(overlapRangeEnd);

        currentDate.setHours(12, 0, 0, 0);
        lastDate.setHours(12, 0, 0, 0);

        while (currentDate <= lastDate) {
            dates.push(formatDate(new Date(currentDate)));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        console.log({checkIn, checkOut, cancelStart, cancelRangeStart, cancelRangeEnd, overlapRangeStart, overlapRangeEnd, nights: dates.length, dates});

        return { dates, count: dates.length };
  });

  const totalFee = computed(() => {
    if (
      nightsCancelled.value.count === 0 ||
      !isLongTermReservation.value ||
      !Array.isArray(reservationInfo.value?.reservation_rates)
    ) {
      return 0;
    }

    // Use a Set for efficient date lookups
    const cancelledDates = new Set(nightsCancelled.value.dates);

    const total = reservationInfo.value.reservation_rates
      .filter(rate => 
        rate.adjustment_type === 'base_rate' && 
        cancelledDates.has(rate.date)
      )
      .reduce((sum, rate) => sum + (parseFloat(rate.price) || 0), 0);

    const fee = Math.round(total);
    
    console.log('Fee calculation:', {
      cancelledDates: nightsCancelled.value.dates,
      totalFee: fee
    });
    
    return fee;
  });

  return {
    nightsCancelled,
    totalFee,
    isLongTermReservation,
    cancellationFeeDate,
    reservationInfo: computed(() => reservationInfo.value),
    numberOfNights
  };
}
