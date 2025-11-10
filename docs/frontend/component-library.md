# Component Library

This document provides comprehensive documentation for the UI components used in the WeHub.work Hotel Management System, including usage examples, patterns, and best practices.

## Overview

The application uses a combination of:
- **PrimeVue 4+**: Professional UI component library
- **Custom Components**: Application-specific components
- **Utility Components**: Reusable helper components

## PrimeVue Components

### Core Components

#### DataTable

The DataTable component is used extensively for displaying tabular data with advanced features.

**Basic Usage:**
```vue
<script setup>
import { ref } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

const reservations = ref([
    { id: 1, guest: '田中太郎', room: '101', checkIn: '2024-01-15' },
    { id: 2, guest: '佐藤花子', room: '102', checkIn: '2024-01-16' }
]);
</script>

<template>
    <DataTable :value="reservations" stripedRows>
        <Column field="id" header="ID" sortable></Column>
        <Column field="guest" header="ゲスト名" sortable></Column>
        <Column field="room" header="部屋番号" sortable></Column>
        <Column field="checkIn" header="チェックイン日" sortable></Column>
    </DataTable>
</template>
```

**Advanced Features:**
```vue
<DataTable 
    :value="reservations"
    v-model:selection="selectedReservations"
    v-model:filters="filters"
    :paginator="true"
    :rows="10"
    :rowsPerPageOptions="[10, 25, 50]"
    filterDisplay="menu"
    :globalFilterFields="['guest', 'room']"
    stripedRows
    showGridlines
    responsiveLayout="scroll"
>
    <template #header>
        <div class="flex justify-between items-center">
            <h2 class="text-xl font-bold">予約一覧</h2>
            <InputText v-model="filters['global'].value" placeholder="検索..." />
        </div>
    </template>
    
    <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
    <Column field="guest" header="ゲスト名" sortable :showFilterMenu="true"></Column>
    <Column field="status" header="ステータス" sortable>
        <template #body="slotProps">
            <Tag :value="slotProps.data.status" :severity="getStatusSeverity(slotProps.data.status)" />
        </template>
    </Column>
    
    <Column header="アクション">
        <template #body="slotProps">
            <SplitButton 
                label="編集" 
                @click="editReservation(slotProps.data)"
                :model="getActionItems(slotProps.data)"
            />
        </template>
    </Column>
</DataTable>
```

**Column Filtering:**
```vue
<Column field="status" header="ステータス" :showFilterMenu="true">
    <template #filter="{filterModel, filterCallback}">
        <Select 
            v-model="filterModel.value" 
            @change="filterCallback()"
            :options="statusOptions"
            placeholder="ステータスを選択"
            class="w-full"
        />
    </template>
</Column>
```

#### Form Components with FloatLabel

**InputText with FloatLabel:**
```vue
<FloatLabel class="mt-6">
    <label for="guestName">ゲスト名</label>
    <InputText id="guestName" v-model="guestName" fluid />
</FloatLabel>
```

**Select (Dropdown) with FloatLabel:**
```vue
<FloatLabel class="mt-6">
    <label for="roomType">部屋タイプ</label>
    <Select 
        id="roomType"
        v-model="selectedRoomType"
        :options="roomTypes"
        optionLabel="name"
        optionValue="id"
        placeholder="部屋タイプを選択"
        fluid
    />
</FloatLabel>
```

**DatePicker with FloatLabel:**
```vue
<FloatLabel class="mt-6">
    <label for="checkInDate">チェックイン日</label>
    <DatePicker 
        id="checkInDate"
        v-model="checkInDate"
        dateFormat="yy/mm/dd"
        :showIcon="true"
        fluid
    />
</FloatLabel>
```

**InputNumber with FloatLabel:**
```vue
<FloatLabel class="mt-6">
    <label for="price">料金</label>
    <InputNumber 
        id="price"
        v-model="price"
        mode="currency"
        currency="JPY"
        locale="ja-JP"
        class="w-full"
    />
</FloatLabel>
```

**Note**: For components without `fluid` prop support (like `InputNumber`), use `class="w-full"` to achieve full width.

#### Dialog

**Basic Dialog:**
```vue
<script setup>
import { ref } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';

const visible = ref(false);

const openDialog = () => {
    visible.value = true;
};

const closeDialog = () => {
    visible.value = false;
};
</script>

<template>
    <Button label="ダイアログを開く" @click="openDialog" />
    
    <Dialog 
        v-model:visible="visible"
        header="予約詳細"
        :style="{ width: '50vw' }"
        :modal="true"
    >
        <p>ダイアログの内容がここに表示されます。</p>
        
        <template #footer>
            <Button label="キャンセル" severity="secondary" outlined @click="closeDialog" />
            <Button label="保存" severity="success" @click="saveAndClose" />
        </template>
    </Dialog>
</template>
```

**Form Dialog Pattern:**
```vue
<Dialog 
    v-model:visible="showFormDialog"
    :header="isEditMode ? '予約編集' : '新規予約'"
    :style="{ width: '70vw' }"
    :modal="true"
    :closable="true"
>
    <div class="grid grid-cols-12 gap-4">
        <div class="col-span-6">
            <FloatLabel class="mt-6">
                <label for="guestName">ゲスト名</label>
                <InputText id="guestName" v-model="formData.guestName" fluid />
            </FloatLabel>
        </div>
        
        <div class="col-span-6">
            <FloatLabel class="mt-6">
                <label for="roomNumber">部屋番号</label>
                <InputText id="roomNumber" v-model="formData.roomNumber" fluid />
            </FloatLabel>
        </div>
    </div>
    
    <template #footer>
        <Button label="キャンセル" severity="secondary" outlined @click="closeDialog" />
        <Button label="保存" severity="success" @click="submitForm" />
    </template>
</Dialog>
```

#### ConfirmDialog

**Using ConfirmDialog Service:**
```vue
<script setup>
import { useConfirm } from 'primevue/useconfirm';
import ConfirmDialog from 'primevue/confirmdialog';

const confirm = useConfirm();

const deleteReservation = (reservationId) => {
    confirm.require({
        message: 'この予約を削除してもよろしいですか？',
        header: '削除確認',
        icon: 'pi pi-exclamation-triangle',
        acceptProps: {
            label: '削除',
            severity: 'danger'
        },
        rejectProps: {
            label: 'キャンセル',
            severity: 'secondary',
            outlined: true
        },
        accept: async () => {
            await performDelete(reservationId);
            toast.add({ 
                severity: 'success', 
                summary: '成功', 
                detail: '予約が削除されました', 
                life: 3000 
            });
        },
        reject: () => {
            // User cancelled
        }
    });
};
</script>

<template>
    <ConfirmDialog />
    <Button label="削除" severity="danger" @click="deleteReservation(reservation.id)" />
</template>
```

#### Toast Notifications

**Using Toast Service:**
```vue
<script setup>
import { useToast } from 'primevue/usetoast';
import Toast from 'primevue/toast';

const toast = useToast();

const showSuccess = () => {
    toast.add({
        severity: 'success',
        summary: '成功',
        detail: '予約が保存されました',
        life: 3000
    });
};

const showError = () => {
    toast.add({
        severity: 'error',
        summary: 'エラー',
        detail: '予約の保存に失敗しました',
        life: 5000
    });
};

const showInfo = () => {
    toast.add({
        severity: 'info',
        summary: '情報',
        detail: '新しい通知があります',
        life: 3000
    });
};

const showWarning = () => {
    toast.add({
        severity: 'warn',
        summary: '警告',
        detail: 'この操作は取り消せません',
        life: 4000
    });
};
</script>

<template>
    <Toast />
    <!-- Your component content -->
</template>
```

#### SplitButton

**Action Menu Pattern:**
```vue
<script setup>
import SplitButton from 'primevue/splitbutton';

const actionItems = [
    {
        label: '詳細を表示',
        icon: 'pi pi-eye',
        command: () => viewDetails()
    },
    {
        label: '削除',
        icon: 'pi pi-trash',
        command: () => deleteItem()
    },
    {
        separator: true
    },
    {
        label: 'エクスポート',
        icon: 'pi pi-download',
        command: () => exportData()
    }
];
</script>

<template>
    <SplitButton 
        label="編集" 
        icon="pi pi-pencil"
        @click="editItem"
        :model="actionItems"
    />
</template>
```

#### Tag

**Status Tags:**
```vue
<script setup>
const getStatusSeverity = (status) => {
    const severityMap = {
        'confirmed': 'success',
        'pending': 'warn',
        'cancelled': 'danger',
        'completed': 'info'
    };
    return severityMap[status] || 'secondary';
};
</script>

<template>
    <Tag :value="status" :severity="getStatusSeverity(status)" />
</template>
```

**Multiple Tags:**
```vue
<template>
    <div class="flex gap-2">
        <Tag v-for="hotel in selectedHotels" :key="hotel.id" :value="hotel.name" />
    </div>
</template>
```

#### AutoComplete

**Client Search:**
```vue
<script setup>
import { ref } from 'vue';
import AutoComplete from 'primevue/autocomplete';

const selectedClient = ref(null);
const filteredClients = ref([]);

const searchClients = async (event) => {
    const response = await fetch(`/api/clients/search?q=${event.query}`);
    filteredClients.value = await response.json();
};
</script>

<template>
    <FloatLabel class="mt-6">
        <label for="clientSearch">顧客検索</label>
        <AutoComplete
            id="clientSearch"
            v-model="selectedClient"
            :suggestions="filteredClients"
            @complete="searchClients"
            optionLabel="name"
            placeholder="顧客名を入力..."
            fluid
        />
    </FloatLabel>
</template>
```

## Custom Components

### ClientAutoComplete

**Purpose**: Specialized autocomplete for client search with phonetic support

**Usage:**
```vue
<script setup>
import ClientAutoComplete from '@/components/ClientAutoComplete.vue';

const selectedClient = ref(null);

const handleClientSelect = (client) => {
    console.log('Selected client:', client);
};
</script>

<template>
    <ClientAutoComplete 
        v-model="selectedClient"
        @select="handleClientSelect"
        placeholder="顧客名を入力..."
    />
</template>
```

**Features**:
- Phonetic search (Hiragana, Katakana, Romaji)
- Kanji name support
- Recent client suggestions
- Keyboard navigation

### ReservationSearchBar

**Purpose**: Advanced search for reservations

**Usage:**
```vue
<script setup>
import ReservationSearchBar from '@/components/ReservationSearchBar.vue';

const handleSearch = (searchParams) => {
    console.log('Search params:', searchParams);
    // Perform search with params
};
</script>

<template>
    <ReservationSearchBar 
        @search="handleSearch"
        :showAdvancedFilters="true"
    />
</template>
```

**Features**:
- Quick search by guest name, room, or confirmation number
- Advanced filters (date range, status, room type)
- Saved search functionality
- Search history

### WorkInProgress

**Purpose**: Placeholder for features under development

**Usage:**
```vue
<script setup>
import WorkInProgress from '@/components/WorkInProgress.vue';
</script>

<template>
    <WorkInProgress 
        feature="レポート機能"
        estimatedCompletion="2024年3月"
    />
</template>
```

## Form Layout Patterns

### Grid-Based Forms

**Two-Column Layout:**
```vue
<template>
    <form @submit.prevent="submitForm">
        <div class="grid grid-cols-12 gap-4">
            <!-- Left Column -->
            <div class="col-span-6">
                <FloatLabel class="mt-6">
                    <label for="firstName">名</label>
                    <InputText id="firstName" v-model="formData.firstName" fluid />
                </FloatLabel>
            </div>
            
            <!-- Right Column -->
            <div class="col-span-6">
                <FloatLabel class="mt-6">
                    <label for="lastName">姓</label>
                    <InputText id="lastName" v-model="formData.lastName" fluid />
                </FloatLabel>
            </div>
            
            <!-- Full Width -->
            <div class="col-span-12">
                <FloatLabel class="mt-6">
                    <label for="email">メールアドレス</label>
                    <InputText id="email" v-model="formData.email" type="email" fluid />
                </FloatLabel>
            </div>
        </div>
        
        <div class="flex justify-end gap-2 mt-6">
            <Button label="キャンセル" severity="secondary" outlined @click="cancel" />
            <Button label="保存" severity="success" type="submit" />
        </div>
    </form>
</template>
```

**Responsive Layout:**
```vue
<template>
    <div class="grid grid-cols-12 gap-4">
        <!-- Full width on mobile, half on tablet+, third on desktop -->
        <div class="col-span-12 md:col-span-6 lg:col-span-4">
            <FloatLabel class="mt-6">
                <label for="field1">フィールド1</label>
                <InputText id="field1" v-model="field1" fluid />
            </FloatLabel>
        </div>
        
        <div class="col-span-12 md:col-span-6 lg:col-span-4">
            <FloatLabel class="mt-6">
                <label for="field2">フィールド2</label>
                <InputText id="field2" v-model="field2" fluid />
            </FloatLabel>
        </div>
        
        <div class="col-span-12 md:col-span-6 lg:col-span-4">
            <FloatLabel class="mt-6">
                <label for="field3">フィールド3</label>
                <InputText id="field3" v-model="field3" fluid />
            </FloatLabel>
        </div>
    </div>
</template>
```

### Form Validation and Error Handling

Robust form validation is crucial for a good user experience and data integrity. The following example demonstrates a comprehensive pattern for handling client-side and server-side validation, loading states, and accessibility.

**Key Patterns**:
- **Inline Field Errors**: Provide immediate feedback under each field. Validate `onBlur` for a good balance between responsiveness and user experience.
- **Form-Level Error Summary**: At the top of the form, list all errors with links to the invalid fields. This is important for accessibility and for long forms.
- **Submission State**: Disable the submit button and show a loading indicator to prevent duplicate submissions and provide feedback.
- **Server-Side Validation**: Gracefully handle errors returned from the server, mapping them back to the relevant fields or showing a global error message.
- **Accessibility**: Use `aria-invalid` and `aria-describedby` to link inputs to their error messages for screen readers.

**Complete Example**:
```vue
<template>
  <form @submit.prevent="handleSubmit">
    <!-- 1. Form-Level Error Summary -->
    <div v-if="formErrors.length" class="error-summary" role="alert">
      <p>Please correct the following errors:</p>
      <ul>
        <li v-for="error in formErrors" :key="error.field">
          <a :href="'#' + error.field">{{ error.message }}</a>
        </li>
      </ul>
    </div>

    <!-- Name Field -->
    <div class="form-group">
      <label for="name">Name</label>
      <InputText
        id="name"
        v-model="formData.name"
        @blur="validateField('name')"
        :aria-invalid="!!fieldErrors.name"
        :aria-describedby="fieldErrors.name ? 'name-error' : null"
        fluid
      />
      <p v-if="fieldErrors.name" id="name-error" class="error-message">
        {{ fieldErrors.name }}
      </p>
    </div>

    <!-- Email Field -->
    <div class="form-group mt-4">
      <label for="email">Email</label>
      <InputText
        id="email"
        type="email"
        v-model="formData.email"
        @blur="validateField('email')"
        :aria-invalid="!!fieldErrors.email"
        :aria-describedby="fieldErrors.email ? 'email-error' : null"
        fluid
      />
      <p v-if="fieldErrors.email" id="email-error" class="error-message">
        {{ fieldErrors.email }}
      </p>
    </div>

    <!-- 3. Submission State -->
    <div class="flex justify-end mt-6">
        <Button type="submit" :disabled="isSubmitting">
          <span v-if="isSubmitting">
            <i class="pi pi-spin pi-spinner mr-2"></i> Submitting...
          </span>
          <span v-else>Submit</span>
        </Button>
    </div>
  </form>
</template>

<script setup>
import { ref, reactive } from 'vue';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';

const formData = reactive({ name: '', email: '' });
const fieldErrors = reactive({});
const formErrors = ref([]);
const isSubmitting = ref(false);

function validateField(field) {
  // Simple validation logic
  if (field === 'name' && !formData.name) {
    fieldErrors.name = 'Name is required.';
  } else {
    fieldErrors.name = null;
  }

  if (field === 'email' && !formData.email) {
    fieldErrors.email = 'Email is required.';
  } else if (field === 'email' && formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
    fieldErrors.email = 'Please enter a valid email address.';
  } else {
    fieldErrors.email = null;
  }
}

function validateForm() {
  validateField('name');
  validateField('email');
  
  formErrors.value = Object.entries(fieldErrors)
    .filter(([, message]) => message)
    .map(([field, message]) => ({ field, message }));
    
  return formErrors.value.length === 0;
}

async function handleSubmit() {
  if (!validateForm()) {
    return;
  }

  isSubmitting.value = true;
  formErrors.value = [];

  try {
    // Replace with your actual API call
    // await api.submitForm(formData);
    console.log('Form submitted successfully');
    // Handle success (e.g., show success message, redirect)
  } catch (error) {
    // 4. Server-Side Error Handling
    if (error.response && error.response.status === 422) {
      // Map server field errors
      for (const key in error.response.data.errors) {
        fieldErrors[key] = error.response.data.errors[key][0];
      }
      validateForm(); // Re-populate formErrors summary
    } else {
      // Global error
      formErrors.value.push({
        field: 'form',
        message: 'An unexpected error occurred. Please try again.'
      });
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped>
.error-summary {
  border: 1px solid var(--p-red-500);
  background-color: var(--p-red-50);
  color: var(--p-red-700);
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 6px;
}
.error-message {
  color: var(--p-red-600);
  font-size: 0.875rem;
  margin-top: 0.25rem;
}
</style>
```

## Component Best Practices

### 1. Always Use Japanese UI Text

```vue
<!-- ✅ Correct -->
<Button label="保存" />
<Dialog header="予約詳細" />
<Column header="ゲスト名" />

<!-- ❌ Incorrect -->
<Button label="Save" />
<Dialog header="Reservation Details" />
<Column header="Guest Name" />
```

### 2. Use FloatLabel for Form Inputs

```vue
<!-- ✅ Correct -->
<FloatLabel class="mt-6">
    <label for="guestName">ゲスト名</label>
    <InputText id="guestName" v-model="guestName" fluid />
</FloatLabel>

<!-- ❌ Avoid -->
<label for="guestName">ゲスト名</label>
<InputText id="guestName" v-model="guestName" placeholder="ゲスト名" />
```

### 3. Use Tailwind Grid for Layouts

```vue
<!-- ✅ Correct -->
<div class="grid grid-cols-12 gap-4">
    <div class="col-span-6">...</div>
    <div class="col-span-6">...</div>
</div>

<!-- ❌ Avoid PrimeFlex -->
<div class="p-grid">
    <div class="p-col-6">...</div>
    <div class="p-col-6">...</div>
</div>
```

### 4. Use ConfirmDialog for Destructive Actions

```vue
<!-- ✅ Correct -->
<script setup>
const confirm = useConfirm();

const deleteItem = () => {
    confirm.require({
        message: '削除してもよろしいですか？',
        header: '削除確認',
        icon: 'pi pi-exclamation-triangle',
        acceptProps: { label: '削除', severity: 'danger' },
        rejectProps: { label: 'キャンセル', severity: 'secondary', outlined: true },
        accept: () => performDelete()
    });
};
</script>

<!-- ❌ Avoid native confirm -->
<script setup>
const deleteItem = () => {
    if (confirm('削除してもよろしいですか？')) {
        performDelete();
    }
};
</script>
```

### 5. Proper Button Styling

```vue
<!-- Primary action -->
<Button label="保存" severity="success" />

<!-- Secondary action -->
<Button label="キャンセル" severity="secondary" outlined />

<!-- Destructive action -->
<Button label="削除" severity="danger" />

<!-- Info action -->
<Button label="詳細" severity="info" />
```

### 6. Consistent Tag Usage

```vue
<script setup>
const getSeverity = (status) => {
    const map = {
        'active': 'success',
        'pending': 'warn',
        'inactive': 'danger',
        'draft': 'info'
    };
    return map[status] || 'secondary';
};
</script>

<template>
    <Tag :value="statusLabel" :severity="getSeverity(status)" />
</template>
```

### 7. Read-Only "Viewer" Tag

When a user has read-only permissions (`crud_ok` is false), it's important to clearly indicate their status and disable destructive actions.

**Detecting Read-Only Users:**

A computed property should be used to determine if the user is a viewer.

```javascript
import { computed } from 'vue';
import { useUserStore } from '@/stores/user'; // Adjust path as needed

const userStore = useUserStore();
const isViewer = computed(() => !userStore.currentUser?.permissions?.crud_ok);
```

**Displaying the Viewer Tag:**

When `isViewer` is true, display a prominent red "閲覧者" tag.

```vue
<template>
    <div v-if="isViewer" class="viewer-tag-container">
        <Tag severity="danger" value="閲覧者"></Tag>
    </div>
</template>
```

**Disabling UI Elements:**

Action buttons for creating, editing, or deleting should be disabled or hidden.

-   **Accessibility**: When disabling a button, use `aria-label` to provide context for screen readers.
-   **Clarity**: Prefer disabling buttons over hiding them to maintain a consistent UI layout.

**Code Example:**

```vue
<template>
    <div>
        <!-- Viewer Tag Display -->
        <div v-if="isViewer" class="mb-4">
            <Tag severity="danger" value="閲覧者" icon="pi pi-eye"></Tag>
            <span class="ml-2 text-sm text-gray-600">読み取り専用モードです。</span>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-2">
            <!-- Create Button: Hidden for viewers -->
            <Button 
                v-if="!isViewer" 
                label="新規作成" 
                icon="pi pi-plus" 
                severity="success"
                @click="createNew" 
            />

            <!-- Edit Button: Disabled for viewers -->
            <Button 
                label="編集" 
                icon="pi pi-pencil"
                :disabled="isViewer"
                aria-label="編集 (閲覧者には無効)"
                @click="editItem" 
            />

            <!-- Delete Button: Disabled for viewers -->
            <Button 
                label="削除" 
                icon="pi pi-trash"
                severity="danger"
                :disabled="isViewer"
                aria-label="削除 (閲覧者には無効)"
                @click="deleteItem"
            />
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { useUserStore } from '@/stores/user';
import Button from 'primevue/button';
import Tag from 'primevue/tag';

// Assume userStore is initialized and has user data
const userStore = useUserStore();
const isViewer = computed(() => userStore.currentUser && !userStore.currentUser.permissions.crud_ok);

const createNew = () => { /* ... */ };
const editItem = () => { /* ... */ };
const deleteItem = () => { /* ... */ };
</script>
```


## Accessibility Considerations

### 1. Always Provide Labels

```vue
<!-- ✅ Correct -->
<FloatLabel>
    <label for="email">メールアドレス</label>
    <InputText id="email" v-model="email" />
</FloatLabel>

<!-- ❌ Missing label -->
<InputText v-model="email" placeholder="メールアドレス" />
```

### 2. Use Semantic HTML

```vue
<!-- ✅ Correct -->
<form @submit.prevent="submitForm">
    <fieldset>
        <legend>予約情報</legend>
        <!-- Form fields -->
    </fieldset>
    <Button type="submit" label="送信" />
</form>
```

### 3. Provide ARIA Labels When Needed

```vue
<Button 
    icon="pi pi-trash"
    aria-label="予約を削除"
    @click="deleteReservation"
/>
```

### 4. Keyboard Navigation

Ensure all interactive elements are keyboard accessible:
- Tab navigation works correctly
- Enter key submits forms
- Escape key closes dialogs
- Arrow keys navigate lists

## Performance Optimization

### 1. Lazy Loading Components

```vue
<script setup>
import { defineAsyncComponent } from 'vue';

const HeavyComponent = defineAsyncComponent(() =>
    import('@/components/HeavyComponent.vue')
);
</script>
```

### 2. Virtual Scrolling for Large Lists

```vue
<DataTable 
    :value="largeDataset"
    :virtualScrollerOptions="{ itemSize: 46 }"
    scrollable
    scrollHeight="400px"
>
    <!-- Columns -->
</DataTable>
```

### 3. Debounce Search Inputs

```vue
<script setup>
import { ref } from 'vue';
import { useDebounceFn } from '@vueuse/core';

const searchQuery = ref('');

const performSearch = useDebounceFn((query) => {
    // Perform search
}, 300);
</script>

<template>
    <InputText 
        v-model="searchQuery"
        @input="performSearch(searchQuery)"
        placeholder="検索..."
    />
</template>
```

## Related Documentation

- **[Frontend Development](README.md)** - Frontend overview
- **[State Management](state-management.md)** - Store patterns
- **[Styling Guidelines](styling-guidelines.md)** - CSS and design system
- **[Testing Frontend](testing-frontend.md)** - Component testing

---

*This component library documentation provides patterns and examples for consistent UI development across the application.*
