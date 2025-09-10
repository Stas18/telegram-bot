const { google } = require('googleapis');

module.exports = {
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
      this.logger.error(error, 'uploadHistoryToGoogleSheets');
      throw error;
    }
  },

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
      this.logger.error(error, 'saving to GitHub and Sheets');
      throw error;
    }
  },

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
      this.logger.error(error, `sending meeting info to ${chatId}`);
      try {
        await this.bot.sendAnimation(chatId, this.ANIMATION_URLS.ERROR, {
          caption: 'Ой, что-то пошло не так! Попробуйте позже.'
        });
      } catch (e) {
        this.logger.error(e, 'sending error animation');
      }
    }
  },

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
      console.error('Error in showSubscriptionMenu:', error);
      if (this.logger) {
        this.logger.error(error, 'showing subscription menu');
      }
      await this.bot.sendMessage(
        chatId,
        'Произошла ошибка при загрузке информации о подписке.'
      );
    }
  },

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
          this.logger.error(error, `sending history item ${film}`);
          await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
        }
      }

      await this.bot.sendMessage(
        chatId,
        `Результат оценки предыдущего фильма.`,
        this.menuCreator.createMainMenu(isAdmin)
      );
    } catch (error) {
      this.logger.error(error, 'showing history');
      await this.bot.sendMessage(chatId, 'Произошла ошибка при загрузке истории оценок.');
    }
  }
};
