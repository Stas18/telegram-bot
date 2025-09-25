module.exports = {
  /**
   * Инициализирует модуль, внедряя необходимые зависимости.
   * Должен быть вызван первым перед использованием других методов модуля.
   * 
   * @param {Object} deps - Объект с зависимостями
   * @param {Object} deps.adminCallbacks - Модуль для обработки административных callback-ов
   * @param {Object} deps.userCallbacks - Модуль для обработки пользовательских callback-ов
   * @param {Object} deps.logger - Логгер для записи ошибок и информации
   * @returns {void}
   */
  init: function (deps) {
    this.adminCallbacks = deps.adminCallbacks;
    this.userCallbacks = deps.userCallbacks;
    this.logger = deps.logger;
  },

  /**
   * Асинхронно обрабатывает входящий callback-запрос от Telegram.
   * Определяет тип callback (административный или пользовательский) и делегирует обработку соответствующему модулю.
   * В случае ошибки логирует ее и пробрасывает исключение дальше.
   * 
   * @param {Object} query - Объект callback-запроса от Telegram Bot API
   * @param {Object} query.message - Сообщение, к которому привязан callback
   * @param {number|string} query.message.chat.id - Идентификатор чата
   * @param {string} query.data - Данные callback-кнопки
   * @returns {Promise<void>}
   * @throws {Error} Пробрасывает ошибку, возникшую при обработке callback
   */
  dispatch: async function (query) {
    const chatId = query.message.chat.id;

    try {
      if (query.data.startsWith('admin_')) {
        await this.adminCallbacks.handle(query);
      } else {
        await this.userCallbacks.handle(query);
      }
    } catch (error) {
      this.logger.error(error, `dispatching callback ${query.data} from ${chatId}`);
      throw error;
    }
  }
};
