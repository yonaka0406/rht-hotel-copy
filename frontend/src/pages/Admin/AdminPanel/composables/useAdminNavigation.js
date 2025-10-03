import { ref } from 'vue';

export function useAdminNavigation() {
    const adminSidebarItems = ref([
        { key: 'dashboard', type: 'link', label: 'ダッシュボード', icon: 'pi pi-fw pi-tablet', route: '/admin' },
        { type: 'separator' },
        { key: 'manage-users-header', type: 'header', label: 'ユーザー管理', icon: 'pi pi-fw pi-users' },
        { key: 'mu-create-edit', type: 'link', label: '新規 & 編集', icon: 'pi pi-fw pi-user', route: '/admin/users' },
        { key: 'mu-roles', type: 'link', label: 'ロール', icon: 'pi pi-fw pi-key', route: '/admin/roles' },
        { type: 'separator' },
        { key: 'manage-hotels-header', type: 'header', label: 'ホテル管理', icon: 'pi pi-fw pi-building' },
        { key: 'mh-create', type: 'link', label: '新規', icon: 'pi pi-fw pi-plus', route: '/admin/hotel-create' },
        { key: 'mh-edit', type: 'link', label: '編集', icon: 'pi pi-fw pi-pen-to-square', route: '/admin/hotel-edit' },
        { key: 'mh-plan', type: 'link', label: 'プラン', icon: 'pi pi-fw pi-box', route: '/admin/hotel-plans' },
        { key: 'mh-addon', type: 'link', label: 'アドオン', icon: 'pi pi-fw pi-cart-plus', route: '/admin/hotel-addons' },
        { key: 'mh-calendar', type: 'link', label: 'カレンダー', icon: 'pi pi-fw pi-calendar', route: '/admin/hotel-calendar' },
        { type: 'separator' },
        { key: 'manage-parking-header', type: 'header', label: '駐車場管理', icon: 'pi pi-fw pi-car' },
        { key: 'mp-manage', type: 'link', label: '管理', icon: 'pi pi-fw pi-car', route: '/admin/manage-parking' },
        { type: 'separator' },
        { key: 'customer-management-header', type: 'header', label: '顧客管理', icon: 'pi pi-fw pi-address-book' },
        { key: 'loyalty-tiers', type: 'link', label: 'ロイヤルティ層設定', icon: 'pi pi-fw pi-star', route: '/admin/loyalty-tiers' },
        { key: 'waitlist-management', type: 'link', label: '順番待ち管理', icon: 'pi pi-fw pi-clock', route: '/admin/waitlist' },
        { type: 'separator' },
        { key: 'data-import-header', type: 'header', label: 'データインポート', icon: 'pi pi-fw pi-database' },
        { key: 'import-data', type: 'link', label: '他社PMSデータインポート', icon: 'pi pi-fw pi-file-import', route: '/admin/pms-import' },
        { key: 'import-finances', type: 'link', label: '財務データ', icon: 'pi pi-fw pi-wallet', route: '/admin/finances' },
        { type: 'separator' },
        { key: 'other-settings', type: 'link', label: 'その他設定', icon: 'pi pi-fw pi-cog', route: '/admin/settings' },
        { key: 'manage-ota', type: 'link', label: 'OTA Exchange', icon: 'pi pi-fw pi-arrow-right-arrow-left', route: '/admin/ota' },
    ]);

    return {
        adminSidebarItems
    };
}
