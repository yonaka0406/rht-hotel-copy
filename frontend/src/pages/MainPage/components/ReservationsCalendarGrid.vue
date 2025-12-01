<template>
    <div class="table-container" :class="{ 'compact-view': compact }" @scroll="handleScroll">
      <table class="calendar-grid">
        <thead>
          <tr>
            <th class="sticky-header">Date</th>
            <th 
              v-for="room in rooms" 
              :key="room.id"
              class="room-header"
            >
              {{ room.room_type_name }}<br>
              <span class="room-number">{{ room.room_number }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(date, dateIndex) in dateRange" :key="dateIndex">
            <td class="date-cell">
              {{ formatDate(date) }}
            </td>
            <ReservationsCalendarCell
              v-for="room in rooms" 
              :key="room.id"
              :room="room"
              :date="date"
              :reservation="getReservationForCell(room.id, date)"
              :is-first-day="isFirstDay(room.id, date)"
              :is-last-day="isLastDay(room.id, date)"
              @click="$emit('cell-click', { room, date })"
              @dragstart="$emit('cell-dragstart', { event: $event, room, date })"
              @drop="$emit('cell-drop', { event: $event, room, date })"
              @contextmenu="$emit('cell-contextmenu', { event: $event, room, date })"
            />
          </tr>
        </tbody>
      </table>
    </div>
  </template>
  
  <script setup>
  import ReservationsCalendarCell from './ReservationsCalendarCell.vue';
  
  const props = defineProps({
    rooms: { type: Array, required: true },
    dateRange: { type: Array, required: true },
    reservations: { type: Object, default: () => ({}) },
    compact: { type: Boolean, default: false }
  });
  
  const emit = defineEmits(['scroll', 'cell-click', 'cell-dragstart', 'cell-drop', 'cell-contextmenu']);
  
  const getReservationForCell = (roomId, date) => {
    return props.reservations[`${roomId}_${date}`] || null;
  };

  const isFirstDay = (roomId, date) => {
    const reservation = getReservationForCell(roomId, date);
    if (!reservation) return false;
    return reservation.check_in === formatDate(date);
  };

  const isLastDay = (roomId, date) => {
    const reservation = getReservationForCell(roomId, date);
    if (!reservation) return false;
    return reservation.check_out === formatDate(date);
  };
  
  const handleScroll = (e) => {
    emit('scroll', e);
  };

  const formatDate = (date) => {
    return typeof date === 'string' ? date.split('T')[0] : date.toISOString().split('T')[0];
  };
  </script>