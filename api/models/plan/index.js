const mainQueries = require('./main');
const globalQueries = require('./global');

module.exports = {
  ...mainQueries,
  ...globalQueries,
};
