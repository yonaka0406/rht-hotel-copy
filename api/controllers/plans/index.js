const mainController = require('./main');
const categoriesController = require('./categories');
const patternController = require('./pattern');
const copyController = require('./copy');

module.exports = {
  ...mainController,
  ...categoriesController,
  ...patternController,
  ...copyController,
};