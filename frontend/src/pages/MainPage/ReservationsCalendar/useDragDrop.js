import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from "primevue/useconfirm";
import { formatDate } from '@/utils/dateUtils';

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

export function useDragDrop(dependencies) {
  const {
    reservedRooms,
    reservationDetails,
    selectedHotelRooms,
    reservedRoomsMap,
    tempReservationsMap,
    tempReservations,
    tempRoomData,
    hasChanges,
    dragMode,
    selectedHotelId,
    setReservationId,
    fetchReservation,
    setCalendarChange,
    setReservationRoom,
    setCalendarFreeChange,
    fetchReservations,
    dateRange,
    isUpdating,
    openDrawer
  } = dependencies;

  const toast = useToast();
  const confirm = useConfirm();
  const confirmRoomMode = useConfirm();

  const draggingStyle = ref({});
  const selectedRoomByDay = ref([]);
  const reservationCardData = ref([]);
  const selectedCellReservations = ref([]);
  const reservationCardVisible = ref(false);
  const isDrawerExpanded = ref(false);

  const formattedMessage = ref('');

  const showReservationCard = () => {
    isDrawerExpanded.value = false;
    reservationCardVisible.value = true;
  };
  const expandDrawer = () => {
    isDrawerExpanded.value = true;
    reservationCardVisible.value = true;
  };

  const collapseDrawer = () => {
    isDrawerExpanded.value = false;
  };

  const handleCardDragStart = (event, reservation) => {
    reservationCardVisible.value = false;
    selectedCellReservations.value = reservation;
  };

  const draggingRoomId = ref(null);
  const draggingDate = ref(null);

  const startDrag = (event, roomId, date, getReservationForCell) => {
    const reservation = getReservationForCell(roomId, date);
    if (reservation.reservation_id) {
      draggingRoomId.value = roomId;
      draggingDate.value = date;

      const rect = event.target.getBoundingClientRect();
      draggingStyle.value = {
        position: 'absolute',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'row',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
        pointerEvents: 'none',
      };
    }
  };

  const endDrag = () => {
    draggingRoomId.value = null;
    draggingDate.value = null;
  };

  const highlightDropZone = (event) => {
    const cell = event.target.closest('td');
    if (cell) {
      cell.classList.add('drop-zone');
      const rowIndex = cell.parentElement.rowIndex;
      const firstColCell = document.querySelector(`tbody tr:nth-child(${rowIndex}) td:first-child`);
      if (firstColCell) {
        firstColCell.classList.add('drop-zone-first-col');
      }
      const cellIndex = cell.cellIndex;
      const th = document.querySelector(`thead th:nth-child(${cellIndex + 1})`);
      if (th) {
        th.classList.add('drop-zone-th');
      }
    }
  };

  const removeHighlight = (event) => {
    if (event) {
      setTimeout(() => {
        const cell = event.target.closest('td');
        if (cell) {
          cell.classList.remove('drop-zone');
          const rowIndex = cell.parentElement.rowIndex;
          const firstColCell = document.querySelector(`tbody tr:nth-child(${rowIndex}) td:first-child`);
          if (firstColCell) {
            firstColCell.classList.remove('drop-zone-first-col');
          }
          const cellIndex = cell.cellIndex;
          const th = document.querySelector(`thead th:nth-child(${cellIndex + 1})`);
          if (th) {
            th.classList.remove('drop-zone-th');
          }
        }
      }, 300);
    } else {
      document.querySelectorAll('.drop-zone').forEach(zone => zone.classList.remove('drop-zone'));
      document.querySelectorAll('.drop-zone-first-col').forEach(zone => zone.classList.remove('drop-zone-first-col'));
      document.querySelectorAll('.drop-zone-th').forEach(zone => zone.classList.remove('drop-zone-th'));
    }
  };

  const dragFrom = ref({ reservation_id: null, room_id: null, room_number: null, room_type_name: null, number_of_people: null, check_in: null, check_out: null, days: null });
  const dragTo = ref({ room_id: null, room_number: null, room_type_name: null, capacity: null, check_in: null, check_out: null });

  const onDragStart = async (event, roomId, date, getReservationForCell) => {
    dragFrom.value = null;
    const reservation = getReservationForCell(roomId, date);
    const reservation_id = reservation.reservation_id;

    if (reservation_id) {
      const check_in = formatDate(new Date(reservation.check_in));
      const check_out = formatDate(new Date(reservation.check_out));
      const room_id = reservation.room_id;
      const room_number = reservation.room_number;
      const room_type_name = reservation.room_type_name;
      const number_of_people = reservation.number_of_people;
      const days = Math.floor((new Date(check_out) - new Date(check_in)) / MILLIS_PER_DAY);
      dragFrom.value = { reservation_id, room_id, room_number, room_type_name, number_of_people, check_in, check_out, days };
      await fetchReservation(reservation_id, selectedHotelId.value);
    }
  };

  const checkForConflicts = (from, to) => {
    if (!reservationDetails.value.reservation) return false;
    const dateDiffDays = (new Date(to.check_in) - new Date(from.check_in)) / MILLIS_PER_DAY;

    for (const reservation of reservationDetails.value.reservation) {
      let targetDateStr;
      if (from.room_number === to.room_number || (from.check_in !== to.check_in || from.check_out !== to.check_out)) {
        const newDate = new Date(reservation.date);
        newDate.setDate(newDate.getDate() + dateDiffDays);
        targetDateStr = formatDate(newDate);
      } else {
        targetDateStr = reservation.date;
      }
      const conflictRes = reservedRoomsMap.value[`${to.room_id}_${targetDateStr}`];
      if (conflictRes && conflictRes.reservation_id !== reservation.reservation_id) {
        return true;
      }
    }
    return false;
  };

  const showConfirmationPrompt = async () => {
    const from = dragFrom.value;
    const to = dragTo.value;
    let message = '';
    if (from.room_number === to.room_number) {
      message = `<b>${from.room_number}号室</b>の宿泊期間を<br/>「IN：${from.check_in} OUT：${from.check_out}」から<br/>「IN：${to.check_in} OUT：${to.check_out}」にしますか?<br/>`;
    } else if (from.check_in === to.check_in && from.check_out === to.check_out) {
      message = `<b>${from.room_number}号室</b>の予約を<br/><b>${to.room_number}号室</b>に移動しますか?<br/>`;
    } else {
      message = `<b>${from.room_number}号室</b>の宿泊期間を<br/>「IN：${from.check_in} OUT：${from.check_out}」から<br/>「IN：${to.check_in} OUT：${to.check_out}」に変更し、<br/><b>${to.room_number}号室</b>に移動しますか?<br/>`;
    }

    formattedMessage.value = message;

    confirm.require({
      group: 'templating',
      header: '確認',
      icon: 'pi pi-exclamation-triangle',
      acceptProps: { label: 'はい' },
      accept: async () => {
        if (!checkForConflicts(from, to)) {
          isUpdating.value = true;
          await setCalendarChange(from.reservation_id, from.check_in, from.check_out, to.check_in, to.check_out, from.room_id, to.room_id, from.number_of_people, 'solo');
          setReservationId(null);
          isUpdating.value = false;
          await fetchReservations(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);
        } else {
          toast.add({ severity: 'error', summary: 'エラー', detail: '予約が重複しています。', life: 3000 });
        }
        confirm.close('templating');
      },
      rejectProps: { label: 'キャンセル', severity: 'secondary', outlined: true },
      reject: () => { confirm.close('templating'); }
    });
  };

  const onDrop = (event, roomId, date) => {
    if (dragMode.value === 'reservation') {
      if (!dragFrom.value) return;
      const selectedRoom = selectedHotelRooms.value.find(room => room.room_id === roomId);
      const check_in = formatDate(new Date(date));
      const check_out = formatDate(new Date(new Date(date).setDate(new Date(date).getDate() + dragFrom.value.days)));
      const room_id = selectedRoom.room_id;
      const room_number = selectedRoom.room_number;
      const room_type_name = selectedRoom.room_type_name;
      const capacity = selectedRoom.room_capacity;
      dragTo.value = { room_id, room_number, room_type_name, capacity, check_in, check_out };

      const from = dragFrom.value;
      const to = dragTo.value;

      const startDate = new Date(from.check_in);
      const endDate = new Date(from.check_out);
      endDate.setDate(endDate.getDate() - 1);
      const allDates = [];
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        allDates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      const roomReservations = reservedRooms.value.filter(room => room.reservation_id === from.reservation_id && room.room_id === from.room_id);
      const bookedDates = roomReservations.map(room => formatDate(new Date(room.date)));
      const isRoomFullyBooked = allDates.every(date => bookedDates.includes(date));

      if (!isRoomFullyBooked) {
        toast.add({ severity: 'warn', summary: '注意', detail: '部屋が分割されています。日ごとに部屋移動モードで変更を行ってください。', life: 3000 });
      } else if (from.number_of_people > to.capacity) {
        toast.add({ severity: 'error', summary: 'エラー', detail: '人数が収容人数を超えています。', life: 3000 });
      } else if (!checkForConflicts(from, to)) {
        showConfirmationPrompt();
      } else {
        toast.add({ severity: 'error', summary: 'エラー', detail: '予約が重複しています。', life: 3000 });
      }
    } else if (dragMode.value === 'roomByDay') {
      if (selectedRoomByDay.value.length > 0) {
        selectedRoomByDay.value = [];
      }
    } else if (dragMode.value === 'reorganizeRooms') {
      const key = `${draggingRoomId.value}_${draggingDate.value}`;
      if (reservationCardData.value && !reservationCardVisible.value) {
        const reservation = selectedCellReservations.value;
        const originalDetails = reservation.details;
        let minDate = originalDetails.length > 0 ? new Date(originalDetails[0].date) : null;
        for (let i = 1; i < originalDetails.length; i++) {
          const currentDate = new Date(originalDetails[i].date);
          if (currentDate < minDate) minDate = currentDate;
        }

        let hasConflicts = false;
        for (const detail of originalDetails) {
          const detailDate = formatDate(new Date(detail.date));
          const conflictKey = `${roomId}_${detailDate}`;
          if (tempReservationsMap.value[conflictKey]) {
            hasConflicts = true;
            break;
          }
        }
        if (!hasConflicts) {
          originalDetails.forEach(detail => {
            const updatedDetail = { ...detail };
            updatedDetail.room_id = roomId;
            const dateDiff = new Date(date) - new Date(minDate);
            const newDetailDate = new Date(detail.date);
            newDetailDate.setDate(newDetailDate.getDate() + dateDiff / MILLIS_PER_DAY);
            updatedDetail.date = formatDate(newDetailDate);
            updatedDetail.check_in = formatDate(new Date(new Date(updatedDetail.check_in).setDate(new Date(updatedDetail.check_in).getDate() + dateDiff / MILLIS_PER_DAY)));
            updatedDetail.check_out = formatDate(new Date(new Date(updatedDetail.check_out).setDate(new Date(updatedDetail.check_out).getDate() + dateDiff / MILLIS_PER_DAY)));
            tempReservations.value.push(updatedDetail);
            const existingItemIndex = tempRoomData.value.findIndex(item => item.id === updatedDetail.id);
            if (existingItemIndex !== -1) tempRoomData.value.splice(existingItemIndex, 1);
            tempRoomData.value.push(updatedDetail);
          });
          hasChanges.value = true;
        } else {
          toast.add({ severity: 'error', summary: 'エラー', detail: '予約が重複しています。', life: 2000 });
          setTimeout(() => { reservationCardVisible.value = true; }, 2000);
          return;
        }

        const reservationIndex = reservationCardData.value.findIndex((item) => item.reservation_id === reservation.reservation_id && item.room_id === reservation.room_id);
        if (reservationIndex !== -1) reservationCardData.value.splice(reservationIndex, 1);
        selectedCellReservations.value = [];
        if (reservationCardData.value.length === 0) reservationCardVisible.value = false;
        else reservationCardVisible.value = true;

      } else if (tempReservationsMap.value[key]) {
        const reservation = tempReservationsMap.value[key];
        const reservationIdToUpdate = reservation.reservation_id;
        const originalRoomId = reservation.room_id;
        const updatedDates = new Set();
        const updatedReservationIds = new Set();

        tempReservations.value = tempReservations.value.map(item => {
          if (item.reservation_id === reservationIdToUpdate && item.room_id === originalRoomId) {
            const updatedItem = { ...item };
            updatedItem.room_id = roomId;
            const dateDiff = new Date(date) - new Date(draggingDate.value);
            updatedItem.check_in = formatDate(new Date(new Date(updatedItem.check_in).setDate(new Date(updatedItem.check_in).getDate() + dateDiff / MILLIS_PER_DAY)));
            updatedItem.check_out = formatDate(new Date(new Date(updatedItem.check_out).setDate(new Date(updatedItem.check_out).getDate() + dateDiff / MILLIS_PER_DAY)));
            updatedItem.date = formatDate(new Date(new Date(updatedItem.date).setDate(new Date(updatedItem.date).getDate() + dateDiff / MILLIS_PER_DAY)));
            updatedDates.add(updatedItem.date);
            updatedReservationIds.add(updatedItem.reservation_id);
            const existingItemIndex = tempRoomData.value.findIndex(item => item.id === updatedItem.id);
            if (existingItemIndex !== -1) tempRoomData.value.splice(existingItemIndex, 1);
            tempRoomData.value.push(updatedItem);
            return updatedItem;
          }
          return item;
        });

        updatedDates.forEach(updatedDate => {
          tempReservations.value = tempReservations.value.map(innerItem => {
            if (innerItem.room_id === roomId && formatDate(new Date(innerItem.date)) === updatedDate && !updatedReservationIds.has(innerItem.reservation_id)) {
              const swappedItem = { ...innerItem, room_id: draggingRoomId.value };
              const existingSwappedItemIndex = tempRoomData.value.findIndex(item => item.id === swappedItem.id);
              if (existingSwappedItemIndex !== -1) tempRoomData.value.splice(existingSwappedItemIndex, 1);
              tempRoomData.value.push(swappedItem);
              return swappedItem;
            }
            return innerItem;
          });
        });

        tempReservations.value.sort((a, b) => {
          const dateA = new Date(a.check_in);
          const dateB = new Date(b.check_in);
          if (dateA - dateB === 0) return a.room_number - b.room_number;
          return dateA - dateB;
        });
        hasChanges.value = true;
      }
    }
    removeHighlight();
  };

  const isSelectedRoomByDay = (roomId, date) => {
    return selectedRoomByDay.value.some(item => item.key === `${roomId}_${date}`);
  };

  const handleCellClick = async (room, date) => {
    const key = `${room.room_id}_${date}`;
    if (dragMode.value === 'reservation') {
      openDrawer(room.room_id, date);
    } else if (dragMode.value === 'roomByDay') {
      const clickedReservation = reservedRoomsMap.value[key];
      if (selectedRoomByDay.value.length > 0) {
        const isPartOfSelection = selectedRoomByDay.value.some(item => item.key === key);
        const sourceReservation = selectedRoomByDay.value[0].reservation;
        if (isPartOfSelection) {
          const originalSelection = [...selectedRoomByDay.value];
          const index = originalSelection.findIndex(item => item.key === key);
          originalSelection.splice(index, 1);
          if (originalSelection.length === 0) {
            selectedRoomByDay.value = [];
          } else {
            const sortedSelection = originalSelection.sort((a, b) => new Date(a.key.split('_')[1]) - new Date(b.key.split('_')[1]));
            let isStillContiguous = true;
            for (let i = 0; i < sortedSelection.length - 1; i++) {
              const currentDay = new Date(sortedSelection[i].key.split('_')[1]);
              const nextDay = new Date(sortedSelection[i + 1].key.split('_')[1]);
              if (nextDay.getTime() - currentDay.getTime() !== MILLIS_PER_DAY) {
                isStillContiguous = false;
                break;
              }
            }
            if (isStillContiguous) {
              selectedRoomByDay.value = sortedSelection;
            } else {
              const firstBlock = [];
              if (sortedSelection.length > 0) {
                firstBlock.push(sortedSelection[0]);
                for (let i = 0; i < sortedSelection.length - 1; i++) {
                  if (new Date(sortedSelection[i + 1].key.split('_')[1]).getTime() - new Date(sortedSelection[i].key.split('_')[1]).getTime() === MILLIS_PER_DAY) {
                    firstBlock.push(sortedSelection[i + 1]);
                  } else break;
                }
              }
              selectedRoomByDay.value = firstBlock;
            }
          }
        } else if (clickedReservation && clickedReservation.reservation_id === sourceReservation.reservation_id) {
          selectedRoomByDay.value.push({ key: key, reservation: clickedReservation });
          const selectedDates = selectedRoomByDay.value.map(item => new Date(item.key.split('_')[1]));
          const minDateVal = new Date(Math.min.apply(null, selectedDates));
          const maxDateVal = new Date(Math.max.apply(null, selectedDates));
          const dateRangeArr = [];
          for (let d = new Date(minDateVal); d <= maxDateVal; d.setDate(d.getDate() + 1)) {
            dateRangeArr.push(formatDate(new Date(d)));
          }
          const reservationId = sourceReservation.reservation_id;
          const roomId = sourceReservation.room_id;
          selectedRoomByDay.value = dateRangeArr.map(dateInRange => {
            const rangeKey = `${roomId}_${dateInRange}`;
            const reservationData = reservedRoomsMap.value[rangeKey];
            if (reservationData && reservationData.reservation_id === reservationId) return { key: rangeKey, reservation: reservationData };
            return null;
          }).filter(Boolean);
        } else {
          const targetRoomId = room.room_id;
          const sourceRoomId = sourceReservation.room_id;
          const datesToOperate = selectedRoomByDay.value.map(day => day.key.split('_')[1]);
          const executionPlan = { swaps: [], moves: [] };
          let isConflict = false;
          for (const opDate of datesToOperate) {
            const sourceDay = reservedRoomsMap.value[`${sourceRoomId}_${opDate}`];
            const targetDay = reservedRoomsMap.value[`${targetRoomId}_${opDate}`];
            if (targetDay) {
              if (targetDay.reservation_id === sourceReservation.reservation_id) {
                isConflict = true;
                toast.add({ severity: 'error', summary: '操作不可', detail: '同じ予約の別の部屋パートと直接スワップすることはできません。', life: 4000 });
                break;
              }
              executionPlan.swaps.push({ source: sourceDay, target: targetDay });
            } else executionPlan.moves.push(sourceDay);
          }
          if (isConflict) return;
          const swapCount = executionPlan.swaps.length;
          const moveCount = executionPlan.moves.length;
          if (swapCount === 0 && moveCount === 0) return;
          let message = `<b>${sourceReservation.room_number}号室</b>から<b>${room.room_number}号室</b>へ移動します。<br/><br/>`;
          if (swapCount > 0) message += `・${swapCount}泊分を交換します。<br/>`;
          if (moveCount > 0) message += `・${moveCount}泊分を空室へ移動します。<br/>`;
          message += '<br/>よろしいですか？';
          formattedMessage.value = message;
          confirmRoomMode.require({
            group: 'templating',
            header: '移動・交換の確認',
            icon: 'pi pi-question-circle',
            acceptProps: { label: 'はい' },
            rejectProps: { label: 'キャンセル', severity: 'secondary', outlined: true },
            accept: async () => {
              isUpdating.value = true;
              try {
                for (const pair of executionPlan.swaps) {
                  await setReservationRoom(pair.source.id, targetRoomId);
                  await setReservationRoom(pair.target.id, sourceRoomId);
                }
                for (const day of executionPlan.moves) await setReservationRoom(day.id, targetRoomId);
                toast.add({ severity: 'success', summary: '成功', detail: '部屋を移動・交換しました。', life: 3000 });
              } catch (_error) { toast.add({ severity: 'error', summary: 'エラー', detail: '操作に失敗しました。', life: 3000 }); }
              finally {
                selectedRoomByDay.value = [];
                isUpdating.value = false;
                await fetchReservations(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);
                confirmRoomMode.close('templating');
              }
            },
            reject: () => { confirmRoomMode.close('templating'); }
          });
        }
      } else if (clickedReservation) selectedRoomByDay.value.push({ key: key, reservation: clickedReservation });
    } else if (dragMode.value === 'reorganizeRooms') {
      if (tempReservationsMap.value[key]) {
        const clickedReservation = tempReservationsMap.value[key];
        const clickedRoomId = room.room_id;
        const reservationsToMove = tempReservations.value.filter((item) => item.reservation_id === clickedReservation.reservation_id && item.room_id === clickedRoomId);
        if (reservationsToMove.length > 0) {
          const { reservation_id, check_in, check_out, client_name, room_number } = reservationsToMove[0];
          reservationCardData.value.push({ reservation_id, check_in, check_out, client_name, room_number, details: reservationsToMove });
        }
        tempReservations.value = tempReservations.value.filter((item) => item.reservation_id !== clickedReservation.reservation_id || item.room_id !== clickedRoomId);
        hasChanges.value = true;
        showReservationCard();
      }
    }
  };

  const applyReorganization = async () => {
    await setCalendarFreeChange(tempRoomData.value);
    await fetchReservations(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);
    dragMode.value = 'reservation'
    tempRoomData.value = [];
    hasChanges.value = false;
  };

  const handleDragStart = (event, roomId, date, getReservationForCell) => {
    if (dragMode.value === 'reservation') {
      onDragStart(event, roomId, date, getReservationForCell);
      startDrag(event, roomId, date, getReservationForCell);
    } else if (dragMode.value === 'reorganizeRooms') {
      startDrag(event, roomId, date, getReservationForCell);
    }
  };

  return {
    draggingStyle,
    selectedRoomByDay,
    reservationCardData,
    reservationCardVisible,
    isDrawerExpanded,
    formattedMessage,
    showReservationCard,
    expandDrawer,
    collapseDrawer,
    handleCardDragStart,
    handleDragStart,
    handleDrop: onDrop,
    handleCellClick,
    applyReorganization,
    isSelectedRoomByDay,
    endDrag,
    highlightDropZone,
    removeHighlight
  };
}
