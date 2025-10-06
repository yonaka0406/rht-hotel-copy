const readQueries = require('./read');
const writeCommands = require('./write');

module.exports = {
  ...readQueries,
  ...writeCommands,
};
