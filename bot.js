require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const nodeSchedule = require('node-schedule');

// Constants and Configuration
const ENV_CHECK = {
  BOT_TOKEN: 'BOT_TOKEN',
  ADMIN_IDS: 'ADMIN_IDS'
};

const FILE_KEYS = {
  LOG: 'log',
  SUBSCRIPTIONS: 'subscriptions',
  VOTING: 'voting',
  HISTORY: 'history',
  NEXT_MEETING: 'nextMeeting'
};

const ANIMATION_URLS = {
  WELCOME: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
  MOVIE: 'https://media.giphy.com/media/3o6Zt6ML6BklcajjsA/giphy.gif',
  SUCCESS: 'https://media.giphy.com/media/XreQmk7ETCak0/giphy.gif',
  ERROR: 'https://media.giphy.com/media/TqiwHbFBaZ4ti/giphy.gif'
};

const DEFAULT_MEETING = {
  date: 'Дата встречи не указана',
  time: 'Время не указано',
  place: 'Онлайн (https://telemost.yandex.ru/) / Кофейня "КиноМан" (ул. Пушкинская, 42)',
  film: 'Фильм ещё не выбран',
  director: 'Режиссёр не указан',
  genre: 'Жанр уточняется',
  country: 'Страна производства не указана',
  year: 'Год выхода неизвестен',
  poster: ANIMATION_URLS.MOVIE,
  discussionNumber: 'Следующий номер после последнего в истории',
  description: 'После просмотра будет обсуждение с чаем/кофе и печеньками!',
  requirements: 'Рекомендуем посмотреть фильм заранее'
};

// Validate environment variables
const validateEnvironment = () => {
  const missingVars = Object.values(ENV_CHECK).filter(key => !process.env[key]);
  if (missingVars.length > 0) {
    console.error(`ERROR: Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }
};

validateEnvironment();

// Initialize bot
const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: true,
  filepath: false,
  baseApiUrl: 'https://api.telegram.org'
});

const ADMIN_IDS = process.env.ADMIN_IDS.split(',');

// File paths
const filePaths = {
  [FILE_KEYS.LOG]: path.join(__dirname, 'bot.log'),
  [FILE_KEYS.SUBSCRIPTIONS]: path.join(__dirname, 'subscriptions.json'),
  [FILE_KEYS.VOTING]: path.join(__dirname, 'voting.json'),
  [FILE_KEYS.HISTORY]: path.join(__dirname, 'history.json'),
  [FILE_KEYS.NEXT_MEETING]: path.join(__dirname, 'next_meeting.json')
};

// Utility functions
const logger = {
  log: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(filePaths[FILE_KEYS.LOG], logMessage);
    console.log(logMessage);
  },
  error: (error, context = '') => {
    logger.log(`ERROR${context ? ` in ${context}` : ''}: ${error.message || error}`);
  }
};

const fileManager = {
  load: (fileKey, defaultValue = {}) => {
    try {
      if (!fs.existsSync(filePaths[fileKey])) {
        fileManager.save(fileKey, defaultValue);
        return defaultValue;
      }
      return JSON.parse(fs.readFileSync(filePaths[fileKey], 'utf8'));
    } catch (error) {
      logger.error(error, `loading ${fileKey}`);
      return defaultValue;
    }
  },
  save: (fileKey, data) => {
    try {
      fs.writeFileSync(filePaths[fileKey], JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error(error, `saving ${fileKey}`);
    }
  }
};

// Data managers
const subscriptionsManager = {
  load: () => new Set(fileManager.load(FILE_KEYS.SUBSCRIPTIONS, [])),
  save: (subscriptions) => fileManager.save(FILE_KEYS.SUBSCRIPTIONS, [...subscriptions])
};

const votingManager = {
  load: () => fileManager.load(FILE_KEYS.VOTING, {
    ratings: {},
    average: null,
    film: null,
    director: null,
    genre: null,
    year: null,
    poster: null,
    discussionNumber: null,
    date: null,
    description: null,
    country: null
  }),
  save: (data) => fileManager.save(FILE_KEYS.VOTING, data),
  calculateAverage: (ratings) => {
    const values = Object.values(ratings);
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
  }
};

const historyManager = {
  load: () => fileManager.load(FILE_KEYS.HISTORY, []),
  save: (data) => fileManager.save(FILE_KEYS.HISTORY, data)
};

const meetingManager = {
  load: () => fileManager.load(FILE_KEYS.NEXT_MEETING, DEFAULT_MEETING),
  save: (data) => fileManager.save(FILE_KEYS.NEXT_MEETING, data),
  getCurrent: () => meetingManager.load() || DEFAULT_MEETING
};

// Formatting functions
const formatter = {
  escapeHtml: (text) => {
    if (!text) return '';
    return text.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },
  formatMovieInfo: (meeting, voting) => {
    const filmInfo = voting.film ? { ...meeting, ...voting } : meeting;
    const ratingBlock = voting.average
      ? `│ ⭐ <b>Рейтинг:</b> ${voting.average.toFixed(1)}/10\n` +
        `│ 👥 <b>Оценок:</b> ${Object.keys(voting.ratings).length}\n` +
        `├───────────────────────\n`
      : '';

    return `
🎬 <b>${filmInfo.film.toUpperCase()}</b>

📝 <b>О фильме:</b>
├───────────────────────
│ 🎥 <b>Режиссер:</b> ${filmInfo.director}
│ 🎭 <b>Жанр:</b> ${filmInfo.genre}
│ 🌎 <b>Страна:</b> ${filmInfo.country}
│ 📅 <b>Год:</b> ${filmInfo.year}
${ratingBlock}
🗓 <b>Дата встречи:</b> ${filmInfo.date}
⏰ <b>Время:</b> ${filmInfo.time}
📍 <b>Место:</b> ${filmInfo.place}

🔢 <b>Обсуждение №${filmInfo.discussionNumber}</b>
    `.trim();
  }
};

// Menu creators
const menuCreator = {
  createMainMenu: (isAdmin) => {
    const menu = {
      reply_markup: {
        resize_keyboard: true,
        keyboard: [
          [{ text: 'ℹ️ Информация о встрече' }, { text: '📅 Моя подписка' }],
          [{ text: '🌐 Перейти на сайт', web_app: { url: 'https://ulysses-club.github.io/odissea/' } }],
          [{ text: '📜 История оценок' }]
        ]
      }
    };

    if (isAdmin) {
      menu.reply_markup.keyboard.push([{ text: '👑 Админ-панель' }]);
    }

    return menu;
  },
  createAdminPanel: () => ({
    reply_markup: {
      inline_keyboard: [
        [{ text: '⭐ Поставить оценку фильму', callback_data: 'admin_rate_movie' }],
        [{ text: '🧹 Очистить оценки', callback_data: 'admin_clear_votes' }],
        [{ text: '📨 Разослать результаты', callback_data: 'admin_send_results' }],
        [{ text: '💾 Сохранить в историю', callback_data: 'admin_save_to_history' }],
        [{ text: '🎬 Добавить следующий фильм', callback_data: 'admin_add_next_movie' }],
        [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
      ]
    }
  }),
  createSubscriptionMenu: (isSubscribed) => ({
    reply_markup: {
      inline_keyboard: [
        [{
          text: isSubscribed ? '❌ Отписаться' : '✅ Подписаться',
          callback_data: isSubscribed ? 'unsubscribe' : 'subscribe'
        }],
        [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
      ]
    }
  }),
  createRatingKeyboard: () => ({
    reply_markup: {
      inline_keyboard: [
        [{ text: '1', callback_data: 'admin_rate_1' }, { text: '2', callback_data: 'admin_rate_2' }, { text: '3', callback_data: 'admin_rate_3' }],
        [{ text: '4', callback_data: 'admin_rate_4' }, { text: '5', callback_data: 'admin_rate_5' }, { text: '6', callback_data: 'admin_rate_6' }],
        [{ text: '7', callback_data: 'admin_rate_7' }, { text: '8', callback_data: 'admin_rate_8' }, { text: '9', callback_data: 'admin_rate_9' }],
        [{ text: '10', callback_data: 'admin_rate_10' }],
        [{ text: '✅ Завершить ввод оценок', callback_data: 'admin_finish_rating' }],
        [{ text: '🔙 Назад', callback_data: 'back_to_admin' }]
      ]
    }
  })
};

// Core functions
const coreFunctions = {
  sendMeetingInfo: async (chatId) => {
    const meeting = meetingManager.getCurrent();
    const voting = votingManager.load();
    const isAdmin = ADMIN_IDS.includes(chatId.toString());

    try {
      const message = formatter.formatMovieInfo(meeting, voting);
      await bot.sendPhoto(chatId, voting.poster || meeting.poster, {
        caption: message,
        parse_mode: 'HTML',
        ...menuCreator.createMainMenu(isAdmin)
      });
    } catch (error) {
      logger.error(error, `sending meeting info to ${chatId}`);
      await bot.sendAnimation(chatId, ANIMATION_URLS.ERROR, {
        caption: 'Ой, что-то пошло не так! Попробуйте позже.'
      });
    }
  },
  showSubscriptionMenu: async (chatId) => {
    const subscriptions = subscriptionsManager.load();
    const isSubscribed = subscriptions.has(chatId.toString());

    await bot.sendMessage(
      chatId,
      isSubscribed
        ? 'Ты подписан на рассылку о встречах клуба! 🎉'
        : 'Ты не подписан на уведомления о встречах 😔',
      menuCreator.createSubscriptionMenu(isSubscribed)
    );
  },
  showHistory: async (chatId) => {
    try {
      const history = historyManager.load();
      const isAdmin = ADMIN_IDS.includes(chatId.toString());

      if (!history || history.length === 0) {
        return await bot.sendMessage(
          chatId,
          'История оценок пока пуста.',
          menuCreator.createMainMenu(isAdmin)
        );
      }

      const recentHistory = history.slice(0, 5);

      for (const item of recentHistory) {
        const message = `📜 <b>История оценок:</b>\n\n` +
          `🎥 <b>${formatter.escapeHtml(item.film)}</b>\n` +
          `📝 <b>О фильме:</b> ${item.description || 'Описание отсутствует'}\n` +
          `👥 Участников: ${item.participants}\n` +
          `⭐ Оценка: ${item.average?.toFixed(1) || 'N/A'}/10\n` +
          `🎭 Жанр: ${item.genre || 'не указан'}\n` +
          `🌎 Страна: ${item.country || 'не указана'}\n` +
          `📅 Год: ${item.year || 'не указан'}\n` +
          `🎬 Режиссер: ${item.director || 'не указан'}`;

        try {
          if (item.poster) {
            await bot.sendPhoto(chatId, item.poster, {
              caption: message,
              parse_mode: 'HTML'
            });
          } else {
            await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
          }
        } catch (error) {
          logger.error(error, `sending history item ${item.film}`);
          await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
        }
      }

      await bot.sendMessage(
        chatId,
        `Показаны последние ${recentHistory.length} оцененных фильмов.`,
        menuCreator.createMainMenu(isAdmin)
      );
    } catch (error) {
      logger.error(error, 'showing history');
      await bot.sendMessage(chatId, 'Произошла ошибка при загрузке истории оценок.');
    }
  }
};

// Command handlers
const commandHandlers = {
  start: async (msg) => {
    const chatId = msg.chat.id;
    const isAdmin = ADMIN_IDS.includes(chatId.toString());

    const welcomeGifs = [
      ANIMATION_URLS.WELCOME,
      'https://media.giphy.com/media/l0HU20BZ6LbSEITza/giphy.gif',
      'https://media.giphy.com/media/xT5LMGupUKCHm7DdFu/giphy.gif',
      ANIMATION_URLS.MOVIE
    ];

    const randomGif = welcomeGifs[Math.floor(Math.random() * welcomeGifs.length)];

    try {
      await bot.sendAnimation(chatId, randomGif, {
        caption: `🎬 <b>Привет, ${msg.from.first_name}!</b> 👋\n` +
                 `Я — бот кино-клуба "Одиссея"`,
        parse_mode: 'HTML'
      });

      await bot.sendMessage(
        chatId,
        '🍿 <b>Что я умею:</b>\n\n' +
        '• Рассказывать о ближайших кинопоказах\n' +
        '• Напоминать о встречах\n' +
        '• Принимать оценки фильмов\n' +
        '• Показывать историю обсуждений\n\n' +

        '✨ <b>Особенности клуба:</b>\n' +
        '• Никаких спойлеров до обсуждения\n' +
        '• После 3-х встреч — звание "Кино-Одиссей"\n\n' +

        '<i>"Мы не просто смотрим кино — мы его проживаем."</i>',
        {
          parse_mode: 'HTML',
          ...menuCreator.createMainMenu(isAdmin)
        }
      );
    } catch (error) {
      logger.error(error, `sending start message to ${chatId}`);
    }
  },
  notify: async (msg, match) => {
    if (!ADMIN_IDS.includes(msg.from.id.toString())) {
      return bot.sendMessage(msg.chat.id, '🚫 Эта команда только для администраторов');
    }

    const message = match[1];
    const subscriptions = subscriptionsManager.load();
    let sentCount = 0;

    await bot.sendChatAction(msg.chat.id, 'typing');

    for (const chatId of subscriptions) {
      try {
        await bot.sendMessage(chatId, `📢 <b>Объявление:</b>\n\n${message}`, {
          parse_mode: 'HTML'
        });
        sentCount++;
      } catch (error) {
        logger.error(error, `sending notification to ${chatId}`);
      }
    }

    await bot.sendAnimation(msg.chat.id, ANIMATION_URLS.SUCCESS, {
      caption: `✅ Сообщение отправлено ${sentCount} подписчикам`
    });
  },
  subscribers: (msg) => {
    if (!ADMIN_IDS.includes(msg.from.id.toString())) {
      return bot.sendMessage(msg.chat.id, '🚫 Только для администратора');
    }

    const subscriptions = subscriptionsManager.load();
    bot.sendMessage(
      msg.chat.id,
      `📊 Всего подписчиков: ${subscriptions.size}`,
      { parse_mode: 'HTML' }
    );
  },
  restart: async (msg) => {
    const chatId = msg.chat.id;
    
    if (!ADMIN_IDS.includes(chatId.toString())) {
      return bot.sendMessage(chatId, '🚫 Эта команда только для администраторов');
    }

    try {
      await bot.sendMessage(chatId, '🔄 Перезапуск бота...');
      logger.log(`Администратор ${chatId} инициировал перезапуск бота`);
      process.exit(0);
    } catch (error) {
      logger.error(error, 'restarting bot');
      await bot.sendMessage(chatId, '❌ Ошибка при перезапуске бота');
    }
  },
  checkadmin: (msg) => {
    const chatId = msg.chat.id.toString();
    const isAdmin = ADMIN_IDS.includes(chatId);
    
    const debugInfo = `
🔍 <b>Проверка прав администратора:</b>
  
🆔 <b>Ваш ID:</b> <code>${chatId}</code>
👑 <b>Статус админа:</b> ${isAdmin ? '✅ Да' : '❌ Нет'}
📋 <b>Список ADMIN_IDS:</b> ${ADMIN_IDS.map(id => `\n- <code>${id}</code>`).join('')}

ℹ️ <i>Если статус "Нет", проверьте:\n1. Ваш ID в списке ADMIN_IDS\n2. Нет ли опечаток\n3. Перезапустили ли бот после изменения .env</i>
    `;

    bot.sendMessage(chatId, debugInfo, { 
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Перезагрузить .env', callback_data: 'reload_env' }]
        ]
      }
    });
  }
};

// Message handler
bot.on('message', async (msg) => {
  if (msg.text && !msg.text.startsWith('/')) {
    const chatId = msg.chat.id;
    const isAdmin = ADMIN_IDS.includes(chatId.toString());

    const handlers = {
      'ℹ️ Информация о встрече': async () => {
        await bot.sendMessage(
          chatId,
          '🎬 <b>Кино-клуб "Одиссея"</b>\n\n' +
          'Мы — сообщество любителей кино, которые:\n' +
          '• Еженедельно обсуждают фильмы\n' +
          '• Серьезно анализируют кинокартины\n' +
          '• Делятся впечатлениями в дружеской атмосфере\n\n' +

          '📌 <b>Формат встреч:</b>\n' +
          '1. Сначала смотрим фильм дома\n' +
          '2. Встречаемся в кофейне\n' +
          '3. Обсуждаем и ставим оценки\n\n' +

          '📬 <b>Контакты:</b>\n' +
          '• Админ бота: @GeekLS\n' +
          '• Организатор: Настенька\n' +
          '• Телефон: +7 (978) 736-32-12\n' +
          '• Сайт: https://ulysses-club.github.io/odissea/',
          {
            parse_mode: 'HTML',
            ...menuCreator.createMainMenu(isAdmin)
          }
        );
        await coreFunctions.sendMeetingInfo(chatId);
      },
      '📅 Моя подписка': () => coreFunctions.showSubscriptionMenu(chatId),
      '📜 История оценок': () => coreFunctions.showHistory(chatId),
      '👑 Админ-панель': async () => {
        if (isAdmin) {
          await bot.sendMessage(chatId, 'Админ-панель:', menuCreator.createAdminPanel());
        } else {
          await bot.sendMessage(chatId, 'Эта функция доступна только администраторам', menuCreator.createMainMenu(isAdmin));
        }
      }
    };

    if (handlers[msg.text]) {
      await handlers[msg.text]();
    } else {
      await bot.sendMessage(
        chatId,
        'Используй меню для навигации 😉',
        menuCreator.createMainMenu(isAdmin)
      );
    }
  }
});

// Callback handlers
const callbackHandlers = {
  handleAdminCallbacks: async (query) => {
    const chatId = query.message.chat.id;
    const meeting = meetingManager.getCurrent();
    const voting = votingManager.load();

    const adminHandlers = {
      admin_rate_movie: async () => {
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
          votingManager.save(voting);
        }

        let message = 'Выберите оценку для текущего фильма:';
        if (voting.average) {
          message += `\n\nТекущий средний рейтинг: ${voting.average.toFixed(1)}/10`;
          message += `\nКоличество оценок: ${Object.keys(voting.ratings).length}`;
        }

        await bot.editMessageText(message, {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: menuCreator.createRatingKeyboard().reply_markup
        });
      },
      admin_finish_rating: async () => {
        if (Object.keys(voting.ratings).length === 0) {
          await bot.answerCallbackQuery(query.id, { text: 'Вы не поставили ни одной оценки!' });
          return;
        }

        await bot.editMessageText(`✅ Ввод оценок завершен!\n\n${formatter.formatMovieInfo(meeting, voting)}`, {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '⭐ Продолжить ввод оценок', callback_data: 'admin_rate_movie' }],
              [{ text: '🔙 Назад в админ-панель', callback_data: 'back_to_admin' }]
            ]
          }
        });
      },
      back_to_admin: async () => {
        await bot.editMessageText('Админ-панель:', {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: menuCreator.createAdminPanel().reply_markup
        });
      },
      admin_clear_votes: async () => {
        voting.ratings = {};
        voting.average = null;
        votingManager.save(voting);

        await bot.answerCallbackQuery(query.id, { text: 'Результаты очищены!' });
        await bot.editMessageText('🧹 Все результаты голосования очищены.', {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: menuCreator.createAdminPanel().reply_markup
        });
      },
      admin_send_results: async () => {
        if (!voting.ratings || Object.keys(voting.ratings).length === 0) {
          return await bot.answerCallbackQuery(query.id, { text: 'Нет результатов для рассылки' });
        }

        const currentRatings = Object.values(voting.ratings);
        const average = currentRatings.reduce((a, b) => a + b, 0) / currentRatings.length;
        const subscriptions = subscriptionsManager.load();
        let sentCount = 0;

        for (const subChatId of subscriptions) {
          try {
            await bot.sendMessage(
              subChatId,
              `⭐ <b>Результаты голосования:</b>\n\n` +
              `Фильм: ${voting.film}\n` +
              `Средняя оценка: ${average.toFixed(1)}/10\n` +
              `Количество участников: ${currentRatings.length}`,
              { parse_mode: 'HTML' }
            );
            sentCount++;
          } catch (error) {
            logger.error(error, `sending results to ${subChatId}`);
          }
        }

        await bot.answerCallbackQuery(query.id, { text: `Результаты отправлены ${sentCount} подписчикам` });
        await bot.editMessageText(`✅ Результаты голосования разосланы ${sentCount} подписчикам`, {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: menuCreator.createAdminPanel().reply_markup
        });
      },
      admin_save_to_history: async () => {
        if (!voting.average || !voting.film) {
          return await bot.answerCallbackQuery(query.id, { text: 'Нет данных для сохранения' });
        }

        const history = historyManager.load();
        history.unshift({
          film: voting.film,
          director: voting.director,
          genre: voting.genre,
          country: voting.country || 'не указана',
          year: voting.year,
          description: voting.description || 'Описание отсутствует',
          average: voting.average,
          participants: Object.keys(voting.ratings).length,
          date: new Date().toISOString(),
          poster: voting.poster,
          discussionNumber: voting.discussionNumber
        });

        historyManager.save(history.slice(0, 5));
        await bot.answerCallbackQuery(query.id, { text: 'Результаты сохранены в историю!' });
        await bot.editMessageText('✅ Результаты голосования сохранены в историю.', {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: menuCreator.createAdminPanel().reply_markup
        });
      },
      admin_add_next_movie: async () => {
        await bot.answerCallbackQuery(query.id);
        await bot.editMessageText('Введите информацию о следующем фильме в формате:\n\n' +
          '<b>Дата|Время|Место|Название|Режиссер|Жанр|Страна|Год|Постер|Номер обсуждения|Описание</b>\n\n' +
          'Пример:\n' +
          '20.07.2025|15:00|Кофейня "Том Сойер"|Интерстеллар|Кристофер Нолан|фантастика|США|2014|https://example.com/poster.jpg|16|Фантастический фильм о космических путешествиях', {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'HTML'
        });

        const messageId = query.message.message_id;
        const responseListener = async (msg) => {
          if (msg.from.id.toString() === chatId.toString()) {
            bot.removeListener('message', responseListener);

            try {
              await bot.deleteMessage(chatId, messageId);
            } catch (error) {
              logger.error(error, 'deleting message');
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
                description: parts[10]
              };
              meetingManager.save(nextMeeting);

              votingManager.save({
                ratings: {},
                average: null,
                film: parts[3],
                director: parts[4],
                genre: parts[5],
                year: parts[7],
                poster: parts[8],
                discussionNumber: parts[9],
                date: parts[0],
                description: parts[10],
                country: parts[6]
              });

              await bot.sendMessage(chatId, '✅ Информация о следующем фильме сохранена!', menuCreator.createMainMenu(true));
              await coreFunctions.sendMeetingInfo(chatId);
            } else {
              await bot.sendMessage(chatId, '❌ Неверный формат. Попробуйте снова.', menuCreator.createMainMenu(true));
            }
          }
        };

        bot.on('message', responseListener);
      }
    };

    if (query.data.startsWith('admin_rate_') && query.data !== 'admin_rate_movie') {
      const rating = parseInt(query.data.split('_')[2]);
      const participantId = `user_${Object.keys(voting.ratings).length + 1}`;

      voting.ratings[participantId] = rating;
      voting.average = votingManager.calculateAverage(voting.ratings);
      votingManager.save(voting);

      await bot.answerCallbackQuery(query.id, { text: `Оценка ${rating} сохранена!` });
      await callbackHandlers.showRatingMenu(chatId, query.message.message_id, voting);
    } else if (adminHandlers[query.data]) {
      await adminHandlers[query.data]();
    }
  },
  showRatingMenu: async (chatId, messageId, voting) => {
    const message = `✅ Оценка добавлена!\n\n` +
      `Текущий средний рейтинг: ${voting.average.toFixed(1)}/10\n` +
      `Количество оценок: ${Object.keys(voting.ratings).length}\n\n` +
      'Выберите следующую оценку или завершите ввод:';

    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: menuCreator.createRatingKeyboard().reply_markup
    });
  },
  handleUserCallbacks: async (query) => {
    const chatId = query.message.chat.id;
    const isAdmin = ADMIN_IDS.includes(chatId.toString());

    const userHandlers = {
      subscribe: async () => {
        const subscriptions = subscriptionsManager.load();
        subscriptions.add(chatId.toString());
        subscriptionsManager.save(subscriptions);
        await bot.answerCallbackQuery(query.id, { text: '✅ Вы подписались!' });
        await bot.editMessageText('🎉 Теперь ты будешь получать уведомления о встречах!', {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
            ]
          }
        });
      },
      unsubscribe: async () => {
        const subscriptions = subscriptionsManager.load();
        subscriptions.delete(chatId.toString());
        subscriptionsManager.save(subscriptions);
        await bot.answerCallbackQuery(query.id, { text: '❌ Вы отписались' });
        await bot.editMessageText('Теперь ты не будешь получать уведомления 😢', {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
            ]
          }
        });
      },
      back_to_main: async () => {
        await bot.deleteMessage(chatId, query.message.message_id);
        await bot.sendMessage(
          chatId,
          'Выбери действие:',
          menuCreator.createMainMenu(isAdmin)
        );
      },
      reload_env: async () => {
        delete require.cache[require.resolve('dotenv')];
        require('dotenv').config();
        ADMIN_IDS = process.env.ADMIN_IDS.split(',');
        await bot.answerCallbackQuery(query.id, { text: '✅ .env перезагружен!' });
      }
    };

    if (userHandlers[query.data]) {
      await userHandlers[query.data]();
    }
  }
};

// Set up event listeners
bot.onText(/\/start/, commandHandlers.start);
bot.onText(/\/notify (.+)/, commandHandlers.notify);
bot.onText(/\/subscribers/, commandHandlers.subscribers);
bot.onText(/\/restart/, commandHandlers.restart);
bot.onText(/\/checkadmin/, commandHandlers.checkadmin);

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const isAdmin = ADMIN_IDS.includes(chatId.toString());

  try {
    if (query.data.startsWith('admin_')) {
      if (!isAdmin) {
        return await bot.answerCallbackQuery(query.id, { text: 'Эта функция только для администратора' });
      }
      await callbackHandlers.handleAdminCallbacks(query);
    } else {
      await callbackHandlers.handleUserCallbacks(query);
    }
  } catch (error) {
    logger.error(error, `handling callback for ${chatId}`);
    await bot.sendAnimation(chatId, ANIMATION_URLS.ERROR, {
      caption: 'Произошла ошибка, попробуйте снова'
    });
  }
});

// Set up weekly schedule
const weeklySchedule = nodeSchedule.scheduleJob('0 14 * * 5', async () => {
  logger.log('Запуск еженедельной рассылки');
  const subscriptions = subscriptionsManager.load();

  for (const chatId of subscriptions) {
    try {
      await bot.sendChatAction(chatId, 'upload_photo');
      await coreFunctions.sendMeetingInfo(chatId);
    } catch (error) {
      logger.error(error, `sending weekly notification to ${chatId}`);
      subscriptions.delete(chatId);
    }
  }

  subscriptionsManager.save(subscriptions);
});

// Start the bot
logger.log('Бот успешно запущен!');
console.log('ADMIN_IDS:', ADMIN_IDS);