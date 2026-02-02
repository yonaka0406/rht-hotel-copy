import { ref } from 'vue';
import { formatDate } from '@/utils/dateUtils';

export function useModernDragDrop(dependencies) {
  const {
    dateRange,
    emit,
    getRoomNumber,
    rowHeight
  } = dependencies;

  const draggingBlock = ref(null);
  const dropTargetRoomId = ref(null);
  const dropTargetDateIndex = ref(null);

  const handleDragStart = (event, block) => {
    draggingBlock.value = block;

    const rect = event.target.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    event.dataTransfer.setDragImage(event.target, offsetX, offsetY);
    event.dataTransfer.effectAllowed = 'move';

    // Make the original element semi-transparent
    setTimeout(() => {
      if (event.target) event.target.style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnd = (event) => {
    if (event.target) event.target.style.opacity = '1';
    draggingBlock.value = null;
    dropTargetRoomId.value = null;
    dropTargetDateIndex.value = null;
  };

  const handleDragOver = (event, room) => {
    if (!draggingBlock.value) return;
    event.preventDefault();

    dropTargetRoomId.value = room.room_id;

    const rect = event.currentTarget.getBoundingClientRect();
    const relativeY = event.clientY - rect.top;
    dropTargetDateIndex.value = Math.floor(relativeY / rowHeight);
  };

  const handleDrop = (event, room) => {
    if (!draggingBlock.value) return;
    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();
    const relativeY = event.clientY - rect.top;
    const dateIndex = Math.floor(relativeY / rowHeight);

    if (dateIndex >= 0 && dateIndex < dateRange.value.length) {
      const targetDate = dateRange.value[dateIndex];
      const sourceBlock = draggingBlock.value;

      const durationDays = sourceBlock.items.length;
      const newCheckIn = targetDate;
      const newCheckOutDate = new Date(targetDate);
      newCheckOutDate.setDate(newCheckOutDate.getDate() + durationDays);
      const newCheckOut = formatDate(newCheckOutDate);

      const updateData = {
        reservation_id: sourceBlock.reservation_id,
        old_check_in: sourceBlock.check_in,
        old_check_out: sourceBlock.check_out,
        new_check_in: newCheckIn,
        new_check_out: newCheckOut,
        old_room_id: sourceBlock.items[0].room_id,
        new_room_id: room.room_id,
        number_of_people: sourceBlock.items[0].total_number_of_people || sourceBlock.items[0].number_of_people || 1,
        message: generateUpdateMessage(sourceBlock, room, newCheckIn, newCheckOut)
      };

      emit('calendar-update', updateData);
    }

    draggingBlock.value = null;
    dropTargetRoomId.value = null;
    dropTargetDateIndex.value = null;
  };

  const generateUpdateMessage = (block, targetRoom, newIn, newOut) => {
    const oldRoomNum = getRoomNumber(block.items[0].room_id);
    const newRoomNum = targetRoom.room_number;

    let msg = `<b>${oldRoomNum}号室</b>の予約を `;
    if (oldRoomNum !== newRoomNum) {
      msg += `<b>${newRoomNum}号室</b>に移動し、`;
    }
    msg += `<br/>宿泊期間を<br/>「IN：${block.check_in} OUT：${block.check_out}」から<br/>「IN：${newIn} OUT：${newOut}」に変更しますか?`;
    return msg;
  };

  return {
    draggingBlock,
    dropTargetRoomId,
    dropTargetDateIndex,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop
  };
}
