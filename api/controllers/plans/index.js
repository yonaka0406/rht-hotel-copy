const mainController = require('./main');
const categoriesController = require('./categories');
const patternController = require('./pattern');
const copyController = require('./copy');
const globalController = require('./global');

module.exports = {
  ...mainController,
  ...categoriesController,
  ...patternController,
  ...copyController,
  ...globalController,
};