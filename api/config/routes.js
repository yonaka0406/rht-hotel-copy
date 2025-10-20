const registerRoutes = (app) => {
  const routes = [
    { path: '/api', router: require('../routes/protectedRoutes') },
    { path: '/api/auth', router: require('../routes/authRoutes') },
    { path: '/api', router: require('../routes/usersRoutes') },
    { path: '/api', router: require('../routes/rolesRoutes') },
    { path: '/api', router: require('../routes/hotelsRoutes') },
    { path: '/api', router: require('../routes/addonRoutes') },
    { path: '/api', router: require('../routes/plansRoutes') },
    { path: '/api', router: require('../routes/clientsRoutes') },
    { path: '/api', router: require('../routes/crmRoutes') },
    { path: '/api', router: require('../routes/reservationsRoutes') },
    { path: '/api', router: require('../routes/reportRoutes') },
    { path: '/api', router: require('../routes/billingRoutes') },
    { path: '/api', router: require('../routes/settingsRoutes') },
    { path: '/api', router: require('../routes/importRoutes') },
    { path: '/api', router: require('../routes/logRoutes') },
    { path: '/api', router: require('../routes/metricsRoutes') },
    { path: '/api', router: require('../routes/projectRoutes') },
    { path: '/api', router: require('../ota/xmlRoutes') },
    { path: '/api', router: require('../routes/waitlistRoutes') },
    { path: '/api/search', router: require('../routes/searchRoutes') },
    { path: '/api/booking-engine', router: require('../routes/bookingEngineRoutes') },
    { path: '/api', router: require('../routes/parkingRoutes') },
    { path: '/api', router: require('../routes/guestRoutes') },
    { path: '/api', router: require('../routes/validationRoutes') },
  ];

  routes.forEach(({ path, router }) => {
    app.use(path, router);
  });
};

module.exports = { registerRoutes };