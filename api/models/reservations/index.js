const main = require('./main');
const selectModels = require('./select');
const insertModels = require('./insert');
const updateModels = require('./update');
const deleteModels = require('./delete');
const roomsModels = require('./rooms');

module.exports = {
  ...main,
  ...selectModels,
  ...insertModels,
  ...updateModels,
  ...deleteModels,
  ...roomsModels,
};
