module.exports = {
  /**
   * Инициализирует модуль обработки callback-ов.
   * Сохраняет зависимости, инициализирует подмодули для административных и пользовательских callback-ов.
   * 
   * @param {Object} deps - Объект с зависимостями модуля
   * @param {Array<string|number>} deps.ADMIN_IDS - Массив идентификаторов администраторов
   * @param {Object} deps.bot - Объект бота Telegram API
   * @param {Object} deps.logger - Логгер для записи событий
   * @param {Object} deps.services - Сервисы приложения
   * @returns {void}
   */
  init: function (deps) {
    // Сохраняем зависимости
    Object.assign(this, deps);

    // Инициализируем подмодули с зависимостями
    this.adminCallbacks = require('./adminCallbacks');
    this.adminCallbacks.init(deps);

    this.userCallbacks = require('./userCallbacks');
    this.userCallbacks.init(deps);
  },

  /**
   * Обрабатывает административные callback-запросы.
   * Делегирует обработку специализированному модулю adminCallbacks.
   * 
   * @param {Object} query - Объект callback-запроса от Telegram Bot API
   * @param {string} query.data - Данные callback-кнопки
   * @param {string} query.id - Уникальный идентификатор callback-запроса
   * @param {Object} query.message - Сообщение, связанное с callback
   * @returns {Promise<void>}
   */
  handleAdminCallbacks: async function (query) {
    await this.adminCallbacks.handle(query);
  },

  /**
   * Обрабатывает пользовательские callback-запросы.
   * Делегирует обработку специализированному модулю userCallbacks.
   * 
   * @param {Object} query - Объект callback-запроса от Telegram Bot API
   * @param {string} query.data - Данные callback-кнопки
   * @param {string} query.id - Уникальный идентификатор callback-запроса
   * @param {Object} query.message - Сообщение, связанное с callback
   * @returns {Promise<void>}
   */
  handleUserCallbacks: async function (query) {
    await this.userCallbacks.handle(query);
  },

  /**
   * Основной метод обработки входящих callback-запросов.
   * Проверяет права доступа, обрабатывает административные и пользовательские callback-ы.
   * Для не-администраторов, пытающихся использовать admin-функции, показывает уведомление.
   * 
   * @param {Object} query - Объект callback-запроса от Telegram Bot API
   * @param {Object} query.message - Сообщение, к которому привязан callback
   * @param {number|string} query.message.chat.id - Идентификатор чата/пользователя
   * @param {string} query.data - Данные callback-кнопки (начинается с 'admin_' для админских функций)
   * @param {string} query.id - Уникальный идентификатор callback-запроса для ответа
   * @returns {Promise<void>}
   */
  handleCallback: async function (query) {
    const chatId = query.message.chat.id;
    const isAdmin = this.ADMIN_IDS.includes(chatId.toString());

    // Проверка прав доступа для административных функций
    if (query.data.startsWith('admin_') && !isAdmin) {
      await this.bot.answerCallbackQuery(query.id, {
        text: 'Эта функция только для администратора',
        show_alert: false
      });
      return;
    }

    // Маршрутизация callback-запроса в соответствующий обработчик
    if (query.data.startsWith('admin_')) {
      await this.handleAdminCallbacks(query);
    } else {
      await this.handleUserCallbacks(query);
    }
  }
};
