const exportController = require('./export');
const profitLoss = require('./profitLoss');
const dashboard = require('./dashboard');
const settings = require('./settings');
const importController = require('./import');
const receivables = require('./receivables');
const analytics = require('./analytics');

module.exports = {
    ...exportController,
    ...profitLoss,
    ...receivables,
    ...analytics,
    ...dashboard,
    ...settings,
    ...importController
};