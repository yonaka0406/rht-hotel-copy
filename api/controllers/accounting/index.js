const settings = require('./settings');
const exportCtrl = require('./export');
const dashboard = require('./dashboard');
const importCtrl = require('./import');

module.exports = {
    ...settings,
    ...exportCtrl,
    ...dashboard,
    ...importCtrl
};
