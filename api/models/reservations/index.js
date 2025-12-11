const main = require('./main');
const selectModels = require('./select');
const insertModels = require('./insert');
const updateModels = require('./update');
const deleteModels = require('./delete');
const detailsModels = require('./details');
const roomsModels = require('./rooms');
const splitModels = require('./split');
const addonsModels = require('./addons');
const clientsModels = require('./clients');
const ratesModels = require('./rates');
const parkingModels = require('./parking');
const otaModels = require('./ota');

module.exports = {
  ...main,
  ...selectModels,
  ...insertModels,
  ...updateModels,
  ...deleteModels,
  ...detailsModels,
  ...roomsModels,
  ...splitModels,
  ...addonsModels,
  ...clientsModels,
  ...ratesModels,
  ...parkingModels,
  ...otaModels,
};
