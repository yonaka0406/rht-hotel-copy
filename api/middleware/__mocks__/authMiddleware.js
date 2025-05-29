const authMiddleware = (req, res, next) => {
    req.user = { id: 'mockUserId', role: 'user' }; 
    next();
};

const authMiddlewareAdmin = (req, res, next) => {
    req.user = { id: 'mockAdminUserId', role: 'admin', permissions: { manage_users: true, manage_db: true } }; // Added permissions for admin
    next();
};

const authMiddlewareSuperAdmin = (req, res, next) => {
    req.user = { id: 'mockSuperAdminUserId', role: 'superadmin', permissions: { manage_users: true, manage_db: true } }; // Added permissions
    next();
};

const authMiddleware_manageUsers = (req, res, next) => {
    req.user = { id: 'mockManageUsersId', role: 'admin', permissions: { manage_users: true } }; // Ensure mock user has necessary permission
    next();
};

const authMiddleware_manageDB = (req, res, next) => {
    req.user = { id: 'mockManageDbId', role: 'admin', permissions: { manage_db: true } };
    next();
};

const authMiddleware_manageClients = (req, res, next) => {
    req.user = { id: 'mockManageClientsId', role: 'user', permissions: { manage_clients: true } };
    next();
};

const authMiddlewareCRUDAccess = (req, res, next) => {
    req.user = { id: 'mockCrudAccessId', role: 'user', permissions: { crud_ok: true } };
    next();
};


module.exports = {
    authMiddleware,
    authMiddlewareAdmin,
    authMiddlewareSuperAdmin,
    authMiddleware_manageUsers, // Added this export
    authMiddleware_manageDB,
    authMiddleware_manageClients,
    authMiddlewareCRUDAccess
};
