# Styling Guidelines

This document outlines the styling approach, design system, and best practices for the WeHub.work Hotel Management System frontend.

## Overview

The application uses a modern styling stack:
- **Tailwind CSS 4**: Utility-first CSS framework
- **PrimeVue Themes**: Component styling and theming
- **Custom CSS**: Application-specific styles

## Tailwind CSS 4 Configuration

### Setup

The project uses Tailwind CSS v4 with a different configuration approach than v3.

#### CSS Import

```css
/* src/assets/css/main.css */
@import 'tailwindcss';

/* Configure dark mode for Tailwind CSS v4 */
@custom-variant dark:media(prefers-color-scheme: dark);
```

#### Config File

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        }
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
      }
    },
  },
}
```

### Dark Mode

Dark mode is configured using the `@custom-variant` directive and automatically activates based on system preference:

```css
/* Automatically configured in main.css */
@custom-variant dark:media(prefers-color-scheme: dark);
```

**Usage in components:**
```vue
<template>
    <div class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <h1 class="text-2xl font-bold">ダッシュボード</h1>
        <p class="text-gray-600 dark:text-gray-300">システム概要</p>
    </div>
</template>
```

## Design System

### Color Palette

#### Primary Colors
```vue
<template>
    <!-- Blue shades (primary) -->
    <div class="bg-blue-50">Very light blue</div>
    <div class="bg-blue-100">Light blue</div>
    <div class="bg-blue-500">Primary blue</div>
    <div class="bg-blue-700">Dark blue</div>
    <div class="bg-blue-900">Very dark blue</div>
</template>
```

#### Semantic Colors
```vue
<template>
    <!-- Success -->
    <div class="bg-green-500 text-white">成功</div>
    
    <!-- Warning -->
    <div class="bg-yellow-500 text-white">警告</div>
    
    <!-- Error -->
    <div class="bg-red-500 text-white">エラー</div>
    
    <!-- Info -->
    <div class="bg-blue-500 text-white">情報</div>
</template>
```

#### Neutral Colors
```vue
<template>
    <!-- Gray scale -->
    <div class="bg-gray-50">Background</div>
    <div class="bg-gray-100">Light background</div>
    <div class="bg-gray-200">Border</div>
    <div class="text-gray-600">Secondary text</div>
    <div class="text-gray-900">Primary text</div>
</template>
```

### Typography

#### Font Sizes
```vue
<template>
    <h1 class="text-4xl font-bold">見出し1</h1>
    <h2 class="text-3xl font-bold">見出し2</h2>
    <h3 class="text-2xl font-semibold">見出し3</h3>
    <h4 class="text-xl font-semibold">見出し4</h4>
    <p class="text-base">本文テキスト</p>
    <small class="text-sm text-gray-600">小さいテキスト</small>
    <span class="text-xs text-gray-500">極小テキスト</span>
</template>
```

#### Font Weights
```vue
<template>
    <p class="font-light">Light (300)</p>
    <p class="font-normal">Normal (400)</p>
    <p class="font-medium">Medium (500)</p>
    <p class="font-semibold">Semibold (600)</p>
    <p class="font-bold">Bold (700)</p>
</template>
```

#### Line Heights
```vue
<template>
    <p class="leading-tight">Tight line height</p>
    <p class="leading-normal">Normal line height</p>
    <p class="leading-relaxed">Relaxed line height</p>
    <p class="leading-loose">Loose line height</p>
</template>
```

### Spacing

#### Margin and Padding Scale
```vue
<template>
    <!-- Spacing scale: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 56, 64 -->
    <div class="m-4">Margin 1rem (16px)</div>
    <div class="p-6">Padding 1.5rem (24px)</div>
    <div class="mt-8">Margin top 2rem (32px)</div>
    <div class="px-4 py-2">Padding x: 1rem, y: 0.5rem</div>
</template>
```

#### Gap for Flexbox/Grid
```vue
<template>
    <div class="flex gap-2">
        <div>Item 1</div>
        <div>Item 2</div>
    </div>
    
    <div class="grid grid-cols-3 gap-4">
        <div>Cell 1</div>
        <div>Cell 2</div>
        <div>Cell 3</div>
    </div>
</template>
```

### Layout Patterns

#### Container
```vue
<template>
    <!-- Centered container with max width -->
    <div class="container mx-auto px-4">
        <h1>コンテンツ</h1>
    </div>
    
    <!-- Full width container -->
    <div class="w-full px-4">
        <h1>フルワイドコンテンツ</h1>
    </div>
</template>
```

#### Grid System
```vue
<template>
    <!-- 12-column grid -->
    <div class="grid grid-cols-12 gap-4">
        <!-- Full width -->
        <div class="col-span-12">Full width</div>
        
        <!-- Half width -->
        <div class="col-span-6">Half width</div>
        <div class="col-span-6">Half width</div>
        
        <!-- Third width -->
        <div class="col-span-4">Third</div>
        <div class="col-span-4">Third</div>
        <div class="col-span-4">Third</div>
        
        <!-- Quarter width -->
        <div class="col-span-3">Quarter</div>
        <div class="col-span-3">Quarter</div>
        <div class="col-span-3">Quarter</div>
        <div class="col-span-3">Quarter</div>
    </div>
</template>
```

#### Responsive Grid
```vue
<template>
    <!-- Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
    </div>
    
    <!-- Mobile: full width, Tablet: half, Desktop: third -->
    <div class="grid grid-cols-12 gap-4">
        <div class="col-span-12 md:col-span-6 lg:col-span-4">Item 1</div>
        <div class="col-span-12 md:col-span-6 lg:col-span-4">Item 2</div>
        <div class="col-span-12 md:col-span-6 lg:col-span-4">Item 3</div>
    </div>
</template>
```

#### Flexbox Layouts
```vue
<template>
    <!-- Horizontal layout -->
    <div class="flex items-center gap-4">
        <div>Item 1</div>
        <div>Item 2</div>
    </div>
    
    <!-- Vertical layout -->
    <div class="flex flex-col gap-2">
        <div>Item 1</div>
        <div>Item 2</div>
    </div>
    
    <!-- Space between -->
    <div class="flex justify-between items-center">
        <div>Left</div>
        <div>Right</div>
    </div>
    
    <!-- Centered -->
    <div class="flex justify-center items-center h-screen">
        <div>Centered content</div>
    </div>
</template>
```

## Component Styling Patterns

### Card Component
```vue
<template>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 class="text-xl font-semibold mb-4">カードタイトル</h3>
        <p class="text-gray-600 dark:text-gray-300">カードの内容</p>
    </div>
</template>
```

### Button Styles
```vue
<template>
    <!-- Primary button -->
    <button class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
        保存
    </button>
    
    <!-- Secondary button -->
    <button class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors">
        キャンセル
    </button>
    
    <!-- Outlined button -->
    <button class="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold py-2 px-4 rounded-lg transition-colors">
        詳細
    </button>
    
    <!-- Danger button -->
    <button class="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
        削除
    </button>
</template>
```

### Form Styling
```vue
<template>
    <form class="space-y-6">
        <!-- Form group -->
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
                ラベル
            </label>
            <input 
                type="text"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
        </div>
        
        <!-- Form actions -->
        <div class="flex justify-end gap-2">
            <button type="button" class="px-4 py-2 text-gray-600 hover:text-gray-800">
                キャンセル
            </button>
            <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                送信
            </button>
        </div>
    </form>
</template>
```

### Table Styling
```vue
<template>
    <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        名前
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ステータス
                    </th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        田中太郎
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            確認済み
                        </span>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
```

## Responsive Design

### Breakpoints

Tailwind CSS breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Mobile-First Approach
```vue
<template>
    <!-- Base styles for mobile, then override for larger screens -->
    <div class="text-sm md:text-base lg:text-lg">
        Responsive text
    </div>
    
    <div class="p-4 md:p-6 lg:p-8">
        Responsive padding
    </div>
    
    <!-- Hide on mobile, show on desktop -->
    <div class="hidden lg:block">
        Desktop only content
    </div>
    
    <!-- Show on mobile, hide on desktop -->
    <div class="block lg:hidden">
        Mobile only content
    </div>
</template>
```

### Responsive Grid Example
```vue
<template>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <!-- 1 column on mobile -->
        <!-- 2 columns on small screens -->
        <!-- 3 columns on large screens -->
        <!-- 4 columns on extra large screens -->
        <div v-for="item in items" :key="item.id" class="bg-white p-4 rounded-lg shadow">
            {{ item.name }}
        </div>
    </div>
</template>
```

## PrimeVue Theme Integration

### Theme Configuration

PrimeVue themes are configured in `main.js`:

```javascript
import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';

const app = createApp(App);

app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            darkModeSelector: '.dark-mode',
            cssLayer: {
                name: 'primevue',
                order: 'tailwind-base, primevue, tailwind-utilities'
            }
        }
    }
});
```

### Customizing PrimeVue Components

```vue
<template>
    <!-- Using Tailwind classes with PrimeVue -->
    <Button 
        label="保存"
        class="bg-blue-600 hover:bg-blue-700"
    />
    
    <!-- Custom styled DataTable -->
    <DataTable 
        :value="data"
        class="custom-table"
    >
        <Column field="name" header="名前" />
    </DataTable>
</template>

<style scoped>
.custom-table :deep(.p-datatable-thead) {
    @apply bg-gray-50;
}

.custom-table :deep(.p-datatable-tbody tr:hover) {
    @apply bg-blue-50;
}
</style>
```

## Animation and Transitions

### Transition Classes
```vue
<template>
    <transition name="fade">
        <div v-if="show">Fading content</div>
    </transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
```

### Tailwind Transitions
```vue
<template>
    <!-- Hover transitions -->
    <button class="bg-blue-600 hover:bg-blue-700 transition-colors duration-200">
        ホバー効果
    </button>
    
    <!-- Transform transitions -->
    <div class="transform hover:scale-105 transition-transform duration-300">
        拡大効果
    </div>
    
    <!-- Multiple properties -->
    <div class="opacity-0 hover:opacity-100 transform translate-y-4 hover:translate-y-0 transition-all duration-500">
        フェードイン＆スライド
    </div>
</template>
```

## Best Practices

### 1. Use Tailwind Utilities Over Custom CSS

```vue
<!-- ✅ Correct -->
<div class="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
    Content
</div>

<!-- ❌ Avoid -->
<div class="custom-container">
    Content
</div>

<style>
.custom-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background-color: white;
    border-radius: 0.5rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
</style>
```

### 2. Use Grid for Layouts, Not PrimeFlex

```vue
<!-- ✅ Correct -->
<div class="grid grid-cols-12 gap-4">
    <div class="col-span-6">Left</div>
    <div class="col-span-6">Right</div>
</div>

<!-- ❌ Avoid -->
<div class="p-grid">
    <div class="p-col-6">Left</div>
    <div class="p-col-6">Right</div>
</div>
```

### 3. Consistent Spacing

```vue
<!-- ✅ Correct - Use consistent spacing scale -->
<div class="space-y-4">
    <div class="p-4">Item 1</div>
    <div class="p-4">Item 2</div>
</div>

<!-- ❌ Avoid - Inconsistent spacing -->
<div>
    <div class="p-3">Item 1</div>
    <div class="p-5">Item 2</div>
</div>
```

### 4. Responsive Design

```vue
<!-- ✅ Correct - Mobile first -->
<div class="text-sm md:text-base lg:text-lg">
    Responsive text
</div>

<!-- ❌ Avoid - Desktop first -->
<div class="text-lg md:text-base sm:text-sm">
    Wrong approach
</div>
```

### 5. Dark Mode Support

```vue
<!-- ✅ Correct -->
<div class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
    Content
</div>

<!-- ❌ Incomplete -->
<div class="bg-white text-gray-900">
    Content (no dark mode)
</div>
```

### 6. Scoped Styles for Component-Specific CSS

```vue
<template>
    <div class="custom-component">
        Content
    </div>
</template>

<style scoped>
.custom-component {
    /* Component-specific styles that can't be achieved with Tailwind */
}
</style>
```

### 7. Use @apply for Repeated Patterns

```vue
<style scoped>
.btn-primary {
    @apply bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors;
}

.card {
    @apply bg-white dark:bg-gray-800 rounded-lg shadow-md p-6;
}
</style>
```

## Accessibility

### Focus States
```vue
<template>
    <button class="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
        Accessible button
    </button>
    
    <input 
        type="text"
        class="focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
</template>
```

### Color Contrast
```vue
<template>
    <!-- ✅ Good contrast -->
    <div class="bg-blue-600 text-white">High contrast</div>
    
    <!-- ❌ Poor contrast -->
    <div class="bg-gray-200 text-gray-300">Low contrast</div>
</template>
```

### Screen Reader Support
```vue
<template>
    <button class="sr-only">
        Screen reader only text
    </button>
    
    <div aria-label="予約情報" role="region">
        Content
    </div>
</template>
```

## Performance Optimization

### Purge Unused CSS

Tailwind automatically purges unused CSS in production builds. Ensure your `tailwind.config.js` includes all template files:

```javascript
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  // ...
}
```

### Avoid Deep Selectors When Possible

```vue
<!-- ✅ Prefer utility classes -->
<DataTable class="custom-table">
    <Column class="font-semibold" />
</DataTable>

<!-- ❌ Avoid excessive deep selectors -->
<style scoped>
.custom-table :deep(.p-datatable) :deep(.p-column) :deep(.p-column-header) {
    /* Complex selector */
}
</style>
```

## Related Documentation

- **[Frontend Development](README.md)** - Frontend overview
- **[Component Library](component-library.md)** - UI components
- **[Routing & Navigation](routing-navigation.md)** - Navigation patterns
- **[Testing Frontend](testing-frontend.md)** - Testing strategies

---

*These styling guidelines ensure consistent, maintainable, and accessible UI development across the application.*
