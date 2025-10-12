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
   * @param {string} historyEntry.cast - В главных ролях (английский ключ)
   * @param {string} historyEntry ['В главных ролях'] - В главных ролях (русский ключ)
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

      // Используем русские названия полей из normalizedEntry
      const values = [
        [
          historyEntry['Фильм'] || historyEntry.film,
          historyEntry['Режиссер'] || historyEntry.director,
          historyEntry['Жанр'] || historyEntry.genre,
          historyEntry['Страна'] || historyEntry.country,
          historyEntry['Год'] || historyEntry.year,
          historyEntry['Оценка'] || historyEntry.average?.toFixed(1) || 'N/A',
          historyEntry['Номер обсуждения'] || historyEntry.discussionNumber,
          historyEntry['Дата'] || historyEntry.date,
          historyEntry['Постер URL'] || historyEntry.poster,
          historyEntry['В главных ролях'] || historyEntry.cast || ' ',
          historyEntry['Участников'] || historyEntry.participants || 0
        ]
      ];

      // Проверяем существование листа и заголовков
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.SPREADSHEET_ID,
          range: `${this.SHEET_NAME}!A1:K1`,
        });

        // Если нет данных, добавляем заголовки
        if (!response.data.values || response.data.values.length === 0) {
          await sheets.spreadsheets.values.update({
            spreadsheetId: this.SPREADSHEET_ID,
            range: `${this.SHEET_NAME}!A1:K1`,
            valueInputOption: 'RAW',
            resource: {
              values: [[
                'Фильм', 'Режиссер', 'Жанр', 'Страна', 'Год', 'Оценка',
                'Номер обсуждения', 'Дата', 'Постер URL', 'В главных ролях', 'Участников'
              ]],
            },
          });
        }
      } catch (error) {
        // Если лист не существует, создаем его с заголовками
        if (error.code === 400) {
          await sheets.spreadsheets.values.update({
            spreadsheetId: this.SPREADSHEET_ID,
            range: `${this.SHEET_NAME}!A1:K1`,
            valueInputOption: 'RAW',
            resource: {
              values: [[
                'Фильм', 'Режиссер', 'Жанр', 'Страна', 'Год', 'Оценка',
                'Номер обсуждения', 'Дата', 'Постер URL', 'В главных ролях', 'Участников'
              ]],
            },
          });
        } else {
          throw error;
        }
      }

      // Добавляем новую запись
      const appendResponse = await sheets.spreadsheets.values.append({
        spreadsheetId: this.SPREADSHEET_ID,
        range: `${this.SHEET_NAME}!A:K`,
        valueInputOption: 'RAW',
        resource: {
          values: values,
        },
      });

      this.logger.log('✅ История успешно загружена в Google Sheets!');
      this.logger.log(`Добавлена запись: ${historyEntry['Фильм'] || historyEntry.film}`);
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
   * @param {string} historyEntry.cast - В главных ролях
   * @param {number} historyEntry.participants - Количество участников
   * @returns {Promise<boolean>} - true если сохранение успешно
   * @throws {Error} - В случае ошибки сохранения
   */
  saveToGitHubAndSheets: async function (historyEntry) {
    try {
      this.logger.log('Начало сохранения истории...');
      this.logger.log(`Входные данные: ${JSON.stringify(historyEntry, null, 2)}`);

      // 1. Нормализуем данные к единому формату
      const normalizedEntry = this.normalizeHistoryEntry(historyEntry);
      this.logger.log(`Нормализованные данные: ${JSON.stringify(normalizedEntry, null, 2)}`);

      // 2. Валидация обязательных полей
      if (!this.validateHistoryEntry(normalizedEntry)) {
        throw new Error('Не все обязательные поля заполнены');
      }

      // 3. Сохраняем в Google Sheets
      this.logger.log('Сохранение в Google Sheets...');
      await this.uploadHistoryToGoogleSheets(normalizedEntry);

      // 4. Сохраняем в films.json (добавляем в массив всех фильмов)
      this.logger.log('Сохранение в локальную историю...');
      const films = this.filmsManager.load();
      films.push(normalizedEntry);
      this.filmsManager.save(films);

      // 5. Обновляем на GitHub - отправляем ВЕСЬ массив films
      this.logger.log('Синхронизация с GitHub...');
      await this.githubService.updateFilmsOnGitHub(films);

      this.logger.log('✅ Данные успешно сохранены в Google Sheets и GitHub!');
      return true;
    } catch (error) {
      this.logger.error(error, 'сохранение в GitHub и Таблицы');
      throw error;
    }
  },

  /**
   * Нормализует запись истории к единому формату
   */
  normalizeHistoryEntry: function (entry) {
    // Приводим все ключи к русскому формату
    const source = entry;

    const normalized = {};

    // Обрабатываем каждое поле с дефолтными значениями
    const fieldDefaults = {
      'Фильм': 'Не указано',
      'Режиссер': 'Не указано',
      'Жанр': 'Не указано',
      'Страна': 'Не указано',
      'Год': 'Не указано',
      'Оценка': 'N/A',
      'Номер обсуждения': this.calculateNextDiscussionNumber(),
      'Дата': new Date().toLocaleDateString('ru-RU'),
      'Постер URL': '',
      'В главных ролях': '',
      'Участников': 0
    };

    for (const [key, defaultValue] of Object.entries(fieldDefaults)) {
      let value = source[key] ||
        source[key.toLowerCase()] ||
        this.getEnglishKeyValue(source, key) ||
        defaultValue;

      // Специальная обработка для числовых полей
      if (key === 'Оценка') {
        if (value !== 'N/A' && value !== null && value !== undefined) {
          const numValue = parseFloat(value);
          value = !isNaN(numValue) ? numValue.toFixed(1) : 'N/A';
        }
      } else if (key === 'Год') {
        const yearValue = parseInt(value);
        value = !isNaN(yearValue) ? yearValue : defaultValue;
      } else if (key === 'Участников') {
        const participantsValue = parseInt(value);
        value = !isNaN(participantsValue) ? participantsValue : 0;
      } else if (key === 'Номер обсуждения') {
        const discussionValue = parseInt(value);
        value = !isNaN(discussionValue) ? discussionValue : defaultValue;
      }

      // Если значение пустое, используем значение по умолчанию
      if (value === undefined || value === null || value === '') {
        value = defaultValue;
      }

      normalized[key] = value;
    }

    return normalized;
  },

  /**
   * Получает значение по английскому ключу
   */
  getEnglishKeyValue: function (source, russianKey) {
    const keyMap = {
      'Фильм': 'film',
      'Режиссер': 'director',
      'Жанр': 'genre',
      'Страна': 'country',
      'Год': 'year',
      'Оценка': 'average',
      'Номер обсуждения': 'discussionNumber',
      'Дата': 'date',
      'Постер URL': 'poster',
      'В главных ролях': 'cast',
      'Участников': 'participants'
    };

    const englishKey = keyMap[russianKey];
    return source[englishKey];
  },

  /**
   * Валидирует обязательные поля записи истории
   */
  validateHistoryEntry: function (entry) {
    const requiredFields = ['Фильм', 'Режиссер', 'Номер обсуждения', 'Дата'];
    return requiredFields.every(field => entry[field] && entry[field] !== 'Не указано');
  },

  /**
   * Рассчитывает следующий номер обсуждения
   */
  calculateNextDiscussionNumber: function () {
    const films = this.filmsManager.load();
    if (films.length === 0) return 1;

    // Находим максимальный номер обсуждения среди всех фильмов
    const lastNumber = Math.max(...films.map(film => {
      const num = parseInt(film['Номер обсуждения'] || film.discussionNumber || 0);
      return isNaN(num) ? 0 : num;
    }));

    return lastNumber > 0 ? lastNumber + 1 : 1;
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

      // Проверяем, есть ли реальные данные о встрече
      const hasRealMeeting = meeting.film && meeting.film !== 'Фильм ещё не выбран';

      if (!hasRealMeeting) {
        await this.bot.sendMessage(
          chatId,
          '🎬 <b>Информация о следующей встрече</b>\n\n' +
          'Следующий фильм ещё не выбран. Ожидайте анонса от организаторов! 🍿\n\n' +
          'Следите за обновлениями в наших соцсетях 👇',
          {
            parse_mode: 'HTML',
            ...this.menuCreator.createSocialsMenu()
          }
        );
        return;
      }

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
          '📜 <b>История оценок</b>\n\nПока нет оцененных фильмов. История будет появляться после обсуждений! 🎬',
          {
            parse_mode: 'HTML',
            ...this.menuCreator.createMainMenu(isAdmin)
          }
        );
      }

      for (const item of recentFilms) {
        const film = item['Фильм'] || item.film;
        const director = item['Режиссер'] || item.director;
        const genre = item['Жанр'] || item.genre;
        const country = item['Страна'] || item.country;
        const year = item['Год'] || item.year;
        const cast = item['В главных ролях'] || item.cast;
        const average = item['Оценка'] || item.average;
        const discussionNumber = item['Номер обсуждения'] || item.discussionNumber;
        const date = item['Дата'] || item.date;
        const poster = item['Постер URL'] || item.poster;
        const participants = item['Участников'] || item.participants;

        const message = `📜 <b>История оценок:</b>\n\n` +
          `🎥 <b>${this.formatter.escapeHtml(film)}</b>\n` +
          `🎭 <b>Жанр:</b> ${genre || 'не указан'}\n` +
          `🌎 <b>Страна:</b> ${country || 'не указана'}\n` +
          `📅 <b>Год:</b> ${year || 'не указан'}\n` +
          `🎬 <b>Режиссер:</b> ${director || 'не указан'}\n` +
          `👥 <b>В главных ролях:</b> ${cast || 'не указаны'}\n` +
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
