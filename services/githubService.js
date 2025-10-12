const https = require("https");
const logger = require("../utils/logger");

module.exports = {
  init: function (deps) {
    this.logger = deps.logger;
    this.GITHUB_TOKEN = deps.GITHUB_TOKEN;
    this.lastSha = null;
  },

  /**
   * Универсальный метод для обновления файлов на GitHub
   */
  updateFileOnGitHub: async function (filePath, content, commitMessage) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (!this.GITHUB_TOKEN || this.GITHUB_TOKEN === "undefined") {
          throw new Error("GitHub token не настроен");
        }

        // Получаем текущий SHA файла
        const sha = await this.getFileSha(filePath);

        // Правильное кодирование контента
        const postData = JSON.stringify({
          message: commitMessage,
          content: Buffer.from(JSON.stringify(content, null, 2)).toString("base64"),
          sha: sha || undefined,
        });

        const options = {
          hostname: "api.github.com",
          path: `/repos/ulysses-club/odissea/contents/${filePath}`,
          method: "PUT",
          headers: {
            Authorization: `Bearer ${this.GITHUB_TOKEN}`,
            "User-Agent": "Ulysses-Bot",
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(postData),
          },
          timeout: 10000,
          signal: AbortSignal.timeout(15000)
        };

        return await new Promise((resolve, reject) => {
          const req = https.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => {
              data += chunk;
            });
            res.on("end", () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                this.logger.log(`✅ ${filePath} успешно обновлен на GitHub`);
                resolve(JSON.parse(data));
              } else {
                reject(new Error(`GitHub API error: ${res.statusCode}: ${data}`));
              }
            });
          });

          req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error("Timeout exceeded"));
          });

          req.on("error", (error) => {
            reject(error);
          });

          req.write(postData);
          req.end();
        });

      } catch (error) {
        this.logger.error(`Попытка ${attempt}/${MAX_RETRIES} не удалась: ${error.message}`);

        if (attempt === MAX_RETRIES) {
          throw new Error(`Не удалось после ${MAX_RETRIES} попыток: ${error.message}`);
        }

        if (error.name === 'TimeoutError' || error.code === 'ECONNRESET') {
          this.logger.error(`Таймаут или разрыв соединения при попытке ${attempt}`);
          continue; // Продолжаем повторные попытки
        }

        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      }
    }
  },

  /**
   * Обновляет films.json на GitHub - добавляет новые фильмы к существующим
   */
  updateFilmsOnGitHub: async function (filmsData) {
    if (!Array.isArray(filmsData)) {
      throw new Error("filmsData должен быть массивом");
    }

    return await this.updateFileOnGitHub(
      "assets/data/films.json",
      filmsData,
      "Bot: обновление films.json - добавлен новый фильм"
    );
  },

  /**
   * Обновляет next-meeting.json на GitHub
   */
  updateNextMeetingOnGitHub: async function (nextMeetingData) {
    // Нормализуем данные
    const formattedData = {
      date: nextMeetingData.date || '',
      time: nextMeetingData.time || '',
      place: nextMeetingData.place || '',
      film: nextMeetingData.film || '',
      director: nextMeetingData.director || '',
      genre: nextMeetingData.genre || '',
      country: nextMeetingData.country || '',
      year: nextMeetingData.year || '',
      poster: nextMeetingData.poster || '',
      discussionNumber: nextMeetingData.discussionNumber || '',
      cast: nextMeetingData.cast || '',
      requirements: nextMeetingData.requirements || "Рекомендуем посмотреть фильм заранее"
    };

    return await this.updateFileOnGitHub(
      "assets/data/next-meeting.json",
      formattedData,
      "Bot: обновить информацию о следующей встрече"
    );
  },

  /**
   * Получает SHA хэш файла из GitHub
   */
  getFileSha: async function (filePath) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: "api.github.com",
        path: `/repos/ulysses-club/odissea/contents/${filePath}`,
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.GITHUB_TOKEN}`,
          "User-Agent": "Ulysses-Bot",
          Accept: "application/vnd.github.v3+json",
        },
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode === 200) {
            const fileInfo = JSON.parse(data);
            resolve(fileInfo.sha);
          } else if (res.statusCode === 404) {
            this.logger.log(`${filePath} не найден на GitHub, создаем новый`);
            resolve(null);
          } else {
            reject(new Error(`GitHub API error: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on("error", (error) => {
        this.logger.error(error, `Не удалось получить SHA файла ${filePath} из GitHub`);
        reject(error);
      });

      req.end();
    });
  }
};
