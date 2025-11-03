const main = require('./main');
const selectModels = require('./select');
const insertModels = require('./insert');
const updateModels = require('./update');
const deleteModels = require('./delete');
const roomsModels = require('./rooms');
const splitModels = require('./split');

module.exports = {
  ...main,
  ...selectModels,
  ...insertModels,
  ...updateModels,
  ...deleteModels,
  ...roomsModels,
  ...splitModels,
};
