/**
 * Основной модуль Telegram бота для кино-клуба "Одиссея"
 * Оркестрирует все компоненты системы: управление встречами, голосования, подписки, интеграции
 * 
 * @file overview Бот для управления кино-клубом с функциями администрирования, уведомлений и аналитики
 * @module bot
 */
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const nodeSchedule = require('node-schedule');

// Импорт конфигурации
const DEFAULT_MEETING = require('../config/default-meeting.json');
const {
  ENV_CHECK,
  ANIMATION_URLS,
  SPREADSHEET_ID,
  SHEET_NAME
} = require('../config/constants');

// Импорт коммунальных услуг
const logger = require('../utils/logger');
const fileManager = require('../utils/fileManager');

// Менеджер импорта
const subscriptionsManager = require('../managers/subscriptionsManager');
const votingManager = require('../managers/votingManager');
const historyManager = require('../managers/historyManager');
const meetingManager = require('../managers/meetingManager');
const filmsManager = require('../managers/filmsManager');

// Импорт услуг
const githubService = require('../services/githubService');

// Импорт компонентов
const formatter = require('../components/formatter');
const menuCreator = require('../components/menuCreator');
const coreFunctions = require('../components/coreFunctions');
const commandHandlers = require('../handlers/commandHandlers');
const callbackHandlers = require('../handlers/callbackHandlers');

/**
 * Проверяет наличие всех необходимых переменных окружения
 * Завершает процесс при отсутствии критических переменных
 * 
 * @function validateEnvironment
 * @throws {Error} Если отсутствуют обязательные переменные окружения
 */
const validateEnvironment = () => {
  const missingVars = Object.values(ENV_CHECK).filter(key => !process.env[key]);
  if (missingVars.length > 0) {
    logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }
};

validateEnvironment();

/**
 * Экземпляр Telegram бота с настройками polling
 * 
 * @type {TelegramBot}
 * @property {boolean} polling - Включен режим long-polling
 * @property {boolean} filepath - Отключено сохранение файлов локально
 * @property {string} baseApiUrl - Базовый URL API Telegram
 */
const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: true,
  filepath: false,
  baseApiUrl: 'https://api.telegram.org'
});

/**
 * Массив ID администраторов бота
 * 
 * @type {string[]}
 */
let ADMIN_IDS = process.env.ADMIN_IDS.split(',');

/**
 * Объект зависимостей для инъекции в модули
 * 
 * @type {Object}
 * @property {TelegramBot} bot - Экземпляр бота
 * @property {Object} logger - Логгер приложения
 * @property {Object} fileManager - Менеджер файловых операций
 * @property {Object} subscriptionsManager - Менеджер подписок
 * @property {Object} votingManager - Менеджер голосований
 * @property {Object} historyManager - Менеджер истории
 * @property {Object} meetingManager - Менеджер встреч
 * @property {Object} filmsManager - Менеджер фильмов
 * @property {Object} githubService - Сервис работы с GitHub
 * @property {Object} formatter - Форматировщик сообщений
 * @property {Object} menuCreator - Создатель меню
 * @property {Object} coreFunctions - Основные функции бота
 * @property {string[]} ADMIN_IDS - ID администраторов
 * @property {Object} DEFAULT_MEETING - Настройки встречи по умолчанию
 * @property {Object} ANIMATION_URLS - URL анимаций
 * @property {string} SPREADSHEET_ID - ID Google таблицы
 * @property {string} SHEET_NAME - Название листа
 * @property {string} CREDENTIALS_PATH - Путь к credentials Google
 * @property {string} GITHUB_TOKEN - Токен GitHub API
 */
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

// Инициализировать githubService
githubService.init({
  logger: logger,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN
});

// Инициализировать обработчики с зависимостями
coreFunctions.init(dependencies);
commandHandlers.init(dependencies);
callbackHandlers.init(dependencies);

/**
 * Обработчики текстовых команд бота
 * Регистрирует обработчики для команд, начинающихся с /
 */
bot.onText(/\/start/, (msg) => commandHandlers.start(msg));
bot.onText(/\/notify (.+)/, (msg, match) => commandHandlers.notify(msg, match));
bot.onText(/\/subscribers/, (msg) => commandHandlers.subscribers(msg));
bot.onText(/\/restart/, (msg) => commandHandlers.restart(msg));
bot.onText(/\/checkadmin/, (msg) => commandHandlers.checkadmin(msg));
bot.onText(/\/test_sheets/, (msg) => commandHandlers.test_sheets(msg));

/**
 * Обработчик обычных текстовых сообщений (не команд)
 * Обрабатывает нажатия на кнопки меню и другие текстовые взаимодействия
 */
bot.on('message', async (msg) => {
  if (msg.text && !msg.text.startsWith('/')) {
    const chatId = msg.chat.id;
    const isAdmin = ADMIN_IDS.includes(chatId.toString());

    /**
     * Маппинг текстовых сообщений на обработчики
     * 
     * @type {Object.<string, Function>}
     */
    const handlers = {
      'ℹ️ Информация о встрече': async () => {
        const meeting = meetingManager.getCurrent();
        const hasRealMeeting = meeting.film && meeting.film !== 'Фильм ещё не выбран';

        if (!hasRealMeeting) {
          await bot.sendMessage(
            chatId,
            '🎬 <b>Кино-клуб "Одиссея"</b>\n\n' +
            'Мы — сообщество любителей кино, которые:\n' +
            '• Еженедельно обсуждают фильмы\n' +
            '• Серьезно анализируют кинокартины\n' +
            '• Делятся впечатлениями в дружеской атмосфере\n\n' +
            '📌 <b>Следующая встреча:</b>\n' +
            'Фильм ещё не выбран. Следите за анонсами! 🍿\n\n' +
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
        } else {
          await coreFunctions.sendMeetingInfo(chatId);
        }
      },
      '📅 Моя подписка': () => coreFunctions.showSubscriptionMenu(chatId),
      '🌐 Наши соцсети': async () => {
        await bot.sendMessage(
          chatId,
          `📢 <b>Наши соцсети и контакты:</b>\n\n` +
          `Здесь вы найдёте актуальные новости, анонсы и даже интерактивную игру! 🎮\n\n` +
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

/**
 * Специализированный обработчик для интерактивной игры
 * Обрабатывает callback'и связанные с игровой механикой
 */
bot.on('callback_query', async (query) => {
  try {
    // Обработка интерактивной игры и back_to_socials
    if (query.data === 'interactive_game' || query.data === 'back_to_socials') {
      if (query.data === 'interactive_game') {
        await bot.sendMessage(
          query.message.chat.id,
          `🎮 <b>Интерактив-игра Odissea</b>\n\n` +
          `Приветствуем в увлекательной интерактивной игре нашего киноклуба! 🎬\n\n` +
          `<b>🎯 Краткое описание:</b>\n` +
          `• Городской квест по локациям Севастополя\n` +
          `• Поиск кодов и ответы на вопросы о кино\n` +
          `• Командное соревнование с призами\n` +
          `• Связь реального мира с кинематографом\n\n` +
          `<b>📱 Начать игру:</b> @ulysses_club_game_odissea_bot\n\n` +
          `<b>💡 Полное описание игры:</b>\n` +
          `🎬 <b>Инструкция для участников киноквеста «Odissea»</b>\n\n` +
          `🎯 <b>Цель игры:</b> Набрать максимальное количество баллов, находя коды на реальных локациях в городе и правильно отвечая на вопросы.\n\n` +
          `⚠️ <b>Главное правило:</b> Физическое присутствие на локациях — обязательно! Бот отслеживает время ваших ответов. Слишком быстрые ответы караются штрафными баллами.\n\n` +
          `💡 <b>Как играть:</b>\n\n` +
          `1️⃣ <b>Регистрация команды</b>\n` +
          `• Нажмите /start\n` +
          `• Выберите название команды из предложенного списка\n` +
          `• Введите имена всех участников через запятую\n\n` +
          `2️⃣ <b>Выбор и прохождение точки</b>\n` +
          `• Ожидайте старта от админов\n` +
          `• В главном меню нажмите «🌍 Выбрать точку»\n` +
          `• Найдите физический код на локации\n` +
          `• Ответьте на вопросы, связанные с темой локации\n\n` +
          `3️⃣ <b>Система начисления очков</b>\n` +
          `• Правильный ответ: 1-10 баллов\n` +
          `• Слишком быстрый ответ: -3 балла\n` +
          `• Неправильный ответ: -1 балл\n\n` +
          `🏆 <b>Система призов</b>\n` +
          `За первое прохождение точек (4, 8, 10) ваша команда получает промокоды в кафе!\n\n` +
          `🤝 <b>Сотрудничество:</b>\n` +
          `Хотите провести подобную игру для вашего мероприятия или организации? Мы с радостью поможем адаптировать квест под ваши нужды!\n\n` +
          `📞 <b>Контакты для сотрудничества:</b>\n` +
          `• Разработчик: @GeekLS\n` +
          `• Организатор: +7 (978) 736-32-12\n\n` +
          `<i>«Жизнь — это как коробка шоколадных конфет... а этот квест — как самая вкусная из них!»</i>`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🎮 Начать игру', url: 'https://t.me/ulysses_club_game_odissea_bot' }],
                [{ text: '📞 Связаться для сотрудничества', url: 'https://t.me/GeekLS' }],
                [{ text: '🔙 Назад к соцсетям', callback_data: 'back_to_socials' }]
              ]
            }
          }
        );
      } else if (query.data === 'back_to_socials') {
        await bot.editMessageText(
          `📢 <b>Наши соцсети и контакты:</b>\n\n` +
          `Здесь вы найдёте актуальные новости, анонсы и даже интерактивную игру! 🎮\n\n` +
          `🔹 По вопросам пишите админу или организатору.`,
          {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            parse_mode: 'HTML',
            ...menuCreator.createSocialsMenu()
          }
        );
      }
      await bot.answerCallbackQuery(query.id);
    } else {
      // Все остальные callback обрабатываем через единый обработчик
      await callbackHandlers.handleCallback(query);
    }
  } catch (error) {
    logger.error(`Ошибка обработки callback: ${error.message}`);
    try {
      await bot.answerCallbackQuery(query.id, {
        text: 'Произошла ошибка',
        show_alert: false
      });
    } catch (e) {
      logger.error(`Не удалось ответить на callback: ${e.message}`);
    }
  }
});

/**
 * Еженедельное расписание рассылки уведомлений
 * Запускается каждую пятницу в 14:00
 * 
 * @type {nodeSchedule.Job}
 */
const weeklySchedule = nodeSchedule.scheduleJob('0 14 * * 5', async () => {
  logger.log('Запуск еженедельной рассылки');
  const subscriptions = subscriptionsManager.load();

  for (const chatId of subscriptions) {
    try {
      await bot.sendChatAction(chatId, 'upload_photo');
      await coreFunctions.sendMeetingInfo(chatId);
    } catch (error) {
      logger.error(error, `отправка еженедельного уведомления ${chatId}`);

      // Удаляем только при определенных ошибках (пользователь заблокировал бота)
      if (error.response && error.response.statusCode === 403) {
        subscriptions.delete(chatId);
      }
    }
  }

  subscriptionsManager.save(subscriptions);
});

// Запустить бота
logger.log('Бот успешно запущен!');
console.log('ADMIN_IDS:', ADMIN_IDS);
