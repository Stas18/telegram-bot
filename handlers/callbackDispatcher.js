module.exports = {
  init: function(deps) {
    this.adminCallbacks = deps.adminCallbacks;
    this.userCallbacks = deps.userCallbacks;
    this.logger = deps.logger;
  },

  dispatch: async function(query) {
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