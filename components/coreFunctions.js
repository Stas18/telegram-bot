const { google } = require('googleapis');

module.exports = {
  /**
 * Инициализирует зависимости модуля
 * 
 * @param {deps} deps - Объект с зависимостями
 * @param {bot} deps.bot - Экземпляр Telegram бота
 * @param {logger} deps.logger - Сервис логирования
 * @param {fileManager} deps.fileManager - Менеджер файлов
 * @param {subscriptionsManager} deps.subscriptionsManager - Менеджер подписок
 * @param {votingManager} deps.votingManager - Менеджер голосований
 * @param {historyManager} deps.historyManager - Менеджер истории
 * @param {meetingManager} deps.meetingManager - Менеджер встреч
 * @param {filmsManager} deps.filmsManager - Менеджер фильмов
 * @param {githubService} deps.githubService - Сервис работы с GitHub
 * @param {formatter} deps.formatter - Сервис форматирования
 * @param {menuCreator} deps.menuCreator - Создатель меню
 * @param {Array} deps.ADMIN_IDS - Массив ID администраторов
 * @param {DEFAULT_MEETING} deps.DEFAULT_MEETING - Настройки встречи по умолчанию
 * @param {ANIMATION_URLS} deps.ANIMATION_URLS - URL анимаций
 * @param {string} deps.SPREADSHEET_ID - ID Google таблицы
 * @param {string} deps.SHEET_NAME - Название листа
 * @param {string} deps.CREDENTIALS_PATH - Путь к credentials Google
 * @param {string} deps.GITHUB_TOKEN - Токен GitHub
 */
  init: function (deps) {
    this.bot = deps.bot;
    this.logger = deps.logger;
    this.fileManager = deps.fileManager;
    this.subscriptionsManager = deps.subscriptionsManager;
    this.votingManager = deps.votingManager;
    this.historyManager = deps.historyManager;
    this.meetingManager = deps.meetingManager;
    this.filmsManager = deps.filmsManager;
    this.githubService = deps.githubService;
    this.formatter = deps.formatter;
    this.menuCreator = deps.menuCreator;
    this.ADMIN_IDS = deps.ADMIN_IDS;
    this.DEFAULT_MEETING = deps.DEFAULT_MEETING;
    this.ANIMATION_URLS = deps.ANIMATION_URLS;
    this.SPREADSHEET_ID = deps.SPREADSHEET_ID;
    this.SHEET_NAME = deps.SHEET_NAME;
    this.CREDENTIALS_PATH = deps.CREDENTIALS_PATH;
    this.GITHUB_TOKEN = deps.GITHUB_TOKEN;
  },

  /**
 * Загружает запись истории в Google Sheets
 * 
 * @param {Object} historyEntry - Объект с данными о фильме
 * @param {string} historyEntry.film - Название фильма (английский ключ)
 * @param {string} historyEntry ['Фильм'] - Название фильма (русский ключ)
 * @param {string} historyEntry.director - Режиссер (английский ключ)
 * @param {string} historyEntry ['Режиссер'] - Режиссер (русский ключ)
 * @param {string} historyEntry.genre - Жанр (английский ключ)
 * @param {string} historyEntry ['Жанр'] - Жанр (русский ключ)
 * @param {string} historyEntry.country - Страна (английский ключ)
 * @param {string} historyEntry ['Страна'] - Страна (русский ключ)
 * @param {number} historyEntry.year - Год (английский ключ)
 * @param {number} historyEntry ['Год'] - Год (русский ключ)
 * @param {number} historyEntry.average - Средняя оценка (английский ключ)
 * @param {number} historyEntry ['Оценка'] - Средняя оценка (русский ключ)
 * @param {number} historyEntry.discussionNumber - Номер обсуждения (английский ключ)
 * @param {number} historyEntry ['Номер обсуждения'] - Номер обсуждения (русский ключ)
 * @param {string} historyEntry.date - Дата (английский ключ)
 * @param {string} historyEntry ['Дата'] - Дата (русский ключ)
 * @param {string} historyEntry.poster - URL постера (английский ключ)
 * @param {string} historyEntry ['Постер URL'] - URL постера (русский ключ)
 * @param {string} historyEntry.description - Описание (английский ключ)
 * @param {string} historyEntry ['Описание'] - Описание (русский ключ)
 * @param {number} historyEntry.participants - Количество участников (английский ключ)
 * @param {number} historyEntry ['Участников'] - Количество участников (русский ключ)
 * @returns {Promise<boolean>} - true если запись успешно загружена
 * @throws {Error} - В случае ошибки загрузки
 */
  uploadHistoryToGoogleSheets: async function (historyEntry) {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: this.CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });

      // Используем русские названия полей
      const values = [
        [
          historyEntry.film || historyEntry['Фильм'],
          historyEntry.director || historyEntry['Режиссер'],
          historyEntry.genre || historyEntry['Жанр'],
          historyEntry.country || historyEntry['Страна'],
          historyEntry.year || historyEntry['Год'],
          historyEntry.average?.toFixed(1) || historyEntry['Оценка'] || 'N/A',
          historyEntry.discussionNumber || historyEntry['Номер обсуждения'],
          historyEntry.date || historyEntry['Дата'],
          historyEntry.poster || historyEntry['Постер URL'],
          historyEntry.description || historyEntry['Описание'] || ' ',
          historyEntry.participants || historyEntry['Участников'] || 0
        ]
      ];

      // Проверяем существование листа и заголовков
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.SPREADSHEET_ID,
          range: `${this.SHEET_NAME}!A1:K1`,
        });

        // Если нет данных, добавляем заголовки
        if (!response.data.values) {
          await sheets.spreadsheets.values.update({
            spreadsheetId: this.SPREADSHEET_ID,
            range: `${this.SHEET_NAME}!A1:K1`,
            valueInputOption: 'RAW',
            resource: {
              values: [[
                'Фильм', 'Режиссер', 'Жанр', 'Страна', 'Год', 'Оценка',
                'Номер обсуждения', 'Дата', 'Постер URL', 'Описание', 'Участников'
              ]],
            },
          });
        }
      } catch (error) {
        // Если лист не существует, создаем его с заголовками
        await sheets.spreadsheets.values.update({
          spreadsheetId: this.SPREADSHEET_ID,
          range: `${this.SHEET_NAME}!A1:K1`,
          valueInputOption: 'RAW',
          resource: {
            values: [[
              'Фильм', 'Режиссер', 'Жанр', 'Страна', 'Год', 'Оценка',
              'Номер обсуждения', 'Дата', 'Постер URL', 'Описание', 'Участников'
            ]],
          },
        });
      }

      // Добавляем только последнюю запись
      await sheets.spreadsheets.values.append({
        spreadsheetId: this.SPREADSHEET_ID,
        range: `${this.SHEET_NAME}!A2:K`,
        valueInputOption: 'RAW',
        resource: {
          values: values,
        },
      });

      this.logger.log('✅ История успешно загружена в Google Sheets!');
      return true;
    } catch (error) {
      this.logger.error(error, 'загрузить историю в Google Таблицы');
      throw error;
    }
  },

  /**
 * Сохраняет запись истории в GitHub и Google Sheets
 * Нормализует данные к русским ключам и сохраняет в обоих хранилищах
 * 
 * @param {Object} historyEntry - Объект с данными о фильме
 * @param {string} historyEntry.film - Название фильма
 * @param {string} historyEntry.director - Режиссер
 * @param {string} historyEntry.genre - Жанр
 * @param {string} historyEntry.country - Страна
 * @param {number} historyEntry.year - Год
 * @param {number} historyEntry.average - Средняя оценка
 * @param {number} historyEntry.discussionNumber - Номер обсуждения
 * @param {string} historyEntry.date - Дата
 * @param {string} historyEntry.poster - URL постера
 * @param {string} historyEntry.description - Описание
 * @param {number} historyEntry.participants - Количество участников
 * @returns {Promise<boolean>} - true если сохранение успешно
 * @throws {Error} - В случае ошибки сохранения
 */
  saveToGitHubAndSheets: async function (historyEntry) {
    try {
      // 1. Сохраняем в films.json (добавляем в массив всех фильмов)
      // Убедимся, что используем русские ключи
      const normalizedEntry = {
        'Фильм': historyEntry.film || historyEntry['Фильм'],
        'Режиссер': historyEntry.director || historyEntry['Режиссер'],
        'Жанр': historyEntry.genre || historyEntry['Жанр'],
        'Страна': historyEntry.country || historyEntry['Страна'],
        'Год': historyEntry.year || historyEntry['Год'],
        'Оценка': historyEntry.average?.toFixed(1) || historyEntry['Оценка'] || 'N/A',
        'Номер обсуждения': historyEntry.discussionNumber || historyEntry['Номер обсуждения'],
        'Дата': historyEntry.date || historyEntry['Дата'],
        'Постер URL': historyEntry.poster || historyEntry['Постер URL'],
        'Описание': historyEntry.description || historyEntry['Описание'] || ' ',
        'Участников': historyEntry.participants || historyEntry['Участников'] || 0
      };

      const films = this.filmsManager.add(normalizedEntry);

      // 2. Обновляем на GitHub - отправляем ВЕСЬ массив films
      await this.githubService.getCurrentFileSha();
      await this.githubService.updateFilmsOnGitHub(films);

      // 3. Сохраняем в Google Sheets только последнюю запись
      await this.uploadHistoryToGoogleSheets(normalizedEntry);

      return true;
    } catch (error) {
      this.logger.error(error, 'сохранение в GitHub и Таблицы');
      throw error;
    }
  },

  /**
 * Отправляет информацию о текущей встрече в указанный чат
 * Включает фото фильма, информацию о голосовании и меню
 * 
 * @param {number|string} chatId - ID чата для отправки сообщения
 * @returns {Promise<void>}
 */
  sendMeetingInfo: async function (chatId) {
    try {
      const meeting = this.meetingManager.getCurrent();
      const voting = this.votingManager.load();
      const isAdmin = this.ADMIN_IDS.includes(chatId.toString());

      const message = this.formatter.formatMovieInfo(meeting, voting);
      await this.bot.sendPhoto(chatId, voting.poster || meeting.poster, {
        caption: message,
        parse_mode: 'HTML',
        ...this.menuCreator.createMainMenu(isAdmin)
      });
    } catch (error) {
      this.logger.error(error, `отправка информации о встрече ${chatId}`);
      try {
        await this.bot.sendAnimation(chatId, this.ANIMATION_URLS.ERROR, {
          caption: 'Ой, что-то пошло не так! Попробуйте позже.'
        });
      } catch (e) {
        this.logger.error(e, 'отправка анимации ошибки');
      }
    }
  },

  /**
 * Показывает меню подписки на уведомления о встречах
 * Отображает текущий статус подписки и кнопки управления
 * 
 * @param {number|string} chatId - ID чата для отправки сообщения
 * @returns {Promise<void>}
 */
  showSubscriptionMenu: async function (chatId) {
    try {
      const subscriptions = this.subscriptionsManager.load();
      const isSubscribed = subscriptions.has(chatId.toString());

      await this.bot.sendMessage(
        chatId,
        isSubscribed
          ? 'Ты подписан на рассылку о встречах клуба! 🎉'
          : 'Ты не подписан на уведомления о встречах 😔',
        this.menuCreator.createSubscriptionMenu(isSubscribed)
      );
    } catch (error) {
      console.error('Ошибка в showSubscriptionMenu:', error);
      if (this.logger) {
        this.logger.error(error, 'показ меню подписки');
      }
      await this.bot.sendMessage(
        chatId,
        'Произошла ошибка при загрузке информации о подписке.'
      );
    }
  },

  /**
 * Отображает историю оценок фильмов (последние 2 записи)
 * Для каждого фильма показывает подробную информацию с постером
 * 
 * @param {number|string} chatId - ID чата для отправки сообщения
 * @returns {Promise<void>}
 */
  showHistory: async function (chatId) {
    try {
      // Получаем последние 2 фильма из общего массива
      const recentFilms = this.filmsManager.getRecent(2);
      const isAdmin = this.ADMIN_IDS.includes(chatId.toString());

      if (!recentFilms || recentFilms.length === 0) {
        return await this.bot.sendMessage(
          chatId,
          'История оценок пока пуста.',
          this.menuCreator.createMainMenu(isAdmin)
        );
      }

      for (const item of recentFilms) {
        const film = item['Фильм'] || item.film;
        const director = item['Режиссер'] || item.director;
        const genre = item['Жанр'] || item.genre;
        const country = item['Страна'] || item.country;
        const year = item['Год'] || item.year;
        const description = item['Описание'] || item.description;
        const average = item['Оценка'] || item.average;
        const discussionNumber = item['Номер обсуждения'] || item.discussionNumber;
        const date = item['Дата'] || item.date;
        const poster = item['Постер URL'] || item.poster;
        const participants = item['Участников'] || item.participants;

        const message = `📜 <b>История оценок:</b>\n\n` +
          `🎥 <b>${this.formatter.escapeHtml(film)}</b>\n` +
          `📝 <b>Описание:</b> ${description || ' '}\n` +
          `🎭 <b>Жанр:</b> ${genre || 'не указан'}\n` +
          `🌎 <b>Страна:</b> ${country || 'не указана'}\n` +
          `📅 <b>Год:</b> ${year || 'не указан'}\n` +
          `🎬 <b>Режиссер:</b> ${director || 'не указан'}\n` +
          `🔢 <b>Номер обсуждения:</b> ${discussionNumber}\n` +
          `🗓 <b>Дата:</b> ${date}\n` +
          `⭐ <b>Средняя оценка:</b> ${average || 'N/A'}/10\n` +
          `👥 <b>Участников:</b> ${participants || 0}`;

        try {
          if (poster) {
            await this.bot.sendPhoto(chatId, poster, {
              caption: message,
              parse_mode: 'HTML'
            });
          } else {
            await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
          }
        } catch (error) {
          this.logger.error(error, `отправка элемента истории ${film}`);
          await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
        }
      }

      await this.bot.sendMessage(
        chatId,
        `Результат оценки предыдущих картин`,
        this.menuCreator.createMainMenu(isAdmin)
      );
    } catch (error) {
      this.logger.error(error, 'показ истории');
      await this.bot.sendMessage(chatId, 'Произошла ошибка при загрузке истории оценок.');
    }
  }
};
