# State Management

This document describes the state management approach used in the Hotel Management System frontend, including the current implementation pattern, architecture, and future migration plans.

## Current State Management Approach

The application currently uses a **custom Vue 3 Composition API store pattern** that provides global state management without requiring an external library.

### Architecture Overview

The state management system is built on Vue 3's Composition API and leverages Vue's reactivity system for automatic updates across components.

**Key Characteristics**:
- **Shared Reactive State**: Global state using Vue's `ref()` and `reactive()`
- **Composable Functions**: Reusable logic encapsulated in composable functions
- **Automatic Reactivity**: Leverages Vue's reactivity system
- **TypeScript Support**: Full type safety and autocompletion
- **Performance**: Minimal overhead with Vue's optimized reactivity
- **Simplicity**: No external dependencies, straightforward implementation

### Store Pattern Implementation

#### Basic Store Structure

```javascript
// composables/useHotelStore.js
import { ref, computed } from 'vue';
import axios from 'axios';

// Shared state (defined outside the composable function)
const hotels = ref([]);
const selectedHotel = ref(null);
const selectedHotelId = ref(null);
const loading = ref(false);

export function useHotelStore() {
    // Getters (computed properties)
    const selectedHotelRooms = computed(() => {
        if (!selectedHotel.value) return [];
        return selectedHotel.value.rooms || [];
    });
    
    const hotelCount = computed(() => hotels.value.length);
    
    // Actions (functions that modify state)
    const fetchHotels = async () => {
        loading.value = true;
        try {
            const response = await axios.get('/api/hotels');
            hotels.value = response.data;
        } catch (error) {
            console.error('Failed to fetch hotels:', error);
        } finally {
            loading.value = false;
        }
    };
    
    const setHotelId = (id) => {
        selectedHotelId.value = id;
        selectedHotel.value = hotels.value.find(h => h.id === id);
    };
    
    const updateHotel = async (hotelId, updates) => {
        try {
            const response = await axios.put(`/api/hotels/${hotelId}`, updates);
            const index = hotels.value.findIndex(h => h.id === hotelId);
            if (index !== -1) {
                hotels.value[index] = response.data;
            }
            return response.data;
        } catch (error) {
            console.error('Failed to update hotel:', error);
            throw error;
        }
    };
    
    // Return state, getters, and actions
    return {
        // State
        hotels,
        selectedHotel,
        selectedHotelId,
        loading,
        // Getters
        selectedHotelRooms,
        hotelCount,
        // Actions
        fetchHotels,
        setHotelId,
        updateHotel
    };
}
```

#### Using Stores in Components

```vue
<script setup>
import { onMounted } from 'vue';
import { useHotelStore } from '@/composables/useHotelStore';

// Get store instance
const hotelStore = useHotelStore();

// Destructure state and actions
const { hotels, selectedHotel, loading } = hotelStore;
const { fetchHotels, setHotelId } = hotelStore;

// Fetch data on mount
onMounted(async () => {
    await fetchHotels();
});

// Use actions
const handleHotelSelect = (hotelId) => {
    setHotelId(hotelId);
};
</script>

<template>
    <div>
        <div v-if="loading">Loading hotels...</div>
        <div v-else>
            <div v-for="hotel in hotels" :key="hotel.id">
                <button @click="handleHotelSelect(hotel.id)">
                    {{ hotel.name }}
                </button>
            </div>
            <div v-if="selectedHotel">
                <h2>{{ selectedHotel.name }}</h2>
                <p>{{ selectedHotel.address }}</p>
            </div>
        </div>
    </div>
</template>
```

## Current Store Implementations

### Core Stores

#### useUserStore
**Purpose**: User authentication and profile management

**State**:
- `users`: Array of all users
- `logged_user`: Currently logged-in user
- `loading`: Loading state

**Actions**:
- `fetchUsers()`: Retrieve all users
- `fetchUser()`: Get current user profile
- `createUserCalendar()`: Create user calendar
- `triggerCalendarSyncStore()`: Sync calendar data

#### useHotelStore
**Purpose**: Hotel selection and management

**State**:
- `hotels`: Array of available hotels
- `selectedHotel`: Currently selected hotel object
- `selectedHotelId`: ID of selected hotel

**Actions**:
- `fetchHotels()`: Load hotel list
- `setHotelId(id)`: Select a hotel
- `updateHotel(id, data)`: Update hotel information

#### useReservationStore
**Purpose**: Reservation management

**State**:
- `reservations`: Array of reservations
- `selectedReservation`: Currently selected reservation
- `filters`: Active filters for reservation list

**Actions**:
- `fetchReservations(filters)`: Load reservations
- `createReservation(data)`: Create new reservation
- `updateReservation(id, data)`: Update reservation
- `cancelReservation(id)`: Cancel reservation

#### useClientStore
**Purpose**: Client/CRM management

**State**:
- `clients`: Array of clients
- `selectedClient`: Currently selected client
- `searchQuery`: Client search query

**Actions**:
- `fetchClients(query)`: Search and load clients
- `createClient(data)`: Create new client
- `updateClient(id, data)`: Update client information
- `getClientHistory(id)`: Get client booking history

#### useBillingStore
**Purpose**: Billing and payment management

**State**:
- `invoices`: Array of invoices
- `payments`: Array of payments
- `selectedInvoice`: Currently selected invoice

**Actions**:
- `fetchInvoices(filters)`: Load invoices
- `createInvoice(data)`: Generate new invoice
- `processPayment(data)`: Process payment
- `refundPayment(id)`: Process refund

### Supporting Stores

#### useNotificationStore
**Purpose**: System notifications and alerts

**State**:
- `notifications`: Array of notifications
- `unreadCount`: Count of unread notifications

**Actions**:
- `addNotification(notification)`: Add new notification
- `markAsRead(id)`: Mark notification as read
- `clearAll()`: Clear all notifications

#### useSettingsStore
**Purpose**: Application settings and preferences

**State**:
- `settings`: Application settings object
- `theme`: Current theme
- `language`: Current language

**Actions**:
- `loadSettings()`: Load user settings
- `updateSettings(updates)`: Update settings
- `resetSettings()`: Reset to defaults

## State Management Patterns

### State Initialization

```javascript
// Initialize state with default values
const state = ref({
    data: [],
    loading: false,
    error: null,
    lastUpdated: null
});
```

### Async Actions with Loading States

```javascript
const fetchData = async () => {
    loading.value = true;
    error.value = null;
    
    try {
        const response = await axios.get('/api/data');
        data.value = response.data;
        lastUpdated.value = new Date();
    } catch (err) {
        error.value = err.message;
        console.error('Fetch error:', err);
    } finally {
        loading.value = false;
    }
};
```

### Computed Properties (Getters)

```javascript
// Derived state using computed
const filteredData = computed(() => {
    if (!searchQuery.value) return data.value;
    return data.value.filter(item => 
        item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
});

const totalCount = computed(() => data.value.length);
const hasData = computed(() => data.value.length > 0);
```

### State Persistence

```javascript
// Save to localStorage
const saveToStorage = () => {
    localStorage.setItem('app-state', JSON.stringify(state.value));
};

// Load from localStorage
const loadFromStorage = () => {
    const saved = localStorage.getItem('app-state');
    if (saved) {
        state.value = JSON.parse(saved);
    }
};

// Watch for changes and persist
watch(state, saveToStorage, { deep: true });
```

## Benefits of Current Approach

### Advantages

1. **Simplicity**: No external library required, straightforward implementation
2. **Performance**: Minimal overhead, leverages Vue's optimized reactivity
3. **Flexibility**: Easy to customize for specific needs
4. **Type Safety**: Full TypeScript support with proper typing
5. **Learning Curve**: Familiar to Vue developers, uses standard Composition API
6. **Bundle Size**: No additional dependencies
7. **Integration**: Seamless integration with Vue 3 features

### Use Cases

This pattern works well for:
- Small to medium-sized applications
- Teams familiar with Vue Composition API
- Projects requiring minimal dependencies
- Applications with straightforward state management needs

## Future Migration: Pinia

### Migration Rationale

While the current custom store pattern works well, migrating to Pinia (the official Vue state management library) will provide additional benefits:

#### Enhanced Developer Experience
- **Vue Devtools Integration**: Superior state inspection and time-travel debugging
- **Hot Module Replacement**: Better development experience with HMR
- **Plugin System**: Extensibility through plugins
- **Official Support**: Maintained by the Vue core team

#### Improved Architecture
- **Centralized State**: Single source of truth with better organization
- **Modular Stores**: Clear separation of concerns
- **Type Safety**: Enhanced TypeScript support
- **SSR Support**: Robust server-side rendering capabilities

#### Better Tooling
- **Devtools**: Advanced debugging capabilities
- **Testing**: Easier store testing in isolation
- **Documentation**: Comprehensive official documentation
- **Community**: Large ecosystem and community support

### Migration Strategy

The migration will be performed incrementally to minimize disruption:

#### Phase 1: Setup and Preparation
1. Install Pinia: `npm install pinia`
2. Initialize Pinia in `main.js`:
```javascript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.mount('#app');
```

#### Phase 2: Store Migration
Migrate stores one at a time using Pinia's Setup Store syntax (similar to current pattern):

```javascript
// stores/hotelStore.js
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export const useHotelStore = defineStore('hotel', () => {
    // State
    const hotels = ref([]);
    const selectedHotel = ref(null);
    const selectedHotelId = ref(null);
    
    // Getters
    const selectedHotelRooms = computed(() => {
        if (!selectedHotel.value) return [];
        return selectedHotel.value.rooms || [];
    });
    
    // Actions
    const fetchHotels = async () => {
        const response = await axios.get('/api/hotels');
        hotels.value = response.data;
    };
    
    const setHotelId = (id) => {
        selectedHotelId.value = id;
        selectedHotel.value = hotels.value.find(h => h.id === id);
    };
    
    return {
        // State
        hotels,
        selectedHotel,
        selectedHotelId,
        // Getters
        selectedHotelRooms,
        // Actions
        fetchHotels,
        setHotelId
    };
});
```

#### Phase 3: Component Updates
Update components to use Pinia stores with `storeToRefs`:

```vue
<script setup>
import { storeToRefs } from 'pinia';
import { useHotelStore } from '@/stores/hotelStore';

const hotelStore = useHotelStore();

// Use storeToRefs for reactive state
const { hotels, selectedHotel, selectedHotelRooms } = storeToRefs(hotelStore);

// Actions can be destructured directly
const { fetchHotels, setHotelId } = hotelStore;
</script>
```

#### Phase 4: Testing and Validation
- Test each migrated store thoroughly
- Verify reactivity is maintained
- Check Vue Devtools integration
- Validate performance
- Ensure no regressions

#### Phase 5: Cleanup
- Remove old composable store files
- Update documentation
- Update developer guidelines

### Migration Timeline

**Status**: Planning phase

**Estimated Timeline**:
- Phase 1 (Setup): 1 day
- Phase 2 (Store Migration): 2-3 weeks (incremental)
- Phase 3 (Component Updates): 1-2 weeks
- Phase 4 (Testing): 1 week
- Phase 5 (Cleanup): 2-3 days

### Migration Priorities

**High Priority Stores** (migrate first):
1. useUserStore - Core authentication
2. useHotelStore - Core functionality
3. useReservationStore - Primary business logic

**Medium Priority Stores**:
4. useClientStore - CRM functionality
5. useBillingStore - Financial operations
6. useNotificationStore - User notifications

**Low Priority Stores** (migrate last):
7. useSettingsStore - Application settings
8. useMetricsStore - Analytics and reporting
9. Utility stores - Supporting functionality

## Best Practices

### State Organization

```javascript
// Group related state together
const state = reactive({
    data: [],
    ui: {
        loading: false,
        error: null,
        selectedId: null
    },
    filters: {
        search: '',
        status: 'all',
        dateRange: null
    }
});
```

### Action Naming Conventions

- **fetch**: Retrieve data from API (`fetchHotels`)
- **create**: Create new resource (`createReservation`)
- **update**: Update existing resource (`updateClient`)
- **delete**: Remove resource (`deleteInvoice`)
- **set**: Set state value (`setSelectedHotel`)
- **toggle**: Toggle boolean state (`toggleSidebar`)
- **reset**: Reset state to initial values (`resetFilters`)

### Error Handling

```javascript
const fetchData = async () => {
    try {
        loading.value = true;
        error.value = null;
        
        const response = await axios.get('/api/data');
        data.value = response.data;
    } catch (err) {
        error.value = {
            message: err.message,
            code: err.response?.status,
            timestamp: new Date()
        };
        
        // Show user-friendly notification
        notificationStore.addNotification({
            type: 'error',
            message: 'Failed to load data. Please try again.'
        });
    } finally {
        loading.value = false;
    }
};
```

### State Validation

```javascript
const updateReservation = async (id, updates) => {
    // Validate before API call
    if (!id || !updates) {
        throw new Error('Invalid parameters');
    }
    
    // Optimistic update
    const index = reservations.value.findIndex(r => r.id === id);
    const original = { ...reservations.value[index] };
    reservations.value[index] = { ...original, ...updates };
    
    try {
        const response = await axios.put(`/api/reservations/${id}`, updates);
        reservations.value[index] = response.data;
    } catch (error) {
        // Rollback on error
        reservations.value[index] = original;
        throw error;
    }
};
```

## Testing State Management

### Unit Testing Stores

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { useHotelStore } from '@/composables/useHotelStore';

describe('useHotelStore', () => {
    let store;
    
    beforeEach(() => {
        store = useHotelStore();
    });
    
    it('should initialize with empty hotels', () => {
        expect(store.hotels.value).toEqual([]);
    });
    
    it('should set selected hotel', () => {
        store.hotels.value = [{ id: 1, name: 'Test Hotel' }];
        store.setHotelId(1);
        expect(store.selectedHotel.value.name).toBe('Test Hotel');
    });
});
```

### Integration Testing with Components

```javascript
import { mount } from '@vue/test-utils';
import HotelSelector from '@/components/HotelSelector.vue';

describe('HotelSelector', () => {
    it('should display hotels from store', async () => {
        const wrapper = mount(HotelSelector);
        
        // Wait for data to load
        await wrapper.vm.$nextTick();
        
        expect(wrapper.findAll('.hotel-item')).toHaveLength(3);
    });
});
```

## Related Documentation

- **[Frontend Development](README.md)** - Frontend overview
- **[Component Library](component-library.md)** - UI components
- **[API Integration](../api/README.md)** - Backend communication
- **[Testing Frontend](testing-frontend.md)** - Testing strategies

---

*This state management approach provides a solid foundation for the application while maintaining flexibility for future enhancements.*
