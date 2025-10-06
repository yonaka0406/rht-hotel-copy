<template>    
    <div class="p-4">
        <Panel header="ユーザーロール管理">            
            <div>
                <div class="text-left">
                    <Button
                        label="ロール作成"
                        icon="pi pi-plus"
                        class="p-button-success mb-4"
                        @click="createRole"
                    />
                </div>
                
                <div>
                    <!-- DataTable -->
                    <DataTable 
                        v-if="!isLoading"
                        :value="roles" 
                        paginator 
                        :rows="10" 
                        class="p-datatable-sm"
                        scrollable
                        responsive                    
                    >
                        <Column field="id" header="ID" />
                        <Column field="role_name" header="ロール名" />
                        <Column header="権限">
                            <template #body="slotProps">
                                <MultiSelect
                                    v-model="slotProps.data.permissions"
                                    :options="permissionsList"
                                    optionLabel="name"                                        
                                    placeholder="権限を選択する"   
                                    class="w-full md:w-80"
                                    :disabled="slotProps.data.id === 1 || slotProps.data.id === 5"
                                    @change="submitPermissionsChange(slotProps.data)"
                                />
                            </template>
                        </Column>                            
                        <Column header="詳細">
                            <template #body="slotProps">
                            <Textarea
                                v-model="slotProps.data.description"
                                rows="4" 
                                cols="30" 
                                placeholder="詳細を入力する"
                                class="w-full"
                                @change="submitPermissionsChange(slotProps.data)"
                            />
                            </template>
                        </Column>
                        <Column header="操作">
                            <template #body="slotProps">
                                <Button
                                    v-if="slotProps.data.id !== 1 && slotProps.data.id !== 5"
                                    icon="pi pi-trash"
                                    class="p-button-danger p-button-sm"
                                    @click="confirmDelete(slotProps.data)"
                                />
                                <ConfirmPopup />
                            </template>
                        </Column>
                    </DataTable>

                    <!-- Skeleton Loader -->
                    <div v-else class="p-datatable p-datatable-sm w-full">
                        <!-- Skeleton Rows -->
                        <div v-for="i in 10" :key="i" class="flex items-center p-2 border-b border-gray-200">
                            <Skeleton width="5%" height="2rem" class="mr-2" />
                            <Skeleton width="25%" height="2rem" class="mr-2" />
                            <Skeleton width="30%" height="2rem" class="mr-2" />
                            <Skeleton width="30%" height="2rem" class="mr-2" />
                            <Skeleton width="10%" height="2rem" />
                        </div>
                    </div>
                </div>
                <!-- Create Role Dialog -->
                <Dialog
                    v-model="createRoleDialog"
                    header="新規ロール"
                    :visible="createRoleDialog"
                    :style="{ width: '450px' }"
                    modal
                    :closable="false"
                >
                    <form @submit.prevent="submitNewRole">
                    
                    <!-- Role Name Field -->
                    <div class="field mb-5 mt-5">
                        <FloatLabel>
                            <InputText
                                id="roleName"
                                v-model="newRole.name"                                        
                                class="w-full"
                                required
                            />
                            <label for="roleName">ロール名</label>
                        </FloatLabel>
                    </div>

                    <!-- Permissions Field -->
                    <div class="field mb-5 mt-5">
                        <FloatLabel>
                            <MultiSelect
                                id="permissions"
                                v-model="newRole.permissions"
                                :options="permissionsList"
                                optionLabel="name"                                        
                                display="chip"
                                class="w-full"
                            />
                            <label for="roleName">権限</label>
                        </FloatLabel>
                    </div>

                    <!-- Description Field -->
                    <div class="field mb-3 mt-5">
                        <FloatLabel>
                            <InputText
                                id="description"
                                v-model="newRole.description"
                                class="w-full"
                            />
                            <label for="description">詳細</label>
                        </FloatLabel>
                    </div>

                    <!-- Error Message Section -->
                    <div v-if="dialogErrorMessage" class="p-error mt-2 text-red-500 text-sm text-center">
                        {{ dialogErrorMessage }}
                    </div>

                    <div class="mb-3 mt-5 text-center">
                        <!-- Submit Button -->
                        <Button
                            type="submit"
                            label="新規"
                            class="p-button-success"
                            icon="pi pi-check"
                            severity="success"                                    
                        />
                        <!-- Cancel Button -->
                        <Button
                            type="button"
                            label="キャンセル"
                            class="p-button-text p-button-secondary"
                            icon="pi pi-times"
                            severity="danger"
                            @click="cancelDialog"
                        />
                    </div>

                    
                    </form>
                </Dialog>

            </div>                
        </Panel>
    </div>    
  </template>
  
<script setup>
    // Vue
    import { onMounted } from "vue";

    //Primevue
    import { Panel, Dialog, DataTable, Column, FloatLabel, InputText, Textarea, MultiSelect, Button, Skeleton, ConfirmPopup} from 'primevue';
    import { useManageRoles } from '../../../composables/useManageRolesStore';

    const {
        isLoading,
        roles,
        createRoleDialog,
        newRole,
        dialogErrorMessage,
        permissionsList,
        fetchRoles,
        submitPermissionsChange,
        createRole,
        submitNewRole,
        deleteRole,
        confirmDelete,
        cancelDialog,
    } = useManageRoles();

    onMounted(() => {
        fetchRoles();
    });
</script>
  
<style scoped>

</style>
  