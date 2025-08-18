const fs = require('fs');
const path = require('path');
const { FILE_KEYS } = require('../config/constants');

const logFilePath = path.join(__dirname, '../logs/bot.log');

const logger = {
  log: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(logFilePath, logMessage);
    console.log(logMessage);
  },
  
  error: (error, context = '') => {
    const message = `ERROR${context ? ` in ${context}` : ''}: ${error.message || error}`;
    logger.log(message);
  }
};

module.exports = logger;