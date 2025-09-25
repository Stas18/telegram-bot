const https = require('https');
const logger = require('../utils/logger');

/**
 * Менеджер для взаимодействия с GitHub API
 * Обеспечивает обновление файлов в репозитории через REST API
 * 
 * @namespace githubManager
 */
module.exports = {
  /**
   * Инициализирует менеджер с зависимостями
   * 
   * @function
   * @param {Object} deps - Зависимости
   * @param {Object} deps.logger - Логгер для записи событий
   * @param {string} deps.GITHUB_TOKEN - Токен для аутентификации в GitHub API
   * @example
   * githubManager.init({
   *   logger: console,
   *   GITHUB_TOKEN: 'ghp_...'
   * });
   */
  init: function (deps) {
    this.logger = deps.logger;
    this.GITHUB_TOKEN = deps.GITHUB_TOKEN;
    this.lastSha = null;
  },

  /**
   * Обновляет файл films.json в репозитории GitHub
   * Заменяет весь содержимое файла на переданный массив фильмов
   * 
   * @function
   * @param {Array} filmsData - Массив ВСЕХ фильмов для сохранения
   * @returns {Promise<Object>} Ответ GitHub API
   * @throws {Error} Если filmsData не массив или ошибка API
   * @example
   * await githubManager.updateFilmsOnGitHub([
   *   { title: 'Фильм 1', year: 2020 },
   *   { title: 'Фильм 2', year: 2021 }
   * ]);
   */
  updateFilmsOnGitHub: async function (filmsData) {
    try {
      // Проверяем, что filmsData является массивом ВСЕХ фильмов
      if (!Array.isArray(filmsData)) {
        throw new Error('filmsData должен быть массивом всех фильмов');
      }

      // Получаем текущий SHA
      await this.getCurrentFileSha();

      return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
          message: 'Обновление films.json от бота — добавлен новый фильм',
          content: Buffer.from(JSON.stringify(filmsData, null, 2)).toString('base64'),
          sha: this.lastSha
        });

        const options = {
          hostname: 'api.github.com',
          path: '/repos/ulysses-club/odissea/contents/assets/data/films.json',
          method: 'PUT',
          headers: {
            'Authorization': `token ${this.GITHUB_TOKEN}`,
            'User-Agent': 'Ulysses-Bot',
            'Content-Type': 'application/json',
            'Content-Length': postData.length
          }
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              this.logger.log('✅ Films.json успешно обновлен на GitHub');
              resolve(JSON.parse(data));
            } else {
              this.logger.error(`GitHub API error: ${res.statusCode} - ${data}`);
              reject(new Error(`GitHub API error: ${res.statusCode}`));
            }
          });
        });

        req.on('error', (error) => {
          this.logger.error(error, 'GitHub request failed');
          reject(error);
        });

        req.write(postData);
        req.end();
      });
    } catch (error) {
      this.logger.error(`GitHub update error: ${error.message}`);
      throw error;
    }
  },

  /**
   * Получает SHA хэш текущего файла films.json из GitHub
   * Необходим для обновления существующего файла
   * 
   * @function
   * @returns {Promise<string|null>} SHA хэш файла или null если файл не существует
   * @private
   */
  getCurrentFileSha: async function () {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: '/repos/ulysses-club/odissea/contents/assets/data/films.json',
        method: 'GET',
        headers: {
          'Authorization': `token ${this.GITHUB_TOKEN}`,
          'User-Agent': 'Ulysses-Bot',
          'Accept': 'application/vnd.github.v3+json'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode === 200) {
            const fileInfo = JSON.parse(data);
            this.lastSha = fileInfo.sha;
            resolve(fileInfo.sha);
          } else {
            this.logger.log('Films.json не найден на GitHub, создаем новый');
            resolve(null);
          }
        });
      });

      req.on('error', (error) => {
        this.logger.error(error, 'Не удалось получить SHA-файл из GitHub.');
        reject(error);
      });

      req.end();
    });
  },

  /**
   * Обрабатывает ошибки GitHub API с детализацией
   * 
   * @function
   * @param {Error} error - Объект ошибки
   * @param {string} [context=''] - Контекст для логирования
   */
  handleGitHubError: function (error, context = '') {
    if (error.response) {
      this.logger.error(`GitHub API Error ${context}: ${error.response.status} - ${error.response.data}`);
    } else if (error.request) {
      this.logger.error(`GitHub Network Error ${context}: ${error.message}`);
    } else {
      this.logger.error(`GitHub Error ${context}: ${error.message}`);
    }
  },

  /**
   * Получает SHA хэш файла next-meeting.json из GitHub
   * 
   * @function
   * @returns {Promise<string|null>} SHA хэш файла или null если файл не существует
   * @example
   * const sha = await githubManager.getNextMeetingSha();
   */
  getNextMeetingSha: async function () {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: '/repos/ulysses-club/odissea/contents/assets/data/next-meeting.json',
        method: 'GET',
        headers: {
          'Authorization': `token ${this.GITHUB_TOKEN}`,
          'User-Agent': 'Ulysses-Bot',
          'Accept': 'application/vnd.github.v3+json'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode === 200) {
            const fileInfo = JSON.parse(data);
            resolve(fileInfo.sha);
          } else {
            this.logger.log('next-meeting.json не найден на GitHub, будет создан новый');
            resolve(null);
          }
        });
      });

      req.on('error', (error) => {
        this.logger.error(error, 'Не удалось получить SHA-файл next-meeting.json из GitHub.');
        reject(error);
      });

      req.end();
    });
  },

  /**
   * Обновляет файл next-meeting.json в репозитории GitHub
   * 
   * @function
   * @param {Object} nextMeetingData - Данные о следующей встрече
   * @returns {Promise<Object>} Ответ GitHub API
   * @example
   * await githubManager.updateNextMeetingOnGitHub({
   *   date: '2024-01-15',
   *   film: 'Интерстеллар',
   *   location: 'Киноклуб'
   * });
   */
  updateNextMeetingOnGitHub: async function (nextMeetingData) {
    try {
      // Получаем текущий SHA файла
      const sha = await this.getNextMeetingSha();

      return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
          message: 'Bot: обновить информацию о следующей встрече',
          content: Buffer.from(JSON.stringify(nextMeetingData, null, 2)).toString('base64'),
          sha: sha
        });

        const options = {
          hostname: 'api.github.com',
          path: '/repos/ulysses-club/odissea/contents/assets/data/next-meeting.json',
          method: 'PUT',
          headers: {
            'Authorization': `token ${this.GITHUB_TOKEN}`,
            'User-Agent': 'Ulysses-Bot',
            'Content-Type': 'application/json',
            'Content-Length': postData.length
          }
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              this.logger.log('✅ next-meeting.json успешно обновлен на GitHub');
              resolve(JSON.parse(data));
            } else {
              this.logger.error(`GitHub API error: ${res.statusCode} - ${data}`);
              reject(new Error(`GitHub API error: ${res.statusCode}`));
            }
          });
        });

        req.on('error', (error) => {
          this.logger.error(error, 'Запрос GitHub для next-meeting.json не удался');
          reject(error);
        });

        req.write(postData);
        req.end();
      });
    } catch (error) {
      this.logger.error(`Ошибка обновления GitHub для следующей встречи: ${error.message}`);
      throw error;
    }
  }
};
