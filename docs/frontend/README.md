# Frontend Development

This section provides comprehensive documentation for frontend development in the WeHub.work Hotel Management System, built with Vue.js 3 and modern web technologies.

## Quick Navigation

- **[Component Library](component-library.md)** - UI components and usage patterns
- **[State Management](state-management.md)** - Vue 3 Composition API store pattern
- **[Routing & Navigation](routing-navigation.md)** - Vue Router configuration and patterns
- **[Styling Guidelines](styling-guidelines.md)** - Tailwind CSS and design system
- **[Testing Frontend](#testing-strategy)** - Frontend testing strategies

## Frontend Architecture Overview

The frontend is built with modern Vue.js 3 technologies and follows composition-based patterns:

### 🏗️ **Technology Stack**
- **Vue.js 3** with Composition API
- **Vite** for fast development and optimized builds
- **Tailwind CSS 4** for utility-first styling
- **PrimeVue 4+** for UI components
- **Vue Router** for single-page application routing
- **ECharts** for data visualization and reporting

### 📦 **Project Structure**
```
frontend/
├── src/
│   ├── components/          # Reusable Vue components
│   ├── composables/         # Vue 3 Composition API stores and utilities
│   ├── views/              # Page-level components
│   ├── router/             # Vue Router configuration
│   ├── assets/             # Static assets (images, styles)
│   └── utils/              # Utility functions
├── public/                 # Public static files
└── dist/                   # Built application (generated)
```

### 🔄 **State Management Pattern**

The application uses a **custom Vue 3 Composition API store pattern** that provides:

- **Shared Reactive State**: Global state using Vue's `ref()` and `reactive()`
- **Composable Functions**: Reusable logic encapsulated in composable functions
- **Automatic Reactivity**: Leverages Vue's reactivity system
- **TypeScript Support**: Full type safety and autocompletion
- **Performance**: Minimal overhead with Vue's optimized reactivity

**Example Store Pattern:**
```javascript
// useHotelStore.js
import { ref, computed } from 'vue';

// Shared state (outside the composable)
const hotels = ref([]);
const selectedHotel = ref(null);

export function useHotelStore() {
    // Actions
    const fetchHotels = async () => {
        // API call logic
        hotels.value = await response.json();
    };

    // Getters (computed)
    const hotelCount = computed(() => hotels.value.length);

    return {
        // State
        hotels,
        selectedHotel,
        // Actions
        fetchHotels,
        // Getters
        hotelCount
    };
}
```

### 🧩 **Component Architecture**

#### Component Categories
- **Layout Components**: App shell, navigation, sidebars
- **Feature Components**: Business logic components (reservations, clients, billing)
- **UI Components**: Reusable interface elements
- **Form Components**: Input handling and validation
- **Chart Components**: Data visualization using ECharts

#### Component Communication
- **Props & Emits**: Parent-child communication
- **Composable Stores**: Global state management
- **Provide/Inject**: Dependency injection for deep component trees
- **Event Bus**: Cross-component communication when needed

#### Component File Size and Organization
- **Conciseness**: Strive to keep Vue single-file components (SFCs) under ~300 lines.
- **Refactoring Threshold**: Components exceeding ~400-500 lines are strong candidates for refactoring.
- **Refactoring Options**:
    - **Extract Subcomponents**: Break down large templates into smaller, logical child components.
    - **Move Logic to Composables/Stores**: Extract complex business logic from `<script setup>` into reusable composable functions (`src/composables/`) or Pinia stores.
    - **Relocate Styles**: Move shared or complex styles to dedicated CSS/SCSS files or Tailwind utility classes.
    - **Isolate Complex Logic**: Extract utility functions or hooks for complex computations or side effects.

### 🎨 **Styling Architecture**

#### Tailwind CSS 4 Integration
- **Utility-First**: Rapid UI development with utility classes
- **Custom Design System**: Extended Tailwind configuration
- **Component Variants**: Consistent styling patterns
- **Responsive Design**: Mobile-first responsive utilities

#### PrimeVue Integration
- **Component Library**: Pre-built, accessible UI components
- **Theme Customization**: Custom theme integration with Tailwind
- **Icon System**: PrimeIcons for consistent iconography
- **Form Controls**: Advanced form components with validation

## Routing

The frontend application utilizes Vue Router for managing navigation and defining application routes.

### Key Aspects of Routing:

-   **Route Definitions**: Centralized route configuration in `src/router/index.js`.
-   **Dynamic Routing**: Support for dynamic segments and nested routes.
-   **Navigation Guards**: Implementing authentication and authorization checks before route access.
-   **Lazy Loading**: Optimizing performance by loading route components only when needed.

## Key Frontend Features

### 🏨 **Hotel Management Interface**
- Multi-hotel selection and switching
- Real-time occupancy dashboards
- Room status management
- Rate and inventory controls

### 📅 **Reservation System**
- Interactive calendar views
- Drag-and-drop reservation management
- Real-time availability updates
- Guest check-in/check-out workflows

### 👥 **Client Management (CRM)**
- Client search and filtering
- Booking history and preferences
- Communication tracking
- Loyalty program management

### 💰 **Billing & Financial**
- Invoice generation and management
- Payment processing interfaces
- Financial reporting dashboards
- Revenue analytics and charts

### 📊 **Analytics & Reporting**
- Interactive charts with ECharts
- Real-time metrics dashboards
- Custom report generation
- Data export capabilities

## Development Workflow

### 🛠️ **Development Setup**
1. **Install Dependencies**: `npm install`
2. **Start Development Server**: `npm run dev`
3. **Build for Production**: `npm run build`
4. **Run Tests**: `npm run test`

### 📝 **Component Development**
1. **Create Component**: Follow naming conventions
2. **Add to Component Library**: Document usage patterns
3. **Write Tests**: Unit and integration tests
4. **Update Documentation**: Keep component docs current

### 🔄 **State Management Development**
1. **Create Composable Store**: Follow established patterns
2. **Define State Structure**: Use appropriate Vue reactivity
3. **Implement Actions**: API calls and state mutations
4. **Add Computed Properties**: Derived state and getters
5. **Test Store Logic**: Unit test store functions

## Performance Considerations

### ⚡ **Optimization Strategies**
- **Code Splitting**: Route-based and component-based splitting
- **Lazy Loading**: Dynamic imports for large components
- **Caching**: Intelligent API response caching
- **Bundle Analysis**: Regular bundle size monitoring

### 📱 **Responsive Design**
- **Mobile-First**: Tailwind's mobile-first approach
- **Touch Interfaces**: Touch-friendly interactions
- **Performance**: Optimized for mobile devices
- **Progressive Enhancement**: Core functionality on all devices

## Testing Strategy

### 🧪 **Testing Approaches**
- **Unit Tests**: Component and composable testing
- **Integration Tests**: Feature workflow testing
- **E2E Tests**: Full user journey testing
- **Visual Regression**: UI consistency testing

### 🔧 **Testing Tools**
- **Vitest**: Fast unit testing framework
- **Vue Test Utils**: Vue component testing utilities
- **Cypress**: End-to-end testing framework
- **Storybook**: Component development and testing

## Related Documentation

- **[State Management Details](state-management.md)** - Deep dive into store patterns
- **[Component Library](component-library.md)** - Available components and usage
- **[API Integration](../api/README.md)** - Frontend-backend communication
- **[Deployment](../deployment/README.md)** - Frontend deployment strategies

## Common Development Tasks

### Adding a New Feature
1. Create feature components in `src/components/`
2. Add composable store if needed in `src/composables/`
3. Create routes in `src/router/`
4. Add navigation links
5. Write tests and documentation

### Integrating with Backend APIs
1. Use composable stores for API calls
2. Implement error handling
3. Add loading states
4. Cache responses appropriately
5. Handle authentication

### Styling New Components
1. Use Tailwind utility classes
2. Follow design system patterns
3. Ensure responsive design
4. Test across devices
5. Document styling patterns

---

*For detailed implementation guides, see the specific documentation sections for each frontend aspect.*