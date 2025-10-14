const https = require("https");
const logger = require("../utils/logger");

module.exports = {
  init: function (deps) {
    this.logger = deps.logger;
    this.GITHUB_TOKEN = deps.GITHUB_TOKEN;
    this.lastSha = null;
  },

  /**
   * Универсальный метод для обновления файлов на GitHub с улучшенной обработкой ошибок
   */
  updateFileOnGitHub: async function (filePath, content, commitMessage) {
    const MAX_RETRIES = 2; // Уменьшено количество попыток
    const RETRY_DELAY = 1000;

    // Проверяем наличие токена
    if (!this.GITHUB_TOKEN || this.GITHUB_TOKEN === "undefined") {
      throw new Error("GitHub token не настроен. Проверьте переменную окружения GITHUB_TOKEN.");
    }

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Получаем текущий SHA файла
        const sha = await this.getFileSha(filePath);

        // Кодирование контента для JSON файлов
        const contentString = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
        const encodedContent = Buffer.from(contentString).toString("base64");

        const postData = JSON.stringify({
          message: commitMessage,
          content: encodedContent,
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
                const errorData = JSON.parse(data);
                reject(new Error(`GitHub API error: ${res.statusCode} - ${errorData.message}`));
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
          // Более информативное сообщение об ошибке
          let errorMessage = `Не удалось обновить файл после ${MAX_RETRIES} попыток: ${error.message}`;

          if (error.message.includes('401')) {
            errorMessage += '\nПроверьте правильность GitHub токена в переменной окружения GITHUB_TOKEN';
          } else if (error.message.includes('404')) {
            errorMessage += '\nФайл или репозиторий не найден. Проверьте путь и права доступа.';
          } else if (error.message.includes('403')) {
            errorMessage += '\nДоступ запрещен. Проверьте права токена GitHub.';
          }

          throw new Error(errorMessage);
        }

        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      }
    }
  },

  /**
 * Проверяет подключение к GitHub API
 */
  testGitHubConnection: async function () {
    try {
      if (!this.GITHUB_TOKEN || this.GITHUB_TOKEN === "undefined") {
        return {
          success: false,
          error: "GitHub token не настроен"
        };
      }

      // Пробуем получить информацию о репозитории
      const result = await this.getFileSha('assets/data/next-meeting.json');

      return {
        success: true,
        message: "Подключение к GitHub успешно"
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
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
   * Обновляет next-meeting.json на GitHub с улучшенной обработкой ошибок
   */
  updateNextMeetingOnGitHub: async function (nextMeetingData) {
    // Нормализуем данные и устанавливаем значения по умолчанию
    const formattedData = {
      date: nextMeetingData.date || 'Дата встречи не указана',
      time: nextMeetingData.time || 'Время не указано',
      place: nextMeetingData.place || 'Онлайн (https://telemost.yandex.ru/)',
      film: nextMeetingData.film || 'Фильм ещё не выбран',
      director: nextMeetingData.director || 'Режиссёр не указан',
      genre: nextMeetingData.genre || 'Жанр уточняется',
      country: nextMeetingData.country || 'Страна производства не указана',
      year: nextMeetingData.year || 'Год выхода неизвестен',
      poster: nextMeetingData.poster || 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3bXk0dDYwamltMmg4aGNsZGo1NDkwN3FmdnI5a3RjaGZ1aG54bHl2MyZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/YAlhwn67KT76E/giphy.gif',
      discussionNumber: nextMeetingData.discussionNumber || 'Следующий номер после последнего в истории',
      cast: nextMeetingData.cast || 'Актерский состав не указан',
      requirements: nextMeetingData.requirements || "Рекомендуем посмотреть фильм заранее"
    };

    try {
      const result = await this.updateFileOnGitHub(
        "assets/data/next-meeting.json",
        formattedData,
        `Bot: обновить информацию о следующей встрече - ${formattedData.film}`
      );

      this.logger.log(`✅ next-meeting.json успешно обновлен на GitHub: ${formattedData.film}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Ошибка обновления next-meeting.json на GitHub: ${error.message}`);
      throw error;
    }
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
