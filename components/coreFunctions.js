const { google } = require('googleapis');

module.exports = {
  init: function(deps) {
    // Явно присваиваем все зависимости
    this.bot = deps.bot;
    this.logger = deps.logger;
    this.fileManager = deps.fileManager;
    this.subscriptionsManager = deps.subscriptionsManager;
    this.votingManager = deps.votingManager;
    this.historyManager = deps.historyManager;
    this.meetingManager = deps.meetingManager;
    this.formatter = deps.formatter;
    this.menuCreator = deps.menuCreator;
    this.ADMIN_IDS = deps.ADMIN_IDS;
    this.DEFAULT_MEETING = deps.DEFAULT_MEETING;
    this.ANIMATION_URLS = deps.ANIMATION_URLS;
    this.SPREADSHEET_ID = deps.SPREADSHEET_ID;
    this.SHEET_NAME = deps.SHEET_NAME;
    this.CREDENTIALS_PATH = deps.CREDENTIALS_PATH;
  },

uploadHistoryToGoogleSheets: async function() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: this.CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const history = this.historyManager.load();

    if (history.length === 0) {
      this.logger.log('История пуста, нечего загружать в Google Sheets');
      return;
    }

    const lastEntry = history[history.length - 1];
    
    const values = [
      [
        lastEntry.film,
        lastEntry.director,
        lastEntry.genre,
        lastEntry.country,
        lastEntry.year,
        lastEntry.average?.toFixed(1) || 'N/A',
        lastEntry.discussionNumber,
        lastEntry.date,
        lastEntry.poster,
        lastEntry.description || 'Нет описания',
        lastEntry.participants || 0
      ]
    ];

    // Check if headers exist
    try {
      await sheets.spreadsheets.values.get({
        spreadsheetId: this.SPREADSHEET_ID,
        range: `${this.SHEET_NAME}!A1:K1`,
      });
    } catch (error) {
      // If headers don't exist, create them
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

    // Append new data
    await sheets.spreadsheets.values.append({
      spreadsheetId: this.SPREADSHEET_ID,
      range: `${this.SHEET_NAME}!A2:K`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
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

  sendMeetingInfo: async function(chatId) {
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

  showSubscriptionMenu: async function(chatId) {
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

  showHistory: async function(chatId) {
    try {
      const history = this.historyManager.load();
      const isAdmin = this.ADMIN_IDS.includes(chatId.toString());

      if (!history || history.length === 0) {
        return await this.bot.sendMessage(
          chatId,
          'История оценок пока пуста.',
          this.menuCreator.createMainMenu(isAdmin)
        );
      }

      const recentHistory = history.slice(0, 5);

      for (const item of recentHistory) {
        const message = `📜 <b>История оценок:</b>\n\n` +
          `🎥 <b>${this.formatter.escapeHtml(item.film)}</b>\n` +
          `📝 <b>Описание:</b> ${item.description || 'Описание отсутствует'}\n` +
          `🎭 <b>Жанр:</b> ${item.genre || 'не указан'}\n` +
          `🌎 <b>Страна:</b> ${item.country || 'не указана'}\n` +
          `📅 <b>Год:</b> ${item.year || 'не указан'}\n` +
          `🎬 <b>Режиссер:</b> ${item.director || 'не указан'}\n` +
          `🔢 <b>Номер обсуждения:</b> ${item.discussionNumber}\n` +
          `🗓 <b>Дата:</b> ${item.date}\n` +
          `⭐ <b>Средняя оценка:</b> ${item.average?.toFixed(1) || 'N/A'}/10\n` +
          `👥 <b>Участников:</b> ${item.participants || 0}`;

        try {
          if (item.poster) {
            await this.bot.sendPhoto(chatId, item.poster, {
              caption: message,
              parse_mode: 'HTML'
            });
          } else {
            await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
          }
        } catch (error) {
          this.logger.error(error, `sending history item ${item.film}`);
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