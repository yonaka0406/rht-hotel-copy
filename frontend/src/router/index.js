import { createRouter, createWebHistory } from 'vue-router';

const WorkInProgress = () => import('@/components/WorkInProgress.vue');
const ReservationClientConfirmation = () => import('@/components/ReservationClientConfirmation.vue');

const Login = () => import('@/pages/LoginPage.vue');
const ForgotPassword = () => import('@/pages/ForgotPassword.vue');
const ResetPassword = () => import('@/pages/ResetPassword.vue');
const AuthCallback = () => import('@/pages/AuthCallback.vue');
const NotFound = () => import('@/pages/NotFound.vue');

const AdminPanel = () => import('@/pages/Admin/AdminPanel/AdminPanel.vue');
const ManageUsers = () => import('@/pages/Admin/ManageUsers.vue');
const ManageRoles = () => import('@/pages/Admin/ManageRoles/ManageRolesPage.vue');
const ManageParking = () => import('@/pages/Admin/ManageParking.vue');
const ManageParkingCalendar = () => import('@/pages/Admin/ManageParkingCalendar/ManageParkingCalendar.vue');
const CreateHotel = () => import('@/pages/Admin/CreateHotel/CreateHotel.vue');
const ManageHotel = () => import('@/pages/Admin/ManageHotel/ManageHotel.vue');
const ManagePlans = () => import('@/pages/Admin/ManagePlans/ManagePlans.vue');
const ManageAddons = () => import('@/pages/Admin/ManageAddons/ManageAddons.vue');
const ManageCalendar = () => import('@/pages/Admin/ManageCalendar.vue');
const ManageSettings = () => import('@/pages/Admin/ManageSettings/ManageSettingsPage.vue');
const ManageOTAPage = () => import('@/pages/Admin/ManageOTA/ManageOTAPage.vue');
const ManagePMSImport = () => import('@/pages/Admin/ManagePMSImport.vue');
const ManageFinancesImport = () => import('@/pages/Admin/ManageFinancesImport/ManageFinancesImport.vue');
const ManageLoyaltyTiers = () => import('@/pages/Admin/ManageLoyaltyTiers.vue');
const ManageWaitList = () => import('@/pages/Admin/ManageWaitList.vue');
const ManageGoogleDrive = () => import('@/pages/Admin/ManageGoogleDrive.vue');

const MainPage = () => import('@/pages/MainPage/Main/MainLayout.vue');
const Dashboard = () => import('@/pages/MainPage/DashboardPage.vue');
const RoomIndicator = () => import('@/pages/MainPage/RoomIndicator/RoomIndicator.vue');
const ReservationsNew = () => import('@/pages/MainPage/ReservationsNew/ReservationsNew.vue');
const ReservationEdit = () => import('@/pages/MainPage/Reservation/ReservationEdit.vue');
const ReservationsCalendar = () => import('@/pages/MainPage/ReservationsCalendar.vue');
const StaticCalendar = () => import('@/pages/MainPage/StaticCalendar/StaticCalendar.vue');
const ParkingCalendar = () => import('@/pages/MainPage/ParkingCalendar/ParkingCalendar.vue');
const ReservationList = () => import('@/pages/MainPage/ReservationList/ReservationList.vue');
const BillingInvoices = () => import('@/pages/MainPage/BillingInvoices.vue');
const ReceiptsPage = () => import('@/pages/MainPage/ReceiptsPage.vue'); // Added import
const ReportDaily = () => import('@/pages/MainPage/ReportDaily.vue');
const ReportMonthly = () => import('@/pages/MainPage/ReportMonthly/ReportMonthly.vue');

const ClientHomePage = () => import('@/pages/CRM/ClientHomePage.vue');
const ClientDashboard = () => import('@/pages/CRM/ClientDashboard.vue');
const ClientList = () => import('@/pages/CRM/ClientList/ClientList.vue');
const ClientDuplicates = () => import('@/pages/CRM/ClientDuplicates.vue');
const ClientEdit = () => import('@/pages/CRM/ClientEdit.vue');
const ClientGroupList = () => import('@/pages/CRM/ClientGroupList.vue');
const ClientGroupEdit = () => import('@/pages/CRM/ClientGroupEdit.vue');
const SalesInteractions = () => import('@/pages/CRM/Sales/SalesInteractions.vue');
const SalesProjectList = () => import('@/pages/CRM/Sales/SalesProjectList.vue');

const ReportingMainPage = () => import('@/pages/Reporting/ReportingMainPage.vue');

const AboutPage = () => import('@/pages/About/AboutPage.vue');

const routes = [
  {
    path: '/',
    name: 'MainPage',
    component: MainPage,
    children: [
      { path: '/dashboard', name: 'Dashboard', component: Dashboard },
      { path: '/reservations/day/:date?', name: 'RoomIndicator', component: RoomIndicator },
      { path: '/reservations/new', name: 'ReservationsNew', component: ReservationsNew },
      { path: '/reservations/edit/:reservation_id', name: 'ReservationEdit', component: ReservationEdit, props: true },
      { path: '/reservations/calendar', name: 'ReservationsCalendar', component: ReservationsCalendar },
      { path: '/reservations/static-calendar', name: 'StaticCalendar', component: StaticCalendar },
      { path: '/parking/calendar', name: 'ParkingCalendar', component: ParkingCalendar },
      { path: '/reservations/list', name: 'ReservationList', component: ReservationList },
      { path: '/billing/invoices', name: 'BillingInvoices', component: BillingInvoices },
      { path: '/billing/receipts', name: 'Receipts', component: ReceiptsPage }, // Added route
      { path: '/report/daily', name: 'ReportDaily', component: ReportDaily },
      { path: '/report/monthly', name: 'ReportMonthly', component: ReportMonthly },
    ],
    meta: { requiresAuth: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: ForgotPassword,
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: ResetPassword,
  },
  {
    path: '/auth/google/callback',
    name: 'AuthCallback',
    component: AuthCallback,
  },
  {
    path: '/admin',
    component: AdminPanel,
    children: [
      { path: 'users', component: ManageUsers },
      { path: 'roles', component: ManageRoles },
      { path: 'hotel-create', component: CreateHotel },
      { path: 'hotel-edit', component: ManageHotel },
      { path: 'hotel-plans', component: ManagePlans },
      { path: 'hotel-addons', component: ManageAddons },
      { path: 'hotel-calendar', component: ManageCalendar },
      { path: 'manage-parking', component: ManageParking },
      { path: 'parking-calendar', component: ManageParkingCalendar },
      { path: 'settings', component: ManageSettings },
      { path: 'ota', component: ManageOTAPage },
      { path: 'pms-import', component: ManagePMSImport },
      { path: 'finances', component: ManageFinancesImport },
      { path: 'loyalty-tiers', name: 'ManageLoyaltyTiers', component: ManageLoyaltyTiers },
      { path: 'waitlist', name: 'ManageWaitList', component: ManageWaitList },
      { path: 'google-drive', name: 'ManageGoogleDrive', component: ManageGoogleDrive, meta: { requiresAdmin: true, hidden: true } },
    ],
    meta: { requiresAuth: true },
  },
  {
    path: '/crm',
    component: ClientHomePage,
    children: [
      { path: 'dashboard', component: ClientDashboard },
      { path: 'clients/all', component: ClientList },
      { path: 'clients/duplicates', component: ClientDuplicates },
      { path: 'clients/edit/:clientId', name: 'ClientEdit', component: ClientEdit, props: true },
      { path: 'groups/all', component: ClientGroupList },
      { path: 'groups/edit/:groupId', name: 'ClientGroupEdit', component: ClientGroupEdit, props: true },
      { path: 'sales/interactions', name: 'SalesInteractions', component: SalesInteractions },
      {
        path: 'sales/projects',
        name: 'ProjectListAll',
        component: SalesProjectList,
        meta: { title: 'PJ・工事一覧' }
      },
    ],
    meta: { requiresAuth: true },
  },
  {
    path: '/reporting',
    component: ReportingMainPage,
    children: [],
    meta: { requiresAuth: true },
  },
  {
    path: '/about',
    name: 'About',
    component: AboutPage,
    meta: { requiresAuth: true },
  },
  // Work in Progress
  {
    path: "/wip",
    name: "WorkInProgress",
    component: WorkInProgress
  },
  // Waitlist confirmation route (public, no auth required)
  {
    path: '/waitlist/confirm/:token',
    name: 'ReservationClientConfirmation',
    component: ReservationClientConfirmation,
    props: true,
    meta: { requiresAuth: false }
  },
  // Catch-all 404 route
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation guard for authentication
router.beforeEach((to, from, next) => {
  const authToken = localStorage.getItem('authToken');
  const isAuthenticated = !!authToken;

  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'Login' });
  }

  if (isAuthenticated && to.name === 'Login') {
    return next({ name: 'RoomIndicator' });
  }

  // Redirect to RoomIndicator if path is '/'
  if (to.path === '/') {
    return next({ name: 'RoomIndicator' });
  }

  const verifyToken = async (url) => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        credentials: 'include',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (!response.ok) {
        try {
          const data = await response.json();

          // Specific handling for insufficient permissions
          if (data.error && data.error.includes('Insufficient permissions')) {
            next({ name: 'MainPage' });
            return false;
          }

          // Only clear token on authentication errors (401, 403)
          if (response.status === 401 || response.status === 403) {
            console.log('Authentication error, clearing token');
            localStorage.removeItem('authToken');
            next({ name: 'Login' });
          } else {
            // For other errors, log but don't log out the user
            console.warn('API error during token verification, but keeping user logged in', data);
            next();
          }
          return false;
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
          // Don't log out if we can't parse the error response
          next();
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Network/request error during token verification:', {
        name: error.name,
        message: error.message,
        ...(import.meta.env.DEV ? { stack: error.stack } : {})
      });

      // Don't log out on network errors, just continue
      // The user might be offline or the server might be temporarily unavailable
      next();
      return false;
    }
  };

  if (to.matched.some((record) => record.meta.requiresAuth)) {
    const isAdminRoute = to.path.startsWith('/admin');
    const apiUrl = isAdminRoute ? '/api/adminProtected' : '/api/protected';

    verifyToken(apiUrl).then((isValid) => {
      if (isValid) {
        next();
      }
    });

    return;
  }

  next();
});

export default router;
