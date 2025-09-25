const fileManager = require('../utils/fileManager');
const { FILE_KEYS } = require('../config/constants');

/**
 * Менеджер для работы с данными голосования за фильмы
 * Обеспечивает загрузку, сохранение и расчет статистики голосов
 * 
 * @namespace votingManager
 */
module.exports = {
  /**
   * Загружает данные голосования из файлового хранилища
   * Если файл не существует, возвращает структуру по умолчанию
   * 
   * @function
   * @returns {Object} Данные голосования
   * @returns {Object.<string, number>} ratings - Рейтинги пользователей (userId: rating)
   * @returns {number|null} average - Средний рейтинг
   * @returns {string|null} film - Название фильма
   * @returns {string|null} director - Режиссер
   * @returns {string|null} genre - Жанр
   * @returns {string|null} country - Страна
   * @returns {number|null} year - Год выпуска
   * @returns {string|null} poster - URL постера
   * @returns {number|null} discussionNumber - Номер обсуждения
   * @returns {string|null} date - Дата показа
   * @returns {string|null} description - Описание фильма
   * @example
   * const votingData = votingManager.load();
   * console.log(votingData.film); // Название текущего фильма
   * console.log(votingData.ratings); // Объект с оценками пользователей
   */
  load: () => fileManager.load(FILE_KEYS.VOTING, {
    ratings: {},
    average: null,
    film: null,
    director: null,
    genre: null,
    country: null,
    year: null,
    poster: null,
    discussionNumber: null,
    date: null,
    description: null
  }),

  /**
   * Сохраняет данные голосования в файловое хранилище
   * 
   * @function
   * @param {Object} data - Данные голосования для сохранения
   * @param {Object.<string, number>} data.ratings - Рейтинги пользователей
   * @param {number|null} data.average - Средний рейтинг
   * @param {string|null} data.film - Название фильма
   * @param {string|null} data.director - Режиссер
   * @param {string|null} data.genre - Жанр
   * @param {string|null} data.country - Страна
   * @param {number|null} data.year - Год выпуска
   * @param {string|null} data.poster - URL постера
   * @param {number|null} data.discussionNumber - Номер обсуждения
   * @param {string|null} data.date - Дата показа
   * @param {string|null} data.description - Описание фильма
   * @returns {boolean} Результат операции сохранения
   * @example
   * votingManager.save({
   *   ratings: { 'user123': 8, 'user456': 9 },
   *   film: 'Интерстеллар',
   *   director: 'Кристофер Нолан',
   *   average: 8.5
   * });
   */
  save: (data) => fileManager.save(FILE_KEYS.VOTING, data),

  /**
   * Вычисляет средний рейтинг на основе оценок пользователей
   * 
   * @function
   * @param {Object.<string, number>} ratings - Объект с оценками пользователей
   * @returns {number|null} Средний рейтинг или null если оценок нет
   * @example
   * const ratings = { 'user1': 8, 'user2': 9, 'user3': 7 };
   * const average = votingManager.calculateAverage(ratings); // 8.0
   * 
   * const emptyRatings = {};
   * const avg = votingManager.calculateAverage(emptyRatings); // null
   */
  calculateAverage: (ratings) => {
    const values = Object.values(ratings);
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
  }
};
