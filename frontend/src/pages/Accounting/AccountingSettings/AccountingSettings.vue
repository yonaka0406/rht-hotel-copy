<template>
    <div class="bg-slate-50 dark:bg-slate-900 min-h-screen p-6 font-sans transition-colors duration-300">
        <div class="max-w-7xl mx-auto px-4">
            <!-- Hero Row -->
            <div class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                    <button @click="$router.push({ name: 'AccountingDashboard' })"
                        class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:text-violet-600 hover:border-violet-200 transition-all cursor-pointer shadow-sm h-[46px]">
                        <i class="pi pi-arrow-left text-sm"></i>
                        <span>戻る</span>
                    </button>
                    <div>
                        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
                            会計マスター設定
                        </h1>
                        <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            勘定科目、管理区分、および税区分の管理を行います。
                        </p>
                    </div>
                </div>
            </div>

            <!-- Tabs and Content Container -->
            <div
                class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                <!-- Tabs Container -->
                <div
                    class="flex overflow-x-auto bg-slate-100/50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-2 gap-2">
                    <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
                        class="px-8 py-3 font-black rounded-xl transition-all cursor-pointer whitespace-nowrap"
                        :class="activeTab === tab.id ? 'bg-white dark:bg-slate-800 text-violet-600 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 bg-transparent'">
                        {{ tab.label }}
                    </button>
                </div>

                <!-- Content Area -->
                <div class="p-8">
                    <div v-if="loading" class="flex flex-col items-center justify-center py-20">
                        <i class="pi pi-spin pi-spinner text-4xl text-violet-600 mb-4"></i>
                        <p class="text-slate-500 font-bold uppercase tracking-widest text-xs">データ読み込み中...</p>
                    </div>

                    <div v-else class="animate-fade-in">
                        <!-- Account Codes Tab -->
                        <div v-if="activeTab === 'codes'">
                            <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                <h2 class="text-2xl font-black text-slate-900 dark:text-white">勘定科目一覧</h2>
                                <button @click="openModal('code')"
                                    class="bg-violet-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-violet-700 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-violet-200 dark:shadow-none">
                                    <i class="pi pi-plus"></i> 新規追加
                                </button>
                            </div>

                            <!-- Group Filter Buttons -->
                            <div
                                class="flex flex-wrap gap-2 mb-8 p-1 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl w-fit">
                                <button @click="selectedGroupFilter = null"
                                    class="px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer"
                                    :class="!selectedGroupFilter ? 'bg-white dark:bg-slate-800 text-violet-600 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:text-slate-700 bg-transparent'">
                                    すべて
                                </button>
                                <button v-for="group in settings.groups" :key="group.id"
                                    @click="selectedGroupFilter = group.id"
                                    class="px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer"
                                    :class="selectedGroupFilter === group.id ? 'bg-white dark:bg-slate-800 text-violet-600 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:text-slate-700 bg-transparent'">
                                    {{ group.name }}
                                </button>
                            </div>

                            <div class="overflow-x-auto">
                                <table class="w-full text-left border-collapse">
                                    <thead>
                                        <tr class="border-b border-slate-100 dark:border-slate-700">
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                                コード</th>
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                                科目名</th>
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                                管理区分</th>
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                                状態</th>
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                                操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="item in filteredCodes" :key="item.id"
                                            class="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                            <td class="py-4 px-4 font-black tabular-nums">{{ item.code }}</td>
                                            <td class="py-4 px-4 font-bold">{{ item.name }}</td>
                                            <td class="py-4 px-4 text-sm text-slate-500">{{
                                                getGroupName(item.management_group_id) }}</td>
                                            <td class="py-4 px-4">
                                                <span
                                                    :class="item.is_active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'"
                                                    class="text-[10px] font-black px-2 py-1 rounded-md uppercase">
                                                    {{ item.is_active ? '有効' : '無効' }}
                                                </span>
                                            </td>
                                            <td class="py-4 px-4">
                                                <div class="flex gap-2">
                                                    <button @click="editItem('code', item)"
                                                        class="p-2 bg-slate-50 dark:bg-slate-900/50 text-violet-600 hover:bg-violet-100 rounded-lg transition-all cursor-pointer"><i
                                                            class="pi pi-pencil"></i></button>
                                                    <button @click="confirmDelete('code', item)"
                                                        class="p-2 bg-slate-50 dark:bg-slate-900/50 text-rose-600 hover:bg-rose-100 rounded-lg transition-all cursor-pointer"><i
                                                            class="pi pi-trash"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr v-if="filteredCodes.length === 0">
                                            <td colspan="5" class="py-12 text-center text-slate-400 font-medium">
                                                データがありません。</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Management Groups Tab -->
                        <div v-if="activeTab === 'groups'">
                            <div class="flex justify-between items-center mb-6">
                                <div>
                                    <h2 class="text-2xl font-black text-slate-900 dark:text-white">管理区分設定</h2>
                                    <p class="text-xs text-slate-500 mt-1 italic font-medium">
                                        ※ これらの区分は損益計算書（P&L）のアカウント専用です。
                                    </p>
                                </div>
                                <button @click="openModal('group')"
                                    class="bg-violet-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-violet-700 transition-all flex items-center gap-2 cursor-pointer">
                                    <i class="pi pi-plus"></i> 新規追加
                                </button>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full text-left border-collapse">
                                    <thead>
                                        <tr class="border-b border-slate-100 dark:border-slate-700">
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest w-24">
                                                順序</th>
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                                区分名</th>
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                                操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="item in settings.groups" :key="item.id"
                                            class="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                            <td class="py-4 px-4 font-black tabular-nums">{{ item.display_order }}</td>
                                            <td class="py-4 px-4 font-bold">{{ item.name }}</td>
                                            <td class="py-4 px-4">
                                                <div class="flex gap-2">
                                                    <button @click="editItem('group', item)"
                                                        class="p-2 bg-slate-50 dark:bg-slate-900/50 text-violet-600 hover:bg-violet-100 rounded-lg transition-all cursor-pointer"><i
                                                            class="pi pi-pencil"></i></button>
                                                    <button @click="confirmDelete('group', item)"
                                                        class="p-2 bg-slate-50 dark:bg-slate-900/50 text-rose-600 hover:bg-rose-100 rounded-lg transition-all cursor-pointer"><i
                                                            class="pi pi-trash"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr v-if="settings.groups.length === 0">
                                            <td colspan="3" class="py-12 text-center text-slate-400 font-medium">
                                                データがありません。</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Sub-Accounts Tab -->
                        <div v-if="activeTab === 'subaccounts'">
                            <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                <h2 class="text-2xl font-black text-slate-900 dark:text-white">補助科目一覧</h2>
                                <button @click="openModal('subaccount')"
                                    class="bg-violet-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-violet-700 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-violet-200 dark:shadow-none">
                                    <i class="pi pi-plus"></i> 新規追加
                                </button>
                            </div>

                            <!-- Account Filter Buttons -->
                            <div
                                class="flex flex-wrap gap-2 mb-8 p-1 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl w-fit">
                                <button @click="selectedAccountFilter = null"
                                    class="px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer"
                                    :class="!selectedAccountFilter ? 'bg-white dark:bg-slate-800 text-violet-600 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:text-slate-700 bg-transparent'">
                                    すべて
                                </button>
                                <button v-for="account in accountsWithSubAccounts" :key="account.id"
                                    @click="selectedAccountFilter = account.id"
                                    class="px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer"
                                    :class="selectedAccountFilter === account.id ? 'bg-white dark:bg-slate-800 text-violet-600 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:text-slate-700 bg-transparent'">
                                    {{ account.name }}
                                </button>
                            </div>

                            <div class="overflow-x-auto">
                                <table class="w-full text-left border-collapse">
                                    <thead>
                                        <tr class="border-b border-slate-100 dark:border-slate-700">
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                                親勘定科目</th>
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                                補助科目名</th>
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                                コード</th>
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                                説明</th>
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                                状態</th>
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                                操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="item in filteredSubAccounts" :key="item.id"
                                            class="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                            <td class="py-4 px-4">
                                                <div class="flex flex-col">
                                                    <span class="font-bold">{{ item.account_name }}</span>
                                                    <span class="text-xs text-slate-500 tabular-nums">{{ item.account_code }}</span>
                                                </div>
                                            </td>
                                            <td class="py-4 px-4 font-bold">{{ item.name }}</td>
                                            <td class="py-4 px-4 font-mono text-sm text-slate-600">{{ item.code || '-' }}</td>
                                            <td class="py-4 px-4 text-sm text-slate-500">{{ item.description || '-' }}</td>
                                            <td class="py-4 px-4">
                                                <span
                                                    :class="item.is_active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'"
                                                    class="text-[10px] font-black px-2 py-1 rounded-md uppercase">
                                                    {{ item.is_active ? '有効' : '無効' }}
                                                </span>
                                            </td>
                                            <td class="py-4 px-4">
                                                <div class="flex gap-2">
                                                    <button @click="editItem('subaccount', item)"
                                                        class="p-2 bg-slate-50 dark:bg-slate-900/50 text-violet-600 hover:bg-violet-100 rounded-lg transition-all cursor-pointer"><i
                                                            class="pi pi-pencil"></i></button>
                                                    <button @click="confirmDelete('subaccount', item)"
                                                        class="p-2 bg-slate-50 dark:bg-slate-900/50 text-rose-600 hover:bg-rose-100 rounded-lg transition-all cursor-pointer"><i
                                                            class="pi pi-trash"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr v-if="filteredSubAccounts.length === 0">
                                            <td colspan="6" class="py-12 text-center text-slate-400 font-medium">
                                                データがありません。</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Tax Classes Tab -->
                        <div v-if="activeTab === 'tax'">
                            <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                <h2 class="text-2xl font-black text-slate-900 dark:text-white">税区分設定</h2>
                                <button @click="openModal('tax')"
                                    class="bg-violet-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-violet-700 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-violet-200 dark:shadow-none">
                                    <i class="pi pi-plus"></i> 新規追加
                                </button>
                            </div>

                            <!-- Filter Buttons -->
                            <div
                                class="flex flex-wrap gap-2 mb-8 p-1 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl w-fit">
                                <button @click="selectedTaxFilter = null"
                                    class="px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer"
                                    :class="selectedTaxFilter === null ? 'bg-white dark:bg-slate-800 text-violet-600 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:text-slate-700 bg-transparent'">
                                    すべて
                                </button>
                                <button v-for="rate in uniqueTaxRates" :key="rate" @click="selectedTaxFilter = rate"
                                    class="px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer"
                                    :class="selectedTaxFilter !== null && Math.abs(selectedTaxFilter - rate) < 0.0001 ? 'bg-white dark:bg-slate-800 text-violet-600 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:text-slate-700 bg-transparent'">
                                    {{ (rate * 100).toFixed(0) }}%
                                </button>
                            </div>

                            <div class="overflow-x-auto">
                                <table class="w-full text-left border-collapse">
                                    <thead>
                                        <tr class="border-b border-slate-100 dark:border-slate-700">
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest w-24">
                                                順序</th>
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                                税区分名 (システム)</th>
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                                弥生会計名</th>
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest w-32">
                                                税率</th>
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                                操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="item in filteredTaxClasses" :key="item.id"
                                            class="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                            <td class="py-4 px-4 font-black tabular-nums">{{ item.display_order }}</td>
                                            <td class="py-4 px-4 font-bold">{{ item.name }}</td>
                                            <td class="py-4 px-4 text-sm">{{ item.yayoi_name }}</td>
                                            <td class="py-4 px-4 font-black tabular-nums">{{ (item.tax_rate *
                                                100).toFixed(0) }}%</td>
                                            <td class="py-4 px-4">
                                                <div class="flex gap-2">
                                                    <button @click="editItem('tax', item)"
                                                        class="p-2 bg-slate-50 dark:bg-slate-900/50 text-violet-600 hover:bg-violet-100 rounded-lg transition-all cursor-pointer"><i
                                                            class="pi pi-pencil"></i></button>
                                                    <button @click="confirmDelete('tax', item)"
                                                        class="p-2 bg-slate-50 dark:bg-slate-900/50 text-rose-600 hover:bg-rose-100 rounded-lg transition-all cursor-pointer"><i
                                                            class="pi pi-trash"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr v-if="filteredTaxClasses.length === 0">
                                            <td colspan="5" class="py-12 text-center text-slate-400 font-medium">
                                                データがありません。</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Departments Tab -->
                        <div v-if="activeTab === 'dept'">
                            <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                <div>
                                    <h2 class="text-2xl font-black text-slate-900 dark:text-white">部門設定</h2>
                                    <p class="text-sm text-slate-500">各店舗の現在の部門名と履歴名を管理します</p>
                                </div>
                                <button @click="openModal('dept')"
                                    class="bg-violet-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-violet-700 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-violet-200 dark:shadow-none">
                                    <i class="pi pi-plus"></i> 部門名を追加
                                </button>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full text-left border-collapse">
                                    <thead>
                                        <tr class="border-b border-slate-100 dark:border-slate-700">
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                                店舗名</th>
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                                部門名 (弥生会計)</th>
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                                状態</th>
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                                操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="item in settings.departments" :key="item.id || 'h' + item.hotel_id"
                                            class="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                            <td class="py-4 px-4 font-bold">{{ item.hotel_name }}</td>
                                            <td class="py-4 px-4">
                                                <span v-if="item.name"
                                                    class="font-black text-slate-700 dark:text-slate-300">{{ item.name
                                                    }}</span>
                                                <span v-else class="text-slate-400 text-sm font-medium">未設定</span>
                                            </td>
                                            <td class="py-4 px-4">
                                                <span v-if="item.is_current"
                                                    class="bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded-md uppercase">
                                                    現在
                                                </span>
                                                <span v-else
                                                    class="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-1 rounded-md uppercase">
                                                    履歴
                                                </span>
                                            </td>
                                            <td class="py-4 px-4">
                                                <div class="flex gap-2">
                                                    <button @click="editItem('dept', item)"
                                                        class="p-2 bg-slate-50 dark:bg-slate-900/50 text-violet-600 hover:bg-violet-100 rounded-lg transition-all cursor-pointer"><i
                                                            class="pi pi-pencil"></i></button>
                                                    <button v-if="item.id" @click="confirmDelete('dept', item)"
                                                        class="p-2 bg-slate-50 dark:bg-slate-900/50 text-rose-600 hover:bg-rose-100 rounded-lg transition-all cursor-pointer"><i
                                                            class="pi pi-trash"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr v-if="settings.departments.length === 0">
                                            <td colspan="4" class="py-12 text-center text-slate-400 font-medium">
                                                データがありません。</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Mappings Tab -->
                        <div v-if="activeTab === 'mapping'">
                            <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                <div>
                                    <h2 class="text-2xl font-black text-slate-900 dark:text-white">勘定科目マッピング</h2>
                                    <p class="text-sm text-slate-500">プランやアドオンを勘定科目に紐付けます</p>
                                </div>
                                <div class="flex items-center gap-4">
                                    <div class="flex flex-col gap-1">
                                        <label
                                            class="text-[10px] font-black text-slate-400 uppercase tracking-widest">対象ホテルを選択</label>
                                        <Select v-model="selectedMappingHotelId" :options="hotelStore.safeHotels.value"
                                            optionLabel="name" optionValue="id" placeholder="ホテルを選択" class="w-64"
                                            @change="fetchSettings" />
                                    </div>
                                    <button @click="openModal('mapping')"
                                        class="bg-violet-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-violet-700 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-violet-200 dark:shadow-none self-end">
                                        <i class="pi pi-plus"></i> マッピング追加
                                    </button>
                                </div>
                            </div>

                            <div class="overflow-x-auto">
                                <table class="w-full text-left border-collapse">
                                    <thead>
                                        <tr class="border-b border-slate-100 dark:border-slate-700">
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                                対象タイプ</th>
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                                対象アイテム</th>
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                                ホテル</th>
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                                勘定科目</th>
                                            <th
                                                class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">
                                                操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="item in settings.mappings" :key="item.id"
                                            class="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                            <td class="py-4 px-4">
                                                <span class="text-[10px] font-black px-2 py-1 rounded-md uppercase"
                                                    :class="getTargetTypeBadgeClass(item.target_type)">
                                                    {{ getTargetTypeLabel(item.target_type) }}
                                                </span>
                                            </td>
                                            <td class="py-4 px-4 font-bold">{{ getTargetName(item) }}</td>
                                            <td class="py-4 px-4 text-sm text-slate-500">
                                                <span v-if="item.hotel_id" class="flex items-center gap-1">
                                                    <i class="pi pi-building text-[10px]"></i> {{
                                                        getHotelName(item.hotel_id) }}
                                                </span>
                                                <span v-else
                                                    class="text-violet-600 font-bold italic flex items-center gap-1">
                                                    <i class="pi pi-globe text-[10px]"></i> 共通設定
                                                </span>
                                            </td>
                                            <td class="py-4 px-4 font-black">
                                                <div class="flex flex-col">
                                                    <span class="text-slate-900 dark:text-white">{{ item.account_name
                                                    }}</span>
                                                    <span class="text-[10px] text-slate-400 tabular-nums">{{
                                                        item.account_code }}</span>
                                                </div>
                                            </td>
                                            <td class="py-4 px-4">
                                                <div class="flex gap-2">
                                                    <button @click="editItem('mapping', item)"
                                                        class="p-2 bg-slate-50 dark:bg-slate-900/50 text-violet-600 hover:bg-violet-100 rounded-lg transition-all cursor-pointer"><i
                                                            class="pi pi-pencil"></i></button>
                                                    <button @click="confirmDelete('mapping', item)"
                                                        class="p-2 bg-slate-50 dark:bg-slate-900/50 text-rose-600 hover:bg-rose-100 rounded-lg transition-all cursor-pointer"><i
                                                            class="pi pi-trash"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr v-if="settings.mappings.length === 0">
                                            <td colspan="5" class="py-12 text-center text-slate-400 font-medium">
                                                データがありません。</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>

        <!-- Master Data Modal -->
        <SettingsDialog v-model:visible="modal.visible" :type="modal.type" :is-edit="modal.isEdit" :initial-data="form"
            :settings="settings" :hotels="hotelStore.safeHotels.value" :saving="saving" @save="handleSave" />

        <ConfirmDialog group="accounting-settings" />
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useAccountingStore } from '@/composables/useAccountingStore';
import { useHotelStore } from '@/composables/useHotelStore';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import Select from 'primevue/select';
import ConfirmDialog from 'primevue/confirmdialog';
import SettingsDialog from './components/dialogs/SettingsDialog.vue';

const store = useAccountingStore();
const hotelStore = useHotelStore();
const confirm = useConfirm();
const toast = useToast();
// Note: Toast might need to be provided in main.js, assuming it is.
const activeTab = ref('codes');
const loading = ref(true);
const saving = ref(false);
const selectedGroupFilter = ref(null);
const selectedTaxFilter = ref(null);
const selectedAccountFilter = ref(null);

const tabs = [
    { id: 'codes', label: '勘定科目' },
    { id: 'subaccounts', label: '補助科目' },
    { id: 'groups', label: '管理区分' },
    { id: 'tax', label: '税区分' },
    { id: 'dept', label: '部門設定' }
];

const settings = reactive({
    codes: [],
    groups: [],
    taxClasses: [],
    departments: [],
    subAccounts: [],
    mappings: [],
    mappingMasterData: {
        plans: [],
        categories: [],
        packageCategories: [],
        addonsGlobal: [],
        addonsHotel: []
    }
});

const selectedMappingHotelId = ref(null);

const filteredCodes = computed(() => {
    if (!selectedGroupFilter.value) return settings.codes;
    return settings.codes.filter(c => c.management_group_id === selectedGroupFilter.value);
});

const uniqueTaxRates = computed(() => {
    const rates = new Set(settings.taxClasses.map(t => t.tax_rate));
    return Array.from(rates).sort((a, b) => b - a);
});

const filteredTaxClasses = computed(() => {
    if (selectedTaxFilter.value === null) return settings.taxClasses;
    return settings.taxClasses.filter(t => Math.abs(t.tax_rate - selectedTaxFilter.value) < 0.0001);
});

const accountsWithSubAccounts = computed(() => {
    const accountIds = new Set(settings.subAccounts.map(sa => sa.account_code_id));
    return settings.codes.filter(code => accountIds.has(code.id));
});

const filteredSubAccounts = computed(() => {
    if (!selectedAccountFilter.value) return settings.subAccounts;
    return settings.subAccounts.filter(sa => sa.account_code_id === selectedAccountFilter.value);
});

const modal = reactive({
    visible: false,
    type: 'code',
    isEdit: false
});

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
    is_current: true
});

const fetchSettings = async () => {
    try {
        loading.value = true;
        const data = await store.getAccountingSettings(selectedMappingHotelId.value);
        settings.codes = data.codes;
        settings.groups = data.groups;
        settings.taxClasses = data.taxClasses;
        settings.departments = data.departments;
        settings.subAccounts = data.subAccounts || [];
        settings.mappings = data.mappings;
        if (data.mappingMasterData) {
            settings.mappingMasterData = data.mappingMasterData;
        }
    } catch (err) {
        console.error('Failed to fetch accounting settings', err);
        toast.add({
            severity: 'error',
            summary: 'システムエラー',
            detail: '設定データの取得に失敗しました。ページを更新してください。',
            life: 5000
        });
    } finally {
        loading.value = false;
    }
};

const getGroupName = (id) => {
    const g = settings.groups.find(x => x.id === id);
    return g ? g.name : '-';
};

const getHotelName = (id) => {
    const h = hotelStore.safeHotels.value?.find(x => x.id === id);
    return h ? h.name : '-';
};



const openModal = (type) => {
    modal.type = type;
    modal.isEdit = false;
    modal.visible = true;

    // Reset form
    form.id = null;
    form.code = '';
    form.name = '';
    form.management_group_id = null;
    form.is_active = true;
    form.display_order = 10;
    form.yayoi_name = '';
    form.tax_rate_percent = 10;
    form.hotel_id = null;
    form.is_current = false;
    form.target_type = null;
    form.target_id = null;
    form.account_code_id = null;
};

const editItem = (type, item) => {
    modal.type = type;
    modal.isEdit = true;
    modal.visible = true;

    form.id = item.id;

    if (type !== 'mapping') {
        form.name = item.name;
    }

    if (type === 'code') {
        form.code = item.code;
        form.management_group_id = item.management_group_id;
        form.is_active = item.is_active;
    } else if (type === 'group') {
        form.display_order = item.display_order;
    } else if (type === 'tax') {
        form.yayoi_name = item.yayoi_name;
        form.tax_rate_percent = item.tax_rate * 100;
        form.display_order = item.display_order;
        form.is_active = item.is_active;
    } else if (type === 'dept') {
        form.hotel_id = item.hotel_id;
        form.name = item.name || '';
        form.is_current = item.is_current !== undefined ? item.is_current : false;
    } else if (type === 'mapping') {
        form.hotel_id = item.hotel_id;
        form.target_type = item.target_type;
        form.target_id = item.target_id;
        form.account_code_id = item.account_code_id;
    }
};

const handleSave = async (formData) => {
    try {
        saving.value = true;
        let payload = { ...formData };

        if (modal.type === 'tax') {
            payload.tax_rate = payload.tax_rate_percent / 100;
        }



        if (modal.type === 'mapping' && payload.target_type === 'cancellation') {
            payload.target_id = 0;
        }

        if (modal.type === 'code') await store.upsertAccountCode(payload);
        else if (modal.type === 'group') await store.upsertManagementGroup(payload);
        else if (modal.type === 'tax') await store.upsertTaxClass(payload);
        else if (modal.type === 'dept') await store.upsertDepartment(payload);
        else if (modal.type === 'mapping') await store.upsertMapping(payload);
        else if (modal.type === 'subaccount') await store.upsertSubAccount(payload);

        modal.visible = false;
        await fetchSettings();
        toast.add({ severity: 'success', summary: '成功', detail: '保存しました。', life: 3000 });
    } catch (err) {
        console.error('Save failed', err);
        toast.add({ severity: 'error', summary: 'エラー', detail: '保存に失敗しました。', life: 3000 });
    } finally {
        saving.value = false;
    }
};

const confirmDelete = (type, item) => {
    confirm.require({
        group: 'accounting-settings',
        message: '本当に削除しますか？この操作は取り消せません。',
        header: '削除の確認',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'はい',
        rejectLabel: 'いいえ',
        acceptProps: {
            label: 'はい',
            severity: 'danger',
            class: 'px-6 py-2 rounded-xl font-bold'
        },
        rejectProps: {
            label: 'いいえ',
            severity: 'secondary',
            variant: 'text',
            class: 'px-6 py-2 rounded-xl font-bold'
        },
        accept: async () => {
            try {
                if (type === 'code') await store.deleteAccountCode(item.id);
                else if (type === 'group') await store.deleteManagementGroup(item.id);
                else if (type === 'tax') await store.deleteTaxClass(item.id);
                else if (type === 'dept') await store.deleteDepartment(item.id);
                else if (type === 'mapping') await store.deleteMapping(item.id);
                else if (type === 'subaccount') await store.deleteSubAccount(item.id);
                await fetchSettings();
                toast.add({ severity: 'success', summary: '成功', detail: '削除しました。', life: 3000 });
            } catch (err) {
                console.error('Delete failed', err);
                toast.add({ severity: 'error', summary: 'エラー', detail: '削除に失敗しました。', life: 3000 });
            }
        }
    });
};

// Mapping Helper Functions
const getTargetTypeLabel = (type) => {
    const labels = {
        plan_hotel: '個別プラン',
        plan_type_category: 'プラン区分',
        plan_package_category: 'パッケージ区分',
        addon_hotel: '個別アドオン',
        addon_global: '共通アドオン',
        cancellation: 'キャンセル料'
    };
    return labels[type] || type;
};

const getTargetTypeBadgeClass = (type) => {
    const classes = {
        plan_hotel: 'bg-indigo-100 text-indigo-700',
        plan_type_category: 'bg-violet-100 text-violet-700',
        plan_package_category: 'bg-purple-100 text-purple-700',
        addon_hotel: 'bg-emerald-100 text-emerald-700',
        addon_global: 'bg-teal-100 text-teal-700',
        cancellation: 'bg-rose-100 text-rose-700'
    };
    return classes[type] || 'bg-slate-100 text-slate-700';
};

const getTargetName = (item) => {
    if (item.target_type === 'cancellation') return '全体';

    if (item.target_type === 'plan_hotel') {
        const p = settings.mappingMasterData.plans.find(x => x.id === item.target_id);
        return p ? p.name : `プランID: ${item.target_id}`;
    }

    if (item.target_type === 'plan_type_category') {
        const c = settings.mappingMasterData.categories.find(x => x.id === item.target_id);
        return c ? c.name : `区分ID: ${item.target_id}`;
    }

    if (item.target_type === 'plan_package_category') {
        const c = settings.mappingMasterData.packageCategories.find(x => x.id === item.target_id);
        return c ? c.name : `パッケージID: ${item.target_id}`;
    }

    if (item.target_type === 'addon_global') {
        const a = settings.mappingMasterData.addonsGlobal.find(x => x.id === item.target_id);
        return a ? a.name : `アドオンID: ${item.target_id}`;
    }

    if (item.target_type === 'addon_hotel') {
        const a = settings.mappingMasterData.addonsHotel.find(x => x.id === item.target_id);
        return a ? a.name : `アドオンID: ${item.target_id}`;
    }

    return `ID: ${item.target_id}`;
};

onMounted(async () => {
    try {
        await Promise.all([
            fetchSettings(),
            hotelStore.fetchHotels()
        ]);
    } catch (err) {
        console.error('Failed to initialize settings page', err);
        toast.add({ severity: 'error', summary: '初期化エラー', detail: '一部のデータの読み込みに失敗しました。', life: 3000 });
    }
});
</script>

<style scoped>
.animate-fade-in {
    animation: fade-in 0.3s ease-out forwards;
}

@keyframes fade-in {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
