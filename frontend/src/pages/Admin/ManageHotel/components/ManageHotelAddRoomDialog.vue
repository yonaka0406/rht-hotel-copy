<template>
  <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" :modal="true" header="部屋追加" :style="{ width: '50vw' }" class="p-fluid">
    <div class="grid grid-cols-2 gap-1">
      <div class="col-span-2 mt-6">
        <FloatLabel>
          <label for="floor" class="font-medium mb-2 block">階 *</label>
          <InputNumber id="floor" v-model="newRoom.floor" :min="1" required fluid />
        </FloatLabel>
      </div>
      <div class="col-span-2 mt-6">
        <FloatLabel>
          <label for="room_number" class="font-medium mb-2 block">部屋番号 *</label>
          <InputText id="room_number" v-model="newRoom.room_number" required fluid />
        </FloatLabel>
      </div>
      <div class="col-span-2 mt-6">
        <FloatLabel>
          <label for="room_type_id" class="font-medium mb-2 block">部屋タイプ *</label>
          <Select id="room_type_id" v-model="newRoom.room_type_id" :options="roomTypes" optionLabel="name"
            optionValue="id" placeholder="部屋タイプ選択" required fluid />
        </FloatLabel>
      </div>
      <div class="col-span-2 mt-6">
        <FloatLabel>
          <label for="capacity" class="font-medium mb-2 block">人数 *</label>
          <InputNumber id="capacity" v-model="newRoom.capacity" :min="1" required fluid />
        </FloatLabel>
      </div>
      <div class="col-span-1 mt-6">
        <label for="smoking" class="font-medium mb-2 block">喫煙</label>
        <Checkbox id="smoking" v-model="newRoom.smoking" binary />
      </div>
      <div class="col-span-1 mt-6">
        <label for="for_sale" class="font-medium mb-2 block">販売用</label>
        <Checkbox id="for_sale" v-model="newRoom.for_sale" binary />
      </div>
      <div class="col-span-1 mt-6">
        <label for="has_wet_area" class="font-medium mb-2 block">水回り</label>
        <Checkbox id="has_wet_area" v-model="newRoom.has_wet_area" binary />
      </div>
    </div>
    <template #footer>
      <Button label="追加" icon="pi pi-plus" @click="save" class="p-button-success p-button-text p-button-sm" />
      <Button label="キャンセル" icon="pi pi-times" @click="$emit('update:visible', false)"
        class="p-button-danger p-button-text p-button-sm" />
    </template>
  </Dialog>
</template>

<script setup>
import { reactive, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import Checkbox from 'primevue/checkbox';
import FloatLabel from 'primevue/floatlabel';

const props = defineProps({
  visible: Boolean,
  roomTypes: Array,
});

const emit = defineEmits(['update:visible', 'save']);

const newRoom = reactive({
  floor: 1,
  room_number: '',
  room_type_id: null,
  capacity: 1,
  smoking: false,
  for_sale: true,
  has_wet_area: false
});

watch(() => props.visible, (newValue) => {
  if (!newValue) {
    Object.assign(newRoom, {
      floor: 1,
      room_number: '',
      room_type_id: null,
      capacity: 1,
      smoking: false,
      for_sale: true,
      has_wet_area: false
    });
  }
});

const save = () => {
  emit('save', { ...newRoom });
};
</script>
