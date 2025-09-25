module.exports = {
  /**
   * Инициализирует модуль обработки пользовательских callback-ов.
   * Сохраняет переданные зависимости в контексте модуля.
   * 
   * @param {Object} deps - Объект с зависимостями модуля
   * @param {Object} deps.bot - Объект бота Telegram API
   * @param {Object} deps.logger - Логгер для записи событий
   * @param {Object} deps.subscriptionsManager - Менеджер подписок
   * @param {Object} deps.menuCreator - Модуль создания меню
   * @param {Array<string|number>} deps.ADMIN_IDS - Массив идентификаторов администраторов
   * @returns {void}
   */
  init: function (deps) {
    Object.assign(this, deps);
  },

  /**
   * Основной обработчик пользовательских callback-запросов.
   * Маршрутизирует запросы к соответствующим обработчикам и обрабатывает ошибки.
   * 
   * @param {Object} query - Объект callback-запроса от Telegram Bot API
   * @param {string} query.id - Уникальный идентификатор callback-запроса
   * @param {Object} query.message - Сообщение, связанное с callback
   * @param {number|string} query.message.chat.id - Идентификатор чата
   * @param {number} query.message.message_id - Идентификатор сообщения
   * @param {string} query.data - Данные callback-кнопки
   * @returns {Promise<void>}
   */
  handle: async function (query) {
    const chatId = query.message.chat.id;

    try {
      // Подтверждаем получение callback
      await this.bot.answerCallbackQuery(query.id, {
        text: "...",
        show_alert: false,
      });

      // Словарь обработчиков для различных типов callback-ов
      const userHandlers = {
        subscribe: () => this.handleSubscribe(query),
        unsubscribe: () => this.handleUnsubscribe(query),
        back_to_main: () => this.handleBackToMain(query),
        reload_env: () => this.handleReloadEnv(query),
      };

      // Вызываем соответствующий обработчик, если он существует
      if (userHandlers[query.data]) {
        await userHandlers[query.data]();
      }
    } catch (error) {
      this.logger.error(error, `обратный вызов пользователя ${query.data} от ${chatId}`);
      await this.bot.answerCallbackQuery(query.id, {
        text: "Ошибка обработки запроса",
        show_alert: false,
      });
    }
  },

  /**
   * Обрабатывает подписку пользователя на уведомления.
   * Добавляет пользователя в список подписчиков и подтверждает подписку.
   * 
   * @param {Object} query - Объект callback-запроса
   * @returns {Promise<void>}
   */
  handleSubscribe: async function (query) {
    const chatId = query.message.chat.id;
    const subscriptions = this.subscriptionsManager.load();

    // Добавляем пользователя в подписчики
    subscriptions.add(chatId.toString());
    this.subscriptionsManager.save(subscriptions);

    // Уведомляем пользователя и обновляем сообщение
    await this.bot.answerCallbackQuery(query.id, {
      text: "✅ Вы подписались!",
    });
    await this.bot.editMessageText(
      "🎉 Теперь ты будешь получать уведомления о встречах!",
      {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 Назад", callback_data: "back_to_main" }],
          ],
        },
      }
    );
  },

  /**
   * Обрабатывает отписку пользователя от уведомлений.
   * Удаляет пользователя из списка подписчиков и подтверждает отписку.
   * 
   * @param {Object} query - Объект callback-запроса
   * @returns {Promise<void>}
   */
  handleUnsubscribe: async function (query) {
    const chatId = query.message.chat.id;
    const subscriptions = this.subscriptionsManager.load();

    // Удаляем пользователя из подписчиков
    subscriptions.delete(chatId.toString());
    this.subscriptionsManager.save(subscriptions);

    // Уведомляем пользователя и обновляем сообщение
    await this.bot.answerCallbackQuery(query.id, { text: "❌ Вы отписались" });
    await this.bot.editMessageText(
      "Теперь ты не будешь получать уведомления 😢",
      {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 Назад", callback_data: "back_to_main" }],
          ],
        },
      }
    );
  },

  /**
   * Обрабатывает возврат пользователя на главное меню.
   * Удаляет текущее сообщение и показывает главное меню.
   * 
   * @param {Object} query - Объект callback-запроса
   * @returns {Promise<void>}
   */
  handleBackToMain: async function (query) {
    const chatId = query.message.chat.id;
    const isAdmin = this.ADMIN_IDS.includes(chatId.toString());

    // Удаляем текущее сообщение и показываем главное меню
    await this.bot.deleteMessage(chatId, query.message.message_id);
    await this.bot.sendMessage(
      chatId,
      "Выбери действие:",
      this.menuCreator.createMainMenu(isAdmin)
    );
  },

  /**
   * Обрабатывает перезагрузку переменных окружения из .env файла.
   * Обновляет список ADMIN_IDS без необходимости перезапуска бота.
   * 
   * @param {Object} query - Объект callback-запроса
   * @returns {Promise<void>}
   */
  handleReloadEnv: async function (query) {
    // Очищаем кэш модуля dotenv и перезагружаем переменные окружения
    delete require.cache[require.resolve("dotenv")];
    require("dotenv").config();

    // Обновляем список администраторов
    this.ADMIN_IDS = process.env.ADMIN_IDS.split(",");

    await this.bot.answerCallbackQuery(query.id, {
      text: "✅ .env перезагружен!",
    });
  },
};
