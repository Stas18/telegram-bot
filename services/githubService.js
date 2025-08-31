const https = require('https');
const logger = require('../utils/logger');

module.exports = {
  init: function(deps) {
    this.logger = deps.logger;
    this.GITHUB_TOKEN = deps.GITHUB_TOKEN;
    this.lastSha = null;
  },

  updateFilmsOnGitHub: async function(filmsData) {
    try {
      // Проверяем, что filmsData является массивом ВСЕХ фильмов
      if (!Array.isArray(filmsData)) {
        throw new Error('filmsData должен быть массивом всех фильмов');
      }
      
      // Получаем текущий SHA
      await this.getCurrentFileSha();
      
      return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
          message: 'Update films.json from bot - added new film',
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

  getCurrentFileSha: async function() {
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
        this.logger.error(error, 'Failed to get file SHA from GitHub');
        reject(error);
      });

      req.end();
    });
  },

  handleGitHubError: function(error, context = '') {
    if (error.response) {
      this.logger.error(`GitHub API Error ${context}: ${error.response.status} - ${error.response.data}`);
    } else if (error.request) {
      this.logger.error(`GitHub Network Error ${context}: ${error.message}`);
    } else {
      this.logger.error(`GitHub Error ${context}: ${error.message}`);
    }
  },

  getNextMeetingSha: async function() {
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
      this.logger.error(error, 'Failed to get next-meeting.json SHA from GitHub');
      reject(error);
    });

    req.end();
  });
},

updateNextMeetingOnGitHub: async function(nextMeetingData) {
  try {
    // Получаем текущий SHA файла
    const sha = await this.getNextMeetingSha();
    
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        message: 'Bot: Update next meeting information',
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
        this.logger.error(error, 'GitHub request for next-meeting.json failed');
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  } catch (error) {
    this.logger.error(`GitHub update error for next-meeting: ${error.message}`);
    throw error;
  }
}
};