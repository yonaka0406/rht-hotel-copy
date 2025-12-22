<template>
    <div id="hotelTabPanel" v-show="!showHotelRatePanel">
        <div class="flex justify-end mb-2">
            <Button @click="$emit('openAddPlanDialog')" icon="pi pi-plus" label="プラン追加" class="p-button-right"></Button>
            <Button @click="$emit('openCopyPlansDialog')" icon="pi pi-copy" label="プランコピー"
                class="p-button-right ml-2"></Button>
        </div>

        <div class="flex gap-2 mb-4">
            <Button label="有効プラン" :severity="activeTab === 0 ? 'info' : 'secondary'" @click="activeTab = 0" />
            <Button label="無効プラン" :severity="activeTab === 1 ? 'info' : 'secondary'" @click="activeTab = 1" />
        </div>

        <div v-show="activeTab === 0">
            <DataTable :value="activePlans" editMode="row" dataKey="id" @rowReorder="onRowReorder">
                <Column :rowReorder="true" headerStyle="width: 3rem" :reorderableColumn="false" />
                <Column field="name" header="名称"></Column>
                <Column field="plan_type" headerClass="text-center">
                    <template #header>
                        <span class="font-bold text-center w-full block">プランタイプ</span>
                    </template>
                    <template #body="slotProps">
                        <PlanTypeColumnContent :planType="slotProps.data.plan_type" />
                    </template>
                </Column>

                <Column header="カテゴリー">
                    <template #body="slotProps">
                        <PlanCategoryBadges :typeCategory="slotProps.data.plan_type_category_name"
                            :packageCategory="slotProps.data.plan_package_category_name" />
                    </template>
                </Column>
                <Column headerClass="text-center">
                    <template #header>
                        <span class="font-bold text-center w-full block">操作</span>
                    </template>
                    <template #body="slotProps">
                        <PlanActions :planData="slotProps.data" :ButtonComponent="Button"
                            @openEditPlanDialog="emit('openEditPlanDialog', $event)"
                            @switchEditHotelPlanRate="emit('switchEditHotelPlanRate', $event)"
                            @deletePlan="emit('deletePlan', $event)" />
                    </template>
                </Column>
            </DataTable>
        </div>
        <div v-show="activeTab === 1">
            <DataTable :value="inactivePlans" dataKey="id">
                <Column field="name" header="名称"></Column>
                <Column field="plan_type" headerClass="text-center">
                    <template #header>
                        <span class="font-bold text-center w-full block">プランタイプ</span>
                    </template>
                    <template #body="slotProps">
                        <PlanTypeColumnContent :planType="slotProps.data.plan_type" />
                    </template>
                </Column>

                <Column header="カテゴリー">
                    <template #body="slotProps">
                        <PlanCategoryBadges :typeCategory="slotProps.data.plan_type_category_name"
                            :packageCategory="slotProps.data.plan_package_category_name" />
                    </template>
                </Column>
                <Column headerClass="text-center">
                    <template #header>
                        <span class="font-bold text-center w-full block">操作</span>
                    </template>
                    <template #body="slotProps">
                        <PlanActions :planData="slotProps.data" :ButtonComponent="Button"
                            @openEditPlanDialog="emit('openEditPlanDialog', $event)"
                            @switchEditHotelPlanRate="emit('switchEditHotelPlanRate', $event)"
                            @deletePlan="emit('deletePlan', $event)" />
                    </template>
                </Column>
            </DataTable>
        </div>

    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Badge from 'primevue/badge';

// Local component for Plan Type Column Content
const PlanTypeColumnContent = {
    props: {
        planType: String,
    },
    template: `
    <div class="flex items-center justify-center">
      <i v-if="planType === 'per_person'" class="pi pi-id-card" style="color: darkgoldenrod;" v-tooltip="'1人あたり'"></i>
      <i v-if="planType === 'per_room'" class="pi pi-shop" style="color: brown;" v-tooltip="'部屋あたり'"></i>
    </div>
  `,
};

// Local component for Plan Category Badges
const PlanCategoryBadges = {
    components: {
        Badge
    },
    props: {
        typeCategory: String,
        packageCategory: String,
    },
    template: `
    <div>
      <Badge :value="typeCategory" severity="primary" class="mr-2"></Badge>
      <Badge :value="packageCategory" severity="secondary"></Badge>
    </div>
  `,
};

// Local component for Plan Actions
const PlanActions = {
    props: {
        planData: Object,
        ButtonComponent: Object, // Accept Button as a prop
    },
    emits: ['openEditPlanDialog', 'switchEditHotelPlanRate', 'deletePlan'],
    template: `
    <div class="flex items-center justify-center">
      <component :is="ButtonComponent"
        icon="pi pi-pencil"
        class="p-button-text p-button-sm"
        @click="$emit('openEditPlanDialog', planData)"
        v-tooltip="'プラン編集'"
      />
      <component :is="ButtonComponent"
        icon="pi pi-dollar"
        class="p-button-text p-button-sm"
        @click="$emit('switchEditHotelPlanRate', planData)"
        v-tooltip="'料金編集'"
      />
      <component :is="ButtonComponent"
        icon="pi pi-trash"
        class="p-button-text p-button-sm p-button-danger"
        @click="$emit('deletePlan', planData)"
        v-tooltip="'プラン削除'"
      />
    </div>
  `,
};

const props = defineProps({
    hotelPlans: Array,
    showHotelRatePanel: Boolean,
    selectedHotelId: Number,
});

const emit = defineEmits([
    'openAddPlanDialog',
    'openCopyPlansDialog',
    'openEditPlanDialog',
    'switchEditHotelPlanRate',
    'orderChanged',
    'deletePlan',
]);

const activeTab = ref(0);

const activePlans = computed(() => {
    const filtered = Array.isArray(props.hotelPlans) ? props.hotelPlans.filter(plan => plan.is_active) : [];    
    return filtered;
});

const inactivePlans = computed(() => {
    const filtered = Array.isArray(props.hotelPlans) ? props.hotelPlans.filter(plan => !plan.is_active) : [];    
    return filtered;
});

const onRowReorder = (event) => {    
    emit('orderChanged', event.value);
};

// Watch for changes in hotelPlans prop
watch(() => props.hotelPlans, (newPlans, oldPlans) => {
    console.log('ManageHotelPlansTable - hotelPlans prop changed:', {
        selectedHotelId: props.selectedHotelId,
        oldPlansCount: oldPlans?.length || 0,
        newPlansCount: newPlans?.length || 0,
        newPlans: newPlans?.map(p => ({ id: p.id, name: p.name, hotel_id: p.hotel_id, is_active: p.is_active })) || []
    });
}, { deep: true });

// Watch for changes in selectedHotelId prop
watch(() => props.selectedHotelId, (newHotelId, oldHotelId) => {
    console.log('ManageHotelPlansTable - selectedHotelId changed:', {
        oldHotelId,
        newHotelId,
        currentPlansCount: props.hotelPlans?.length || 0
    });
});
</script>

<style scoped>
/* Add any scoped styles here if needed */
</style>