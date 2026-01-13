const settings = require('./settings');
const exportCtrl = require('./export');

const dashboard = require('./dashboard');

module.exports = {
    ...settings,
    ...exportCtrl,
    ...dashboard
};
