<template>
    <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" :header="modalTitle" modal
        class="w-full max-w-lg">
        <div class="p-2 space-y-6">
            <!-- Account Code Form -->
            <div v-if="type === 'code'" class="space-y-4">
                <div class="flex flex-col gap-2">
                    <label class="text-xs font-black text-slate-500 uppercase">勘定コード <span
                            class="text-rose-500">*</span></label>
                    <InputText v-model="form.code" placeholder="例: 4110004" fluid />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="text-xs font-black text-slate-500 uppercase">勘定科目名 <span
                            class="text-rose-500">*</span></label>
                    <InputText v-model="form.name" placeholder="例: 宿泊事業売上" fluid />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="text-xs font-black text-slate-500 uppercase">管理区分</label>
                    <Select v-model="form.management_group_id" :options="settings.groups" optionLabel="name"
                        optionValue="id" placeholder="区分を選択" showClear fluid />
                </div>
                <div class="flex items-center gap-2">
                    <Checkbox v-model="form.is_active" :binary="true" />
                    <label class="text-sm font-bold text-slate-700 dark:text-slate-300">有効化する</label>
                </div>
            </div>

            <!-- Management Group Form -->
            <div v-if="type === 'group'" class="space-y-4">
                <div class="flex flex-col gap-2">
                    <label class="text-xs font-black text-slate-500 uppercase">区分名 <span
                            class="text-rose-500">*</span></label>
                    <InputText v-model="form.name" placeholder="例: 売上高" fluid />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="text-xs font-black text-slate-500 uppercase">表示順序</label>
                    <InputNumber v-model="form.display_order" placeholder="例: 10" fluid />
                </div>
            </div>

            <!-- Tax Class Form -->
            <div v-if="type === 'tax'" class="space-y-4">
                <div class="flex flex-col gap-2">
                    <label class="text-xs font-black text-slate-500 uppercase">システム内表示名 <span
                            class="text-rose-500">*</span></label>
                    <InputText v-model="form.name" placeholder="例: 課税売上10%" fluid />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="text-xs font-black text-slate-500 uppercase">弥生会計出力名 <span
                            class="text-rose-500">*</span></label>
                    <InputText v-model="form.yayoi_name" placeholder="例: 課税売上内10%" fluid />
                </div>
                <div class="flex flex-row gap-4">
                    <div class="flex flex-col gap-2 flex-1">
                        <label class="text-xs font-black text-slate-500 uppercase">税率 (%)</label>
                        <InputNumber v-model="form.tax_rate_percent" :min="0" :max="100" placeholder="例: 10" fluid />
                    </div>
                    <div class="flex flex-col gap-2 flex-1">
                        <label class="text-xs font-black text-slate-500 uppercase">表示順序</label>
                        <InputNumber v-model="form.display_order" fluid />
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <Checkbox v-model="form.is_active" :binary="true" />
                    <label class="text-sm font-bold text-slate-700 dark:text-slate-300">有効化する</label>
                </div>
            </div>

            <!-- Department Form -->
            <div v-if="type === 'dept'" class="space-y-4">
                <div class="flex flex-col gap-2">
                    <label class="text-xs font-black text-slate-500 uppercase">対象店舗 <span v-if="!form.id"
                            class="text-rose-500">*</span></label>
                    <div v-if="form.id"
                        class="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-slate-700 dark:text-slate-300">
                        {{ getHotelName(form.hotel_id) }}
                    </div>
                    <Select v-else v-model="form.hotel_id" :options="hotels" optionLabel="name" optionValue="id"
                        placeholder="ホテルを選択" fluid />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="text-xs font-black text-slate-500 uppercase">部門名 (弥生会計) <span
                            class="text-rose-500">*</span></label>
                    <InputText v-model="form.name" placeholder="例: WH室蘭" fluid />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="text-xs font-black text-slate-500 uppercase">状態</label>
                    <div class="flex items-center gap-3">
                        <Checkbox v-model="form.is_current" :binary="true" inputId="is_current" />
                        <label for="is_current" class="text-sm font-medium text-slate-700 dark:text-slate-300">
                            現在のマッピング (エクスポートに使用)
                        </label>
                    </div>
                </div>
            </div>

            <!-- Mapping Form -->
            <div v-if="type === 'mapping'" class="space-y-4">
                <div class="flex flex-col gap-2">
                    <label class="text-xs font-black text-slate-500 uppercase">対象ホテル</label>
                    <Select v-model="form.hotel_id" :options="hotels" optionLabel="name" optionValue="id" showClear
                        placeholder="共通（すべてのホテル）" fluid />
                </div>

                <div class="flex flex-col gap-2">
                    <label class="text-xs font-black text-slate-500 uppercase">対象タイプ <span
                            class="text-rose-500">*</span></label>
                    <Select v-model="form.target_type" :options="[
                        { label: '個別プラン', value: 'plan_hotel' },
                        { label: 'プラン区分', value: 'plan_type_category' },
                        { label: '個別アドオン', value: 'addon_hotel' },
                        { label: '共通アドオン', value: 'addon_global' },
                        { label: 'キャンセル料', value: 'cancellation' }
                    ]" optionLabel="label" optionValue="value" placeholder="タイプを選択" fluid
                        @change="form.target_id = null" />
                </div>

                <div v-if="form.target_type && form.target_type !== 'cancellation'" class="flex flex-col gap-2">
                    <label class="text-xs font-black text-slate-500 uppercase">対象アイテム <span
                            class="text-rose-500">*</span></label>
                    <Select v-model="form.target_id" :options="getTargetOptions(form.target_type)" optionLabel="name"
                        optionValue="id" placeholder="アイテムを選択" fluid filter />
                </div>

                <div class="flex flex-col gap-2">
                    <label class="text-xs font-black text-slate-500 uppercase">紐付ける勘定科目 <span
                            class="text-rose-500">*</span></label>
                    <Select v-model="form.account_code_id" :options="settings.codes" optionLabel="name" optionValue="id"
                        placeholder="科目を選択" fluid filter>
                        <template #option="slotProps">
                            <div class="flex justify-between items-center w-full">
                                <span>{{ slotProps.option.name }}</span>
                                <span class="text-[10px] tabular-nums text-slate-400">{{ slotProps.option.code }}</span>
                            </div>
                        </template>
                    </Select>
                </div>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <Button label="キャンセル" @click="close" severity="secondary" text
                    class="px-6 py-2 rounded-xl font-bold !bg-transparent" />
                <Button label="保存する" @click="handleSave" :loading="saving" :disabled="!isFormValid"
                    class="px-8 py-2 rounded-xl font-bold bg-violet-600 border-violet-600 hover:bg-violet-700 hover:border-violet-700" />
            </div>
        </div>
    </Dialog>
</template>

<script setup>
import { reactive, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Checkbox from 'primevue/checkbox';
import Select from 'primevue/select';
import Button from 'primevue/button';

const props = defineProps({
    visible: Boolean,
    type: String,
    isEdit: Boolean,
    initialData: Object,
    settings: Object,
    hotels: Array,
    saving: Boolean
});

const emit = defineEmits(['update:visible', 'save']);

const form = reactive({
    id: null,
    code: '',
    name: '',
    management_group_id: null,
    is_active: true,
    display_order: 0,
    yayoi_name: '',
    tax_rate_percent: 10,
    hotel_id: null,
    is_current: true,
    target_type: null,
    target_id: null,
    account_code_id: null
});

// Watch for initialData changes or visibility to populate local form
watch(() => props.visible, (newVal) => {
    if (newVal) {
        if (props.initialData) {
            Object.assign(form, props.initialData);
        } else {
            // Reset form if no initialData (or for new item)
            Object.assign(form, {
                id: null,
                code: '',
                name: '',
                management_group_id: null,
                is_active: true,
                display_order: 10,
                yayoi_name: '',
                tax_rate_percent: 10,
                hotel_id: null,
                is_current: true,
                target_type: null,
                target_id: null,
                account_code_id: null
            });
        }
    }
});

const modalTitle = computed(() => {
    const action = props.isEdit ? '編集' : '新規作成';
    const targets = { code: '勘定科目', group: '管理区分', tax: '税区分', dept: '部門', mapping: 'マッピング' };
    return `${targets[props.type] || ''}${action}`;
});

const getHotelName = (id) => {
    const h = props.hotels?.find(x => x.id === id);
    return h ? h.name : '-';
};

const getTargetOptions = (type) => {
    const master = props.settings?.mappingMasterData;
    if (!master) return [];
    if (type === 'plan_hotel') return master.plans;
    if (type === 'plan_type_category') return master.categories;
    if (type === 'plan_package_category') return master.packageCategories;
    if (type === 'addon_global') return master.addonsGlobal;
    if (type === 'addon_hotel') return master.addonsHotel;
    return [];
};

const isFormValid = computed(() => {
    switch (props.type) {
        case 'code':
            return form.code && form.name;
        case 'group':
            return form.name;
        case 'tax':
            return form.name && form.yayoi_name;
        case 'dept':
            return form.hotel_id && form.name;
        case 'mapping':
            return form.target_type && (form.target_type === 'cancellation' || form.target_id) && form.account_code_id;
        default:
            return false;
    }
});

const handleSave = () => {
    emit('save', { ...form });
};

const close = () => {
    emit('update:visible', false);
};
</script>

<style scoped>
/* Dark Mode Component Fixes */
.dark :deep(.p-inputtext),
.dark :deep(.p-inputnumber-input),
.dark :deep(.p-select),
.dark :deep(.p-datepicker-input) {
    background: #0f172a !important;
    border-color: #334155 !important;
    color: #f8fafc !important;
}

.dark :deep(.p-select-label.p-placeholder) {
    color: #64748b !important;
    /* slate-500 */
}

.dark :deep(.p-datepicker-dropdown),
.dark :deep(.p-select-dropdown) {
    background: #1e293b !important;
    color: #f8fafc !important;
}
</style>