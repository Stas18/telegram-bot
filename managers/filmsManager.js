const fileManager = require('../utils/fileManager');
const { FILE_KEYS } = require('../config/constants');

/**
 * Менеджер для работы с данными о фильмах
 * Обеспечивает CRUD-операции с фильмами: создание, чтение, обновление
 */
const filmsManager = {
  /**
   * Загружает все фильмы из хранилища
   * 
   * @returns {Array<Object>} Массив объектов фильмов
   * @example
   * const films = filmsManager.load();
   * // Возвращает: [{ discussionNumber: 1, title: "Фильм 1" }, ...]
   */
  load: () => fileManager.load(FILE_KEYS.FILMS, []),

  /**
   * Сохраняет массив фильмов в хранилище
   * 
   * @param {Array<Object>} films - Массив объектов фильмов для сохранения
   * @returns {void}
   * @example
   * filmsManager.save([{ discussionNumber: 1, title: "Новый фильм" }]);
   */
  save: (films) => fileManager.save(FILE_KEYS.FILMS, films),

  /**
   * Добавляет новый фильм в коллекцию
   * 
   * @param {Object} film - Объект фильма для добавления
   * @param {number} film.discussionNumber - Номер обсуждения фильма
   * @param {string} film.title - Название фильма
   * @param {string} film.description - Описание фильма
   * @param {Date} film.date - Дата показа фильма
   * @returns {Array<Object>} Обновленный массив всех фильмов
   * @example
   * const newFilm = { discussionNumber: 3, title: "Интерстеллар" };
   * const allFilms = filmsManager.add(newFilm);
   */
  add: function (film) {
    const films = this.load();
    films.push(film);
    this.save(films);
    return films;
  },

  /**
   * Получает последние N фильмов из коллекции
   * 
   * @param {number} [count=2] - Количество последних фильмов для возврата
   * @returns {Array<Object>} Массив последних фильмов
   * @example
   * const recentFilms = filmsManager.getRecent(3);
   * // Возвращает 3 последних фильма
   */
  getRecent: function (count = 2) {
    const films = this.load();
    return films.slice(-count);
  },

  /**
   * Находит фильм по номеру обсуждения (discussionNumber)
   * 
   * @param {number|string} number - Номер обсуждения для поиска
   * @returns {Object|null} Объект фильма или null если не найден
   * @example
   * const film = filmsManager.getByDiscussionNumber(5);
   * if (film) { console.log(film.title); }
   */
  getByDiscussionNumber: function (number) {
    const films = this.load();
    return films.find(film => film.discussionNumber == number);
  },

  /**
   * Обновляет данные фильма по номеру обсуждения
   * 
   * @param {number|string} discussionNumber - Номер обсуждения фильма для обновления
   * @param {Object} updates - Объект с полями для обновления
   * @param {string} [updates.title] - Новое название фильма
   * @param {string} [updates.description] - Новое описание
   * @param {Date} [updates.date] - Новая дата показа
   * @returns {Object|null} Обновленный объект фильма или null если не найден
   * @example
   * const updatedFilm = filmsManager.update(2, { 
   *   title: "Новое название",
   *   description: "Обновленное описание" 
   * });
   */
  update: function (discussionNumber, updates) {
    const films = this.load();
    const index = films.findIndex(film => film.discussionNumber == discussionNumber);

    if (index !== -1) {
      // Объединяем существующие данные с обновлениями
      films[index] = { ...films[index], ...updates };
      this.save(films);
      return films[index];
    }

    return null;
  }
};

module.exports = filmsManager;
