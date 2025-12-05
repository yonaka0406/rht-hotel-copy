const { validationResult } = require('express-validator');
const usersModel = require('../../models/user');

const registerUser = async (req, res) => {
    const logger = req.app.locals.logger;
    const isProduction = process.env.NODE_ENV === 'production';
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const specificErrors = errors.array().map(err => ({ field: err.param, message: err.msg }));
        logger.warn('User registration validation failed', { ip: req.ip, email: req.body.email, errors: specificErrors, requestId: req.requestId });
        const clientError = isProduction ? 'Registration failed. Please check your input.' : specificErrors[0].message;
        return res.status(400).json({ error: clientError, details: isProduction ? undefined : specificErrors });
    }

    const { email, name, password, role } = req.body;
    const created_by = req.user.id; // Assuming req.user is populated by authMiddleware_manageUsers
    const updated_by = req.user.id;

    // The manual check for email, password, role, created_by is now mostly covered by express-validator.
    // `created_by` comes from `req.user.id`, so it should be reliable if middleware is correct.
    // Role might need a specific validator if it has enum values, but for now, notEmpty is good.

    try {
        const user = await usersModel.insertUser(req.requestId, email, name, password, role, created_by, updated_by);
        logger.info('User registered successfully by admin/manager', { userId: user.id, email: user.email, adminId: created_by, requestId: req.requestId });
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                email: user.email,
                role_id: user.role_id
            }
        });
    } catch (err) {
        let specificError = 'Internal server error during user registration.';
        let statusCode = 500;
        if (err.code === '23505') { // Unique constraint violation (e.g., email already exists)
            specificError = 'Email already exists.';
            statusCode = 400;
            logger.warn(specificError, { email, ip: req.ip, requestId: req.requestId });
        } else {
            logger.error(specificError, { error: err.message, stack: err.stack, email, ip: req.ip, requestId: req.requestId });
        }
        res.status(statusCode).json({ error: isProduction && statusCode === 500 ? 'Registration failed. Please try again later.' : specificError });
    }
};

const updateUser = async (req, res) => {
    const logger = req.app.locals.logger;
    const isProduction = process.env.NODE_ENV === 'production';
    const { id, name, status_id, role_id } = req.body;
    const updated_by = req.user.id;

    // Basic validation for required fields, express-validator could be added here too for more complex rules
    if (!id || status_id === undefined || role_id === undefined) { // status_id can be 0, so check for undefined
        const specificError = 'User ID, status ID, and role ID are required for update.';
        logger.warn(specificError, { body: req.body, adminId: updated_by, requestId: req.requestId });
        return res.status(400).json({ error: isProduction ? 'Update failed. Missing required fields.' : specificError });
    }

    try {
        const user = await usersModel.updateUserInfo(req.requestId, id, name, status_id, role_id, updated_by);
        if (!user) {
            const specificError = 'User not found for update.';
            logger.warn(specificError, { userIdToUpdate: id, adminId: updated_by, requestId: req.requestId });
            return res.status(404).json({ error: isProduction ? 'User not found.' : specificError });
        }

        logger.info('User updated successfully by admin/manager', { userIdUpdated: id, adminId: updated_by, requestId: req.requestId });
        res.status(200).json({ message: 'User updated successfully' });
    } catch (err) {
        const specificError = 'Internal server error during user update.';
        logger.error(specificError, { error: err.message, stack: err.stack, userIdToUpdate: id, adminId: updated_by, requestId: req.requestId });
        res.status(500).json({ error: isProduction ? 'Update failed. Please try again later.' : specificError });
    }
};

module.exports = {
    registerUser,
    updateUser
};
