const fs = require('fs');
const path = require('path');
const { FILE_KEYS } = require('../config/constants');

const logFilePath = path.join(__dirname, '../logs/bot.log');

const logger = {
  /**
 * Логирует сообщение в файл и выводит в консоль
 * 
 * @param {string} message - Сообщение для логирования
 * @returns {void}
 */
  log: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(logFilePath, logMessage);
    console.log(logMessage);
  },

  /**
 * Логирует ошибку в файл и выводит в консоль
 * Автоматически добавляет контекст и форматирование для ошибок
 * 
 * @param {Error|string} error - Объект ошибки или строка с сообщением об ошибке
 * @param {string} [context=''] - Контекст, в котором произошла ошибка (опционально)
 * @returns {void}
 */
  error: (error, context = '') => {
    const message = `ERROR${context ? ` in ${context}` : ''}: ${error.message || error}`;
    logger.log(message);
  }
};

module.exports = logger;
