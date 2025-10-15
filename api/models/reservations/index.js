const main = require('./main');
const selectModels = require('./select');
const insertModels = require('./insert');
const updateModels = require('./update');
const deleteModels = require('./delete');

module.exports = {
  ...main,
  ...selectModels,
  ...insertModels,
  ...updateModels,
  ...deleteModels,
};
