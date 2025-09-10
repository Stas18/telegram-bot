module.exports = {
  createMainMenu: (isAdmin) => {
    const menu = {
      reply_markup: {
        resize_keyboard: true,
        keyboard: [
          [{ text: 'ℹ️ Информация о встрече' }, { text: '📅 Моя подписка' }],
          [{ text: '🌐 Наши соцсети' }, { text: '📜 История оценок' }],
        ]
      }
    };

    if (isAdmin) {
      menu.reply_markup.keyboard.push([{ text: '👑 Админ-панель' }]);
    }

    return menu;
  },

  createSocialsMenu: () => ({
    reply_markup: {
      inline_keyboard: [
        [{ text: '🌍 Официальный сайт', url: 'https://ulysses-club.github.io/odissea/' }],
        [{ text: '🔵 Группа ВКонтакте', url: 'https://vk.com/ulysses_club?from=groups' }],
        [{ text: '🎮 Игровой бот (в разработке)', url: 'https://t.me/ulysses_club_game_odissea_bot' }],
        [{ text: '👨‍💻 Админ бота', url: 'https://t.me/GeekLS' }],
        [{ text: '🎬 Организатор киноклуба', url: 'https://vk.com/id8771550' }],
        [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
      ]
    }
  }),

  createAdminPanel: () => ({
    reply_markup: {
      inline_keyboard: [
        [{ text: '⭐ Поставить оценку фильму', callback_data: 'admin_rate_movie' }],
        [{ text: '🧹 Очистить оценки', callback_data: 'admin_clear_votes' }],
        [{ text: '💾 Сохранить в историю', callback_data: 'admin_save_to_history' }],
        [{ text: '🎬 Добавить следующий фильм', callback_data: 'admin_add_next_movie' }],
        [{ text: '📢 Разослать новость', callback_data: 'admin_broadcast_news' }],
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
        [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
      ]
    }
  })
};