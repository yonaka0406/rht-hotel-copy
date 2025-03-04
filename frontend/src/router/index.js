import { createRouter, createWebHistory } from 'vue-router';

const WorkInProgress = () => import('@/components/WorkInProgress.vue');

const Login = () => import('@/pages/Login.vue');
const ForgotPassword = () => import('@/pages/ForgotPassword.vue');
const ResetPassword = () => import('@/pages/ResetPassword.vue');
const NotFound = () => import('@/pages/NotFound.vue');

const AdminPanel = () => import('@/pages/Admin/AdminPanel.vue');
const ManageUsers = () => import('@/pages/Admin/ManageUsers.vue');
const ManageRoles = () => import('@/pages/Admin/ManageRoles.vue');
const ManageHotels = () => import('@/pages/Admin/ManageHotels.vue');
const ManageHotel = () => import('@/pages/Admin/ManageHotel.vue');
const ManagePlans = () => import('@/pages/Admin/ManagePlans.vue');
const ManageAddons = () => import('@/pages/Admin/ManageAddons.vue');
const ManageSettings = () => import('@/pages/Admin/ManageSettings.vue');
const ManageOTA = () => import('@/pages/Admin/ManageOTA.vue');

const MainPage = () => import('@/pages/MainPage/MainPage.vue');
const Dashboard = () => import('@/pages/MainPage/Dashboard.vue');
const RoomIndicator = () => import('@/pages/MainPage/RoomIndicator.vue');
const ReservationsNew = () => import('@/pages/MainPage/ReservationsNew.vue');
const ReservationEdit = () => import('@/pages/MainPage/ReservationEdit.vue');
const ReservationsCalendar = () => import('@/pages/MainPage/ReservationsCalendar.vue');
const ReportDaily = () => import('@/pages/MainPage/ReportDaily.vue');
const ReportMonthly = () => import('@/pages/MainPage/ReportMonthly.vue');

const ClientHomePage = () => import('@/pages/CRM/ClientHomePage.vue');
const ClientDashboard = () => import('@/pages/CRM/ClientDashboard.vue');
const ClientList = () => import('@/pages/CRM/ClientList.vue');
const ClientDuplicates = () => import('@/pages/CRM/ClientDuplicates.vue');
const ClientEdit = () => import('@/pages/CRM/ClientEdit.vue');
const SalesInteractions = () => import('@/pages/CRM/SalesInteractions.vue');

const routes = [
  {path: '/',
    name: 'MainPage',
    component: MainPage,
    children: [
      { path: '/dashboard', name: 'Dashboard', component: Dashboard },
      { path: '/reservations/day', name: 'RoomIndicator', component: RoomIndicator },
      { path: '/reservations/new', name: 'ReservationsNew', component: ReservationsNew },
      { path: '/reservations/edit/:reservation_id', name: 'ReservationEdit', component: ReservationEdit, props: true },
      { path: '/reservations/calendar', name: 'ReservationsCalendar', component: ReservationsCalendar },
      { path: '/report/daily', name: 'ReportDaily', component: ReportDaily },
      { path: '/report/monthly', name: 'ReportMonthly', component: ReportMonthly },
    ],
    meta: { requiresAuth: true },
  },  
  {path: '/login',
    name: 'Login',
    component: Login,
  },
  {path: '/forgot-password',
    name: 'ForgotPassword',
    component: ForgotPassword,
  },
  {path: '/reset-password',
    name: 'ResetPassword',    
    component: ResetPassword,
  },
  {path: '/admin',
    component: AdminPanel,
    children: [
      { path: 'users', component: ManageUsers },
      { path: 'roles', component: ManageRoles },
      { path: 'hotel-create', component: ManageHotels },
      { path: 'hotel-edit', component: ManageHotel },
      { path: 'hotel-plans', component: ManagePlans },
      { path: 'hotel-addons', component: ManageAddons },
      { path: 'settings', component: ManageSettings },
      { path: 'ota', component: ManageOTA }
    ],
    meta: { requiresAuth: true },
  },
  {path: '/crm',
    component: ClientHomePage,
    children: [
      { path: 'dashboard', component: ClientDashboard },
      { path: 'clients/all', component: ClientList },
      { path: 'clients/duplicates', component: ClientDuplicates },
      { path: 'clients/edit/:clientId', name: 'ClientEdit', component: ClientEdit, props: true },
      { path: 'sales/interactions', component: SalesInteractions },
    ],
    meta: { requiresAuth: true },
  },
  // Work in Progress
  {
    path: "/wip",
    name: "WorkInProgress",
    component: WorkInProgress
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
      });

      if (!response.ok) {
        const data = await response.json();

        // Specific handling for insufficient permissions
        if (data.error && data.error.includes('Insufficient permissions')) {
          next({ name: 'MainPage' });
          return false;          
        }

        // Other errors
        localStorage.removeItem('authToken');        
        next({ name: 'Login' });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Authentication verification failed:', error);
      localStorage.removeItem('authToken');
      next({ name: 'Login' });
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
