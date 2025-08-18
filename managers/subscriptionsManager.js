const fileManager = require('../utils/fileManager');
const { FILE_KEYS } = require('../config/constants');

module.exports = {
  load: () => new Set(fileManager.load(FILE_KEYS.SUBSCRIPTIONS, [])),
  save: (subscriptions) => fileManager.save(FILE_KEYS.SUBSCRIPTIONS, [...subscriptions])
};