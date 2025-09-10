const fs = require('fs');
const path = require('path');
const { FILE_KEYS } = require('../config/constants');
const logger = require('./logger');

const filePaths = {
  [FILE_KEYS.LOG]: path.join(__dirname, '../logs/bot.log'),
  [FILE_KEYS.SUBSCRIPTIONS]: path.join(__dirname, '../data/subscriptions.json'),
  [FILE_KEYS.VOTING]: path.join(__dirname, '../data/voting.json'),
  [FILE_KEYS.HISTORY]: path.join(__dirname, '../data/films.json'),
  [FILE_KEYS.NEXT_MEETING]: path.join(__dirname, '../data/next_meeting.json'),
  [FILE_KEYS.FILMS]: path.join(__dirname, '../data/films.json')
};

module.exports = {
  load: (fileKey, defaultValue = {}) => {
    try {
      if (!fs.existsSync(filePaths[fileKey])) {
        this.save(fileKey, defaultValue);
        return defaultValue;
      }
      return JSON.parse(fs.readFileSync(filePaths[fileKey], 'utf8'));
    } catch (error) {
      logger.error(error, `loading ${fileKey}`);
      return defaultValue;
    }
  },

  save: (fileKey, data) => {
    try {
      const dir = path.dirname(filePaths[fileKey]);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePaths[fileKey], JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error(error, `saving ${fileKey}`);
    }
  }
};
