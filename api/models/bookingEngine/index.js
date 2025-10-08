const readOperations = require('./read');
const writeOperations = require('./write');

module.exports = {
  ...readOperations,
  ...writeOperations,
};
