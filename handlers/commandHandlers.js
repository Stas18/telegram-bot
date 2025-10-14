module.exports = {
  /**
   * Инициализирует модуль команд, сохраняя переданные зависимости.
   *
   * @param {Object} deps - Объект с зависимостями модуля
   * @param {Array<string|number>} deps.ADMIN_IDS - Массив идентификаторов администраторов
   * @param {Object} deps.bot - Объект бота Telegram API
   * @param {Object} deps.logger - Логгер для записи событий
   * @param {Object} deps.menuCreator - Модуль создания меню
   * @param {Object} deps.subscriptionsManager - Менеджер подписок
   * @param {Object} deps.coreFunctions - Основные функции приложения
   * @param {Object} deps.ANIMATION_URLS - URL анимаций для сообщений
   * @returns {void}
   */
  init: (deps) => {
    Object.assign(this, deps);
    this.vkService = deps.vkService;
  },

  /**
   * Обрабатывает команду /start - приветствует пользователя и показывает основное меню.
   * Отправляет случайную приветственную GIF-анимацию и информационное сообщение.
   * Для администраторов показывает расширенное меню с дополнительными функциями.
   *
   * @param {Object} msg - Объект сообщения от Telegram Bot API
   * @param {number|string} msg.chat.id - Идентификатор чата
   * @param {Object} msg.from - Информация о пользователе
   * @param {string} msg.from.first_name - Имя пользователя
   * @returns {Promise<void>}
   */
  start: async (msg) => {
    const chatId = msg.chat.id;
    const isAdmin = this.ADMIN_IDS.includes(chatId.toString());

    const welcomeGifs = [
      this.ANIMATION_URLS.WELCOME,
      "https://media.giphy.com/media/l0HU20BZ6LbSEITza/giphy.gif",
      "https://media.giphy.com/media/xT5LMGupUKCHm7DdFu/giphy.gif",
      "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ2ptYXloNWJ1Ym9jd2l5anJreGFqazR0aXRrN3Yxb3RmcmM1NzJrdCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Cmr1OMJ2FN0B2/giphy.gif",
      "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExaWcxOWY5dTFibzZvdGlxNjZvMG14OGFvNng2Z29xdmQzenFqMHJ3eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/1kJxyyCq9ZHXX0GM3a/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3cTN1N2F1OWVnYjlucGNnMGJhMGt0bW9wOHhiYzVrMWhhZ3N0dDlodCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/7JDXBtIdOErbG/giphy.gif",
      "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHF1ZG9jMmIwd3I0ZzNjanI2bjd3a3YxMG9pNGcxZG04MHVlc25hMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/d7fvcrPydrDIVDRkim/giphy.gif",
      this.ANIMATION_URLS.MOVIE,
    ];

    const randomGif =
      welcomeGifs[Math.floor(Math.random() * welcomeGifs.length)];

    try {
      await this.bot.sendAnimation(chatId, randomGif, {
        caption:
          `🎬 <b>Привет, ${msg.from.first_name}!</b> 👋\n` +
          `Я — бот кино-клуба "Одиссея"`,
        parse_mode: "HTML",
      });

      await this.bot.sendMessage(
        chatId,
        "🍿 <b>Что я умею:</b>\n\n" +
        "• Рассказывать о ближайших кинопоказах\n" +
        "• Напоминать о встречах\n" +
        "• Принимать оценки фильмов\n" +
        "• Показывать историю обсуждений\n\n" +
        "✨ <b>Особенности клуба:</b>\n" +
        "• Никаких спойлеров до обсуждения\n" +
        '• После 3-х встреч — звание "Кино-Одиссей"\n\n' +
        '<i>"Мы не просто смотрим кино — мы его проживаем."</i>',
        {
          parse_mode: "HTML",
          ...this.menuCreator.createMainMenu(isAdmin),
        }
      );
    } catch (error) {
      this.logger.error(error, `отправка начального сообщения ${chatId}`);
    }
  },

  /**
   * Отправляет уведомление всем подписчикам (только для администраторов).
   * Команда формата: /notify Текст сообщения
   *
   * @param {Object} msg - Объект сообщения от Telegram Bot API
   * @param {Array} match - Результат совпадения регулярного выражения
   * @param {string} match[1] - Текст уведомления для отправки
   * @returns {Promise<void>}
   */
  notify: async (msg, match) => {
    if (!this.ADMIN_IDS.includes(msg.from.id.toString())) {
      return this.bot.sendMessage(
        msg.chat.id,
        "🚫 Эта команда только для администраторов"
      );
    }

    const message = match[1];
    const subscriptions = this.subscriptionsManager.load();
    let sentCount = 0;

    await this.bot.sendChatAction(msg.chat.id, "typing");

    for (const chatId of subscriptions) {
      try {
        await this.bot.sendMessage(
          chatId,
          `📢 <b>Объявление:</b>\n\n${message}`,
          {
            parse_mode: "HTML",
          }
        );
        sentCount++;
      } catch (error) {
        this.logger.error(error, `отправка уведомления ${chatId}`);
      }
    }

    await this.bot.sendAnimation(msg.chat.id, this.ANIMATION_URLS.SUCCESS, {
      caption: `✅ Сообщение отправлено ${sentCount} подписчикам`,
    });
  },

  /**
   * Показывает количество подписчиков бота (только для администраторов).
   *
   * @param {Object} msg - Объект сообщения от Telegram Bot API
   * @returns {Promise<void>}
   */
  subscribers: (msg) => {
    if (!this.ADMIN_IDS.includes(msg.from.id.toString())) {
      return this.bot.sendMessage(msg.chat.id, "🚫 Только для администратора");
    }

    const subscriptions = this.subscriptionsManager.load();
    this.bot.sendMessage(
      msg.chat.id,
      `📊 Всего подписчиков: ${subscriptions.size || 0}`,
      { parse_mode: "HTML" }
    );
  },

  /**
   * Перезапускает бота (только для администраторов).
   *
   * @param {Object} msg - Объект сообщения от Telegram Bot API
   * @returns {Promise<void>}
   */
  restart: async (msg) => {
    const chatId = msg.chat.id;

    if (!this.ADMIN_IDS.includes(chatId.toString())) {
      return this.bot.sendMessage(
        chatId,
        "🚫 Эта команда только для администраторов"
      );
    }

    try {
      await this.bot.sendMessage(chatId, "🔄 Перезапуск бота...");
      this.logger.log(`Администратор ${chatId} инициировал перезапуск бота`);
      process.exit(0);
    } catch (error) {
      this.logger.error(error, "перезапуск бота");
      await this.bot.sendMessage(chatId, "❌ Ошибка при перезапуске бота");
    }
  },

  /**
   * Проверяет права администратора для текущего пользователя.
   * Показывает отладочную информацию: ID пользователя, статус администратора, список ADMIN_IDS.
   *
   * @param {Object} msg - Объект сообщения от Telegram Bot API
   * @returns {Promise<void>}
   */
  checkadmin: (msg) => {
    const chatId = msg.chat.id.toString();
    const isAdmin = this.ADMIN_IDS.includes(chatId);

    const debugInfo = `
🔍 <b>Проверка прав администратора:</b>
  
🆔 <b>Ваш ID:</b> <code>${chatId}</code>
👑 <b>Статус админа:</b> ${isAdmin ? "✅ Да" : "❌ Нет"}
📋 <b>Список ADMIN_IDS:</b> ${this.ADMIN_IDS.map((id) => `\n- <code>${id}</code>`).join("")}

ℹ️ <i>Если статус "Нет", проверьте:\n1. Ваш ID в списке ADMIN_IDS\n2. Нет ли опечаток\n3. Перезапустили ли бот после изменения .env</i>
    `;

    this.bot.sendMessage(chatId, debugInfo, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔄 Перезагрузить .env", callback_data: "reload_env" }],
        ],
      },
    });
  },

  /**
   * Тестирует интеграцию с Google Sheets (только для администраторов).
   * Выполняет синхронизацию истории с таблицей Google Sheets.
   *
   * @param {Object} msg - Объект сообщения от Telegram Bot API
   * @returns {Promise<void>}
   */
  test_sheets: async (msg) => {
    if (!this.ADMIN_IDS.includes(msg.from.id.toString())) return;
    await this.coreFunctions.uploadHistoryToGoogleSheets();
    this.bot.sendMessage(
      msg.chat.id,
      "Попытка синхронизации с Google Sheets завершена"
    );
  },

  test_vk: async (msg) => {
    if (!this.ADMIN_IDS.includes(msg.from.id.toString())) return;

    try {
      await this.bot.sendMessage(msg.chat.id, "🔗 Проверка подключения к VK...");

      const connectionTest = await this.vkService.testConnection();

      if (connectionTest.success) {
        await this.bot.sendMessage(
          msg.chat.id,
          `✅ VK подключение успешно!\n\n` +
          `Группа: ${connectionTest.groupName}\n` +
          `Адрес: vk.com/${connectionTest.screenName}`
        );
      } else {
        await this.bot.sendMessage(
          msg.chat.id,
          `❌ Ошибка подключения к VK:\n${connectionTest.error}`
        );
      }
    } catch (error) {
      this.logger.error(error, 'тестирование VK подключения');
      await this.bot.sendMessage(msg.chat.id, `❌ Ошибка: ${error.message}`);
    }
  },

  test_github: async (msg) => {
    if (!this.ADMIN_IDS.includes(msg.from.id.toString())) return;

    try {
      await this.bot.sendMessage(msg.chat.id, "🔗 Проверка подключения к GitHub...");

      const connectionTest = await this.githubService.testGitHubConnection();

      if (connectionTest.success) {
        await this.bot.sendMessage(
          msg.chat.id,
          `✅ GitHub подключение успешно!\n\n${connectionTest.message}`
        );
      } else {
        await this.bot.sendMessage(
          msg.chat.id,
          `❌ Ошибка подключения к GitHub:\n${connectionTest.error}`
        );
      }
    } catch (error) {
      this.logger.error(error, 'тестирование GitHub подключения');
      await this.bot.sendMessage(msg.chat.id, `❌ Ошибка: ${error.message}`);
    }
  }
};
