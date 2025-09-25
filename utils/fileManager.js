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
  /**
 * Загружает данные из JSON-файла по указанному ключу
 * Если файл не существует, создает его с значением по умолчанию
 * 
 * @param {string} fileKey - Ключ файла из FILE_KEYS (LOG, SUBSCRIPTIONS, VOTING, etc.)
 * @param {*} [defaultValue={}] - Значение по умолчанию, если файл не существует или произошла ошибка
 * @returns {*} - Данные из файла или значение по умолчанию
 * @throws {Error} - Логирует ошибку, но не прерывает выполнение
 */
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

  /**
 * Сохраняет данные в JSON-файл по указанному ключу
 * Автоматически создает директории, если они не существуют
 * 
 * @param {string} fileKey - Ключ файла из FILE_KEYS (LOG, SUBSCRIPTIONS, VOTING, etc.)
 * @param {*} data - Данные для сохранения (будут преобразованы в JSON)
 * @returns {void}
 * @throws {Error} - Логирует ошибку, но не прерывает выполнение
 */
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
