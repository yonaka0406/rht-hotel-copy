import { ref, onMounted } from "vue";
import { useToast } from 'primevue/usetoast';
import { useConfirm } from "primevue/useconfirm";

export function useManageRoles() {
    const toast = useToast();
    const confirm = useConfirm();
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Refs
    const isLoading = ref(true);
    const roles = ref([]);
    const createRoleDialog = ref(false);
    const newRole = ref({ name: "", permissions: [], description: "" });
    const dialogErrorMessage = ref('');
    const permissionsList = ref([
        { name: "データベース管理", code: "manage_db" },
        { name: "ユーザー管理", code: "manage_users" },
        { name: "顧客管理", code: "manage_clients" },
        { name: "データ編集可能", code: "crud_ok" },
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
                toast.add({
                    severity: 'success',
                    summary: 'Role Updated',
                    detail: '権限が更新されました。',
                    life: 3000,
                });
            } else {
                console.error("Failed to update role:", response.statusText);
                toast.add({
                    severity: 'error',
                    summary: 'Update Failed',
                    detail: response.statusText,
                    life: 5000,
                });
            }
        } catch (error) {
            console.error("Error updating permissions:", error);
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
                            fetchRoles(); // Reload the list
                        } else if (response.status === 403) {                console.error("Failed to delete role:", response.statusText);
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
            message: `「"${role.role_name}"」ロールを削除してもよろしいですか?`,
            header: '削除の確認',
            icon: 'pi pi-info-circle',
            acceptClass: 'p-button-danger',
            acceptLabel: 'はい',
            rejectLabel: 'キャンセル',
            rejectIcon: 'pi pi-times',
            rejectClass: 'p-button-secondary',
            accept: () => {
                deleteRole(role);
                toast.add({
                    severity: 'success',
                    summary: 'ロール削除',
                    detail: `「"${role.role_name}"」を削除します。`,
                    life: 3000
                });
                confirm.close();
            },
            reject: () => {
                toast.add({
                    severity: 'info',
                    summary: '削除キャンセル',
                    detail: 'ロール削除するのをキャンセルしました。',
                    life: 3000
                });
                confirm.close();
            }
        });
    };

    const cancelDialog = () => {
        // Reset the inputs when the dialog is closed
        newRole.value = {
            name: '',
            permissions: [],
            description: ''
        };
        createRoleDialog.value = false; // Close the dialog
        dialogErrorMessage.value = ''; // Clear any error messages
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
        deleteRole,
        confirmDelete,
        cancelDialog,
    };
}
