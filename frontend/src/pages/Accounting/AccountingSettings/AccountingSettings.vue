<template>
    <div class="bg-slate-50 dark:bg-slate-900 min-h-screen p-6 font-sans transition-colors duration-300">
        <div class="max-w-7xl mx-auto px-4">
            <!-- Hero Row -->
            <div class="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-300">
                <div class="flex items-center gap-6">
                    <div class="flex-shrink-0 inline-flex items-center justify-center w-16 h-16 bg-violet-600 rounded-2xl shadow-lg shadow-violet-200 dark:shadow-none">
                        <i class="pi pi-cog text-3xl text-white"></i>
                    </div>
                    <div class="text-left">
                        <h1 class="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                            会計マスター設定
                        </h1>
                        <p class="text-slate-500 dark:text-slate-400 font-medium">
                            勘定科目、管理区分、および税区分の管理を行います。
                        </p>
                    </div>
                </div>
                
                <button @click="$router.push({ name: 'AccountingDashboard' })" class="flex items-center gap-2 px-6 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-black hover:text-violet-600 hover:border-violet-200 transition-all cursor-pointer">
                    <i class="pi pi-arrow-left text-sm"></i>
                    <span>ダッシュボードに戻る</span>
                </button>
            </div>

            <!-- Tabs and Content Container -->
            <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                <!-- Tabs Container -->
                <div class="flex overflow-x-auto bg-slate-100/50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-2 gap-2">
                    <button 
                        v-for="tab in tabs" 
                        :key="tab.id"
                        @click="activeTab = tab.id"
                        class="px-8 py-3 font-black rounded-xl transition-all cursor-pointer whitespace-nowrap"
                        :class="activeTab === tab.id ? 'bg-white dark:bg-slate-800 text-violet-600 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 bg-transparent'"
                    >
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
                                <button @click="openModal('code')" class="bg-violet-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-violet-700 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-violet-200 dark:shadow-none">
                                    <i class="pi pi-plus"></i> 新規追加
                                </button>
                            </div>

                            <!-- Group Filter Buttons -->
                            <div class="flex flex-wrap gap-2 mb-8 p-1 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl w-fit">
                                <button 
                                    @click="selectedGroupFilter = null"
                                    class="px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer"
                                    :class="!selectedGroupFilter ? 'bg-white dark:bg-slate-800 text-violet-600 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:text-slate-700 bg-transparent'"
                                >
                                    すべて
                                </button>
                                <button 
                                    v-for="group in settings.groups" 
                                    :key="group.id"
                                    @click="selectedGroupFilter = group.id"
                                    class="px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer"
                                    :class="selectedGroupFilter === group.id ? 'bg-white dark:bg-slate-800 text-violet-600 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:text-slate-700 bg-transparent'"
                                >
                                    {{ group.name }}
                                </button>
                            </div>

                            <div class="overflow-x-auto">
                                <table class="w-full text-left border-collapse">
                                    <thead>
                                        <tr class="border-b border-slate-100 dark:border-slate-700">
                                            <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">コード</th>
                                            <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">科目名</th>
                                            <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">管理区分</th>
                                            <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">状態</th>
                                            <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="item in filteredCodes" :key="item.id" class="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                            <td class="py-4 px-4 font-black tabular-nums">{{ item.code }}</td>
                                            <td class="py-4 px-4 font-bold">{{ item.name }}</td>
                                            <td class="py-4 px-4 text-sm text-slate-500">{{ getGroupName(item.management_group_id) }}</td>
                                            <td class="py-4 px-4">
                                                <span :class="item.is_active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'" class="text-[10px] font-black px-2 py-1 rounded-md uppercase">
                                                    {{ item.is_active ? '有効' : '無効' }}
                                                </span>
                                            </td>
                                            <td class="py-4 px-4">
                                                <div class="flex gap-2">
                                                    <button @click="editItem('code', item)" class="p-2 bg-slate-50 dark:bg-slate-900/50 text-violet-600 hover:bg-violet-100 rounded-lg transition-all cursor-pointer"><i class="pi pi-pencil"></i></button>
                                                    <button @click="confirmDelete('code', item)" class="p-2 bg-slate-50 dark:bg-slate-900/50 text-rose-600 hover:bg-rose-100 rounded-lg transition-all cursor-pointer"><i class="pi pi-trash"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr v-if="filteredCodes.length === 0">
                                            <td colspan="5" class="py-12 text-center text-slate-400 font-medium">データがありません。</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Management Groups Tab -->
                        <div v-if="activeTab === 'groups'">
                            <div class="flex justify-between items-center mb-6">
                                <h2 class="text-2xl font-black text-slate-900 dark:text-white">管理区分設定</h2>
                                <button @click="openModal('group')" class="bg-violet-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-violet-700 transition-all flex items-center gap-2 cursor-pointer">
                                    <i class="pi pi-plus"></i> 新規追加
                                </button>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full text-left border-collapse">
                                    <thead>
                                        <tr class="border-b border-slate-100 dark:border-slate-700">
                                            <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest w-24">順序</th>
                                            <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">区分名</th>
                                            <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="item in settings.groups" :key="item.id" class="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                            <td class="py-4 px-4 font-black tabular-nums">{{ item.display_order }}</td>
                                            <td class="py-4 px-4 font-bold">{{ item.name }}</td>
                                            <td class="py-4 px-4">
                                                <div class="flex gap-2">
                                                    <button @click="editItem('group', item)" class="p-2 bg-slate-50 dark:bg-slate-900/50 text-violet-600 hover:bg-violet-100 rounded-lg transition-all cursor-pointer"><i class="pi pi-pencil"></i></button>
                                                    <button @click="confirmDelete('group', item)" class="p-2 bg-slate-50 dark:bg-slate-900/50 text-rose-600 hover:bg-rose-100 rounded-lg transition-all cursor-pointer"><i class="pi pi-trash"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr v-if="settings.groups.length === 0">
                                            <td colspan="3" class="py-12 text-center text-slate-400 font-medium">データがありません。</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Tax Classes Tab -->                        
                        <div v-if="activeTab === 'tax'">
                            <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                <h2 class="text-2xl font-black text-slate-900 dark:text-white">税区分設定</h2>
                                <button @click="openModal('tax')" class="bg-violet-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-violet-700 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-violet-200 dark:shadow-none">
                                    <i class="pi pi-plus"></i> 新規追加
                                </button>
                            </div>

                            <!-- Filter Buttons -->
                            <div class="flex flex-wrap gap-2 mb-8 p-1 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl w-fit">
                                <button 
                                    @click="selectedTaxFilter = null"
                                    class="px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer"
                                    :class="selectedTaxFilter === null ? 'bg-white dark:bg-slate-800 text-violet-600 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:text-slate-700 bg-transparent'"
                                >
                                    すべて
                                </button>
                                <button 
                                    v-for="rate in uniqueTaxRates" 
                                    :key="rate"
                                    @click="selectedTaxFilter = rate"
                                    class="px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer"
                                    :class="selectedTaxFilter !== null && Math.abs(selectedTaxFilter - rate) < 0.0001 ? 'bg-white dark:bg-slate-800 text-violet-600 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:text-slate-700 bg-transparent'"
                                >
                                    {{ (rate * 100).toFixed(0) }}%
                                </button>
                            </div>

                            <div class="overflow-x-auto">
                                <table class="w-full text-left border-collapse">
                                    <thead>
                                        <tr class="border-b border-slate-100 dark:border-slate-700">
                                            <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest w-24">順序</th>
                                            <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">税区分名 (システム)</th>
                                            <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">弥生会計名</th>
                                            <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest w-32">税率</th>
                                            <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="item in filteredTaxClasses" :key="item.id" class="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                            <td class="py-4 px-4 font-black tabular-nums">{{ item.display_order }}</td>
                                            <td class="py-4 px-4 font-bold">{{ item.name }}</td>
                                            <td class="py-4 px-4 text-sm">{{ item.yayoi_name }}</td>
                                            <td class="py-4 px-4 font-black tabular-nums">{{ (item.tax_rate * 100).toFixed(0) }}%</td>
                                            <td class="py-4 px-4">
                                                <div class="flex gap-2">
                                                    <button @click="editItem('tax', item)" class="p-2 bg-slate-50 dark:bg-slate-900/50 text-violet-600 hover:bg-violet-100 rounded-lg transition-all cursor-pointer"><i class="pi pi-pencil"></i></button>
                                                    <button @click="confirmDelete('tax', item)" class="p-2 bg-slate-50 dark:bg-slate-900/50 text-rose-600 hover:bg-rose-100 rounded-lg transition-all cursor-pointer"><i class="pi pi-trash"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr v-if="filteredTaxClasses.length === 0">
                                            <td colspan="5" class="py-12 text-center text-slate-400 font-medium">データがありません。</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Departments Tab -->
                        <div v-if="activeTab === 'dept'">
                            <div class="mb-6">
                                <h2 class="text-2xl font-black text-slate-900 dark:text-white">部門設定</h2>
                                <p class="text-sm text-slate-500">現在の部門マッピングと履歴データを管理します</p>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full text-left border-collapse">
                                    <thead>
                                        <tr class="border-b border-slate-100 dark:border-slate-700">
                                            <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">店舗名</th>
                                            <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">部門名 (弥生会計)</th>
                                            <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">状態</th>
                                            <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">有効期間</th>
                                            <th class="py-4 px-4 font-black text-slate-400 text-xs uppercase tracking-widest">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="item in settings.departments" :key="item.id" class="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                            <td class="py-4 px-4 font-bold">{{ item.hotel_name }}</td>
                                            <td class="py-4 px-4">
                                                <span v-if="item.name" class="font-black text-slate-700 dark:text-slate-300">{{ item.name }}</span>
                                                <span v-else class="text-slate-400 text-sm font-medium">未設定</span>
                                            </td>
                                            <td class="py-4 px-4">
                                                <span v-if="item.is_current" class="bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded-md uppercase">
                                                    現在
                                                </span>
                                                <span v-else class="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-1 rounded-md uppercase">
                                                    履歴
                                                </span>
                                            </td>
                                            <td class="py-4 px-4 text-sm text-slate-500">
                                                <span v-if="item.valid_from || item.valid_to">
                                                    {{ formatDate(item.valid_from) }} 〜 {{ formatDate(item.valid_to) || '現在' }}
                                                </span>
                                                <span v-else class="text-slate-400">-</span>
                                            </td>
                                            <td class="py-4 px-4">
                                                <div class="flex gap-2">
                                                    <button @click="editItem('dept', item)" class="p-2 bg-slate-50 dark:bg-slate-900/50 text-violet-600 hover:bg-violet-100 rounded-lg transition-all cursor-pointer"><i class="pi pi-pencil"></i></button>
                                                    <button v-if="item.id" @click="confirmDelete('dept', item)" class="p-2 bg-slate-50 dark:bg-slate-900/50 text-rose-600 hover:bg-rose-100 rounded-lg transition-all cursor-pointer"><i class="pi pi-trash"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr v-if="settings.departments.length === 0">
                                            <td colspan="5" class="py-12 text-center text-slate-400 font-medium">データがありません。</td>
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
        <Dialog v-model:visible="modal.visible" :header="modalTitle" modal class="w-full max-w-lg">
            <div class="p-2 space-y-6">
                <!-- Account Code Form -->
                <div v-if="modal.type === 'code'" class="space-y-4">
                    <div class="flex flex-col gap-2">
                        <label class="text-xs font-black text-slate-500 uppercase">勘定コード <span class="text-rose-500">*</span></label>
                        <InputText v-model="form.code" placeholder="例: 4110004" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-xs font-black text-slate-500 uppercase">勘定科目名 <span class="text-rose-500">*</span></label>
                        <InputText v-model="form.name" placeholder="例: 宿泊事業売上" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-xs font-black text-slate-500 uppercase">管理区分</label>
                        <Select v-model="form.management_group_id" :options="settings.groups" optionLabel="name" optionValue="id" placeholder="区分を選択" class="w-full" />
                    </div>
                    <div class="flex items-center gap-2">
                        <Checkbox v-model="form.is_active" :binary="true" />
                        <label class="text-sm font-bold text-slate-700 dark:text-slate-300">有効化する</label>
                    </div>
                </div>

                <!-- Management Group Form -->
                <div v-if="modal.type === 'group'" class="space-y-4">
                    <div class="flex flex-col gap-2">
                        <label class="text-xs font-black text-slate-500 uppercase">区分名 <span class="text-rose-500">*</span></label>
                        <InputText v-model="form.name" placeholder="例: 売上高" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-xs font-black text-slate-500 uppercase">表示順序</label>
                        <InputNumber v-model="form.display_order" placeholder="例: 10" class="w-full" />
                    </div>
                </div>

                <!-- Tax Class Form -->
                <div v-if="modal.type === 'tax'" class="space-y-4">
                    <div class="flex flex-col gap-2">
                        <label class="text-xs font-black text-slate-500 uppercase">システム内表示名 <span class="text-rose-500">*</span></label>
                        <InputText v-model="form.name" placeholder="例: 課税売上10%" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-xs font-black text-slate-500 uppercase">弥生会計出力名 <span class="text-rose-500">*</span></label>
                        <InputText v-model="form.yayoi_name" placeholder="例: 課税売上内10%" class="w-full" />
                    </div>
                    <div class="flex flex-row gap-4">
                        <div class="flex flex-col gap-2 flex-1">
                            <label class="text-xs font-black text-slate-500 uppercase">税率 (%)</label>
                            <InputNumber v-model="form.tax_rate_percent" :min="0" :max="100" placeholder="例: 10" class="w-full" />
                        </div>
                        <div class="flex flex-col gap-2 flex-1">
                            <label class="text-xs font-black text-slate-500 uppercase">表示順序</label>
                            <InputNumber v-model="form.display_order" class="w-full" />
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <Checkbox v-model="form.is_active" :binary="true" />
                        <label class="text-sm font-bold text-slate-700 dark:text-slate-300">有効化する</label>
                    </div>
                </div>

                <!-- Department Form -->
                <div v-if="modal.type === 'dept'" class="space-y-4">
                    <div class="flex flex-col gap-2">
                        <label class="text-xs font-black text-slate-500 uppercase">対象店舗</label>
                        <div class="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-slate-700 dark:text-slate-300">
                             {{ getHotelName(form.hotel_id) }}
                        </div>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-xs font-black text-slate-500 uppercase">部門名 (弥生会計) <span class="text-rose-500">*</span></label>
                        <InputText v-model="form.name" placeholder="例: WH室蘭" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-xs font-black text-slate-500 uppercase">状態</label>
                        <div class="flex items-center gap-3">
                            <Checkbox v-model="form.is_current" :binary="true" inputId="is_current" />
                            <label for="is_current" class="text-sm font-medium text-slate-700 dark:text-slate-300">
                                現在のマッピング (エクスポートに使用)
                            </label>
                        </div>
                        <p class="text-xs text-slate-500">チェックを外すと履歴データとして保存されます (インポート時の解決に使用)</p>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="flex flex-col gap-2">
                            <label class="text-xs font-black text-slate-500 uppercase">有効開始日</label>
                            <DatePicker v-model="form.valid_from" dateFormat="yy/mm/dd" placeholder="YYYY/MM/DD" class="w-full" />
                            <p class="text-xs text-slate-500">任意: この部門名が有効になった日</p>
                        </div>
                        <div class="flex flex-col gap-2">
                            <label class="text-xs font-black text-slate-500 uppercase">有効終了日</label>
                            <DatePicker v-model="form.valid_to" dateFormat="yy/mm/dd" placeholder="YYYY/MM/DD" class="w-full" :disabled="form.is_current" />
                            <p class="text-xs text-slate-500">任意: この部門名が終了した日</p>
                        </div>
                    </div>
                </div>

                <div class="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <button @click="modal.visible = false" class="px-6 py-2 rounded-xl font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-all">
                        キャンセル
                    </button>
                    <button @click="handleSave" :disabled="saving || !isFormValid" class="bg-violet-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-violet-700 transition-all flex items-center gap-2 shadow-lg shadow-violet-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none">
                        <i v-if="saving" class="pi pi-spin pi-spinner"></i>
                        保存する
                    </button>
                </div>
            </div>
        </Dialog>

        <ConfirmDialog group="accounting-settings" />
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useAccountingStore } from '@/composables/useAccountingStore';
import { useHotelStore } from '@/composables/useHotelStore';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Checkbox from 'primevue/checkbox';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import ConfirmDialog from 'primevue/confirmdialog';

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

const tabs = [
    { id: 'codes', label: '勘定科目' },
    { id: 'groups', label: '管理区分' },
    { id: 'tax', label: '税区分' },
    { id: 'dept', label: '部門設定' }
];

const settings = reactive({
    codes: [],
    groups: [],
    taxClasses: [],
    departments: []
});

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
    is_current: true,
    valid_from: null,
    valid_to: null
});

const modalTitle = computed(() => {
    const action = modal.isEdit ? '編集' : '新規作成';
    const targets = { code: '勘定科目', group: '管理区分', tax: '税区分', dept: '部門' };
    return `${targets[modal.type]}${action}`;
});

const fetchSettings = async () => {
    try {
        loading.value = true;
        const data = await store.getAccountingSettings();
        settings.codes = data.codes;
        settings.groups = data.groups;
        settings.taxClasses = data.taxClasses;
        settings.departments = data.departments;
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

const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
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
    form.is_current = true;
    form.valid_from = null;
    form.valid_to = null;
};

const editItem = (type, item) => {
    modal.type = type;
    modal.isEdit = true;
    modal.visible = true;
    
    form.id = item.id;
    form.name = item.name;
    
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
        form.is_current = item.is_current !== undefined ? item.is_current : true;
        form.valid_from = item.valid_from ? new Date(item.valid_from) : null;
        form.valid_to = item.valid_to ? new Date(item.valid_to) : null;
    }
};

const isFormValid = computed(() => {
    switch (modal.type) {
        case 'code':
            return form.code && form.name;
        case 'group':
            return form.name;
        case 'tax':
            return form.name && form.yayoi_name;
        case 'dept':
            return form.name;
        default:
            return false;
    }
});

const handleSave = async () => {
    if (!isFormValid.value) return;

    try {
        saving.value = true;
        let payload = { ...form };
        
        if (modal.type === 'tax') {
            payload.tax_rate = payload.tax_rate_percent / 100;
        }

        if (modal.type === 'dept') {
            // Format dates for backend
            if (payload.valid_from) {
                payload.valid_from = payload.valid_from.toISOString().split('T')[0];
            }
            if (payload.valid_to) {
                payload.valid_to = payload.valid_to.toISOString().split('T')[0];
            }
        }

        if (modal.type === 'code') await store.upsertAccountCode(payload);
        else if (modal.type === 'group') await store.upsertManagementGroup(payload);
        else if (modal.type === 'tax') await store.upsertTaxClass(payload);
        else if (modal.type === 'dept') await store.upsertDepartment(payload);
        
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
                await fetchSettings();
                toast.add({ severity: 'success', summary: '成功', detail: '削除しました。', life: 3000 });
            } catch (err) {
                console.error('Delete failed', err);
                toast.add({ severity: 'error', summary: 'エラー', detail: '削除に失敗しました。', life: 3000 });
            }
        }
    });
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
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
