<template>
  <div class="p-4">
    <Panel header="プランカテゴリー管理" class="mb-4">
      <Tabs :value="activeTab" @update:value="onTabChange">
        <TabList>
          <Tab value="0">
            <i class="pi pi-tag"></i> プランタイプカテゴリー
          </Tab>
          <Tab value="1">
            <i class="pi pi-box"></i> プランパッケージカテゴリー
          </Tab>
        </TabList>
        <TabPanels>
          <!-- Plan Type Categories -->
          <TabPanel value="0">
            <div class="flex justify-end mb-4">
              <Button @click="openAddTypeDialog" icon="pi pi-plus" label="タイプカテゴリー追加" />
            </div>
            <DataTable :value="typeCategories" dataKey="id" class="w-full">
              <Column field="name" header="名称" class="w-4/5"></Column>
              <Column header="操作" class="w-1/5">
                <template #body="slotProps">
                  <div class="flex gap-2">
                    <Button 
                      icon="pi pi-pencil" 
                      class="p-button-text p-button-sm" 
                      @click="openEditTypeDialog(slotProps.data)"
                      v-tooltip="'編集'"
                    />
                    <Button 
                      icon="pi pi-trash" 
                      class="p-button-text p-button-sm p-button-danger" 
                      @click="(event) => confirmDeleteType(event, slotProps.data)"
                      v-tooltip="'削除'"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
          </TabPanel>

          <!-- Plan Package Categories -->
          <TabPanel value="1">
            <div class="flex justify-end mb-4">
              <Button @click="openAddPackageDialog" icon="pi pi-plus" label="パッケージカテゴリー追加" />
            </div>
            <DataTable :value="packageCategories" dataKey="id" class="w-full">
              <Column field="name" header="名称" class="w-4/5"></Column>
              <Column header="操作" class="w-1/5">
                <template #body="slotProps">
                  <div class="flex gap-2">
                    <Button 
                      icon="pi pi-pencil" 
                      class="p-button-text p-button-sm" 
                      @click="openEditPackageDialog(slotProps.data)"
                      v-tooltip="'編集'"
                    />
                    <Button 
                      icon="pi pi-trash" 
                      class="p-button-text p-button-sm p-button-danger" 
                      @click="(event) => confirmDeletePackage(event, slotProps.data)"
                      v-tooltip="'削除'"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Panel>

    <!-- Category Dialogs -->
    <CategoryDialog
      v-model:visible="showTypeDialog"
      :category="editingTypeCategory"
      category-type="タイプ"
      @save="saveTypeCategory"
    />

    <CategoryDialog
      v-model:visible="showPackageDialog"
      :category="editingPackageCategory"
      category-type="パッケージ"
      @save="savePackageCategory"
    />

    <!-- Confirm Delete Dialog -->
    <ConfirmDialog group="delete-category" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { usePlansStore } from '@/composables/usePlansStore';

// Components
import CategoryDialog from './dialogs/CategoryDialog.vue';

// PrimeVue Components
import Panel from 'primevue/panel';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import ConfirmDialog from 'primevue/confirmdialog';

const toast = useToast();
const confirm = useConfirm();

const {
  fetchPlanTypeCategories,
  createPlanTypeCategory,
  updatePlanTypeCategory,
  deletePlanTypeCategory,
  fetchPlanPackageCategories,
  createPlanPackageCategory,
  updatePlanPackageCategory,
  deletePlanPackageCategory,
} = usePlansStore();

// State
const activeTab = ref(0);
const typeCategories = ref([]);
const packageCategories = ref([]);

// Type Category Dialog
const showTypeDialog = ref(false);
const editingTypeCategory = ref({
  id: null,
  name: '',
  description: '',
  color: '#D3D3D3',
  display_order: 0,
});

// Package Category Dialog
const showPackageDialog = ref(false);
const editingPackageCategory = ref({
  id: null,
  name: '',
  description: '',
  color: '#D3D3D3',
  display_order: 0,
});

// Methods
const onTabChange = (newTabValue) => {
  activeTab.value = newTabValue;
};

const loadData = async () => {
  try {
    typeCategories.value = await fetchPlanTypeCategories();
    packageCategories.value = await fetchPlanPackageCategories();
  } catch (error) {
    console.error('Error loading categories:', error);
    toast.add({ severity: 'error', summary: 'エラー', detail: 'カテゴリーの読み込みに失敗しました', life: 3000 });
  }
};

// Type Category Methods
const openAddTypeDialog = () => {
  editingTypeCategory.value = {
    id: null,
    name: '',
    description: '',
    color: '#D3D3D3',
    display_order: typeCategories.value.length,
  };
  showTypeDialog.value = true;
};

const openEditTypeDialog = (category) => {
  editingTypeCategory.value = { ...category };
  showTypeDialog.value = true;
};

const saveTypeCategory = async (categoryData) => {
  try {
    if (categoryData.id) {
      await updatePlanTypeCategory(categoryData.id, categoryData);
      toast.add({ severity: 'success', summary: '成功', detail: 'タイプカテゴリーが更新されました', life: 3000 });
    } else {
      await createPlanTypeCategory(categoryData);
      toast.add({ severity: 'success', summary: '成功', detail: 'タイプカテゴリーが作成されました', life: 3000 });
    }
    showTypeDialog.value = false;
    await loadData();
  } catch (error) {
    console.error('Error saving type category:', error);
    toast.add({ severity: 'error', summary: 'エラー', detail: 'タイプカテゴリーの保存に失敗しました', life: 3000 });
  }
};

const confirmDeleteType = (event, category) => {
  confirm.require({
    group: 'delete-category',
    target: event.currentTarget,
    message: `タイプカテゴリー「${category.name}」を削除しますか？`,
    header: '削除確認',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'キャンセル',
    acceptClass: 'p-button-danger',
    acceptLabel: '削除',
    accept: () => deleteTypeCategory(category.id),
  });
};

const deleteTypeCategory = async (id) => {
  try {
    await deletePlanTypeCategory(id);
    toast.add({ severity: 'success', summary: '成功', detail: 'タイプカテゴリーが削除されました', life: 3000 });
    await loadData();
  } catch (error) {
    console.error('Error deleting type category:', error);
    if (error?.message?.includes('currently in use')) {
      toast.add({ severity: 'error', summary: 'エラー', detail: 'このカテゴリーは使用中のため削除できません', life: 5000 });
    } else {
      toast.add({ severity: 'error', summary: 'エラー', detail: 'タイプカテゴリーの削除に失敗しました', life: 3000 });
    }
  }
};

// Package Category Methods
const openAddPackageDialog = () => {
  editingPackageCategory.value = {
    id: null,
    name: '',
    description: '',
    color: '#D3D3D3',
    display_order: packageCategories.value.length,
  };
  showPackageDialog.value = true;
};

const openEditPackageDialog = (category) => {
  editingPackageCategory.value = { ...category };
  showPackageDialog.value = true;
};

const savePackageCategory = async (categoryData) => {
  try {
    if (categoryData.id) {
      await updatePlanPackageCategory(categoryData.id, categoryData);
      toast.add({ severity: 'success', summary: '成功', detail: 'パッケージカテゴリーが更新されました', life: 3000 });
    } else {
      await createPlanPackageCategory(categoryData);
      toast.add({ severity: 'success', summary: '成功', detail: 'パッケージカテゴリーが作成されました', life: 3000 });
    }
    showPackageDialog.value = false;
    await loadData();
  } catch (error) {
    console.error('Error saving package category:', error);
    toast.add({ severity: 'error', summary: 'エラー', detail: 'パッケージカテゴリーの保存に失敗しました', life: 3000 });
  }
};

const confirmDeletePackage = (event, category) => {
  confirm.require({
    group: 'delete-category',
    target: event.currentTarget,
    message: `パッケージカテゴリー「${category.name}」を削除しますか？`,
    header: '削除確認',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'キャンセル',
    acceptClass: 'p-button-danger',
    acceptLabel: '削除',
    accept: () => deletePackageCategory(category.id),
  });
};

const deletePackageCategory = async (id) => {
  try {
    await deletePlanPackageCategory(id);
    toast.add({ severity: 'success', summary: '成功', detail: 'パッケージカテゴリーが削除されました', life: 3000 });
    await loadData();
  } catch (error) {
    console.error('Error deleting package category:', error);
    if (error?.message?.includes('currently in use')) {
      toast.add({ severity: 'error', summary: 'エラー', detail: 'このカテゴリーは使用中のため削除できません', life: 5000 });
    } else {
      toast.add({ severity: 'error', summary: 'エラー', detail: 'パッケージカテゴリーの削除に失敗しました', life: 3000 });
    }
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
/* Add any scoped styles here if needed */
</style>