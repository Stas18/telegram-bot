module.exports = {
  init: function(deps) {
    // Инициализация подмодулей
    this.adminCallbacks = require('./adminCallbacks');
    this.userCallbacks = require('./userCallbacks');
    this.callbackDispatcher = require('./callbackDispatcher');
    
    // Передача зависимостей
    this.adminCallbacks.init(deps);
    this.userCallbacks.init(deps);
    this.callbackDispatcher.init({
      adminCallbacks: this.adminCallbacks,
      userCallbacks: this.userCallbacks,
      logger: deps.logger
    });

    // Сохранение зависимостей для других методов
    Object.assign(this, deps);
  },

  handleAdminCallbacks: async function(query) {
    await this.adminCallbacks.handle(query);
  },

  handleUserCallbacks: async function(query) {
    await this.userCallbacks.handle(query);
  }
};