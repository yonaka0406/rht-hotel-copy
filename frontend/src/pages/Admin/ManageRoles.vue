<template>    
    <div class="p-4">
        <Panel header="Manage Roles">            
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
  
<script>
    import { ref, onMounted } from "vue";    
    import { useToast } from 'primevue/usetoast';
    import { useConfirm } from "primevue/useconfirm";
    import Button from "primevue/button";
    import Card from "primevue/card";
    import Skeleton from "primevue/skeleton";
    import DataTable from "primevue/datatable";
    import Column from "primevue/column";
    import Dialog from "primevue/dialog";
    import FloatLabel from 'primevue/floatlabel';
    import InputText from "primevue/inputtext";
    import Textarea from 'primevue/textarea';
    import MultiSelect from "primevue/multiselect";
    import Panel from "primevue/panel";
    import ConfirmPopup from 'primevue/confirmpopup';

    export default {
        name: "ManageRoles",
        components: {            
            Button,
            Card,
            Skeleton,
            DataTable,
            Column,
            Dialog,
            FloatLabel,
            InputText,
            Textarea,
            MultiSelect,
            Panel,
            ConfirmPopup,
        },
        setup() {
            const toast = useToast();
            const confirm = useConfirm();
            const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

            // Refs
            const isLoading = ref(true);
            const roles = ref([]);
            const createRoleDialog = ref(false);
            const newRole = ref({ name: "", permissions: [] });
            const dialogErrorMessage = ref('');
            const permissionsList = ref([
                { name: "データベース管理", code: "manage_db" },
                { name: "ユーザー管理", code: "manage_users" },
                { name: "顧客管理", code: "manage_clients" },
                { name: "レポート閲覧", code: "view_reports" }
            ]);


            const fetchRoles = async () => {
                let success = false;

                while (!success) {
                    const authToken = localStorage.getItem("authToken");

                    try {                        
                        const response = await fetch("/api/roles", {
                            method: "GET",
                            headers: {
                            Authorization: `Bearer ${authToken}`,
                            "Content-Type": "application/json",
                            },
                        });

                        if (response.ok) {
                            const data = await response.json();
                            roles.value = data.map((role) => {
                            return {
                                ...role,
                                permissions: Object.keys(role.permissions)
                                .filter((key) => role.permissions[key])
                                .map((key) =>
                                    permissionsList.value.find(
                                    (permission) => permission.code === key
                                    )
                                ),
                            };
                            });
                            success = true; // Stop retrying                                                  
                        } else {
                            console.error("Failed to fetch roles:", response.statusText);
                        }
                    } catch (error) {
                        console.error("Error fetching roles:", error);
                    }

                    if (!success) {
                        console.log("Retrying in 2 seconds...");
                        await delay(2000); // Wait 2 seconds before retrying
                    }
                }

                isLoading.value = false;
            };

            const submitPermissionsChange = async (roleData) => {
                
                const authToken = localStorage.getItem('authToken');

                try {
                    // Prepare the role data (permissions change)
                    const permissionsObject = roleData.permissions.reduce((acc, permission) => {
                        acc[permission.code] = true;
                        return acc;
                    }, {});

                    const updatedRoleData = {
                        id: roleData.id,
                        role_name: roleData.role_name,
                        permissions: permissionsObject,
                        description: roleData.description,
                    };

                    // Call the API to update the role permissions
                    const response = await fetch('/api/roles/update', {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(updatedRoleData),
                    });
                    if (response.ok) {
                        const data = await response.json();
                        console.log("Role updated successfully:", data);
                        // Show success toast after role update
                        toast.add({
                            severity: 'success',
                            summary: 'Role Updated',
                            detail: '権限が更新されました。',
                            life: 3000,
                        });
                    } else {
                        console.error("Failed to update role:", response.statusText);
                        // Show error toast on failure
                        toast.add({
                            severity: 'error',
                            summary: 'Update Failed',
                            detail: response.statusText,
                            life: 5000,
                        });
                    }
                } catch (error) {
                    console.error("Error updating permissions:", error);
                    // Show error toast in case of an exception
                    toast.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'An unexpected error occurred while updating the role.',
                    life: 5000,
                    });
                }
            };

            const createRole = () => {
              createRoleDialog.value = true;
            };

            const submitNewRole = async () => {
                
                const authToken = localStorage.getItem('authToken');

                try {
                    // Transform the selected permissions to the required format
                    const transformedPermissions = newRole.value.permissions.reduce((acc, permission) => {
                        acc[permission.code] = true;  // Set the permission to true
                        return acc;
                    }, {});

                    // Prepare the new role data with the transformed permissions
                    const newRoleData = {
                        role_name: newRole.value.name,
                        permissions: transformedPermissions,
                        description: newRole.value.description
                    };

                    // Replace this with your API call to create the role
                    const response = await fetch('/api/roles/create', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(newRoleData),
                    });

                    if (response.ok) {
                        // Close dialog and reset form if the role is created successfully
                        cancelDialog();
                        // Refresh roles list
                        fetchRoles();
                    } else if (response.status === 409) {                        
                        const errorData = await response.json();
                        
                        dialogErrorMessage.value = errorData.error;                        
                    } else {
                        throw new Error('Failed to create role');
                    }                    
                } catch (error) {
                    console.error("Error creating role:", error);
                }
            };

            const permissionsTemplate = (rowData) => {
                return Object.keys(rowData.permissions)
                    .filter(key => rowData.permissions[key])
                    .join(", ");
            };

            const deleteRole = async (role) => {
                
                const authToken = localStorage.getItem('authToken');

                try {
                    // Send DELETE request to the server
                    const response = await fetch(`/api/roles/delete/${role.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${authToken}`, // Replace with your actual token logic
                        'Content-Type': 'application/json',
                    },
                    });

                    if (response.ok) {
                        const result = await response.json();
                        console.log("Role deleted successfully:", result);                        
                    } else if (response.status === 403) {
                        console.error("Failed to delete role:", response.statusText);
                        toast.add({
                            severity: 'error',
                            summary: 'Delete Denied',
                            detail: response.statusText,
                            life: 3000
                        });
                    } else {
                        console.error("Failed to delete role:", response.statusText);
                        toast.add({
                            severity: 'error',
                            summary: 'Delete Failed',
                            detail: 'Unable to delete the role. Please try again.',
                            life: 3000
                        });
                    }
                } catch (error) {
                    console.error("Error deleting role:", error);
                    toast.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'An unexpected error occurred while deleting the role.',
                        life: 3000
                    });
                }
            };

            const confirmDelete = (role) => {
                confirm.require({
                    message: `「"${role.role_name}」"ロールを削除してもよろしいですか?`,
                    header: 'Delete Confirmation',                    
                    icon: 'pi pi-info-circle',
                    acceptClass: 'p-button-danger',
                    accept: () => {
                        deleteRole(role);
                        toast.add({
                            severity: 'success',
                            summary: 'ロール削除',
                            detail: `「"${role.role_name}"」を削除します。`,
                            life: 3000
                        });
                    },
                    reject: () => {
                        toast.add({
                            severity: 'info',
                            summary: '削除キャンセル',
                            detail: 'ロール削除するのをキャンセルしました。',
                            life: 3000
                        });
                    }
                });
            };


            onMounted(() => {
                fetchRoles();
            });
            return {
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
                permissionsTemplate,
                deleteRole,
                confirmDelete,
            };
        },
        methods: {
            cancelDialog() {
                // Reset the inputs when the dialog is closed
                this.newRole = {
                    name: '',
                    permissions: [],
                    description: ''
                };
                this.createRoleDialog = false; // Close the dialog
            }
        }
    }
  
</script>
  
<style scoped>

</style>
  