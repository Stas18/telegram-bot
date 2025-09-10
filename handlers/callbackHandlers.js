module.exports = {
  init: function (deps) {
    // Сохраняем зависимости
    Object.assign(this, deps);

    // Инициализируем подмодули с зависимостями
    this.adminCallbacks = require('./adminCallbacks');
    this.adminCallbacks.init(deps);

    this.userCallbacks = require('./userCallbacks');
    this.userCallbacks.init(deps);
  },

  handleAdminCallbacks: async function (query) {
    await this.adminCallbacks.handle(query);
  },

  handleUserCallbacks: async function (query) {
    await this.userCallbacks.handle(query);
  },

  handleCallback: async function (query) {
    const chatId = query.message.chat.id;
    const isAdmin = this.ADMIN_IDS.includes(chatId.toString());

    if (query.data.startsWith('admin_') && !isAdmin) {
      await this.bot.answerCallbackQuery(query.id, {
        text: 'Эта функция только для администратора',
        show_alert: false
      });
      return;
    }

    if (query.data.startsWith('admin_')) {
      await this.handleAdminCallbacks(query);
    } else {
      await this.handleUserCallbacks(query);
    }
  }
};
