const usersModel = require('../../models/user');

const getAllUsers = async (req, res) => {
    const logger = req.app.locals.logger;
    const isProduction = process.env.NODE_ENV === 'production';
    try {
        const users = await usersModel.selectAllUsers(req.requestId);
        if (!users || users.length === 0) { // Check for empty array too
            logger.info('No users found.', { requestId: req.requestId });
            return res.status(404).json({ error: isProduction ? 'Data not found.' : 'Users not found' });
        }
        res.json(users);
    } catch (err) {
        const specificError = 'Internal server error while fetching users.';
        logger.error(specificError, { error: err.message, stack: err.stack, requestId: req.requestId });
        res.status(500).json({ error: isProduction ? 'An error occurred. Please try again later.' : specificError });
    }
};

const getUser = async (req, res) => {
    const logger = req.app.locals.logger;
    const isProduction = process.env.NODE_ENV === 'production';
    const user_id = req.user.id;
    try {
        const user = await usersModel.selectUserByID(req.requestId, user_id);
        if (!user) {
            logger.info('User not found by ID for current user.', { userId: user_id, requestId: req.requestId });
            return res.status(404).json({ error: isProduction ? 'User information not found.' : 'User not found' });
        }
        res.json(user);
    } catch (error) {
        const specificError = `Error getting user by ID: ${error.message}`;
        logger.error(specificError, { userId: user_id, error: error.message, stack: error.stack, requestId: req.requestId });
        res.status(500).json({ error: isProduction ? 'An error occurred. Please try again later.' : specificError });
    }
};

const getUserById = async (req, res) => {
    const logger = req.app.locals.logger;
    const isProduction = process.env.NODE_ENV === 'production';
    const { id } = req.params; // Get ID from URL parameters

    try {
        const user = await usersModel.selectUserByID(req.requestId, id);
        if (!user || user.length === 0) {
            logger.info(`User not found by ID: ${id}.`, { requestId: req.requestId });
            return res.status(404).json({ error: isProduction ? 'User not found.' : 'User not found' });
        }
        res.json({ user: user[0] }); // Return the first user found
    } catch (error) {
        const specificError = `Error getting user by ID: ${error.message}`;
        logger.error(specificError, { userId: id, error: error.message, stack: error.stack, requestId: req.requestId });
        res.status(500).json({ error: isProduction ? 'An error occurred. Please try again later.' : specificError });
    }
};

module.exports = {
    getAllUsers,
    getUser,
    getUserById
};
