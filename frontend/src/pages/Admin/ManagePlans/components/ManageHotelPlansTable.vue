<template>
    <div id="hotelTabPanel" v-show="!showHotelRatePanel">
        <div class="flex justify-end mb-2">
            <Button
                @click="$emit('openAddPlanDialog')"
                icon="pi pi-plus"
                label="プラン追加"
                class="p-button-right"
            ></Button>
            <Button
                @click="$emit('openCopyPlansDialog')"
                icon="pi pi-copy"
                label="プランコピー"
                class="p-button-right ml-2"
            ></Button>
        </div>

        <Tabs>
            <TabList>
                <Tab value="active">有効プラン</Tab>
                <Tab value="inactive">無効プラン</Tab>
            </TabList>
            <TabPanels>
                <TabPanel value="active">
                    <DataTable :value="activePlans" editMode="row" dataKey="id" @rowReorder="onRowReorder">
                        <Column :rowReorder="true" headerStyle="width: 3rem" :reorderableColumn="false" />
                        <Column field="plan_name" header="名称"></Column>
                        <Column field="plan_type" headerClass="text-center">
                            <template #header>
                            <span class="font-bold text-center w-full block">プランタイプ</span>
                            </template>
                            <template #body="slotProps">
                            <div class="flex items-center justify-center">
                                <i v-if="slotProps.data.plan_type === 'per_person'" class="pi pi-id-card" style="color: darkgoldenrod;" v-tooltip="'1人あたり'"></i>
                                <i v-if="slotProps.data.plan_type === 'per_room'" class="pi pi-shop" style="color: brown;" v-tooltip="'部屋あたり'"></i>
                            </div>
                            </template>
                        </Column>

                        <Column header="カテゴリー">
                            <template #body="slotProps">
                            <Badge :value="slotProps.data.type_category" severity="primary" class="mr-2"></Badge>
                            <Badge :value="slotProps.data.package_category" severity="secondary"></Badge>
                            </template>
                        </Column>
                        <Column headerClass="text-center">
                            <template #header>
                            <span class="font-bold text-center w-full block">操作</span>
                            </template>
                            <template #body="slotProps">
                            <div class="flex items-center justify-center">
                                <Button
                                icon="pi pi-pencil"
                                class="p-button-text p-button-sm"
                                @click="$emit('openEditPlanDialog', slotProps.data)"
                                v-tooltip="'プラン編集'"
                                />
                                <Button
                                icon="pi pi-dollar"
                                class="p-button-text p-button-sm"
                                @click="$emit('switchEditHotelPlanRate', slotProps.data)"
                                v-tooltip="'料金編集'"
                                />
                            </div>
                            </template>
                        </Column>
                    </DataTable>
                </TabPanel>
                <TabPanel value="inactive">
                    <DataTable :value="inactivePlans" dataKey="id">
                        <Column field="plan_name" header="名称"></Column>
                        <Column field="plan_type" headerClass="text-center">
                            <template #header>
                            <span class="font-bold text-center w-full block">プランタイプ</span>
                            </template>
                            <template #body="slotProps">
                            <div class="flex items-center justify-center">
                                <i v-if="slotProps.data.plan_type === 'per_person'" class="pi pi-id-card" style="color: darkgoldenrod;" v-tooltip="'1人あたり'"></i>
                                <i v-if="slotProps.data.plan_type === 'per_room'" class="pi pi-shop" style="color: brown;" v-tooltip="'部屋あたり'"></i>
                            </div>
                            </template>
                        </Column>

                        <Column header="カテゴリー">
                            <template #body="slotProps">
                            <Badge :value="slotProps.data.type_category" severity="primary" class="mr-2"></Badge>
                            <Badge :value="slotProps.data.package_category" severity="secondary"></Badge>
                            </template>
                        </Column>
                        <Column headerClass="text-center">
                            <template #header>
                            <span class="font-bold text-center w-full block">操作</span>
                            </template>
                            <template #body="slotProps">
                            <div class="flex items-center justify-center">
                                <Button
                                icon="pi pi-pencil"
                                class="p-button-text p-button-sm"
                                @click="$emit('openEditPlanDialog', slotProps.data)"
                                v-tooltip="'プラン編集'"
                                />
                                <Button
                                icon="pi pi-dollar"
                                class="p-button-text p-button-sm"
                                @click="$emit('switchEditHotelPlanRate', slotProps.data)"
                                v-tooltip="'料金編集'"
                                />
                            </div>
                            </template>
                        </Column>
                    </DataTable>
                </TabPanel>
            </TabPanels>
        </Tabs>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Badge from 'primevue/badge';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';

const props = defineProps({
  hotelPlans: Array,
  showHotelRatePanel: Boolean,
  selectedHotelId: Number, // Needed for onRowReorder
});

const emit = defineEmits([
  'openAddPlanDialog',
  'openCopyPlansDialog',
  'openEditPlanDialog',
  'switchEditHotelPlanRate',
  'orderChanged', // Emitted from onRowReorder
]);

const activePlans = computed(() => props.hotelPlans.filter(plan => plan.is_active));
const inactivePlans = computed(() => props.hotelPlans.filter(plan => !plan.is_active));

const onRowReorder = (event) => {
  // Emit 'orderChanged' to parent for bulk update
  emit('orderChanged', event.value);
};
</script>

<style scoped>
/* Add any scoped styles here if needed */
</style>
