module.exports = {
  init: function(deps) {
    Object.assign(this, deps);
  },

  handle: async function(query) {
    const chatId = query.message.chat.id;
    
    try {
      await this.bot.answerCallbackQuery(query.id, { text: '...', show_alert: false });

      const userHandlers = {
        subscribe: () => this.handleSubscribe(query),
        unsubscribe: () => this.handleUnsubscribe(query),
        back_to_main: () => this.handleBackToMain(query),
        reload_env: () => this.handleReloadEnv(query)
      };

      if (userHandlers[query.data]) {
        await userHandlers[query.data]();
      }
    } catch (error) {
      this.logger.error(error, `user callback ${query.data} from ${chatId}`);
      await this.bot.answerCallbackQuery(query.id, {
        text: 'Ошибка обработки запроса',
        show_alert: false
      });
    }
  },

  handleSubscribe: async function(query) {
    const chatId = query.message.chat.id;
    const subscriptions = this.subscriptionsManager.load();
    
    subscriptions.add(chatId.toString());
    this.subscriptionsManager.save(subscriptions);
    
    await this.bot.answerCallbackQuery(query.id, { text: '✅ Вы подписались!' });
    await this.bot.editMessageText('🎉 Теперь ты будешь получать уведомления о встречах!', {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
        ]
      }
    });
  },

  handleUnsubscribe: async function(query) {
    const chatId = query.message.chat.id;
    const subscriptions = this.subscriptionsManager.load();
    
    subscriptions.delete(chatId.toString());
    this.subscriptionsManager.save(subscriptions);
    
    await this.bot.answerCallbackQuery(query.id, { text: '❌ Вы отписались' });
    await this.bot.editMessageText('Теперь ты не будешь получать уведомления 😢', {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
        ]
      }
    });
  },

  handleBackToMain: async function(query) {
    const chatId = query.message.chat.id;
    const isAdmin = this.ADMIN_IDS.includes(chatId.toString());
    
    await this.bot.deleteMessage(chatId, query.message.message_id);
    await this.bot.sendMessage(
      chatId,
      'Выбери действие:',
      this.menuCreator.createMainMenu(isAdmin)
    );
  },

  handleReloadEnv: async function(query) {
    delete require.cache[require.resolve('dotenv')];
    require('dotenv').config();
    this.ADMIN_IDS = process.env.ADMIN_IDS.split(',');
    await this.bot.answerCallbackQuery(query.id, { text: '✅ .env перезагружен!' });
  }
};