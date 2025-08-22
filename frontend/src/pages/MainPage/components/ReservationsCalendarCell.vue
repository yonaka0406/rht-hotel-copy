<template>
    <td
      class="calendar-cell"
      :class="cellClasses"
      @click="$emit('click', { room, date })"
      @dragstart="handleDragStart"
      @drop="handleDrop"
      @dragover.prevent
      @contextmenu.prevent="$emit('contextmenu', { event: $event, room, date })"
      draggable="true"
    >
      <div v-if="reservation" class="reservation-content">
        <i :class="statusIcon"></i>
        <span class="guest-name">{{ reservation.client_name || '予約あり' }}</span>
      </div>
      <div v-else class="empty-cell">
        <i class="pi pi-circle"></i>
        <span>空室</span>
      </div>
    </td>
  </template>
  
  <script setup>
  import { computed } from 'vue';
  
  const props = defineProps({
    room: { type: Object, required: true },
    date: { type: [String, Date], required: true },
    reservation: { type: Object, default: null },
    isFirstDay: { type: Boolean, default: false },
    isLastDay: { type: Boolean, default: false },
    isSelected: { type: Boolean, default: false }
  });
  
  const emit = defineEmits(['click', 'dragstart', 'drop', 'contextmenu']);
  
  const statusIcon = computed(() => {
    if (!props.reservation) return '';
    const { type, status } = props.reservation;
    
    const icons = {
      employee: 'pi pi-id-card',
      hold: 'pi pi-pause',
      provisory: 'pi pi-clock',
      confirmed: 'pi pi-check-circle',
      checked_in: 'pi pi-user',
      checked_out: 'pi pi-sign-out',
      block: props.reservation.client_id === '11111111-1111-1111-1111-111111111111' 
        ? 'pi pi-times' 
        : 'pi pi-lock'
    };
  
    return icons[type || status] || '';
  });
  
  const cellClasses = computed(() => ({
    'has-reservation': !!props.reservation,
    'first-day': props.isFirstDay,
    'last-day': props.isLastDay,
    'selected': props.isSelected,
    [`status-${props.reservation?.status || 'empty'}`]: true
  }));
  
  const handleDragStart = (e) => {
    if (props.reservation) {
      emit('dragstart', { event: e, reservation: props.reservation });
    }
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    if (props.reservation) {
      emit('drop', { 
        event: e, 
        targetRoom: props.room,
        targetDate: props.date
      });
    }
  };
  </script>