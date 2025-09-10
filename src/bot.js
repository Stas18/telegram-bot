require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const nodeSchedule = require('node-schedule');

// Config imports
const DEFAULT_MEETING = require('../config/default-meeting.json');
const {
  ENV_CHECK,
  ANIMATION_URLS,
  SPREADSHEET_ID,
  SHEET_NAME
} = require('../config/constants');

// Utility imports
const logger = require('../utils/logger');
const fileManager = require('../utils/fileManager');

// Manager imports
const subscriptionsManager = require('../managers/subscriptionsManager');
const votingManager = require('../managers/votingManager');
const historyManager = require('../managers/historyManager');
const meetingManager = require('../managers/meetingManager');
const filmsManager = require('../managers/filmsManager');

// Service imports
const githubService = require('../services/githubService');

// Component imports
const formatter = require('../components/formatter');
const menuCreator = require('../components/menuCreator');
const coreFunctions = require('../components/coreFunctions');
const commandHandlers = require('../handlers/commandHandlers');
const callbackHandlers = require('../handlers/callbackHandlers');

// Validate environment
const validateEnvironment = () => {
  const missingVars = Object.values(ENV_CHECK).filter(key => !process.env[key]);
  if (missingVars.length > 0) {
    logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }
};

validateEnvironment();

// Initialize bot
const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: true,
  filepath: false,
  baseApiUrl: 'https://api.telegram.org'
});

let ADMIN_IDS = process.env.ADMIN_IDS.split(',');

// Inject dependencies
const dependencies = {
  bot,
  logger,
  fileManager,
  subscriptionsManager,
  votingManager,
  historyManager,
  meetingManager,
  filmsManager,
  githubService,
  formatter,
  menuCreator,
  coreFunctions,
  ADMIN_IDS,
  DEFAULT_MEETING,
  ANIMATION_URLS,
  SPREADSHEET_ID,
  SHEET_NAME,
  CREDENTIALS_PATH: path.join(__dirname, '../config/credentials.json'),
  GITHUB_TOKEN: process.env.GITHUB_TOKEN
};

// Initialize githubService
githubService.init({
  logger: logger,
  GITHUB_TOKEN: dependencies.GITHUB_TOKEN
});

// Initialize handlers with dependencies
coreFunctions.init(dependencies);
commandHandlers.init(dependencies);
callbackHandlers.init(dependencies);

// Set up event listeners
bot.onText(/\/start/, (msg) => commandHandlers.start(msg));
bot.onText(/\/notify (.+)/, (msg, match) => commandHandlers.notify(msg, match));
bot.onText(/\/subscribers/, (msg) => commandHandlers.subscribers(msg));
bot.onText(/\/restart/, (msg) => commandHandlers.restart(msg));
bot.onText(/\/checkadmin/, (msg) => commandHandlers.checkadmin(msg));
bot.onText(/\/test_sheets/, (msg) => commandHandlers.test_sheets(msg));

bot.on('message', async (msg) => {
  if (msg.text && !msg.text.startsWith('/')) {
    const chatId = msg.chat.id;
    const isAdmin = ADMIN_IDS.includes(chatId.toString());

    const handlers = {
      'ℹ️ Информация о встрече': async () => {
        await bot.sendMessage(
          chatId,
          '🎬 <b>Кино-клуб "Одиссея"</b>\n\n' +
          'Мы — сообщество любителей кино, которые:\n' +
          '• Еженедельно обсуждают фильмы\n' +
          '• Серьезно анализируют кинокартины\n' +
          '• Делятся впечатлениями в дружеской атмосфере\n\n' +
          '📌 <b>Формат встреч:</b>\n' +
          '1. Сначала смотрим фильм дома\n' +
          '2. Встречаемся в кофейне\n' +
          '3. Обсуждаем и ставим оценки\n\n' +
          '📬 <b>Контакты:</b>\n' +
          '• Админ бота: @GeekLS\n' +
          '• Организатор: Настенька\n' +
          '• Телефон: +7 (978) 736-32-12\n' +
          '• Сайт: https://ulysses-club.github.io/odissea/',
          {
            parse_mode: 'HTML',
            ...menuCreator.createMainMenu(isAdmin)
          }
        );
        await coreFunctions.sendMeetingInfo(chatId);
      },
      '📅 Моя подписка': () => coreFunctions.showSubscriptionMenu(chatId),
      '🌐 Наши соцсети': async () => {
        await bot.sendMessage(
          chatId,
          `📢 <b>Наши соцсети и контакты:</b>\n\n` +
          `Здесь вы найдёте актуальные новости, анонсы и даже интерактивную игру! 🎮\n\n` +
          `🔹 <b>Игровой бот пока в разработке</b> — нужны тестеры! 🛠\n` +
          `🔹 По вопросам пишите админу или организатору.`,
          {
            parse_mode: 'HTML',
            ...menuCreator.createSocialsMenu()
          }
        );
      },
      '📜 История оценок': () => coreFunctions.showHistory(chatId),
      '👑 Админ-панель': async () => {
        if (isAdmin) {
          await bot.sendMessage(chatId, 'Админ-панель:', menuCreator.createAdminPanel());
        } else {
          await bot.sendMessage(chatId, 'Эта функция доступна только администраторам', menuCreator.createMainMenu(isAdmin));
        }
      }
    };

    if (handlers[msg.text]) {
      await handlers[msg.text]();
    } else {
      await bot.sendMessage(
        chatId,
        'Используй меню для навигации 😉',
        menuCreator.createMainMenu(isAdmin)
      );
    }
  }
});

bot.on('callback_query', async (query) => {
  try {
    // Используем единый обработчик
    await callbackHandlers.handleCallback(query);
  } catch (error) {
    logger.error(`Error handling callback: ${error.message}`);
    try {
      await bot.answerCallbackQuery(query.id, {
        text: 'Произошла ошибка',
        show_alert: false
      });
    } catch (e) {
      logger.error(`Failed to answer callback: ${e.message}`);
    }
  }
});
// Set up weekly schedule
const weeklySchedule = nodeSchedule.scheduleJob('0 14 * * 5', async () => {
  logger.log('Запуск еженедельной рассылки');
  const subscriptions = subscriptionsManager.load();

  for (const chatId of subscriptions) {
    try {
      await bot.sendChatAction(chatId, 'upload_photo');
      await coreFunctions.sendMeetingInfo(chatId);
    } catch (error) {
      logger.error(error, `sending weekly notification to ${chatId}`);
      subscriptions.delete(chatId);
    }
  }

  subscriptionsManager.save(subscriptions);
});

// Start the bot
logger.log('Бот успешно запущен!');
console.log('ADMIN_IDS:', ADMIN_IDS);