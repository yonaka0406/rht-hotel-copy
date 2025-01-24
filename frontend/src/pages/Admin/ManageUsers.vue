<template>
    <div class="p-4">
        <Panel header="Create & Edit Users">
            <div>
                <div class="text-left">
                    <Button
                        label="Create User"
                        icon="pi pi-user-plus"
                        class="p-button-success mb-4"
                        @click="createUser"
                    />
                </div>

                <!-- Create User Dialog -->
                <Dialog
                    v-model="createUserDialog"
                    v-if="createUserDialog"                    
                    header="Create New User"
                    :visible="createUserDialog"
                    :style="{ width: '450px' }"
                    modal
                    :closable="false"
                >
                    <form @submit.prevent="submitNewUser">
                    
                        <!-- User Email Field -->
                        <div class="field mb-5 mt-5">                        
                            <FloatLabel>
                                <InputText
                                    id="email"                                    
                                    v-model="newUser.email"
                                    class="w-full"
                                    :class="{'p-invalid': emailError}"
                                    required 
                                    @blur="validateEmail(newUser.email)"                                                                       
                                />
                                <label for="email">Email</label>
                            </FloatLabel> 
                        </div>

                        <small v-if="emailError" class="p-error text-red-500">{{ emailError }}</small>
                        
                        <!-- Password Input -->
                        <div class="field mb-5 mt-5">
                            <FloatLabel>
                                <Password
                                    id="password"                                    
                                    v-model="newUser.password"
                                    toggleMask
                                    feedback
                                    promptLabel="Choose a password"
                                    weakLabel="Too simple"
                                    mediumLabel="Average complexity"
                                    strongLabel="Complex password"
                                    class="w-full"
                                    :class="{'p-invalid': passwordError}"
                                    required      
                                    @blur="validatePassword(newUser.password)"                              
                                >
                                    <template #header>
                                        <div class="font-semibold text-xm mb-4">Pick a password</div>
                                    </template>
                                    <template #footer>
                                        <Divider />
                                        <ul class="pl-2 ml-2 my-0 leading-normal">
                                            <li>At least one lowercase</li>
                                            <li>At least one uppercase</li>
                                            <li>At least one numeric</li>
                                            <li>Minimum 8 characters</li>
                                        </ul>
                                    </template>
                                </Password>
                                <label for="password">Password</label>
                            </FloatLabel> 
                        </div>

                        <small v-if="passwordError" class="p-error text-red-500">{{ passwordError }}</small>

                        <!-- Role Selection -->
                        <div class="field mt-5">
                            <FloatLabel>
                                <Select
                                    id="role"
                                    v-model="newUser.role"
                                    :options="roles"
                                    optionLabel="role_name"
                                    optionValue="id"
                                    class="w-full"
                                    :class="{'p-invalid': roleError}"
                                    required                                    
                                    @blur="validateRole(newUser.role)"
                                />
                                <label for="role">Role</label>
                            </FloatLabel>                                
                        </div>

                        <small v-if="roleError" class="p-error text-red-500">{{ roleError }}</small>

                        <!-- Error Message Section -->
                        <div v-if="dialogErrorMessage" class="p-error mt-2 text-red-500 text-sm text-center">
                            {{ dialogErrorMessage }}
                        </div>

                        <!-- Buttons -->
                        <div class="mb-3 mt-5 text-center space-x-2">
                            <!-- Submit Button -->
                            <Button
                                type="submit"
                                label="Create User"
                                class="p-button-success"
                                icon="pi pi-check"
                                severity="success"                                    
                            />
                            <!-- Cancel Button -->
                            <Button
                                type="button"
                                label="Cancel"
                                class="p-button-text p-button-secondary"
                                icon="pi pi-times"
                                severity="danger"
                                @click="cancelCreateDialog()"
                            />
                        </div>
                    
                    </form>
                </Dialog>

                <div class="users-management">
                    <Accordion :activeIndex="0">
                        <AccordionPanel value="1">
                            <AccordionHeader>                               
                                <div class="flex space-x-4">
                                    <span class="inline">Active Users</span>
                                    <div class="flex items-center">
                                        <Badge
                                            v-if="activeUsersCount > 0"
                                            class="ml-2"
                                            :value="activeUsersCount"
                                            severity="success"
                                        />
                                    </div>
                                </div>
                            </AccordionHeader>
                            <AccordionContent>
                                <DataTable 
                                    v-model:filters="filters"                                    
                                    :value="activeUsers"
                                    removableSort 
                                    paginator                                     
                                    :rows="10"
                                    class="p-datatable-sm" 
                                    dataKey="id"
                                    filterDisplay="row"
                                    :loading="loading"
                                    :globalFilterFields="['email', 'role_name']"
                                    scrollable
                                    responsive                                    
                                >
                                    <template #header>
                                        <div class="flex justify-end">
                                            <IconField>
                                                <InputIcon>
                                                    <i class="pi pi-search" />
                                                </InputIcon>
                                                <InputText v-model="filters['global'].value" placeholder="Keyword Search" />
                                            </IconField>
                                        </div>
                                    </template>
                                    <Column field="status_id" header="Status ID" sortable style="display: none"></Column>
                                    <Column field="id" header="User ID" sortable style="display: none"></Column>
                                    <Column field="email" header="Email" sortable style="width: 70%"></Column>    
                                    <Column field="role_id" header="Role ID" sortable style="display: none"></Column>
                                    <Column field="role_name" header="Role" sortable style="width: 20%"></Column>
                                    <Column header="Actions" style="width: 10%">
                                        <template #body="slotProps" >
                                            <div class="text-center">
                                                <Button
                                                    v-if="slotProps.data.id !== 1"
                                                    icon="pi pi-pencil"
                                                    class="p-button-info p-button-sm"
                                                    @click="editUser(slotProps.data)"
                                                />
                                            </div>
                                                                                       
                                        </template>
                                    </Column>
                                </DataTable>
                            </AccordionContent>
                        </AccordionPanel>
                        
                        <AccordionPanel value="2">
                            <AccordionHeader>                                
                                <div class="flex space-x-4">
                                    <span class="inline">Deactivated Users</span>
                                    <div class="flex items-center">
                                        <Badge
                                            v-if="deactivatedUsersCount > 0"
                                            class="ml-2"
                                            :value="deactivatedUsersCount"
                                            severity="danger"
                                        />
                                    </div>
                                </div>                                
                            </AccordionHeader>
                            <AccordionContent>
                                <DataTable 
                                    v-model:filters="filters"                                    
                                    :value="deactivatedUsers"
                                    removableSort 
                                    paginator                                     
                                    :rows="10"
                                    class="p-datatable-sm" 
                                    dataKey="id"
                                    filterDisplay="row"
                                    :loading="loading"
                                    :globalFilterFields="['email', 'role_name']"
                                    scrollable
                                    responsive 
                                >
                                    <template #header>
                                        <div class="flex justify-end">
                                            <IconField>
                                                <InputIcon>
                                                    <i class="pi pi-search" />
                                                </InputIcon>
                                                <InputText v-model="filters['global'].value" placeholder="Keyword Search" />
                                            </IconField>
                                        </div>
                                    </template> 
                                    <Column field="email" header="Email" sortable style="width: 70%"></Column>    
                                    <Column field="role_id" header="Role ID" sortable style="display: none"></Column>
                                    <Column field="role_name" header="Role" sortable style="width: 20%"></Column>
                                    <Column header="Actions" style="width: 10%">
                                        <template #body="slotProps" >
                                            <div class="text-center">
                                                <Button
                                                    v-if="slotProps.data.id !== 1"
                                                    icon="pi pi-pencil"
                                                    class="p-button-info p-button-sm"
                                                    @click="editUser(slotProps.data)"
                                                />
                                            </div>
                                                                                       
                                        </template>
                                    </Column>                                   
                                </DataTable>
                            </AccordionContent>
                        </AccordionPanel>
                    </Accordion>
                </div>

                <!-- Edit User Dialog -->
                <Dialog
                    v-model="editUserDialog"
                    v-if="editUserDialog"
                    header="Create New User"
                    :visible="editUserDialog"
                    :style="{ width: '450px' }"
                    modal
                    :closable="false"
                >
                    <form @submit.prevent="submitEditUser">
                    
                        <!-- User Email Field -->
                        <div class="field mb-5 mt-5">                        
                            <FloatLabel>
                                <InputText
                                    id="eu_email"                                    
                                    v-model="currentUser.email"
                                    class="w-full"                                    
                                    disabled                                     
                                />
                                <label for="email">Email</label>
                            </FloatLabel> 
                        </div>

                        <!-- Role Selection -->
                        <div class="field mt-5">
                            <FloatLabel>
                                <Select
                                    id="role"
                                    v-model="currentUser.role"
                                    :options="roles"
                                    optionLabel="role_name"
                                    optionValue="id"
                                    class="w-full"
                                    :class="{'p-invalid': roleError}"
                                    required
                                    @blur="validateRole(currentUser.role)"
                                />
                                <label for="role">Role</label>
                            </FloatLabel>                                
                        </div>

                        <small v-if="roleError" class="p-error text-red-500">{{ roleError }}</small>

                        <!-- Status Selection -->
                        <div class="field mt-5 text-center">
                            <ToggleButton 
                                v-model="statusToggle" 
                                onLabel="Active"                                  
                                offLabel="Deactivated"
                                onIcon="pi pi-lock-open"                                 
                                offIcon="pi pi-lock" 
                                class="w-36" 
                                aria-label="User Status Toggle"
                            />
                        </div>

                        <!-- Error Message Section -->
                        <div v-if="dialogErrorMessage" class="p-error mt-2 text-red-500 text-sm text-center">
                            {{ dialogErrorMessage }}
                        </div>

                        <!-- Buttons -->
                        <div class="mb-3 mt-5 text-center space-x-2">
                            <!-- Edit Button -->
                            <Button
                                type="submit"
                                label="Edit User"
                                class="p-button-warning"
                                icon="pi pi-pencil"
                                severity="warning"                                    
                            />
                            <!-- Cancel Button -->
                            <Button
                                type="button"
                                label="Cancel"
                                class="p-button-text p-button-secondary"
                                icon="pi pi-times"
                                severity="danger"
                                @click="cancelEditDialog"
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
    import { FilterMatchMode } from '@primevue/core/api';
    
    import InputText from 'primevue/inputtext';
    import Password from 'primevue/password';
    import FloatLabel from 'primevue/floatlabel';
    import Card from 'primevue/card';
    import Button from 'primevue/button';
    import Panel  from 'primevue/panel';
    import Divider from 'primevue/divider';
    import Dialog from "primevue/dialog";
    import Select from 'primevue/select';

    import Accordion from 'primevue/accordion';
    import AccordionPanel from 'primevue/accordionpanel';
    import AccordionHeader from 'primevue/accordionheader';
    import AccordionContent from 'primevue/accordioncontent';
    import Badge from 'primevue/badge';
    import OverlayBadge from 'primevue/overlaybadge';
    import DataTable from 'primevue/datatable';
    import Column from 'primevue/column';    
    import IconField from 'primevue/iconfield';
    import InputIcon from 'primevue/inputicon';

    import ToggleButton from 'primevue/togglebutton';

    export default {
        name: 'ManageUsers',
        components: {
            InputText,
            Password,
            FloatLabel,
            Card,
            Button,
            Panel,
            Divider,
            Dialog,
            Select,
            Accordion,
            AccordionPanel,
            AccordionHeader,
            AccordionContent,
            Badge,
            OverlayBadge,
            DataTable,
            Column,
            IconField,
            InputIcon,
            ToggleButton,       
        },
        computed: {
            // Convert currentUser.status (1 or 2) to true/false
            statusToggle: {
                get() {
                    return this.currentUser.status === 1;  // If status is 1, toggle is true (Active)
                },
                set(value) {
                    this.currentUser.status = value ? true : false;  // If true, set to 1 (Active); if false, set to 2 (Deactivated)
                }
            },
        },
        setup() {
            const toast = useToast();
            const confirm = useConfirm();            
            
            // Refs            
            const newUser = ref({ 
                email: '', 
                password: '',
                role: null
            });
            const currentUser = ref({ 
                id: null,
                email: '',                 
                role: null,
                status: true,
            });
            const roles = ref([]);
            const activeUsers = ref([]);
            const deactivatedUsers = ref([]); 
            const activeUsersCount = ref([]); 
            const deactivatedUsersCount = ref([]); 
            const filters = ref({
                global: { value: null, matchMode: FilterMatchMode.CONTAINS }                
            });
            const loading = ref(true);       
            const emailError = ref(null);
            const passwordError = ref(null);
            const roleError = ref(null);
            const dialogErrorMessage = ref(null);
            const createUserDialog = ref(false);
            const editUserDialog = ref(false);            

            // Fetch roles
            const fetchRoles = async () => {
                
                const authToken = localStorage.getItem('authToken');

                try {                    
                    const response = await fetch('/api/roles', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json',                            
                        },                        
                    });

                    if (response.ok) {
                        const data = await response.json();
                        roles.value = data.map(role => {
                            return {
                                ...role                                
                            };
                        });
                        
                    } else {
                        console.error('Failed to fetch roles:', response.statusText);
                    }
                } catch (error) {
                    console.error("Error fetching roles:", error);
                }
            };

            // Fetch users
            const fetchUsers = async () => {

                const authToken = localStorage.getItem('authToken');                

                try {                    
                    const response = await fetch('/api/users', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json',                            
                        },                        
                    });

                    if (response.ok) {
                        const users = await response.json();                        

                        // Filter active and deactivated users based on status_id
                        activeUsers.value = users.filter(user => user.status_id === 1); // status_id: 1 is active
                        deactivatedUsers.value = users.filter(user => user.status_id === 2); // status_id: 2 is deactivated

                        // Computed properties to get count of active and deactivated users
                        activeUsersCount.value = activeUsers.value.length;
                        deactivatedUsersCount.value = deactivatedUsers.value.length;                        
                        
                        loading.value = false;
                        
                    } else {
                        console.error('Failed to fetch users:', response.statusText);
                    }
                } catch (error) {
                    console.error("Error fetching users:", error);
                }
            };

            // New User
            const submitNewUser = async () => {
                
                const authToken = localStorage.getItem('authToken');

                const bodyEmail = newUser.value.email;
                const bodyPassword = newUser.value.password;
                const bodyRole = newUser.value.role;

                // Validate form fields                
                validateEmail(bodyEmail);
                validatePassword(bodyPassword);
                validateRole(bodyRole);

                // Check for validation errors
                if (emailError.value || passwordError.value || roleError.value) {
                    return;
                }

                // Make the API call
                try {                    
                    const response = await fetch('/api/user/register', {
                        method: 'POST',
                        headers: {                            
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            email: bodyEmail,
                            password: bodyPassword,
                            role: bodyRole,                            
                        }),
                    });

                    const result = await response.json();

                    if (response.ok) {
                        toast.add({
                            severity: 'success',
                            summary: 'Success',
                            detail: 'User registered successfully!',
                            life: 3000,
                        });

                        cancelCreateDialog(); 
                        // Fetch updated user list
                        await fetchUsers();
                    } else {                        
                        toast.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: data.error || 'Registration failed.',
                            life: 3000,
                        });
                        // If there's an error (e.g., email already exists), show error message
                        apiResponse = { type: 'error', message: result.error };
                    }                    
                } catch (err) {
                    console.error(err);
                    toast.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'An error occurred. Please try again.',
                        life: 3000,
                    });
                    apiResponse = { type: 'error', message: 'An error occurred. Please try again.' };                    
                }
            }

            // Edit User
            const submitEditUser = async () => {
                const authToken = localStorage.getItem('authToken');

                const bodyID = currentUser.value.id;
                const bodyRole = currentUser.value.role;
                const bodyStatus = typeof currentUser.value.status === 'number'
                    ? currentUser.value.status  // If it's an integer, keep it as is
                    : currentUser.value.status === true
                    ? 1  // If it's true, make it 1 (Active)
                    : 2;  // If it's false, make it 2 (Deactivated)

                // Make the API call
                try {                    
                    const response = await fetch('/api/user/update', {
                        method: 'PUT',
                        headers: {                            
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            id: bodyID,
                            status_id: bodyStatus,
                            role_id: bodyRole,
                        }),
                    });

                    const result = await response.json();

                    if (response.ok) {
                        toast.add({
                            severity: 'success',
                            summary: 'Success',
                            detail: 'User updated successfully!',
                            life: 3000,
                        });

                        cancelEditDialog(); 
                        // Fetch updated user list
                        await fetchUsers();
                    } else {                        
                        toast.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: data.error || 'Update failed.',
                            life: 3000,
                        });
                        // If there's an error (e.g., email already exists), show error message
                        apiResponse = { type: 'error', message: result.error };
                    }                    
                } catch (err) {
                    console.error(err);
                    toast.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'An error occurred. Please try again.',
                        life: 3000,
                    });
                    apiResponse = { type: 'error', message: 'An error occurred. Please try again.' };                    
                }
                
            }

            // Dialog
                const createUser = () => {
                    createUserDialog.value = true;
                };
                const cancelCreateDialog = () => {
                    newUser.email = '';
                    newUser.password = '';
                    newUser.role = null;
                    emailError.value = null;
                    passwordError.value = null;
                    roleError.value = null;
                    dialogErrorMessage.value = null;
                    
                    createUserDialog.value = false;
                    
                };
                const editUser = (user) => {
                    currentUser.value = { 
                        id: user.id,
                        email: user.email, 
                        role: user.role_id,
                        status: user.status_id 
                    };
                    editUserDialog.value = true;
                };
                const cancelEditDialog = () => {                    
                    currentUser.id = null;
                    currentUser.email = '';
                    currentUser.role = null;
                    currentUser.status = true;
                    roleError.value = null;
                    
                    editUserDialog.value = false;                    
                };
                // Email Validation
                const validateEmail = (email) => {
                    if (!email || !/\S+@\S+\.\S+/.test(email)) {
                        emailError.value = 'Please enter a valid email address.';
                    } else {
                        emailError.value = null;
                    }
                };
                // Password Validation
                const validatePassword = (password) => {
                    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

                    if (!password) {
                        passwordError.value = "Password is required.";
                    } else if (!passwordRegex.test(password)) {
                        passwordError.value =
                            "Password must have at least 8 characters, one uppercase letter, one lowercase letter, and one number.";
                    } else {
                        passwordError.value = "";
                    }
                };
                // Role Validation
                const validateRole = (role) => {
                    if (!role) {
                        roleError.value = 'Please select a role.';
                    } else {
                        roleError.value = null;
                    }
                };

            // Call fetchRoles when component is mounted
            onMounted(() => {
                fetchRoles();
                fetchUsers();
            });

            return {
                newUser,
                currentUser,                
                roles,
                activeUsers,
                deactivatedUsers,
                activeUsersCount,
                deactivatedUsersCount,
                filters,
                loading,
                emailError,
                passwordError,
                roleError,
                createUserDialog,
                editUserDialog,
                dialogErrorMessage,
                fetchRoles,
                fetchUsers,
                submitNewUser,
                submitEditUser,
                createUser,
                cancelCreateDialog,
                editUser,
                cancelEditDialog,
                validateEmail,
                validatePassword,
                validateRole
            }
        }        
    };
</script>
  
<style scoped>
  /* Add any custom styles for the ManageUsers page here */
</style>
  