module.exports = {
  init: function (deps) {
    Object.assign(this, deps);
  },

  /**
 * Основной обработчик callback-запросов от администратора
 * Делегирует выполнение соответствующим методам в зависимости от данных callback
 * 
 * @param {Object} query - Объект callback query от Telegram
 * @param {string} query.data - Данные callback
 * @param {Object} query.message - Сообщение, к которому привязан callback
 * @param {number} query.message.chat.id - ID чата
 * @param {number} query.message.message_id - ID сообщения
 * @param {string} query.id - ID callback запроса
 * @returns {Promise<void>}
 */
  handle: async function (query) {
    const chatId = query.message.chat.id;
    const voting = this.votingManager.load();
    const meeting = this.meetingManager.getCurrent();

    try {
      await this.bot.answerCallbackQuery(query.id, { text: 'Обработка...', show_alert: false });

      const adminHandlers = {
        admin_rate_movie: async () => this.handleRateMovie(query, voting, meeting),
        admin_finish_rating: async () => this.handleFinishRating(query, voting, meeting),
        admin_clear_votes: async () => this.handleClearVotes(query, voting),
        admin_save_to_history: async () => this.handleSaveToHistory(query, voting),
        admin_add_next_movie: async () => this.handleAddNextMovie(query),
        admin_broadcast_news: async () => this.handleBroadcastNews(query)
      };

      if (query.data.startsWith('admin_rate_') && query.data !== 'admin_rate_movie') {
        await this.handleRatingInput(query, voting);
      } else if (adminHandlers[query.data]) {
        await adminHandlers[query.data]();
      }
    } catch (error) {
      this.logger.error(error, `admin callback ${query.data} from ${chatId}`);
      await this.bot.answerCallbackQuery(query.id, {
        text: 'Ошибка обработки запроса',
        show_alert: false
      });
    }
  },

  /**
 * Обрабатывает начало процесса выставления оценок фильму
 * Инициализирует данные голосования если необходимо и показывает клавиатуру оценок
 * 
 * @param {Object} query - Объект callback query
 * @param {Object} voting - Данные голосования
 * @param {Object} meeting - Данные о текущей встрече
 * @returns {Promise<void>}
 */
  handleRateMovie: async function (query, voting, meeting) {
    const chatId = query.message.chat.id;

    if (!voting.film) {
      Object.assign(voting, {
        film: meeting.film,
        director: meeting.director,
        genre: meeting.genre,
        year: meeting.year,
        poster: meeting.poster,
        discussionNumber: meeting.discussionNumber,
        date: meeting.date,
        description: meeting.description,
        country: meeting.country
      });
      this.votingManager.save(voting);
    }

    let message = 'Выберите оценку для текущего фильма:';
    if (voting.average) {
      message += `\n\nТекущий средний рейтинг: ${voting.average.toFixed(1)}/10`;
      message += `\nКоличество оценок: ${Object.keys(voting.ratings).length}`;
    }

    await this.bot.editMessageText(message, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: this.menuCreator.createRatingKeyboard().reply_markup
    });
  },

  /**
 * Завершает процесс ввода оценок и показывает итоговую информацию о фильме
 * 
 * @param {Object} query - Объект callback query
 * @param {Object} voting - Данные голосования
 * @param {Object} meeting - Данные о текущей встрече
 * @returns {Promise<void>}
 */
  handleFinishRating: async function (query, voting, meeting) {
    const chatId = query.message.chat.id;

    if (Object.keys(voting.ratings).length === 0) {
      await this.bot.answerCallbackQuery(query.id, { text: 'Вы не поставили ни одной оценки!' });
      return;
    }

    await this.bot.editMessageText(
      `✅ Ввод оценок завершен!\n\n${this.formatter.formatMovieInfo(meeting, voting)}`,
      {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '⭐ Продолжить ввод оценок', callback_data: 'admin_rate_movie' }],
            [{ text: '🔙 Назад в админ-панель', callback_data: 'back_to_main' }]
          ]
        }
      }
    );
  },

  /**
 * Очищает все результаты голосования и сбрасывает рейтинг
 * 
 * @param {Object} query - Объект callback query
 * @param {Object} voting - Данные голосования
 * @returns {Promise<void>}
 */
  handleClearVotes: async function (query, voting) {
    const chatId = query.message.chat.id;

    voting.ratings = {};
    voting.average = null;
    this.votingManager.save(voting);

    await this.bot.answerCallbackQuery(query.id, { text: 'Результаты очищены!' });
    await this.bot.editMessageText('🧹 Все результаты голосования очищены.', {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: this.menuCreator.createAdminPanel().reply_markup
    });
  },

  /**
 * Сохраняет результаты голосования в историю, GitHub и Google Sheets
 * Сбрасывает данные голосования и встречи после успешного сохранения
 * 
 * @param {Object} query - Объект callback query
 * @param {Object} voting - Данные голосования
 * @returns {Promise<void>}
 */
  handleSaveToHistory: async function (query, voting) {
    const chatId = query.message.chat.id;

    if (!voting.average || !voting.film) {
      await this.bot.answerCallbackQuery(query.id, { text: 'Нет данных для сохранения' });
      return;
    }

    const historyEntry = {
      film: voting.film,
      director: voting.director,
      genre: voting.genre,
      country: voting.country,
      year: voting.year,
      description: voting.description || '',
      average: voting.average,
      participants: Object.keys(voting.ratings).length,
      date: voting.date || new Date().toLocaleDateString('ru-RU'),
      poster: voting.poster,
      discussionNumber: voting.discussionNumber
    };

    await this.bot.answerCallbackQuery(query.id, { text: 'Сохранение в GitHub и Google Sheets...' });

    try {
      // Используем новую функцию для сохранения в оба места
      await this.coreFunctions.saveToGitHubAndSheets(historyEntry);

      // Сбрасываем голосование ТОЛЬКО после успешного сохранения
      this.votingManager.save({
        ratings: {},
        average: null,
        film: null,
        director: null,
        genre: null,
        country: null,
        year: null,
        poster: null,
        discussionNumber: null,
        date: null,
        description: null
      });

      this.meetingManager.save(this.DEFAULT_MEETING);

      await this.bot.editMessageText('✅ Результаты сохранены в историю, GitHub и Google Sheets!', {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: this.menuCreator.createAdminPanel().reply_markup
      });
    } catch (error) {
      this.logger.error(error, 'сохранение в GitHub и Google Таблицы');
      await this.bot.sendMessage(
        chatId,
        '❌ Произошла ошибка при сохранении в GitHub/Google Sheets. Данные не сохранены.'
      );
    }
  },

  /**
 * Запрашивает у администратора информацию о следующем фильме
 * Обрабатывает ввод в формате "Дата|Время|Место|Название|Режиссер|Жанр|Страна|Год|Постер URL|Номер обсуждения|Описание"
 * Сохраняет данные локально и синхронизирует с GitHub
 * 
 * @param {Object} query - Объект callback query
 * @returns {Promise<void>}
 */
  handleAddNextMovie: async function (query) {
    const chatId = query.message.chat.id;

    await this.bot.answerCallbackQuery(query.id);
    await this.bot.editMessageText('Введите информацию о следующем фильме в формате:\n\n' +
      '<b>Дата|Время|Место|Название|Режиссер|Жанр|Страна|Год|Постер URL|Номер обсуждения|Описание</b>\n\n', {
      chat_id: chatId,
      message_id: query.message.message_id,
      parse_mode: 'HTML'
    });

    const messageId = query.message.message_id;
    const responseListener = async (msg) => {
      if (msg.from.id.toString() === chatId.toString()) {
        this.bot.removeListener('message', responseListener);

        try {
          await this.bot.deleteMessage(chatId, messageId);
        } catch (error) {
          this.logger.error(error, 'удаление сообщения');
        }

        const parts = msg.text.split('|').map(part => part.trim());
        if (parts.length === 11) {
          const nextMeeting = {
            date: parts[0],
            time: parts[1],
            place: parts[2],
            film: parts[3],
            director: parts[4],
            genre: parts[5],
            country: parts[6],
            year: parts[7],
            poster: parts[8],
            discussionNumber: parts[9],
            description: parts[10],
            requirements: this.meetingManager.getCurrent().requirements
          };

          // Сохраняем локально
          this.meetingManager.save(nextMeeting);

          this.votingManager.save({
            ratings: {},
            average: null,
            film: parts[3],
            director: parts[4],
            genre: parts[5],
            country: parts[6],
            year: parts[7],
            poster: parts[8],
            discussionNumber: parts[9],
            date: parts[0],
            description: parts[10]
          });

          // Сохраняем на GitHub
          try {
            await this.githubService.updateNextMeetingOnGitHub(nextMeeting);
            await this.bot.sendMessage(chatId,
              '✅ Информация о следующем фильме сохранена локально и на GitHub!',
              this.menuCreator.createMainMenu(true)
            );
          } catch (githubError) {
            this.logger.error(githubError, 'Не удалось обновить следующую встречу на GitHub.');
            await this.bot.sendMessage(chatId,
              '✅ Информация сохранена локально, но произошла ошибка при синхронизации с GitHub: ' + githubError.message,
              this.menuCreator.createMainMenu(true)
            );
          }

          await this.coreFunctions.sendMeetingInfo(chatId);
        } else {
          await this.bot.sendMessage(chatId, '❌ Неверный формат. Попробуйте снова.', this.menuCreator.createMainMenu(true));
        }
      }
    };

    this.bot.on('message', responseListener);
  },

  /**
 * Обрабатывает ввод конкретной оценки от администратора
 * Обновляет данные голосования и показывает обновленное меню
 * 
 * @param {Object} query - Объект callback query
 * @param {Object} voting - Данные голосования
 * @returns {Promise<void>}
 */
  handleRatingInput: async function (query, voting) {
    const chatId = query.message.chat.id;
    const rating = parseInt(query.data.split('_')[2]);
    const participantId = `user_${Object.keys(voting.ratings).length + 1}`;

    voting.ratings[participantId] = rating;
    voting.average = this.votingManager.calculateAverage(voting.ratings);
    this.votingManager.save(voting);

    await this.bot.answerCallbackQuery(query.id, { text: `Оценка ${rating} сохранена!` });
    await this.showRatingMenu(chatId, query.message.message_id, voting);
  },

  /**
 * Покажает меню оценок с текущей статистикой голосования
 * 
 * @param {number|string} chatId - ID чата
 * @param {number} messageId - ID сообщения для редактирования
 * @param {Object} voting - Данные голосования
 * @returns {Promise<void>}
 */
  showRatingMenu: async function (chatId, messageId, voting) {
    try {
      const message = `✅ Оценка добавлена!\n\n` +
        `Текущий средний рейтинг: ${voting.average.toFixed(1)}/10\n` +
        `Количество оценок: ${Object.keys(voting.ratings).length}\n\n` +
        'Выберите следующую оценку или завершите ввод:';

      await this.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: this.menuCreator.createRatingKeyboard().reply_markup
      });
    } catch (error) {
      this.logger.error(error, 'показ рейтингового меню');
    }
  },

  /**
 * Запрашивает у администратора текст новости для рассылки подписчикам
 * Рассылает новость всем подписанным пользователям
 * 
 * @param {Object} query - Объект callback query
 * @returns {Promise<void>}
 */
  handleBroadcastNews: async function (query) {
    const chatId = query.message.chat.id;

    await this.bot.answerCallbackQuery(query.id, { text: 'Введите текст новости для рассылки' });
    await this.bot.editMessageText('✉️ <b>Введите текст новости:</b>\n\nФормат: просто текст или HTML-разметка', {
      chat_id: chatId,
      message_id: query.message.message_id,
      parse_mode: 'HTML'
    });

    // Ожидаем ответа от администратора
    const responseListener = async (msg) => {
      if (msg.from.id.toString() === chatId.toString()) {
        this.bot.removeListener('message', responseListener);

        try {
          await this.bot.deleteMessage(chatId, query.message.message_id);
        } catch (error) {
          this.logger.error(error, 'Не удалось удалить сообщение');
        }

        const subscriptions = this.subscriptionsManager.load();
        let sentCount = 0;

        for (const subChatId of subscriptions) {
          try {
            await this.bot.sendMessage(
              subChatId,
              `📢 <b>Новость от кино-клуба "Одиссея":</b>\n\n${msg.text}`,
              { parse_mode: 'HTML' }
            );
            sentCount++;
          } catch (error) {
            this.logger.error(error, `Ошибка отправки новости для ${subChatId}`);
          }
        }

        await this.bot.sendMessage(
          chatId,
          `✅ Новость разослана ${sentCount} подписчикам`,
          this.menuCreator.createAdminPanel()
        );
      }
    };

    this.bot.on('message', responseListener);
  }
};
