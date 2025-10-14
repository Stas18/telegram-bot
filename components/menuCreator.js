module.exports = {
  /**
 * Главное меню бота с базовыми опциями
 * Для администраторов добавляет дополнительную кнопку админ-панели
 * 
 * @param {boolean} isAdmin - Флаг indicating whether the user is an administrator
 * @returns {Object} - Объект меню с клавиатурой для reply_markup
 */
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

  /**
 * Меню с ссылками на соцсети и контакты организаторов
 * Использует inline-клавиатуру для открытия внешних ссылок
 * 
 * @returns {Object} - Объект меню с inline-клавиатурой
 */
  createSocialsMenu: () => ({
    reply_markup: {
      inline_keyboard: [
        [{ text: '🌍 Официальный сайт', url: 'https://ulysses-club.github.io/odissea/' }],
        [{ text: '🔵 Группа ВКонтакте', url: 'https://vk.com/ulysses_club?from=groups' }],
        [{ text: '👨‍💻 Админ бота', url: 'https://t.me/GeekLS' }],
        [{ text: '🎬 Организатор киноклуба', url: 'https://vk.com/id8771550' }],
        [{ text: '🔙 Главное меню', callback_data: 'main_menu' }]
      ]
    }
  }),

  /**
 * Панель администратора с функциями управления ботом
 * Включает управление оценками, историей и рассылкой уведомлений
 * 
 * @returns {Object} - Объект админ-панели с inline-клавиатурой
 */
  createAdminPanel: () => ({
    reply_markup: {
      inline_keyboard: [
        [{ text: '⭐ Поставить оценку фильму', callback_data: 'admin_rate_movie' }],
        [{ text: '🧹 Очистить оценки', callback_data: 'admin_clear_votes' }],
        [{ text: '💾 Сохранить в историю', callback_data: 'admin_save_to_history' }],
        [{ text: '🎬 Добавить следующий фильм', callback_data: 'admin_add_next_movie' }],
        [{ text: '📢 Разослать новость', callback_data: 'admin_broadcast_news' }],
        [{ text: '🔵 Опубликовать в VK', callback_data: 'admin_publish_vk' }],
        [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
      ]
    }
  }),

  /**
 * Меню управления подпиской на уведомления
 * Отображает соответствующую кнопку в зависимости от статуса подписки
 * 
 * @param {boolean} isSubscribed - Текущий статус подписки пользователя
 * @returns {Object} - Объект меню подписки с inline-клавиатурой
 */
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

  /**
 * Клавиатура для выставления оценок фильму
 * Предоставляет кнопки от 1 до 10 для рейтинга и опцию завершения ввода
 * 
 * @returns {Object} - Объект клавиатуры оценок с inline-кнопками
 */
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
