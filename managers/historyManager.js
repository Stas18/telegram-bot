const fileManager = require('../utils/fileManager');
const { FILE_KEYS } = require('../config/constants');

module.exports = {
  load: () => fileManager.load(FILE_KEYS.HISTORY, []),
  save: (data) => fileManager.save(FILE_KEYS.HISTORY, data)
};